package uz.savdo.dto.unit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MeasurementUnitRequest {

    @NotBlank(message = "Kod kiritilishi shart")
    @Pattern(regexp = "^[A-Za-z0-9_]{1,20}$", message = "Kod faqat lotin harflari, raqam va pastki chiziqdan iborat bo'lishi kerak")
    private String code;

    @NotBlank(message = "Nomi kiritilishi shart")
    @Size(max = 50, message = "Nomi 50 belgidan oshmasligi kerak")
    private String name;
}
