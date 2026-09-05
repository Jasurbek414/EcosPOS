package uz.savdo.dto.advance;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/** Bitta xodimning joriy avans qarzi: SUM(ADVANCE_GIVEN) - SUM(ADVANCE_REPAYMENT). */
@Data
@Builder
public class EmployeeAdvanceBalanceResponse {
    private Long userId;
    private String userFullName;
    private Long branchId;
    private BigDecimal balance;
}
