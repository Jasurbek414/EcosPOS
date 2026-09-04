package uz.savdo.dto.goodsreceipt;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.GoodsReceiptItem;
import uz.savdo.entity.Product;

import java.math.BigDecimal;

@Data
@Builder
public class GoodsReceiptItemResponse {
    private Long id;
    private Long productId;
    private String productName;
    private String unit;
    private BigDecimal quantity;
    private BigDecimal unitCost;
    private BigDecimal subtotal;

    public static GoodsReceiptItemResponse from(GoodsReceiptItem item, Product product) {
        return GoodsReceiptItemResponse.builder()
                .id(item.getId())
                .productId(item.getProductId())
                .productName(product.getName())
                .unit(product.getUnit().name())
                .quantity(item.getQuantity())
                .unitCost(item.getUnitCost())
                .subtotal(item.getSubtotal())
                .build();
    }
}
