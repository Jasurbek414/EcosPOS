package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.Plan;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class PlanResponse {
    private Long id;
    private String name;
    private BigDecimal priceMonthly;
    private Integer maxBranches;
    private Integer maxUsers;
    private Integer maxProducts;
    private String description;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static PlanResponse from(Plan p) {
        return PlanResponse.builder()
                .id(p.getId())
                .name(p.getName())
                .priceMonthly(p.getPriceMonthly())
                .maxBranches(p.getMaxBranches())
                .maxUsers(p.getMaxUsers())
                .maxProducts(p.getMaxProducts())
                .description(p.getDescription())
                .isActive(p.getIsActive())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
