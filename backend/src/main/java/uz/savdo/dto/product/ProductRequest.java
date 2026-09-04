package uz.savdo.dto.product;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.savdo.enums.Unit;

import java.math.BigDecimal;

@Data
public class ProductRequest {

    private Long categoryId;

    @NotBlank(message = "Mahsulot nomi kiritilishi shart")
    private String name;

    /** Bo'sh qoldirilishi mumkin, lekin kiritilsa boshqa mahsulot bilan takrorlanmasligi kerak. */
    private String barcode;

    @NotNull(message = "O'lchov birligi kiritilishi shart")
    private Unit unit;

    @NotNull(message = "Tannarx kiritilishi shart")
    @DecimalMin(value = "0", message = "Tannarx manfiy bo'lishi mumkin emas")
    private BigDecimal costPrice;

    @NotNull(message = "Sotuv narxi kiritilishi shart")
    @DecimalMin(value = "0", message = "Sotuv narxi manfiy bo'lishi mumkin emas")
    private BigDecimal salePrice;

    private BigDecimal minStockLevel;

    private String imageUrl;
}
