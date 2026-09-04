package uz.savdo.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.savdo.enums.Unit;

import java.math.BigDecimal;

/**
 * Mahsulot (kompaniya bo'ylab umumiy — katalog, filialga bog'liq emas).
 * Filial bo'yicha zaxira miqdori {@link StockLevel} orqali yuritiladi.
 */
@Entity
@Table(name = "products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Product extends BaseEntity {

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "barcode", unique = true, length = 64)
    private String barcode;

    @Enumerated(EnumType.STRING)
    @Column(name = "unit", nullable = false, length = 20)
    private Unit unit;

    @Column(name = "cost_price", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(name = "sale_price", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal salePrice = BigDecimal.ZERO;

    @Column(name = "min_stock_level", precision = 12, scale = 3)
    private BigDecimal minStockLevel;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
