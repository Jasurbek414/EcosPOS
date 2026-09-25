package uz.savdo.dto.customer;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;

/** POST/PUT /api/v1/customers so'rovi. */
@Data
public class CustomerRequest {

    @NotBlank(message = "Mijoz ismi kiritilishi shart")
    @Size(max = 150, message = "Mijoz ismi 150 belgidan oshmasligi kerak")
    private String fullName;

    @Size(max = 30, message = "Telefon raqami 30 belgidan oshmasligi kerak")
    private String phone;

    @Size(max = 300, message = "Manzil 300 belgidan oshmasligi kerak")
    private String address;

    @Size(max = 300, message = "Izoh 300 belgidan oshmasligi kerak")
    private String note;

    /** Nasiya chegarasi. Bo'sh qoldirilsa chegara qo'yilmaydi. */
    @DecimalMin(value = "0.0", message = "Nasiya chegarasi manfiy bo'lishi mumkin emas")
    private BigDecimal creditLimit;
}
