package uz.savdo.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.savdo.enums.DebtTransactionType;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Mijoz qarz (nasiya) tranzaksiyasi — CREDIT_SALE (nasiya savdo, faqat SaleService
 * orqali avtomatik), PAYMENT (qarzni to'lash) yoki WRITE_OFF (hisobdan chiqarish).
 * Mijozning joriy qarzi = SUM(CREDIT_SALE) - SUM(PAYMENT) - SUM(WRITE_OFF) (Java'da
 * hisoblanadi, qarang: CustomerDebtController#balances).
 */
@Entity
@Table(name = "customer_debt_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerDebtTransaction extends BaseEntity {

    @Column(name = "customer_id", nullable = false)
    private Long customerId;

    @Column(name = "branch_id")
    private Long branchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private DebtTransactionType type;

    @Column(name = "amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal amount;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(name = "related_sale_id")
    private Long relatedSaleId;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
}
