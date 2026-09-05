package uz.savdo.dto.product;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Product;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class ProductResponse {
    private Long id;
    private Long categoryId;
    private String name;
    private String barcode;
    private String unit;
    private BigDecimal costPrice;
    private BigDecimal salePrice;
    private BigDecimal minStockLevel;
    private String imageUrl;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static ProductResponse from(Product p) {
        return ProductResponse.builder()
                .id(p.getId())
                .categoryId(p.getCategoryId())
                .name(p.getName())
                .barcode(p.getBarcode())
                .unit(p.getUnit())
                .costPrice(p.getCostPrice())
                .salePrice(p.getSalePrice())
                .minStockLevel(p.getMinStockLevel())
                .imageUrl(p.getImageUrl())
                .isActive(p.getIsActive())
                .createdAt(p.getCreatedAt())
                .build();
    }
}
