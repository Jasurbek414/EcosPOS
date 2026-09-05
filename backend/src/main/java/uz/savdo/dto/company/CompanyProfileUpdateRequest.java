package uz.savdo.dto.company;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * PUT /api/v1/company so'rovi — kompaniya nomi va chek/kvitansiyalarda ko'rsatiladigan
 * biznes ma'lumotlari (manzil, telefon, logo URL) o'zgartiriladi. slug (login uchun
 * ishlatiladigan kompaniya kodi) ATAYLAB bu yerdan o'zgartirilmaydi — uni o'zgartirish
 * login oqimini buzadi, kerak bo'lsa faqat superadmin tomonidan.
 */
@Data
public class CompanyProfileUpdateRequest {

    @NotBlank(message = "Kompaniya nomi kiritilishi shart")
    private String name;

    @Size(max = 300, message = "Manzil 300 belgidan oshmasligi kerak")
    private String address;

    @Size(max = 30, message = "Telefon raqami 30 belgidan oshmasligi kerak")
    private String phone;

    /** Fayl o'zi emas — POST /api/v1/files/upload orqali yuklangan faylning URL'i. */
    @Size(max = 500, message = "Logo URL 500 belgidan oshmasligi kerak")
    private String logoUrl;
}
