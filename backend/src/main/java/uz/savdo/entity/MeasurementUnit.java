package uz.savdo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

/**
 * O'lchov birligi (kompaniya bo'ylab umumiy, filialga bog'liq emas).
 * Mahsulotlar kod (code) orqali bog'lanadi, shuning uchun qattiq o'chirish yo'q —
 * faqat faol/nofaol holat almashtiriladi (activate/deactivate).
 */
@Entity
@Table(name = "measurement_units")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MeasurementUnit extends BaseEntity {

    @Column(name = "code", nullable = false, unique = true, length = 20)
    private String code;

    @Column(name = "name", nullable = false, length = 50)
    private String name;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
