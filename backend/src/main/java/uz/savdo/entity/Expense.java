package uz.savdo.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.savdo.enums.ExpenseCategory;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Kompaniya xarajati. branchId null bo'lsa — kompaniya bo'ylab (filialga bog'liq
 * bo'lmagan) xarajat, masalan umumiy reklama yoki soliq. Ish haqi bu jadvalga
 * YOZILMAYDI — u uchun SalaryPayment mavjud (qarang: ExpenseCategory).
 */
@Entity
@Table(name = "expenses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense extends BaseEntity {

    @Column(name = "branch_id")
    private Long branchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 30)
    private ExpenseCategory category;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "description", length = 300)
    private String description;

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
}
