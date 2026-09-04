package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Yaratilgan superadmin hisobi + bir martalik tasodifiy parol. password faqat shu
 * javobda qaytariladi — hech qayerda saqlanmaydi, log qilinmaydi.
 */
@Data
@Builder
public class CreatePlatformAdminResponse {
    private Long id;
    private String username;
    private String fullName;
    private String password;
}
