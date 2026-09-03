package uz.savdo.platform.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Yaratilgan kompaniya + birinchi OWNER foydalanuvchisining bir martalik paroli.
 * adminPassword faqat shu javobda qaytariladi — hech qayerda saqlanmaydi, log qilinmaydi.
 */
@Data
@Builder
public class CreateCompanyResponse {
    private Long id;
    private String slug;
    private String name;
    private String status;
    private String adminUsername;
    private String adminPassword;
}
