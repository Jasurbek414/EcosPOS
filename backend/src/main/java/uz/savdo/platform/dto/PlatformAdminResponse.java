package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.PlatformUser;

import java.time.LocalDateTime;

/**
 * GET /api/v1/platform/admins ro'yxatidagi bitta superadmin — parol hash'i hech qachon
 * qaytarilmaydi.
 */
@Data
@Builder
public class PlatformAdminResponse {
    private Long id;
    private String username;
    private String fullName;
    private Boolean isActive;
    private LocalDateTime createdAt;

    public static PlatformAdminResponse from(PlatformUser u) {
        return PlatformAdminResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .fullName(u.getFullName())
                .isActive(u.getIsActive())
                .createdAt(u.getCreatedAt())
                .build();
    }
}
