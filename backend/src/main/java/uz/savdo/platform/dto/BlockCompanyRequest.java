package uz.savdo.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BlockCompanyRequest {
    @NotBlank(message = "Bloklash sababi kiritilishi shart")
    private String reason;
}
