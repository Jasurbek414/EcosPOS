package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.Company;

import java.time.LocalDateTime;

@Data
@Builder
public class CompanyDetailResponse {
    private Long id;
    private String slug;
    private String name;
    private String status;
    private String plan;
    private String blockedReason;
    private LocalDateTime blockedAt;
    private LocalDateTime createdAt;

    public static CompanyDetailResponse from(Company c) {
        return CompanyDetailResponse.builder()
                .id(c.getId())
                .slug(c.getSlug())
                .name(c.getName())
                .status(c.getStatus().name())
                .plan(c.getPlan())
                .blockedReason(c.getBlockedReason())
                .blockedAt(c.getBlockedAt())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
