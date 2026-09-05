package uz.savdo.dto.advance;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.EmployeeAdvanceTransaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class AdvanceTransactionResponse {
    private Long id;
    private Long userId;
    private String userFullName;
    private Long branchId;
    private String type;
    private BigDecimal amount;
    private LocalDate transactionDate;
    private String note;
    private LocalDateTime createdAt;

    public static AdvanceTransactionResponse from(EmployeeAdvanceTransaction tx, String userFullName) {
        return AdvanceTransactionResponse.builder()
                .id(tx.getId())
                .userId(tx.getUserId())
                .userFullName(userFullName)
                .branchId(tx.getBranchId())
                .type(tx.getType().name())
                .amount(tx.getAmount())
                .transactionDate(tx.getTransactionDate())
                .note(tx.getNote())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
