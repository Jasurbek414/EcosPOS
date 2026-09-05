package uz.savdo.platform.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.platform.dto.AdminPasswordResetResponse;
import uz.savdo.platform.dto.AssignPlanRequest;
import uz.savdo.platform.dto.BlockCompanyRequest;
import uz.savdo.platform.dto.CompanyDetailResponse;
import uz.savdo.platform.dto.CompanyResponse;
import uz.savdo.platform.dto.CreateCompanyRequest;
import uz.savdo.platform.dto.CreateCompanyResponse;
import uz.savdo.platform.dto.UpdateCompanyRequest;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.entity.Plan;
import uz.savdo.platform.entity.PlatformUser;
import uz.savdo.platform.enums.CompanyStatus;
import uz.savdo.platform.repository.CompanyRepository;
import uz.savdo.platform.repository.PlanRepository;
import uz.savdo.platform.service.CompanyProvisioningService;
import uz.savdo.platform.service.PlatformAuditLogService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Stream;

/**
 * Superadmin uchun kompaniyalar boshqaruvi: ro'yxat, yaratish, tafsilot, bloklash/blokdan
 * chiqarish, admin parolini tiklash. Obuna/to'lov kabi funksiyalar hali keyingi fazaga
 * qoldirilgan.
 */
@RestController
@RequestMapping("/api/v1/platform/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyRepository companyRepository;
    private final PlanRepository planRepository;
    private final CompanyProvisioningService provisioningService;
    private final PlatformAuditLogService platformAuditLogService;

    @GetMapping
    public List<CompanyResponse> list() {
        List<Company> companies = companyRepository.findAllNotDeleted();
        Map<Long, Plan> plansById = loadPlans(companies.stream().map(Company::getPlanId));
        return companies.stream()
                .map(c -> CompanyResponse.from(c, plansById.get(c.getPlanId())))
                .toList();
    }

    @GetMapping("/{id}")
    public CompanyDetailResponse detail(@PathVariable Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));
        Plan plan = company.getPlanId() != null ? planRepository.findById(company.getPlanId()).orElse(null) : null;
        return CompanyDetailResponse.from(company, plan);
    }

    private Map<Long, Plan> loadPlans(Stream<Long> planIds) {
        List<Long> ids = planIds.filter(Objects::nonNull).distinct().toList();
        return planRepository.findByIds(ids);
    }

    @PostMapping
    public ResponseEntity<CreateCompanyResponse> create(
            @AuthenticationPrincipal PlatformUser currentAdmin,
            @Valid @RequestBody CreateCompanyRequest request) {
        return ResponseEntity.ok(provisioningService.createCompany(request, currentAdmin.getId()));
    }

    @PutMapping("/{id}")
    public CompanyDetailResponse update(@AuthenticationPrincipal PlatformUser currentAdmin,
                                         @PathVariable Long id,
                                         @Valid @RequestBody UpdateCompanyRequest request) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));

        String oldName = company.getName();

        companyRepository.updateName(id, request.getName());
        platformAuditLogService.log(currentAdmin.getId(), "COMPANY_UPDATED", id,
                "Nom: '" + oldName + "' -> '" + request.getName() + "'");

        company.setName(request.getName());
        Plan plan = company.getPlanId() != null ? planRepository.findById(company.getPlanId()).orElse(null) : null;
        return CompanyDetailResponse.from(company, plan);
    }

    @PatchMapping("/{id}/plan")
    public CompanyDetailResponse assignPlan(@AuthenticationPrincipal PlatformUser currentAdmin,
                                             @PathVariable Long id,
                                             @Valid @RequestBody AssignPlanRequest request) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));

        Plan newPlan = null;
        if (request.getPlanId() != null) {
            newPlan = planRepository.findById(request.getPlanId())
                    .orElseThrow(() -> new BadRequestException("Reja topilmadi"));
        }
        Plan oldPlan = company.getPlanId() != null ? planRepository.findById(company.getPlanId()).orElse(null) : null;

        companyRepository.updatePlan(id, request.getPlanId());
        platformAuditLogService.log(currentAdmin.getId(), "COMPANY_PLAN_CHANGED", id,
                "Reja: '" + (oldPlan != null ? oldPlan.getName() : "(rejasiz)") + "' -> '"
                        + (newPlan != null ? newPlan.getName() : "(rejasiz)") + "'");

        company.setPlanId(request.getPlanId());
        return CompanyDetailResponse.from(company, newPlan);
    }

    @PatchMapping("/{id}/block")
    public CompanyDetailResponse block(@AuthenticationPrincipal PlatformUser currentAdmin,
                                        @PathVariable Long id,
                                        @Valid @RequestBody BlockCompanyRequest request) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));
        if (company.getStatus() == CompanyStatus.BLOCKED) {
            throw new BadRequestException("Kompaniya allaqachon bloklangan");
        }

        LocalDateTime blockedAt = LocalDateTime.now();
        companyRepository.updateStatus(id, CompanyStatus.BLOCKED, request.getReason(), blockedAt);
        platformAuditLogService.log(currentAdmin.getId(), "COMPANY_BLOCKED", id,
                "Kompaniya bloklandi: " + request.getReason());

        company.setStatus(CompanyStatus.BLOCKED);
        company.setBlockedReason(request.getReason());
        company.setBlockedAt(blockedAt);
        Plan plan = company.getPlanId() != null ? planRepository.findById(company.getPlanId()).orElse(null) : null;
        return CompanyDetailResponse.from(company, plan);
    }

    @PatchMapping("/{id}/unblock")
    public CompanyDetailResponse unblock(@AuthenticationPrincipal PlatformUser currentAdmin,
                                          @PathVariable Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));
        if (company.getStatus() != CompanyStatus.BLOCKED) {
            throw new BadRequestException("Kompaniya bloklangan holatda emas");
        }

        companyRepository.updateStatus(id, CompanyStatus.ACTIVE, null, null);
        platformAuditLogService.log(currentAdmin.getId(), "COMPANY_UNBLOCKED", id, "Kompaniya blokdan chiqarildi");

        company.setStatus(CompanyStatus.ACTIVE);
        company.setBlockedReason(null);
        company.setBlockedAt(null);
        Plan plan = company.getPlanId() != null ? planRepository.findById(company.getPlanId()).orElse(null) : null;
        return CompanyDetailResponse.from(company, plan);
    }

    @PostMapping("/{id}/reset-admin-password")
    public ResponseEntity<AdminPasswordResetResponse> resetAdminPassword(
            @AuthenticationPrincipal PlatformUser currentAdmin,
            @PathVariable Long id) {
        return ResponseEntity.ok(provisioningService.resetAdminPassword(id, currentAdmin.getId()));
    }
}
