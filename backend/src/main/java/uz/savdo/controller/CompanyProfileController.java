package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.company.CompanyInfoResponse;
import uz.savdo.dto.company.CompanyProfileResponse;
import uz.savdo.dto.company.CompanyProfileUpdateRequest;
import uz.savdo.dto.company.ReceiptSettingsUpdateRequest;
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

        companyRepository.updateProfile(companyId, request.getName(), request.getAddress(),
                request.getPhone(), request.getLogoUrl());
        company.setName(request.getName());
        company.setAddress(request.getAddress());
        company.setPhone(request.getPhone());
        company.setLogoUrl(request.getLogoUrl());

        return CompanyProfileResponse.from(company, resolvePlan(company));
    }

    /** POS chekining ko'rinishi/chop etilish tartibi — faqat OWNER sozlaydi. */
    @PutMapping("/receipt-settings")
    public CompanyProfileResponse updateReceiptSettings(@RequestAttribute("companyId") Long companyId,
                                                          @Valid @RequestBody ReceiptSettingsUpdateRequest request) {
        currentUserService.assertIsOwner();
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));

        companyRepository.updateReceiptSettings(companyId, request.getReceiptPaperWidth(), request.getReceiptFooterText(),
                request.getReceiptShowLogo(), request.getReceiptShowCashierName(), request.getReceiptAutoPrint());
        company.setReceiptPaperWidth(request.getReceiptPaperWidth());
        company.setReceiptFooterText(request.getReceiptFooterText());
        company.setReceiptShowLogo(request.getReceiptShowLogo());
        company.setReceiptShowCashierName(request.getReceiptShowCashierName());
        company.setReceiptAutoPrint(request.getReceiptAutoPrint());

        return CompanyProfileResponse.from(company, resolvePlan(company));
    }

    /**
     * Chek/kvitansiyalarda ko'rsatish uchun minimal biznes ma'lumotlari — istalgan
     * autentifikatsiyalangan tenant foydalanuvchisiga ochiq (MANAGER/CASHIER ham chek
     * chiqaradi), shuning uchun assertIsOwner() ATAYLAB chaqirilmagan.
     */
    @GetMapping("/info")
    public CompanyInfoResponse info(@RequestAttribute("companyId") Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Kompaniya topilmadi"));
        return CompanyInfoResponse.from(company);
    }
}
