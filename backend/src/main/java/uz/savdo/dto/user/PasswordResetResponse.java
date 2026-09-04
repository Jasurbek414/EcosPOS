package uz.savdo.dto.user;

import lombok.Builder;
import lombok.Data;

/**
 * POST /{id}/reset-password javobi. newPassword FAQAT shu javobda ko'rinadi —
 * hech qayerda saqlanmaydi/log qilinmaydi (kompaniya yaratishdagi bir martalik
 * admin paroli bilan bir xil "show once" naqshi).
 */
@Data
@Builder
public class PasswordResetResponse {
    private String username;
    private String newPassword;
}
