package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.entity.Plan;

import java.time.LocalDateTime;

@Data
@Builder
public class CompanyResponse {
    private Long id;
    private String slug;
    private String name;
    private String status;
    private Long planId;
    private String planName;
    private LocalDateTime createdAt;

    /** Kompaniyaga reja biriktirilmagan bo'lsa {@code plan} null uzatiladi. */
    public static CompanyResponse from(Company c, Plan plan) {
        return CompanyResponse.builder()
                .id(c.getId())
                .slug(c.getSlug())
                .name(c.getName())
                .status(c.getStatus().name())
                .planId(c.getPlanId())
                .planName(plan != null ? plan.getName() : null)
                .createdAt(c.getCreatedAt())
                .build();
    }

    public static CompanyResponse from(Company c) {
        return from(c, null);
    }
}
