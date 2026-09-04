package uz.savdo.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreatePlatformAdminRequest {
    @NotBlank(message = "Username kiritilishi shart")
    private String username;

    @NotBlank(message = "To'liq ism kiritilishi shart")
    private String fullName;
}
