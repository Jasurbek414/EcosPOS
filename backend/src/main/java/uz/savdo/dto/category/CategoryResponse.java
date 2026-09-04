package uz.savdo.dto.category;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Category;

import java.time.LocalDateTime;

@Data
@Builder
public class CategoryResponse {
    private Long id;
    private String name;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static CategoryResponse from(Category c) {
        return CategoryResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .isActive(c.getIsActive())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
