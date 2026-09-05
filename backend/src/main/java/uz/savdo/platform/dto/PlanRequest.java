package uz.savdo.platform.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/** POST/PUT /api/v1/platform/plans so'rovi — reja yaratish va tahrirlash uchun bitta DTO. */
@Data
public class PlanRequest {
    @NotBlank(message = "Reja nomi kiritilishi shart")
    private String name;

    @NotNull(message = "Oylik narx kiritilishi shart")
    @DecimalMin(value = "0", message = "Narx manfiy bo'lishi mumkin emas")
    private BigDecimal priceMonthly;

    /** Null bo'lsa — cheksiz (limit yo'q). */
    @Min(value = 0, message = "Filiallar soni manfiy bo'lishi mumkin emas")
    private Integer maxBranches;

    /** Null bo'lsa — cheksiz (limit yo'q). */
    @Min(value = 0, message = "Xodimlar soni manfiy bo'lishi mumkin emas")
    private Integer maxUsers;

    /** Null bo'lsa — cheksiz (limit yo'q). */
    @Min(value = 0, message = "Mahsulotlar soni manfiy bo'lishi mumkin emas")
    private Integer maxProducts;

    @Size(max = 500, message = "Tavsif 500 belgidan oshmasligi kerak")
    private String description;
}
