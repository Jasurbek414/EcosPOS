package uz.savdo.dto.profile;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.User;

/**
 * GET/PUT /api/v1/profile javobi — joriy foydalanuvchining o'zi haqidagi ma'lumotlari.
 * UserResponse'dan farqi: bu boshqa xodimlarni boshqarish uchun emas, foydalanuvchi
 * o'zini ko'rishi uchun (branchName bilan birga, UI'da qulay ko'rsatish uchun).
 */
@Data
@Builder
public class ProfileResponse {
    private Long id;
    private String username;
    private String fullName;
    private String role;
    private Long branchId;
    private String branchName;

    public static ProfileResponse from(User u, String branchName) {
        return ProfileResponse.builder()
                .id(u.getId())
                .username(u.getUsername())
                .fullName(u.getFullName())
                .role(u.getRole().name())
                .branchId(u.getBranchId())
                .branchName(branchName)
                .build();
    }
}
