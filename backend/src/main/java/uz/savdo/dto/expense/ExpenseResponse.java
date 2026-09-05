package uz.savdo.dto.expense;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.Expense;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class ExpenseResponse {
    private Long id;
    private Long branchId;
    /** branchId null bo'lsa "Umumiy" (kompaniya bo'ylab xarajat). */
    private String branchName;
    private String category;
    private BigDecimal amount;
    private String description;
    private LocalDate expenseDate;
    private Long createdByUserId;
    private LocalDateTime createdAt;

    public static ExpenseResponse from(Expense expense, String branchName) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .branchId(expense.getBranchId())
                .branchName(expense.getBranchId() == null ? "Umumiy" : branchName)
                .category(expense.getCategory().name())
                .amount(expense.getAmount())
                .description(expense.getDescription())
                .expenseDate(expense.getExpenseDate())
                .createdByUserId(expense.getCreatedByUserId())
                .createdAt(expense.getCreatedAt())
                .build();
    }
}
