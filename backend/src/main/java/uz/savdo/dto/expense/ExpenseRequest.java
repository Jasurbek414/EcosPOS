package uz.savdo.dto.expense;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class ExpenseRequest {

    /** null bo'lsa — kompaniya bo'ylab (filialga bog'liq bo'lmagan) xarajat, faqat OWNER yarata oladi. */
    private Long branchId;

    @NotBlank(message = "Xarajat turi (category) kiritilishi shart")
    private String category;

    @NotNull(message = "Summa kiritilishi shart")
    @Positive(message = "Summa musbat bo'lishi kerak")
    private BigDecimal amount;

    @Size(max = 300, message = "Izoh 300 belgidan oshmasligi kerak")
    private String description;

    @NotNull(message = "Xarajat sanasi kiritilishi shart")
    private LocalDate expenseDate;
}
