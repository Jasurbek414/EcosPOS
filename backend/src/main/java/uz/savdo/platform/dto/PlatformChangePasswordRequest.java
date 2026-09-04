package uz.savdo.platform.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * POST /api/v1/platform/profile/change-password so'rovi. Minimal uzunlik (4)
 * tenant-side uz.savdo.dto.profile.ChangePasswordRequest bilan bir xil.
 */
@Data
public class PlatformChangePasswordRequest {

    @NotBlank(message = "Joriy parol kiritilishi shart")
    private String currentPassword;

    @NotBlank(message = "Yangi parol kiritilishi shart")
    @Size(min = 4, message = "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak")
    private String newPassword;
}
