package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.company.CompanyProfileResponse;
import uz.savdo.dto.company.CompanyProfileUpdateRequest;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.entity.Plan;
import uz.savdo.platform.repository.CompanyRepository;
import uz.savdo.platform.repository.PlanRepository;
import uz.savdo.security.CurrentUserService;

/**
 * Kompaniya profili (nomi) — faqat OWNER ko'radi/tahrirlaydi. companyId JWT'dan
 * JwtAuthFilter tomonidan request attribute sifatida o'rnatiladi (tenant kontekstida
 * Company/CompanyRepository'ga to'g'ridan-to'g'ri kirish odatda faqat platform tomonida
 * mavjud, shuning uchun bu yagona joy — qarang: JwtAuthFilter#doFilterInternal).
 */
@RestController
@RequestMapping("/api/v1/company")
@RequiredArgsConstructor
public class CompanyProfileController {

    private final CompanyRepository companyRepository;
    private final PlanRepository planRepository;
    private final CurrentUserService currentUserService;

    private Plan resolvePlan(Company company) {
        return company.getPlanId() != null ? planRepository.findById(company.getPlanId()).orElse(null) : null;
    }

    @GetMapping
    public CompanyProfileResponse get(@RequestAttribute("companyId") Long companyId) {
        currentUserService.assertIsOwner();
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));
        return CompanyProfileResponse.from(company, resolvePlan(company));
    }

    @PutMapping
    public CompanyProfileResponse update(@RequestAttribute("companyId") Long companyId,
                                          @Valid @RequestBody CompanyProfileUpdateRequest request) {
        currentUserService.assertIsOwner();
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));

        companyRepository.updateName(companyId, request.getName());
        company.setName(request.getName());

        return CompanyProfileResponse.from(company, resolvePlan(company));
    }
}
