package uz.savdo.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.*;

/**
 * Yetkazib beruvchi (kompaniya bo'ylab umumiy, filialga bog'liq emas).
 */
@Entity
@Table(name = "suppliers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Supplier extends BaseEntity {

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "address", length = 300)
    private String address;

    @Column(name = "contact_person", length = 150)
    private String contactPerson;

    @Column(name = "email", length = 150)
    private String email;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
