package uz.savdo.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * PUT /api/v1/platform/profile so'rovi — superadmin FAQAT o'z to'liq ismini
 * o'zgartira oladi. username bu yerdan o'zgartirilmaydi.
 */
@Data
public class PlatformProfileUpdateRequest {

    @NotBlank(message = "To'liq ism kiritilishi shart")
    private String fullName;
}
