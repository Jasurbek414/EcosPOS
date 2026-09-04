package uz.savdo.dto.cashshift;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CloseShiftRequest {

    @NotNull(message = "Yopilish naqd summasi kiritilishi shart")
    @DecimalMin(value = "0", message = "Yopilish naqd summasi manfiy bo'lishi mumkin emas")
    private BigDecimal closingCash;

    private String note;
}
