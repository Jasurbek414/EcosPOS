package uz.savdo.dto.report;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

/** GET /reports/dashboard javobi — asosiy ilova dashboard'i uchun qisqacha ko'rsatkichlar. */
@Data
@Builder
public class DashboardResponse {
    private BigDecimal todayRevenue;
    private BigDecimal todayProfit;
    private int todaySalesCount;
    private BigDecimal monthRevenue;
    private BigDecimal monthProfit;
    private int lowStockCount;
}
