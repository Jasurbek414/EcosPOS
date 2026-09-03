package uz.savdo.platform.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.platform.dto.CompanyDetailResponse;
import uz.savdo.platform.dto.CompanyResponse;
import uz.savdo.platform.dto.CreateCompanyRequest;
import uz.savdo.platform.dto.CreateCompanyResponse;
import uz.savdo.platform.entity.PlatformUser;
import uz.savdo.platform.repository.CompanyRepository;
import uz.savdo.platform.service.CompanyProvisioningService;

import java.util.List;

/**
 * Superadmin uchun kompaniyalar boshqaruvi: ro'yxat, yaratish, tafsilot.
 * Bloklash/obuna kabi funksiyalar keyingi fazaga qoldirilgan.
 */
@RestController
@RequestMapping("/api/v1/platform/companies")
@RequiredArgsConstructor
public class CompanyController {

    private final CompanyRepository companyRepository;
    private final CompanyProvisioningService provisioningService;

    @GetMapping
    public List<CompanyResponse> list() {
        return companyRepository.findAllNotDeleted().stream()
                .map(CompanyResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public CompanyDetailResponse detail(@PathVariable Long id) {
        return companyRepository.findById(id)
                .map(CompanyDetailResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));
    }

    @PostMapping
    public ResponseEntity<CreateCompanyResponse> create(
            @AuthenticationPrincipal PlatformUser currentAdmin,
            @Valid @RequestBody CreateCompanyRequest request) {
        return ResponseEntity.ok(provisioningService.createCompany(request, currentAdmin.getId()));
    }
}
