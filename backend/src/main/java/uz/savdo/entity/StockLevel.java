package uz.savdo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

import java.math.BigDecimal;

/**
 * Mahsulotning muayyan filialdagi joriy (hozirgi) zaxira miqdori.
 * Bu upsert qilinadigan "current state" jadval — append-only log emas
 * (log uchun {@link StockMovement} qarang). (product_id, branch_id) bo'yicha yagona.
 */
@Entity
@Table(name = "stock_levels")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockLevel extends BaseEntity {

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "quantity", nullable = false, precision = 12, scale = 3)
    @Builder.Default
    private BigDecimal quantity = BigDecimal.ZERO;
}
