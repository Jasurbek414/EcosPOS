package uz.savdo.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Xodimga to'langan ish haqi (bitta to'lov yozuvi). branchId to'lov paytida nishonlangan
 * xodimning o'zining branchId'sidan serverda ko'chiriladi (client tomonidan yuborilmaydi) —
 * qarang: SalaryPaymentController#create.
 */
@Entity
@Table(name = "salary_payments")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalaryPayment extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    /** "yyyy-MM" formatidagi davr, masalan "2026-09". */
    @Column(name = "period_month", nullable = false, length = 7)
    private String periodMonth;

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
}
