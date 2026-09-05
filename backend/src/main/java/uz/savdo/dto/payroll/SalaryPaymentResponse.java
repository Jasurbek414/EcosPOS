package uz.savdo.dto.payroll;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.SalaryPayment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class SalaryPaymentResponse {
    private Long id;
    private Long userId;
    private String userFullName;
    private Long branchId;
    private BigDecimal amount;
    private String periodMonth;
    private LocalDate paymentDate;
    private String note;
    private LocalDateTime createdAt;

    public static SalaryPaymentResponse from(SalaryPayment payment, String userFullName) {
        return SalaryPaymentResponse.builder()
                .id(payment.getId())
                .userId(payment.getUserId())
                .userFullName(userFullName)
                .branchId(payment.getBranchId())
                .amount(payment.getAmount())
                .periodMonth(payment.getPeriodMonth())
                .paymentDate(payment.getPaymentDate())
                .note(payment.getNote())
                .createdAt(payment.getCreatedAt())
                .build();
    }
}
