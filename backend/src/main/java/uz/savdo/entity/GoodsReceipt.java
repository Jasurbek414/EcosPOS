package uz.savdo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Ombor kirim hujjati (yetkazib beruvchidan mahsulot qabul qilish). {@code totalAmount}
 * doim server tomonida item'lar subtotal'lari yig'indisi sifatida hisoblanadi — client'dan
 * kelgan qiymatga hech qachon ishonilmaydi (qarang: GoodsReceiptService).
 */
@Entity
@Table(name = "goods_receipts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GoodsReceipt extends BaseEntity {

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "supplier_id")
    private Long supplierId;

    @Column(name = "receipt_date", nullable = false)
    private LocalDate receiptDate;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "total_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
}
