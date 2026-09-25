package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.sale.SaleItemResponse;
import uz.savdo.dto.sale.SaleRequest;
import uz.savdo.dto.sale.SaleResponse;
import uz.savdo.dto.sale.SaleSummaryResponse;
import uz.savdo.entity.Customer;
import uz.savdo.entity.Product;
import uz.savdo.entity.Sale;
import uz.savdo.entity.SaleItem;
import uz.savdo.entity.User;
import uz.savdo.enums.PaymentMethod;
import uz.savdo.enums.UserRole;
import uz.savdo.exception.ForbiddenException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.repository.CompanyRepository;
import uz.savdo.repository.CustomerRepository;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.SaleItemRepository;
import uz.savdo.repository.SaleRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;
import uz.savdo.service.SaleService;

import java.time.LocalDate;
import java.util.List;

/**
 * Sotuvlar. Yaratish — barcha uch rol uchun ham ruxsat etilgan: filial client'dan emas,
 * kassirning joriy ochiq kassa smenasidan olinadi (qarang: SaleService), shu sababli
 * bu yerda alohida assertCanAccessBranch/assertCanWriteInventory chaqirilmaydi. Ko'rish —
 * GoodsReceiptController bilan bir xil filial-scoping naqshi (OWNER: barchasi/aniq
 * filial, MANAGER/CASHIER: faqat o'z filiali). CREDIT to'lovi uchun kompaniyaning
 * creditSalesEnabled kaliti bu yerda (SaleService'da emas) tekshiriladi — platform
 * CompanyRepository'ga to'g'ridan-to'g'ri kirish BranchController#create bilan bir xil
 * naqsh (qarang: JwtAuthFilter — companyId request attribute sifatida o'rnatiladi).
 */
@RestController
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
public class SaleController {

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final ProductRepository productRepository;
    private final UserRepository userRepository;
    private final CustomerRepository customerRepository;
    private final CompanyRepository companyRepository;
    private final CurrentUserService currentUserService;
    private final SaleService saleService;

    @GetMapping
    public List<SaleSummaryResponse> list(@RequestParam(required = false) Long branchId,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                           @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<Sale> sales;
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            sales = saleRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(branchId);
        } else {
            List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
            sales = allowedBranchIds == null
                    ? saleRepository.findAllByIsDeletedFalseOrderByIdDesc()
                    : allowedBranchIds.stream()
                            .flatMap(id -> saleRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(id).stream())
                            .toList();
        }

        // Filial tekshiruvining o'zi kassirni HECH NIMADAN cheklamaydi: bitta
        // kompaniyada hamma bir xil filialda ishlaydi, ya'ni kassir butun do'kon
        // tushumini ko'ra olardi — bu esa unga hisobotlar bo'limi orqali ataylab
        // berilmagan moliyaviy ma'lumot. Kassirga faqat O'Z savdolari ko'rinadi
        // (chekni tekshirish/qayta ko'rish uchun shuning o'zi yetarli).
        Long faqatShuKassir = kassirFiltri();

        return sales.stream()
                .filter(s -> faqatShuKassir == null || faqatShuKassir.equals(s.getCashierId()))
                .filter(s -> from == null || !s.getCreatedAt().toLocalDate().isBefore(from))
                .filter(s -> to == null || !s.getCreatedAt().toLocalDate().isAfter(to))
                .map(s -> SaleSummaryResponse.from(s, resolveCashierName(s.getCashierId()), countItems(s.getId())))
                .toList();
    }

    /**
     * CASHIER uchun uning o'z ID'si, OWNER/MANAGER uchun {@code null} (cheklov yo'q).
     */
    private Long kassirFiltri() {
        User joriy = currentUserService.getCurrentUser();
        return joriy.getRole() == UserRole.CASHIER ? joriy.getId() : null;
    }

    @GetMapping("/{id}")
    public SaleResponse get(@PathVariable Long id) {
        Sale sale = saleRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sotuv topilmadi: " + id));
        currentUserService.assertCanAccessBranch(sale.getBranchId());

        Long faqatShuKassir = kassirFiltri();
        if (faqatShuKassir != null && !faqatShuKassir.equals(sale.getCashierId())) {
            throw new ForbiddenException("Bu savdo boshqa kassirga tegishli");
        }

        return SaleResponse.from(sale, resolveCashierName(sale.getCashierId()), loadItemResponses(id), resolveCustomerName(sale.getCustomerId()));
    }

    @PostMapping
    public ResponseEntity<SaleResponse> create(@RequestAttribute("companyId") Long companyId,
                                                @Valid @RequestBody SaleRequest request) {
        if (request.getPaymentMethod() == PaymentMethod.CREDIT) {
            Company company = companyRepository.findById(companyId)
                    .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));
            if (!Boolean.TRUE.equals(company.getCreditSalesEnabled())) {
                throw new ForbiddenException("Nasiya savdosi bu kompaniya uchun faollashtirilmagan");
            }
        }

        User currentUser = currentUserService.getCurrentUser();
        Sale sale = saleService.createSale(request, currentUser.getId());

        return ResponseEntity.ok(SaleResponse.from(sale, currentUser.getFullName(), loadItemResponses(sale.getId()), resolveCustomerName(sale.getCustomerId())));
    }

    private List<SaleItemResponse> loadItemResponses(Long saleId) {
        List<SaleItem> items = saleItemRepository.findAllBySaleIdAndIsDeletedFalseOrderByIdAsc(saleId);
        return items.stream()
                .map(item -> {
                    Product product = productRepository.findById(item.getProductId())
                            .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + item.getProductId()));
                    return SaleItemResponse.from(item, product);
                })
                .toList();
    }

    private String resolveCashierName(Long cashierId) {
        return userRepository.findById(cashierId).map(User::getFullName).orElse(null);
    }

    /** customerId faqat CREDIT sotuvlarda to'ldiriladi — shu sababli oddiy sotuvlarda bekorga so'rov yuborilmaydi. */
    private String resolveCustomerName(Long customerId) {
        if (customerId == null) {
            return null;
        }
        return customerRepository.findById(customerId).map(Customer::getFullName).orElse(null);
    }

    private int countItems(Long saleId) {
        return saleItemRepository.findAllBySaleIdAndIsDeletedFalseOrderByIdAsc(saleId).size();
    }
}
