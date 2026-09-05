package uz.savdo.dto.company;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.entity.Plan;

import java.time.LocalDateTime;

/**
 * GET/PUT /api/v1/company javobi — OWNER'ga ko'rsatiladigan kompaniya profili.
 * DIQQAT: dbHost/dbPort/dbName/dbUsername ATAYLAB kiritilmagan — bular ichki
 * infratuzilma tafsilotlari, tenant egasi ularni ko'rmasligi kerak.
 */
@Data
@Builder
public class CompanyProfileResponse {
    private Long id;
    private String name;
    private String slug;
    private String address;
    private String phone;
    private String logoUrl;
    private String receiptPaperWidth;
    private String receiptFooterText;
    private Boolean receiptShowLogo;
    private Boolean receiptShowCashierName;
    private Boolean receiptAutoPrint;
    private Long planId;
    private String planName;
    private LocalDateTime createdAt;

    /** Kompaniyaga reja biriktirilmagan bo'lsa {@code plan} null uzatiladi. */
    public static CompanyProfileResponse from(Company c, Plan plan) {
        return CompanyProfileResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .slug(c.getSlug())
                .address(c.getAddress())
                .phone(c.getPhone())
                .logoUrl(c.getLogoUrl())
                .receiptPaperWidth(c.getReceiptPaperWidth())
                .receiptFooterText(c.getReceiptFooterText())
                .receiptShowLogo(c.getReceiptShowLogo())
                .receiptShowCashierName(c.getReceiptShowCashierName())
                .receiptAutoPrint(c.getReceiptAutoPrint())
                .planId(c.getPlanId())
                .planName(plan != null ? plan.getName() : null)
                .createdAt(c.getCreatedAt())
                .build();
    }
}
