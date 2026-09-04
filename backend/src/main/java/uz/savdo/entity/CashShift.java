package uz.savdo.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.savdo.enums.ShiftStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Kassa smenasi — kassir (OWNER/MANAGER/CASHIER, o'z filiali doirasida) ish boshlaganda
 * boshlang'ich naqd summasi bilan ochadi, ish tugaganda haqiqiy sanoq bilan yopadi.
 * Yopilishda {@code expectedCash} (kutilgan naqd summa) hisoblanadi va {@code closingCash}
 * bilan solishtirib, kassadagi ortiqcha/yetishmovchilikni aniqlash mumkin bo'ladi.
 * Bitta kassirning bir vaqtda faqat bitta OCHIQ smenasi bo'lishi mumkin (qarang: CashShiftService).
 */
@Entity
@Table(name = "cash_shifts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CashShift extends BaseEntity {

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "cashier_id", nullable = false)
    private Long cashierId;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "opening_cash", nullable = false, precision = 14, scale = 2)
    private BigDecimal openingCash;

    @Column(name = "closing_cash", precision = 14, scale = 2)
    private BigDecimal closingCash;

    @Column(name = "expected_cash", precision = 14, scale = 2)
    private BigDecimal expectedCash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private ShiftStatus status;

    @Column(name = "note", length = 300)
    private String note;
}
