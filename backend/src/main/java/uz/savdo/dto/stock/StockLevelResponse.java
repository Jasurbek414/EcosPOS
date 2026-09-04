package uz.savdo.dto.stock;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Product;
import uz.savdo.entity.StockLevel;

import java.math.BigDecimal;

/**
 * Filialdagi bitta mahsulotning joriy zaxira miqdori — frontend N+1 chaqiruv qilmasligi
 * uchun mahsulot nomi/birligi shu javobga qo'shib beriladi.
 */
@Data
@Builder
public class StockLevelResponse {
    private Long productId;
    private String productName;
    private String unit;
    private Long branchId;
    private BigDecimal quantity;
    private BigDecimal minStockLevel;

    public static StockLevelResponse from(StockLevel stockLevel, Product product) {
        return StockLevelResponse.builder()
                .productId(product.getId())
                .productName(product.getName())
                .unit(product.getUnit().name())
                .branchId(stockLevel.getBranchId())
                .quantity(stockLevel.getQuantity())
                .minStockLevel(product.getMinStockLevel())
                .build();
    }
}
