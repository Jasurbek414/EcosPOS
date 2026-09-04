package uz.savdo.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.savdo.enums.MovementType;

import java.math.BigDecimal;

/**
 * Ombor harakatlarining append-only audit jurnali. {@code quantity} har doim
 * ISHORALI (signed) delta sifatida saqlanadi: ortishda musbat, kamayishda manfiy —
 * shunday qilib bitta filial/mahsulot bo'yicha SUM(quantity) {@link StockLevel#getQuantity()}
 * bilan mos kelishi kerak (reconciliation).
 */
@Entity
@Table(name = "stock_movements")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockMovement extends BaseEntity {

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private MovementType type;

    @Column(name = "quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity;

    @Column(name = "reference_type", length = 30)
    private String referenceType;

    @Column(name = "reference_id")
    private Long referenceId;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;
}
