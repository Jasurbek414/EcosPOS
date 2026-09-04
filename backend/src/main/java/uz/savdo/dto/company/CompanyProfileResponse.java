package uz.savdo.dto.company;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.Company;

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
    private String plan;
    private LocalDateTime createdAt;

    public static CompanyProfileResponse from(Company c) {
        return CompanyProfileResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .slug(c.getSlug())
                .plan(c.getPlan())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
