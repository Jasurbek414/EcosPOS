package uz.savdo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

/**
 * Filial (do'kon/supermarket nuqtasi). Har bir kompaniya (tenant) bir nechta filialga
 * ega bo'lishi mumkin — foydalanuvchilar (MANAGER/CASHIER) muayyan filialga bog'lanadi.
 */
@Entity
@Table(name = "branches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Branch extends BaseEntity {

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "address", length = 300)
    private String address;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "phone", length = 30)
    private String phone;

    /** Erkin matn shaklidagi ish vaqti, masalan "09:00–21:00" — strukturaviy jadval emas. */
    @Column(name = "working_hours", length = 100)
    private String workingHours;
}
