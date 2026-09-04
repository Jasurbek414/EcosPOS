package uz.savdo.platform.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * PUT /api/v1/platform/companies/{id} so'rovi — superadmin tomonidan qo'llab-quvvatlash
 * maqsadida kompaniya nomi/rejasini to'g'ridan-to'g'ri tahrirlash. slug (login uchun)
 * bu yerdan o'zgartirilmaydi.
 */
@Data
public class UpdateCompanyRequest {
    @NotBlank(message = "Kompaniya nomi kiritilishi shart")
    private String name;

    /** Bo'sh/null bo'lishi mumkin — bu tizimda faqat yorliq, billing mantig'i yo'q. */
    private String plan;
}
