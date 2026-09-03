package uz.savdo.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Username kiritilishi shart")
    private String username;

    @NotBlank(message = "Parol kiritilishi shart")
    private String password;

    @NotBlank(message = "Kompaniya kodi kiritilishi shart")
    private String companyCode;
}
