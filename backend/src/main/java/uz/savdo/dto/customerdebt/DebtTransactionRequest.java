package uz.savdo.dto.customerdebt;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;
import uz.savdo.enums.DebtTransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * POST /api/v1/customer-debts so'rovi — faqat PAYMENT yoki WRITE_OFF uchun.
 * type == CREDIT_SALE server tomonida rad etiladi (bu qiymat faqat SaleService
 * orqali avtomatik yaratiladi, qarang: CustomerDebtController#create).
 */
@Data
public class DebtTransactionRequest {

    @NotNull(message = "Mijoz (customerId) kiritilishi shart")
    private Long customerId;

    @NotNull(message = "Tranzaksiya turi (type) kiritilishi shart")
    private DebtTransactionType type;

    @NotNull(message = "Summa kiritilishi shart")
    @Positive(message = "Summa musbat bo'lishi kerak")
    private BigDecimal amount;

    @NotNull(message = "Sana (transactionDate) kiritilishi shart")
    private LocalDate transactionDate;

    @Size(max = 300, message = "Izoh 300 belgidan oshmasligi kerak")
    private String note;
}
