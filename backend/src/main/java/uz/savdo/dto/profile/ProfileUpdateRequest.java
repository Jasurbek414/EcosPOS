package uz.savdo.dto.profile;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * PUT /api/v1/profile so'rovi — foydalanuvchi FAQAT o'z to'liq ismini o'zgartira oladi.
 * username/role/branchId bu yerdan o'zgartirilmaydi — ular OWNER-only
 * uz.savdo.controller.UserController orqali boshqariladi.
 */
@Data
public class ProfileUpdateRequest {

    @NotBlank(message = "To'liq ism kiritilishi shart")
    private String fullName;
}
