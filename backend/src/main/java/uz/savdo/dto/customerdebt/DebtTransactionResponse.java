package uz.savdo.dto.customerdebt;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.CustomerDebtTransaction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class DebtTransactionResponse {
    private Long id;
    private Long customerId;
    private String customerFullName;
    private Long branchId;
    private String type;
    private BigDecimal amount;
    private LocalDate transactionDate;
    private Long relatedSaleId;
    private String note;
    private LocalDateTime createdAt;

    public static DebtTransactionResponse from(CustomerDebtTransaction tx, String customerFullName) {
        return DebtTransactionResponse.builder()
                .id(tx.getId())
                .customerId(tx.getCustomerId())
                .customerFullName(customerFullName)
                .branchId(tx.getBranchId())
                .type(tx.getType().name())
                .amount(tx.getAmount())
                .transactionDate(tx.getTransactionDate())
                .relatedSaleId(tx.getRelatedSaleId())
                .note(tx.getNote())
                .createdAt(tx.getCreatedAt())
                .build();
    }
}
