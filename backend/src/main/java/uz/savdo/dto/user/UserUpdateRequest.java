package uz.savdo.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;
import uz.savdo.enums.UserRole;

import java.math.BigDecimal;

/**
 * PUT /api/v1/users/{id} uchun so'rov. Username va parol shu endpoint orqali
 * O'ZGARTIRILMAYDI — username noyoblik bilan chalkash, parol esa alohida
 * POST /{id}/reset-password endpoint orqali almashtiriladi (shunda yangi parol
 * bir martalik javobda ko'rsatiladi).
 */
@Data
public class UserUpdateRequest {

    @NotBlank(message = "To'liq ism kiritilishi shart")
    private String fullName;

    @NotNull(message = "Rol kiritilishi shart")
    private UserRole role;

    /** MANAGER/CASHIER uchun majburiy, OWNER uchun bo'sh qoldirilishi kerak. */
    private Long branchId;

    @NotNull(message = "isActive kiritilishi shart")
    private Boolean isActive;

    /** Ixtiyoriy — HR/payroll modulida ma'lumot maqsadida ko'rsatiladi. */
    @PositiveOrZero(message = "Bazaviy maosh manfiy bo'lishi mumkin emas")
    private BigDecimal baseSalary;
}
