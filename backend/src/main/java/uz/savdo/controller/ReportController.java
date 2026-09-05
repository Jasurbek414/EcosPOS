package uz.savdo.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uz.savdo.dto.report.DashboardResponse;
import uz.savdo.dto.report.ProfitResponse;
import uz.savdo.dto.report.SalesSummaryPointResponse;
import uz.savdo.dto.report.TopProductResponse;
import uz.savdo.entity.Product;
import uz.savdo.entity.Sale;
import uz.savdo.entity.SaleItem;
import uz.savdo.repository.ProductRepository;
import uz.savdo.security.CurrentUserService;
import uz.savdo.service.ReportService;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Sotuv/foyda hisobotlari va analitika — faqat OWNER/MANAGER uchun (assertCanViewReports,
 * qarang: CurrentUserService). Filial scoping SaleController bilan bir xil, ancha
 * moslashuvchan naqsh: branchId ko'rsatilmasa OWNER uchun bu XATO EMAS — barcha
 * filiallari bo'yicha umumiy ko'rinish odatiy holat (masalan dashboard uchun).
 * Barcha og'ir agregatsiya ReportService'ga o'tkazilgan — bu yerda faqat har bir
 * endpoint'ga xos shakllantirish (Java stream orqali guruhlash/saralash).
 */
@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private final CurrentUserService currentUserService;
    private final ReportService reportService;
    private final ProductRepository productRepository;

    @GetMapping("/dashboard")
    public DashboardResponse dashboard(@RequestParam(required = false) Long branchId) {
        currentUserService.assertCanViewReports();
        List<Long> branchIds = reportService.resolveBranchIds(branchId);

        LocalDate today = LocalDate.now();
        LocalDate monthStart = today.withDayOfMonth(1);

        List<Sale> monthSales = reportService.fetchSales(branchIds, monthStart, today);
        List<Sale> todaySales = monthSales.stream()
                .filter(s -> s.getCreatedAt().toLocalDate().isEqual(today))
                .toList();

        List<SaleItem> monthItems = reportService.fetchItems(monthSales);
        List<SaleItem> todayItems = reportService.fetchItems(todaySales);

        return DashboardResponse.builder()
                .todayRevenue(ReportService.sumRevenue(todaySales))
                .todayProfit(ReportService.sumProfit(todayItems))
                .todaySalesCount(todaySales.size())
                .monthRevenue(ReportService.sumRevenue(monthSales))
                .monthProfit(ReportService.sumProfit(monthItems))
                .lowStockCount(reportService.countLowStock(branchIds))
                .build();
    }

    @GetMapping("/sales-summary")
    public List<SalesSummaryPointResponse> salesSummary(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "day") String groupBy) {
        currentUserService.assertCanViewReports();
        List<Long> branchIds = reportService.resolveBranchIds(branchId);

        LocalDate resolvedTo = to != null ? to : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);

        List<Sale> sales = reportService.fetchSales(branchIds, resolvedFrom, resolvedTo);
        Map<Long, Sale> salesById = sales.stream().collect(Collectors.toMap(Sale::getId, Function.identity()));
        List<SaleItem> items = reportService.fetchItems(sales);

        TreeMap<String, PeriodAccumulator> byPeriod = new TreeMap<>();
        for (Sale sale : sales) {
            String period = reportService.periodKey(sale.getCreatedAt().toLocalDate(), groupBy);
            PeriodAccumulator acc = byPeriod.computeIfAbsent(period, k -> new PeriodAccumulator());
            acc.revenue = acc.revenue.add(sale.getTotalAmount());
            acc.saleCount++;
        }
        for (SaleItem item : items) {
            Sale sale = salesById.get(item.getSaleId());
            if (sale == null) {
                continue;
            }
            String period = reportService.periodKey(sale.getCreatedAt().toLocalDate(), groupBy);
            byPeriod.get(period).profit = byPeriod.get(period).profit.add(ReportService.itemProfit(item));
        }

        return byPeriod.entrySet().stream()
                .map(e -> SalesSummaryPointResponse.builder()
                        .period(e.getKey())
                        .revenue(e.getValue().revenue)
                        .profit(e.getValue().profit)
                        .saleCount(e.getValue().saleCount)
                        .build())
                .toList();
    }

    @GetMapping("/top-products")
    public List<TopProductResponse> topProducts(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "10") int limit) {
        currentUserService.assertCanViewReports();
        List<Long> branchIds = reportService.resolveBranchIds(branchId);

        LocalDate resolvedTo = to != null ? to : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);
        int resolvedLimit = Math.min(Math.max(limit, 1), 50);

        List<Sale> sales = reportService.fetchSales(branchIds, resolvedFrom, resolvedTo);
        List<SaleItem> items = reportService.fetchItems(sales);

        Map<Long, ProductAccumulator> byProduct = new HashMap<>();
        for (SaleItem item : items) {
            ProductAccumulator acc = byProduct.computeIfAbsent(item.getProductId(), k -> new ProductAccumulator());
            acc.quantitySold = acc.quantitySold.add(item.getQuantity());
            acc.revenue = acc.revenue.add(item.getSubtotal());
            acc.profit = acc.profit.add(ReportService.itemProfit(item));
        }

        Map<Long, Product> productsById = productRepository.findAllById(byProduct.keySet()).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        return byProduct.entrySet().stream()
                .filter(e -> productsById.containsKey(e.getKey()))
                .sorted((a, b) -> b.getValue().revenue.compareTo(a.getValue().revenue))
                .limit(resolvedLimit)
                .map(e -> {
                    Product product = productsById.get(e.getKey());
                    ProductAccumulator acc = e.getValue();
                    return TopProductResponse.builder()
                            .productId(product.getId())
                            .productName(product.getName())
                            .unit(product.getUnit())
                            .quantitySold(acc.quantitySold)
                            .revenue(acc.revenue)
                            .profit(acc.profit)
                            .build();
                })
                .toList();
    }

    @GetMapping("/profit")
    public ProfitResponse profit(
            @RequestParam(required = false) Long branchId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        currentUserService.assertCanViewReports();
        List<Long> branchIds = reportService.resolveBranchIds(branchId);

        LocalDate resolvedTo = to != null ? to : LocalDate.now();
        LocalDate resolvedFrom = from != null ? from : resolvedTo.minusDays(29);

        List<Sale> sales = reportService.fetchSales(branchIds, resolvedFrom, resolvedTo);
        List<SaleItem> items = reportService.fetchItems(sales);

        BigDecimal totalRevenue = ReportService.sumRevenue(sales);
        BigDecimal totalCost = ReportService.sumCost(items);
        BigDecimal totalProfit = ReportService.sumProfit(items);
        BigDecimal profitMarginPercent = totalRevenue.compareTo(BigDecimal.ZERO) == 0
                ? BigDecimal.ZERO
                : totalProfit.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 2, RoundingMode.HALF_UP);

        return ProfitResponse.builder()
                .totalRevenue(totalRevenue)
                .totalCost(totalCost)
                .totalProfit(totalProfit)
                .profitMarginPercent(profitMarginPercent)
                .build();
    }

    private static class PeriodAccumulator {
        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal profit = BigDecimal.ZERO;
        int saleCount = 0;
    }

    private static class ProductAccumulator {
        BigDecimal quantitySold = BigDecimal.ZERO;
        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal profit = BigDecimal.ZERO;
    }
}
