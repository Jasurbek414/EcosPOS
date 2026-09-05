package uz.savdo.dto.supplier;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SupplierRequest {
    @NotBlank(message = "Yetkazib beruvchi nomi kiritilishi shart")
    private String name;

    private String phone;

    private String address;

    private String contactPerson;

    @Email(message = "Email formati noto'g'ri")
    private String email;
}
