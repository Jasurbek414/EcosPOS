package uz.savdo.dto.branch;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class BranchRequest {
    @NotBlank(message = "Filial nomi kiritilishi shart")
    private String name;

    private String address;
}
