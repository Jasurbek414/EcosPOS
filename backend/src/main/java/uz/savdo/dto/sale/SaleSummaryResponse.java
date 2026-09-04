package uz.savdo.dto.sale;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Sale;
import uz.savdo.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Ro'yxat javobi (GET /sales) — item detallarsiz, faqat qisqacha ma'lumot. */
@Data
@Builder
public class SaleSummaryResponse {
    private Long id;
    private Long branchId;
    private LocalDateTime createdAt;
    private String cashierName;
    private BigDecimal totalAmount;
    private PaymentMethod paymentMethod;
    private int itemCount;

    public static SaleSummaryResponse from(Sale sale, String cashierName, int itemCount) {
        return SaleSummaryResponse.builder()
                .id(sale.getId())
                .branchId(sale.getBranchId())
                .createdAt(sale.getCreatedAt())
                .cashierName(cashierName)
                .totalAmount(sale.getTotalAmount())
                .paymentMethod(sale.getPaymentMethod())
                .itemCount(itemCount)
                .build();
    }
}
