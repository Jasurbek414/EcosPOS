package uz.savdo.dto.expensecategory;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ExpenseCategoryRequest {

    @NotBlank(message = "Kod kiritilishi shart")
    @Pattern(regexp = "^[A-Za-z0-9_]{1,30}$", message = "Kod faqat lotin harflari, raqam va pastki chiziqdan iborat bo'lishi kerak")
    private String code;

    @NotBlank(message = "Nomi kiritilishi shart")
    @Size(max = 50, message = "Nomi 50 belgidan oshmasligi kerak")
    private String name;
}
