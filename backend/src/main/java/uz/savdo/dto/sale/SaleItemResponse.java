package uz.savdo.dto.sale;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Product;
import uz.savdo.entity.SaleItem;

import java.math.BigDecimal;

@Data
@Builder
public class SaleItemResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String unit;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal costPriceSnapshot;
    private BigDecimal subtotal;

    public static SaleItemResponse from(SaleItem item, Product product) {
        return SaleItemResponse.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .productName(product.getName())
                .unit(product.getUnit())
                .quantity(item.getQuantity())
                .unitPrice(item.getUnitPrice())
                .costPriceSnapshot(item.getCostPriceSnapshot())
                .subtotal(item.getSubtotal())
                .build();
    }
}
