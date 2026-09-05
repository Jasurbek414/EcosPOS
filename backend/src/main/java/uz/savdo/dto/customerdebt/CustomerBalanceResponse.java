package uz.savdo.dto.customerdebt;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/** Bitta mijozning joriy qarzi: SUM(CREDIT_SALE) - SUM(PAYMENT) - SUM(WRITE_OFF). */
@Data
@Builder
public class CustomerBalanceResponse {
    private Long customerId;
    private String customerFullName;
    private BigDecimal balance;
}
