package uz.savdo.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PlatformLoginRequest {
    @NotBlank(message = "Username kiritilishi shart")
    private String username;

    @NotBlank(message = "Parol kiritilishi shart")
    private String password;
}
