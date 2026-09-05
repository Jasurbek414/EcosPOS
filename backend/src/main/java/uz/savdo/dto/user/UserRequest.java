package uz.savdo.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;
import uz.savdo.enums.UserRole;

import java.math.BigDecimal;

@Data
public class UserRequest {
    @NotBlank(message = "Username kiritilishi shart")
    private String username;

    @NotBlank(message = "Parol kiritilishi shart")
    private String password;

    @NotBlank(message = "To'liq ism kiritilishi shart")
    private String fullName;

    @NotNull(message = "Rol kiritilishi shart")
    private UserRole role;

    /** MANAGER/CASHIER uchun majburiy, OWNER uchun bo'sh qoldirilishi kerak. */
    private Long branchId;

    /** Ixtiyoriy — HR/payroll modulida ma'lumot maqsadida ko'rsatiladi. */
    @PositiveOrZero(message = "Bazaviy maosh manfiy bo'lishi mumkin emas")
    private BigDecimal baseSalary;
}
