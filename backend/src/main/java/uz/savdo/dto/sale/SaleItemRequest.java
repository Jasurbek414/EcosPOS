package uz.savdo.dto.sale;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SaleItemRequest {

    @NotNull(message = "Mahsulot (productId) kiritilishi shart")
    private Long productId;

    @NotNull(message = "Miqdor kiritilishi shart")
    @DecimalMin(value = "0.001", message = "Miqdor 0 dan katta bo'lishi kerak")
    private BigDecimal quantity;
}
