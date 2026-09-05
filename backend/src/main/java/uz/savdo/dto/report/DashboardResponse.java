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
    /** Joriy oy uchun xarajatlar + to'langan ish haqi yig'indisi (qarang: ReportService#sumExpenses). */
    private BigDecimal monthExpenses;
    /** monthProfit - monthExpenses. */
    private BigDecimal monthNetProfit;
}
