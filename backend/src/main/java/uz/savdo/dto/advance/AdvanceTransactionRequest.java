package uz.savdo.dto.advance;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.savdo.enums.AdvanceTransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

/** POST /api/v1/employee-advances — branchId client'dan qabul qilinmaydi, target User'ning o'zining branchId'sidan serverda ko'chiriladi. */
@Data
public class AdvanceTransactionRequest {

    @NotNull(message = "Xodim (userId) kiritilishi shart")
    private Long userId;

    @NotNull(message = "Tranzaksiya turi (type) kiritilishi shart")
    private AdvanceTransactionType type;

    @NotNull(message = "Summa kiritilishi shart")
    @Positive(message = "Summa musbat bo'lishi kerak")
    private BigDecimal amount;

    @NotNull(message = "Sana (transactionDate) kiritilishi shart")
    private LocalDate transactionDate;

    @Size(max = 300, message = "Izoh 300 belgidan oshmasligi kerak")
    private String note;
}
