package uz.savdo.dto.goodsreceipt;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class GoodsReceiptItemRequest {

    @NotNull(message = "Mahsulot (productId) kiritilishi shart")
    private Long productId;

    @NotNull(message = "Miqdor kiritilishi shart")
    @DecimalMin(value = "0.001", message = "Miqdor 0 dan katta bo'lishi kerak")
    private BigDecimal quantity;

    @NotNull(message = "Birlik tannarxi kiritilishi shart")
    @DecimalMin(value = "0", message = "Birlik tannarxi manfiy bo'lishi mumkin emas")
    private BigDecimal unitCost;
}
