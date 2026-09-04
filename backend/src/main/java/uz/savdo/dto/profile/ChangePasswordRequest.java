package uz.savdo.dto.profile;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * POST /api/v1/profile/change-password so'rovi. Minimal uzunlik (4) frontend'dagi
 * xodim yaratish formasi bilan bir xil (StaffListPage.jsx: register('password', { minLength: 4 })).
 */
@Data
public class ChangePasswordRequest {

    @NotBlank(message = "Joriy parol kiritilishi shart")
    private String currentPassword;

    @NotBlank(message = "Yangi parol kiritilishi shart")
    @Size(min = 4, message = "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak")
    private String newPassword;
}
