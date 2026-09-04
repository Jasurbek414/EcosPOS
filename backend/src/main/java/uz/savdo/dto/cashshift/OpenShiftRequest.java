package uz.savdo.dto.cashshift;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class OpenShiftRequest {

    @NotNull(message = "Filial (branchId) kiritilishi shart")
    private Long branchId;

    @NotNull(message = "Boshlang'ich naqd summasi kiritilishi shart")
    @DecimalMin(value = "0", message = "Boshlang'ich naqd summasi manfiy bo'lishi mumkin emas")
    private BigDecimal openingCash;
}
