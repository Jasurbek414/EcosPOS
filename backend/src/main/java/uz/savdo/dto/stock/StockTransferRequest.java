package uz.savdo.dto.stock;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class StockTransferRequest {

    @NotNull(message = "Manba filial (fromBranchId) kiritilishi shart")
    private Long fromBranchId;

    @NotNull(message = "Qabul qiluvchi filial (toBranchId) kiritilishi shart")
    private Long toBranchId;

    @NotNull(message = "Mahsulot (productId) kiritilishi shart")
    private Long productId;

    @NotNull(message = "Miqdor (quantity) kiritilishi shart")
    @DecimalMin(value = "0.001", message = "Miqdor 0 dan katta bo'lishi kerak")
    private BigDecimal quantity;

    private String note;
}
