package uz.savdo.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.savdo.enums.PaymentMethod;

import java.math.BigDecimal;

/**
 * Sotuv hujjati (chek) — bitta ochiq kassa smenasi doirasida amalga oshiriladi. {@code
 * totalAmount} har doim server tomonida item'lar subtotal'lari yig'indisi sifatida
 * hisoblanadi — client'dan kelgan qiymatga hech qachon ishonilmaydi (qarang: SaleService).
 * CASH to'lovda {@code amountPaid} {@code totalAmount}'dan katta bo'lishi mumkin
 * ({@code changeAmount} — qaytim); CARD to'lovda ikkalasi doim teng.
 */
@Entity
@Table(name = "sales")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sale extends BaseEntity {

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "cash_shift_id", nullable = false)
    private Long cashShiftId;

    @Column(name = "cashier_id", nullable = false)
    private Long cashierId;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", nullable = false, length = 20)
    private PaymentMethod paymentMethod;

    @Column(name = "amount_paid", nullable = false, precision = 14, scale = 2)
    private BigDecimal amountPaid;

    @Column(name = "change_amount", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal changeAmount = BigDecimal.ZERO;

    /**
     * MIXED to'lovda karta bilan qoplangan qism. CASH uchun 0, CARD uchun totalAmount'ga
     * teng (qarang: SaleService#createSale). amountPaid semantikasi bu maydon bilan
     * o'zgarmaydi — u har doim mijoz bergan NAQD summani bildiradi.
     */
    @Column(name = "card_amount", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal cardAmount = BigDecimal.ZERO;

    /**
     * Faqat paymentMethod == CREDIT bo'lganda to'ldiriladi — nasiyaga sotilgan mijoz
     * (qarang: SaleService#createSale, CustomerDebtTransaction). Boshqa to'lov
     * usullarida null.
     */
    @Column(name = "customer_id")
    private Long customerId;
}
