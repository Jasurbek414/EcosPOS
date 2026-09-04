package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Kompaniya OWNER (admin) paroli superadmin tomonidan tiklanganda qaytariladi.
 * adminPassword faqat shu javobda ko'rinadi — hech qayerda saqlanmaydi/log qilinmaydi.
 */
@Data
@Builder
public class AdminPasswordResetResponse {
    private String adminUsername;
    private String adminPassword;
}
