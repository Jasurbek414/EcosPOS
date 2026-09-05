package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.entity.Plan;

import java.time.LocalDateTime;

@Data
@Builder
public class CompanyDetailResponse {
    private Long id;
    private String slug;
    private String name;
    private String status;
    private Long planId;
    private String planName;
    private String blockedReason;
    private LocalDateTime blockedAt;
    private LocalDateTime createdAt;

    /** Kompaniyaga reja biriktirilmagan bo'lsa {@code plan} null uzatiladi. */
    public static CompanyDetailResponse from(Company c, Plan plan) {
        return CompanyDetailResponse.builder()
                .id(c.getId())
                .slug(c.getSlug())
                .name(c.getName())
                .status(c.getStatus().name())
                .planId(c.getPlanId())
                .planName(plan != null ? plan.getName() : null)
                .blockedReason(c.getBlockedReason())
                .blockedAt(c.getBlockedAt())
                .createdAt(c.getCreatedAt())
                .build();
    }

    public static CompanyDetailResponse from(Company c) {
        return from(c, null);
    }
}
