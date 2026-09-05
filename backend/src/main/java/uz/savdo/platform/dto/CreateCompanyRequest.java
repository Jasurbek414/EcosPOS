package uz.savdo.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCompanyRequest {
    @NotBlank(message = "Kompaniya nomi kiritilishi shart")
    private String name;

    @NotBlank(message = "Kompaniya kodi (slug) kiritilishi shart")
    private String slug;

    /** Ixtiyoriy — bo'sh qoldirilsa kompaniya rejasiz yaratiladi, keyin PATCH /{id}/plan orqali biriktiriladi. */
    private Long planId;

    /** Bo'sh qoldirilsa "admin" ishlatiladi. */
    private String adminUsername;

    private String adminFullName;
}
