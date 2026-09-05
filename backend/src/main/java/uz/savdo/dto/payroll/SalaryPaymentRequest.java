package uz.savdo.dto.payroll;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/** POST /api/v1/salary-payments — branchId client'dan qabul qilinmaydi, target User'ning o'zining branchId'sidan serverda ko'chiriladi. */
@Data
public class SalaryPaymentRequest {

    @NotNull(message = "Xodim (userId) kiritilishi shart")
    private Long userId;

    @NotNull(message = "Summa kiritilishi shart")
    @Positive(message = "Summa musbat bo'lishi kerak")
    private BigDecimal amount;

    @NotNull(message = "Davr (periodMonth) kiritilishi shart")
    @Pattern(regexp = "^\\d{4}-\\d{2}$", message = "Davr \"yyyy-MM\" formatida bo'lishi kerak")
    private String periodMonth;

    @NotNull(message = "To'lov sanasi kiritilishi shart")
    private LocalDate paymentDate;

    @Size(max = 300, message = "Izoh 300 belgidan oshmasligi kerak")
    private String note;
}
