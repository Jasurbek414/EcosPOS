package uz.savdo.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.savdo.enums.AdvanceTransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Xodimga avans berish yoki avansni qaytarib olish tranzaksiyasi. Xodimning joriy
 * qarzi = SUM(ADVANCE_GIVEN) - SUM(ADVANCE_REPAYMENT) (Java'da hisoblanadi, qarang:
 * EmployeeAdvanceController#balances). branchId nishonlangan xodimning o'zining
 * branchId'sidan serverda ko'chiriladi.
 */
@Entity
@Table(name = "employee_advance_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeAdvanceTransaction extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "branch_id")
    private Long branchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private AdvanceTransactionType type;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
}
