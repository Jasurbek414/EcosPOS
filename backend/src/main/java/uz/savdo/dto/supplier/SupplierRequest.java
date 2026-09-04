package uz.savdo.dto.supplier;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SupplierRequest {
    @NotBlank(message = "Yetkazib beruvchi nomi kiritilishi shart")
    private String name;

    private String phone;

    private String address;

    private String contactPerson;
}
