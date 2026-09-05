package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.branch.BranchLimitsResponse;
import uz.savdo.dto.branch.BranchNameResponse;
import uz.savdo.dto.branch.BranchRequest;
import uz.savdo.dto.branch.BranchResponse;
import uz.savdo.dto.branch.BranchStatsResponse;
import uz.savdo.entity.Branch;
import uz.savdo.entity.Sale;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ForbiddenException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.entity.Plan;
import uz.savdo.platform.repository.CompanyRepository;
import uz.savdo.platform.repository.PlanRepository;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.StockLevelRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;
import uz.savdo.service.ReportService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchRepository branchRepository;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;
    private final StockLevelRepository stockLevelRepository;
    private final ReportService reportService;
    private final CompanyRepository companyRepository;
    private final PlanRepository planRepository;

    /** Kompaniyaning rejasidan (plan) kelgan filiallar soni chegarasi — reja yo'q/maxBranches null bo'lsa cheksiz. */
    private Integer resolveMaxBranches(Company company) {
        if (company.getPlanId() == null) {
            return null;
        }
        Plan plan = planRepository.findById(company.getPlanId()).orElse(null);
        return plan != null ? plan.getMaxBranches() : null;
    }

    @GetMapping
    public List<BranchResponse> list() {
        List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
        List<Branch> branches = allowedBranchIds == null
                ? branchRepository.findAllByIsDeletedFalseOrderByIdAsc()
                : branchRepository.findAllById(allowedBranchIds).stream()
                        .filter(b -> !b.getIsDeleted())
                        .toList();
        return branches.stream().map(BranchResponse::from).toList();
    }

    /**
     * Rolga qaramasdan BARCHA faol filiallar nomi — filiallar orasida ko'chirish
     * formasidagi "qayerga" pikeri uchun (MANAGER/CASHIER {@code list()} orqali faqat
     * o'z filialini ko'radi, lekin transfer qabul qiluvchi filialni tanlashi kerak).
     */
    @GetMapping("/all-names")
    public List<BranchNameResponse> listAllNames() {
        return branchRepository.findAllByIsDeletedFalseOrderByIdAsc().stream()
                .filter(Branch::getIsActive)
                .map(BranchNameResponse::from)
                .toList();
    }

    /**
     * Joriy filiallar soni, rejadan kelgan yuqori chegara va "Filiallar" funksiyasi
     * yoqilgan/o'chirilganligi — frontend "X / Y filiallar" ko'rsatishi va limit
     * to'lganda "Yangi filial" tugmasini oldindan o'chirib qo'yishi uchun. {@code list()}
     * kabi barcha autentifikatsiyalangan foydalanuvchilarga ochiq.
     */
    @GetMapping("/limits")
    public BranchLimitsResponse limits(@RequestAttribute("companyId") Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));
        return BranchLimitsResponse.builder()
                .currentCount((int) branchRepository.countByIsDeletedFalse())
                .maxBranches(resolveMaxBranches(company))
                .featureEnabled(Boolean.TRUE.equals(company.getBranchesFeatureEnabled()))
                .build();
    }

    @GetMapping("/{id}")
    public BranchResponse getOne(@PathVariable Long id) {
        currentUserService.assertCanAccessBranch(id);

        Branch branch = branchRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: " + id));
        return BranchResponse.from(branch);
    }

    @GetMapping("/{id}/stats")
    public BranchStatsResponse stats(@PathVariable Long id) {
        currentUserService.assertCanAccessBranch(id);

        int staffCount = (int) userRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(id).stream()
                .filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                .count();
        int productCount = stockLevelRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(id).size();
        int lowStockCount = reportService.countLowStock(List.of(id));

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        List<Sale> monthSales = reportService.fetchSales(List.of(id), monthStart, today);
        List<Sale> todaySales = monthSales.stream()
                .filter(s -> s.getCreatedAt().toLocalDate().isEqual(today))
                .toList();

        return BranchStatsResponse.builder()
                .staffCount(staffCount)
                .productCount(productCount)
                .lowStockCount(lowStockCount)
                .todaySalesTotal(ReportService.sumRevenue(todaySales))
                .todaySalesCount(todaySales.size())
                .monthSalesTotal(ReportService.sumRevenue(monthSales))
                .build();
    }

    @PostMapping
    public ResponseEntity<BranchResponse> create(@RequestAttribute("companyId") Long companyId,
                                                  @Valid @RequestBody BranchRequest request) {
        currentUserService.assertIsOwner();

        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));
        if (!Boolean.TRUE.equals(company.getBranchesFeatureEnabled())) {
            throw new ForbiddenException("Filiallar funksiyasi bu kompaniya uchun faollashtirilmagan");
        }
        Integer maxBranches = resolveMaxBranches(company);
        if (maxBranches != null) {
            long currentCount = branchRepository.countByIsDeletedFalse();
            if (currentCount >= maxBranches) {
                throw new BadRequestException("Filiallar limiti to'lgan (" + currentCount + "/" + maxBranches
                        + "). Tarifni yangilang.");
            }
        }

        Branch branch = Branch.builder()
                .name(request.getName())
                .address(request.getAddress())
                .phone(request.getPhone())
                .workingHours(request.getWorkingHours())
                .isActive(true)
                .build();
        branch = branchRepository.save(branch);

        return ResponseEntity.ok(BranchResponse.from(branch));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BranchResponse> update(@PathVariable Long id, @Valid @RequestBody BranchRequest request) {
        currentUserService.assertIsOwner();
        if (request.getIsActive() == null) {
            throw new BadRequestException("isActive kiritilishi shart");
        }

        Branch branch = branchRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: " + id));
        branch.setName(request.getName());
        branch.setAddress(request.getAddress());
        branch.setPhone(request.getPhone());
        branch.setWorkingHours(request.getWorkingHours());
        branch.setIsActive(request.getIsActive());
        branch = branchRepository.save(branch);

        return ResponseEntity.ok(BranchResponse.from(branch));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        currentUserService.assertIsOwner();

        Branch branch = branchRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: " + id));
        branch.setIsDeleted(true);
        branch.setDeletedAt(LocalDateTime.now());
        branchRepository.save(branch);

        return ResponseEntity.noContent().build();
    }
}
