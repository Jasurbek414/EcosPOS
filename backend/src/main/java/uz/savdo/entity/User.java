package uz.savdo.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.savdo.enums.UserRole;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Foydalanuvchi entity (tenant bazasi ichida).
 * branchId — null bo'lsa kompaniya bo'ylab (filiallarga bog'liq bo'lmagan) kirish,
 * bu FAQAT OWNER uchun to'g'ri; MANAGER/CASHIER uchun har doim muayyan filial talab
 * qilinadi (CurrentUserService shu qoidani amalga oshiradi).
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User extends BaseEntity {

    @Column(name = "username", nullable = false, unique = true, length = 50)
    private String username;

    @Column(name = "password", nullable = false)
    private String password;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private UserRole role;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "failed_login_attempts", nullable = false)
    @Builder.Default
    private Integer failedLoginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    /** Xodimning oylik bazaviy maoshi — HR/payroll moduli uchun ma'lumot maqsadida, haqiqiy
     * to'lov summasini majburlamaydi (haqiqiy to'lov SalaryPaymentController orqali erkin kiritiladi). */
    @Column(name = "base_salary", precision = 14, scale = 2)
    private BigDecimal baseSalary;
}
