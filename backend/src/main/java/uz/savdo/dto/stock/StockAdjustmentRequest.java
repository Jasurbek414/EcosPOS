package uz.savdo.dto.stock;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class StockAdjustmentRequest {

    @NotNull(message = "Filial (branchId) kiritilishi shart")
    private Long branchId;

    @NotNull(message = "Mahsulot (productId) kiritilishi shart")
    private Long productId;

    /** Ishorali delta: ortishda musbat, kamayishda manfiy. */
    @NotNull(message = "Miqdor o'zgarishi (quantityDelta) kiritilishi shart")
    private BigDecimal quantityDelta;

    private String reason;
}
