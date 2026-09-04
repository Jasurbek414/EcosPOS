package uz.savdo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

import java.math.BigDecimal;

/**
 * Sotuv hujjatining bitta qatori (bitta mahsulot). {@code unitPrice} sotuv paytidagi
 * {@code Product#salePrice} SNAPSHOT'i — narx keyinchalik o'zgarsa ham eski chek haqiqiy
 * o'sha paytda to'langan narxni ko'rsatishi kerak. {@code subtotal} har doim server
 * tomonida {@code quantity * unitPrice} sifatida hisoblanadi. {@code costPriceSnapshot}
 * xuddi shunday sotuv paytidagi {@code Product#costPrice} SNAPSHOT'i — tarixiy foyda
 * hisobotlari (ReportService) ta'minotchi narxi keyinchalik o'zgargan taqdirda ham
 * o'sha paytdagi haqiqiy tannarx bilan hisoblanishi uchun.
 */
@Entity
@Table(name = "sale_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SaleItem extends BaseEntity {

    @Column(name = "sale_id", nullable = false)
    private Long saleId;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    @Column(name = "quantity", nullable = false, precision = 12, scale = 3)
    private BigDecimal quantity;

    @Column(name = "unit_price", nullable = false, precision = 14, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "cost_price_snapshot", nullable = false, precision = 14, scale = 2)
    private BigDecimal costPriceSnapshot;

    @Column(name = "subtotal", nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotal;
}
