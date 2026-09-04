package uz.savdo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

import java.math.BigDecimal;

/**
 * Bitta filialdan boshqasiga mahsulot ko'chirish hujjati. O'zi audit log emas
 * (bu uchun {@link StockMovement} qarang, har bir transfer ikkita StockMovement
 * (manba: manfiy, qabul qiluvchi: musbat) yozuvi bilan birga keladi) — bu esa
 * transferning o'zi haqidagi metama'lumot (kim, qachon, qaysi filialdan qaysi
 * filialga, qancha).
 */
@Entity
@Table(name = "stock_transfers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransfer extends BaseEntity {

    @Column(name = "from_branch_id", nullable = false)
    private Long fromBranchId;

    @Column(name = "to_branch_id", nullable = false)
    private Long toBranchId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
}
