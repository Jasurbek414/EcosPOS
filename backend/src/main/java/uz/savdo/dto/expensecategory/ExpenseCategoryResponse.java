package uz.savdo.dto.expensecategory;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.ExpenseCategory;

import java.time.LocalDateTime;

@Data
@Builder
public class ExpenseCategoryResponse {
    private Long id;
    private String code;
    private String name;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static ExpenseCategoryResponse from(ExpenseCategory c) {
        return ExpenseCategoryResponse.builder()
                .id(c.getId())
                .code(c.getCode())
                .name(c.getName())
                .isActive(c.getIsActive())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
