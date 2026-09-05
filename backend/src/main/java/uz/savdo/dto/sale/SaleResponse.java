package uz.savdo.dto.sale;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Sale;
import uz.savdo.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/** To'liq javob — chek ko'rinishi (POST /sales va GET /sales/{id}). */
@Data
@Builder
public class SaleResponse {
    private Long id;
    private Long branchId;
    private Long cashShiftId;
    private Long cashierId;
    private String cashierName;
    private BigDecimal totalAmount;
    private PaymentMethod paymentMethod;
    private BigDecimal amountPaid;
    private BigDecimal changeAmount;
    private BigDecimal cardAmount;
    private Long customerId;
    private String customerName;
    private LocalDateTime createdAt;
    private List<SaleItemResponse> items;

    public static SaleResponse from(Sale sale, String cashierName, List<SaleItemResponse> items) {
        return from(sale, cashierName, items, null);
    }

    public static SaleResponse from(Sale sale, String cashierName, List<SaleItemResponse> items, String customerName) {
        return SaleResponse.builder()
                .id(sale.getId())
                .branchId(sale.getBranchId())
                .cashShiftId(sale.getCashShiftId())
                .cashierId(sale.getCashierId())
                .cashierName(cashierName)
                .totalAmount(sale.getTotalAmount())
                .paymentMethod(sale.getPaymentMethod())
                .amountPaid(sale.getAmountPaid())
                .changeAmount(sale.getChangeAmount())
                .cardAmount(sale.getCardAmount())
                .customerId(sale.getCustomerId())
                .customerName(customerName)
                .createdAt(sale.getCreatedAt())
                .items(items)
                .build();
    }
}
