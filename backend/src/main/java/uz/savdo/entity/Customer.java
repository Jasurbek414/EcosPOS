package uz.savdo.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

/**
 * Mijoz (nasiya savdo uchun) — kompaniya bo'ylab umumiy, filialga bog'lanmagan.
 * Joriy qarzi CustomerDebtTransaction'lardan Java'da hisoblanadi (qarang:
 * CustomerDebtController#balances).
 */
@Entity
@Table(name = "customers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer extends BaseEntity {

    @NotBlank
    @Size(max = 150)
    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Size(max = 30)
    @Column(name = "phone", length = 30)
    private String phone;

    @Size(max = 300)
    @Column(name = "address", length = 300)
    private String address;

    @Size(max = 300)
    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;
}
