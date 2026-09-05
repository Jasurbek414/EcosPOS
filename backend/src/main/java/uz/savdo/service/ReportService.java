package uz.savdo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import uz.savdo.entity.Branch;
import uz.savdo.entity.Expense;
import uz.savdo.entity.Product;
import uz.savdo.entity.Sale;
import uz.savdo.entity.SaleItem;
import uz.savdo.entity.SalaryPayment;
import uz.savdo.entity.StockLevel;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.ExpenseRepository;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.SalaryPaymentRepository;
import uz.savdo.repository.SaleItemRepository;
import uz.savdo.repository.SaleRepository;
import uz.savdo.repository.StockLevelRepository;
import uz.savdo.security.CurrentUserService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * ReportController'ning barcha endpoint'lari bir xil naqshga amal qiladi: filial(lar)
 * scoping'ini hal qilish -> sana oralig'idagi Sale/SaleItem qatorlarini oddiy repository
 * metodlari bilan olish -> Java stream'larida agregatsiya. Bu klass shu umumiy qadamlarni
 * (filial ruxsatini hal qilish, sotuv/qator olish, foyda/tannarx hisoblash, kam qolgan
 * mahsulotlarni sanash) bitta joyda ushlab turadi — ma'lumotlar bazasi darajasidagi
 * GROUP BY ATAYLAB ishlatilmaydi (loyihaning V3/V4 bosqichlarida hujjatlashtirilgan
 * Hibernate/Postgres muammosini chetlab o'tish uchun, StockController/SaleController
 * bilan bir xil uslub).
 */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final DateTimeFormatter DAY_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    private final SaleRepository saleRepository;
    private final SaleItemRepository saleItemRepository;
    private final ProductRepository productRepository;
    private final StockLevelRepository stockLevelRepository;
    private final BranchRepository branchRepository;
    private final ExpenseRepository expenseRepository;
    private final SalaryPaymentRepository salaryPaymentRepository;
    private final CurrentUserService currentUserService;

    /**
     * branchId aniq berilgan bo'lsa — kirish huquqini tekshiradi (MANAGER/CASHIER faqat
     * o'z filialiga, aks holda ForbiddenException) va shu bitta filialni qaytaradi.
     * Berilmagan bo'lsa — allowedBranchIds() natijasini qaytaradi (OWNER uchun
     * {@code null} — "barcha filiallar", bu SaleController'dagi kabi to'liq normal holat).
     */
    public List<Long> resolveBranchIds(Long branchId) {
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            return List.of(branchId);
        }
        return currentUserService.allowedBranchIds();
    }

    /** branchIds bo'yicha ({@code null} = barcha filiallar) berilgan sana oralig'idagi sotuvlar. */
    public List<Sale> fetchSales(List<Long> branchIds, LocalDate from, LocalDate to) {
        List<Sale> sales = branchIds == null
                ? saleRepository.findAllByIsDeletedFalseOrderByIdDesc()
                : branchIds.stream()
                        .flatMap(id -> saleRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(id).stream())
                        .toList();

        return sales.stream()
                .filter(s -> from == null || !s.getCreatedAt().toLocalDate().isBefore(from))
                .filter(s -> to == null || !s.getCreatedAt().toLocalDate().isAfter(to))
                .toList();
    }

    /** Berilgan sotuvlarning barcha qatorlarini bitta so'rovda oladi. */
    public List<SaleItem> fetchItems(List<Sale> sales) {
        List<Long> saleIds = sales.stream().map(Sale::getId).toList();
        if (saleIds.isEmpty()) {
            return List.of();
        }
        return saleItemRepository.findAllBySaleIdInAndIsDeletedFalse(saleIds);
    }

    /** Bitta sotuv qatorining foydasi: (sotuv narxi - o'sha paytdagi tannarx) * miqdor. */
    public static BigDecimal itemProfit(SaleItem item) {
        return item.getUnitPrice().subtract(item.getCostPriceSnapshot()).multiply(item.getQuantity());
    }

    /** Bitta sotuv qatorining umumiy tannarxi (o'sha paytdagi snapshot bo'yicha). */
    public static BigDecimal itemCost(SaleItem item) {
        return item.getCostPriceSnapshot().multiply(item.getQuantity());
    }

    public static BigDecimal sumRevenue(List<Sale> sales) {
        return sales.stream().map(Sale::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public static BigDecimal sumProfit(List<SaleItem> items) {
        return items.stream().map(ReportService::itemProfit).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    public static BigDecimal sumCost(List<SaleItem> items) {
        return items.stream().map(ReportService::itemCost).reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /** groupBy="month" bo'lsa "yyyy-MM", aks holda (standart) "yyyy-MM-dd" formatidagi davr kaliti. */
    public String periodKey(LocalDate date, String groupBy) {
        return "month".equalsIgnoreCase(groupBy) ? date.format(MONTH_FMT) : date.format(DAY_FMT);
    }

    /**
     * StockController#low bilan bir xil "kam qolgan mahsulot" mantig'i (quantity <
     * minStockLevel, minStockLevel belgilangan bo'lsagina), lekin ro'yxat o'rniga faqat
     * son qaytaradi. branchIds {@code null} bo'lsa (OWNER, filial ko'rsatilmagan) —
     * kompaniyaning barcha filiallari bo'yicha hisoblanadi.
     */
    public int countLowStock(List<Long> branchIds) {
        List<Long> resolvedBranchIds = branchIds != null
                ? branchIds
                : branchRepository.findAllByIsDeletedFalseOrderByIdAsc().stream().map(Branch::getId).toList();

        List<StockLevel> stockLevels = resolvedBranchIds.stream()
                .flatMap(id -> stockLevelRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(id).stream())
                .toList();

        List<Long> productIds = stockLevels.stream().map(StockLevel::getProductId).distinct().toList();
        Map<Long, Product> productsById = productRepository.findAllById(productIds).stream()
                .collect(Collectors.toMap(Product::getId, Function.identity()));

        return (int) stockLevels.stream()
                .filter(sl -> productsById.containsKey(sl.getProductId()))
                .filter(sl -> {
                    Product product = productsById.get(sl.getProductId());
                    return product.getMinStockLevel() != null
                            && sl.getQuantity().compareTo(product.getMinStockLevel()) < 0;
                })
                .count();
    }

    /**
     * Berilgan davr uchun umumiy "chiqim" — xarajatlar (Expense) + to'langan ish haqi
     * (SalaryPayment) yig'indisi (ProfitResponse/DashboardResponse'dagi netProfit uchun).
     * branchIds {@code null} bo'lsa (OWNER, filial ko'rsatilmagan) — filialga tegishli VA
     * kompaniya bo'ylab (branchId=null) yozuvlarning barchasi hisoblanadi; aks holda faqat
     * ko'rsatilgan filial(lar)ning o'zi (kompaniya bo'ylab yozuvlar CHIQARIB TASHLANADI —
     * ExpenseController'dagi bitta-filial ko'rinishi bilan bir xil P&L atributsiya qoidasi).
     */
    public BigDecimal sumExpenses(List<Long> branchIds, LocalDate from, LocalDate to) {
        List<Expense> expenses = branchIds == null
                ? expenseRepository.findAllByIsDeletedFalse()
                : branchIds.stream()
                        .flatMap(id -> expenseRepository.findAllByBranchIdAndIsDeletedFalse(id).stream())
                        .toList();
        BigDecimal expenseTotal = expenses.stream()
                .filter(e -> from == null || !e.getExpenseDate().isBefore(from))
                .filter(e -> to == null || !e.getExpenseDate().isAfter(to))
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<SalaryPayment> payments = branchIds == null
                ? salaryPaymentRepository.findAllByIsDeletedFalse()
                : branchIds.stream()
                        .flatMap(id -> salaryPaymentRepository.findAllByBranchIdAndIsDeletedFalse(id).stream())
                        .toList();
        BigDecimal salaryTotal = payments.stream()
                .filter(p -> from == null || !p.getPaymentDate().isBefore(from))
                .filter(p -> to == null || !p.getPaymentDate().isAfter(to))
                .map(SalaryPayment::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return expenseTotal.add(salaryTotal);
    }
}
