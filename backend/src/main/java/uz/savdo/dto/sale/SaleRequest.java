package uz.savdo.dto.sale;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.savdo.enums.PaymentMethod;

import java.math.BigDecimal;
import java.util.List;

@Data
public class SaleRequest {

    @NotEmpty(message = "Kamida bitta mahsulot qatori bo'lishi kerak")
    @Valid
    private List<SaleItemRequest> items;

    @NotNull(message = "To'lov usuli (paymentMethod) kiritilishi shart")
    private PaymentMethod paymentMethod;

    /**
     * CARD uchun server tomonida e'tiborga olinmaydi (totalAmount bilan almashtiriladi).
     * MIXED uchun bu — mijoz bergan NAQD summa (cashDue'dan kam bo'lmasligi kerak).
     */
    @NotNull(message = "To'langan summa (amountPaid) kiritilishi shart")
    @DecimalMin(value = "0", message = "To'langan summa manfiy bo'lishi mumkin emas")
    private BigDecimal amountPaid;

    /**
     * Faqat paymentMethod == MIXED bo'lganda talab qilinadi va ishlatiladi — sotuvning
     * karta bilan qoplanadigan qismi. Boshqa usullarda e'tiborga olinmaydi (shu sababli
     * @NotNull emas — SaleService shartli ravishda tekshiradi).
     */
    @DecimalMin(value = "0", inclusive = false, message = "Karta summasi musbat bo'lishi kerak")
    private BigDecimal cardAmount;
}
