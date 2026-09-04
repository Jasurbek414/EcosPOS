package uz.savdo.dto.category;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CategoryRequest {
    @NotBlank(message = "Kategoriya nomi kiritilishi shart")
    private String name;
}
