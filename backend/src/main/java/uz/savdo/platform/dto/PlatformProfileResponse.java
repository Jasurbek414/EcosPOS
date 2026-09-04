package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;
import uz.savdo.platform.entity.PlatformUser;

import java.time.LocalDateTime;

/**
 * GET/PUT /api/v1/platform/profile javobi — joriy superadminning o'zi haqidagi
 * ma'lumotlari. uz.savdo.dto.profile.ProfileResponse'ning platform (superadmin)
 * tomondagi ekvivalenti.
 */
@Data
@Builder
public class PlatformProfileResponse {
    private Long id;
    private String username;
    private String fullName;
    private LocalDateTime createdAt;

    public static PlatformProfileResponse from(PlatformUser u) {
        return PlatformProfileResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .fullName(u.getFullName())
                .createdAt(u.getCreatedAt())
                .build();
    }
}
