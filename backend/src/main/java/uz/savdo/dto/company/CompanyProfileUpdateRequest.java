package uz.savdo.dto.company;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * PUT /api/v1/company so'rovi — faqat kompaniya nomi (display name) o'zgartiriladi.
 * slug (login uchun ishlatiladigan kompaniya kodi) ATAYLAB bu yerdan o'zgartirilmaydi —
 * uni o'zgartirish login oqimini buzadi, kerak bo'lsa faqat superadmin tomonidan.
 */
@Data
public class CompanyProfileUpdateRequest {

    @NotBlank(message = "Kompaniya nomi kiritilishi shart")
    private String name;
}
