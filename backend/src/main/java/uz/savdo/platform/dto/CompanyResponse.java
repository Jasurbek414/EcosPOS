package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.Company;

import java.time.LocalDateTime;

@Data
@Builder
public class CompanyResponse {
    private Long id;
    private String slug;
    private String name;
    private String status;
    private String plan;
    private LocalDateTime createdAt;

    public static CompanyResponse from(Company c) {
        return CompanyResponse.builder()
                .id(c.getId())
                .slug(c.getSlug())
                .name(c.getName())
                .status(c.getStatus().name())
                .plan(c.getPlan())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
