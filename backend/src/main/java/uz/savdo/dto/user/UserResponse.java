package uz.savdo.dto.user;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.User;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String fullName;
    private String role;
    private Long branchId;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private BigDecimal baseSalary;

    public static UserResponse from(User u) {
        return UserResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .fullName(u.getFullName())
                .role(u.getRole().name())
                .branchId(u.getBranchId())
                .isActive(u.getIsActive())
                .createdAt(u.getCreatedAt())
                .baseSalary(u.getBaseSalary())
                .build();
    }
}
