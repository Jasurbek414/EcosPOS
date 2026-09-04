package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.stock.StockAdjustmentRequest;
import uz.savdo.dto.stock.StockLevelResponse;
import uz.savdo.entity.Product;
import uz.savdo.entity.StockLevel;
import uz.savdo.entity.User;
import uz.savdo.enums.UserRole;
import uz.savdo.exception.BadRequestException;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.StockLevelRepository;
import uz.savdo.security.CurrentUserService;
import uz.savdo.service.StockAdjustmentService;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Filial darajasidagi joriy zaxira. Ko'rish uchun assertCanAccessBranch (OWNER/MANAGER/
 * CASHIER — o'z filiali), yozish (tuzatish) uchun StockAdjustmentService orqali
 * assertCanWriteInventory (CASHIER hech qachon yoza olmaydi).
 */
@RestController
@RequestMapping("/api/v1/stock")
@RequiredArgsConstructor
public class StockController {

    private final StockLevelRepository stockLevelRepository;
    private final ProductRepository productRepository;
    private final CurrentUserService currentUserService;
    private final StockAdjustmentService stockAdjustmentService;

    @GetMapping
    public List<StockLevelResponse> list(@RequestParam(required = false) Long branchId) {
        Long resolvedBranchId = resolveBranchId(branchId);
        List<StockLevel> stockLevels = stockLevelRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(resolvedBranchId);
        Map<Long, Product> productsById = loadProducts(stockLevels);

        return stockLevels.stream()
                .filter(sl -> productsById.containsKey(sl.getProductId()))
                .map(sl -> StockLevelResponse.from(sl, productsById.get(sl.getProductId())))
                .toList();
    }

    @GetMapping("/low")
    public List<StockLevelResponse> low(@RequestParam(required = false) Long branchId) {
        Long resolvedBranchId = resolveBranchId(branchId);
        List<StockLevel> stockLevels = stockLevelRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(resolvedBranchId);
        Map<Long, Product> productsById = loadProducts(stockLevels);

        return stockLevels.stream()
                .filter(sl -> productsById.containsKey(sl.getProductId()))
                .filter(sl -> {
                    Product product = productsById.get(sl.getProductId());
                    return product.getMinStockLevel() != null
                            && sl.getQuantity().compareTo(product.getMinStockLevel()) < 0;
                })
                .map(sl -> StockLevelResponse.from(sl, productsById.get(sl.getProductId())))
                .toList();
    }

    @PostMapping("/adjustments")
    public ResponseEntity<StockLevelResponse> adjust(@Valid @RequestBody StockAdjustmentRequest request) {
        currentUserService.assertCanWriteInventory(request.getBranchId());

        User currentUser = currentUserService.getCurrentUser();
        StockLevel stockLevel = stockAdjustmentService.adjust(
                request.getBranchId(), request.getProductId(), request.getQuantityDelta(),
                request.getReason(), currentUser.getId());

        Product product = productRepository.findByIdAndIsDeletedFalse(request.getProductId())
                .orElseThrow(() -> new BadRequestException("Mahsulot topilmadi: " + request.getProductId()));

        return ResponseEntity.ok(StockLevelResponse.from(stockLevel, product));
    }

    /**
     * branchId berilgan bo'lsa — foydalanuvchining shu filialga kirish huquqini tekshiradi
     * (OWNER uchun cheklovsiz, boshqalar uchun faqat o'z filiali). Berilmagan bo'lsa —
     * MANAGER/CASHIER uchun o'z filiali standart qilib olinadi, OWNER uchun esa aniq
     * filial talab qilinganidan 400 qaytariladi (u bir nechta filialni boshqaradi).
     */
    private Long resolveBranchId(Long branchId) {
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            return branchId;
        }
        User currentUser = currentUserService.getCurrentUser();
        if (currentUser.getRole() == UserRole.OWNER) {
            throw new BadRequestException("OWNER uchun branchId parametri aniq ko'rsatilishi shart");
        }
        return currentUser.getBranchId();
    }

    private Map<Long, Product> loadProducts(List<StockLevel> stockLevels) {
        List<Long> productIds = stockLevels.stream().map(StockLevel::getProductId).distinct().toList();
        return productRepository.findAllById(productIds).stream()
                .collect(java.util.stream.Collectors.toMap(Product::getId, Function.identity()));
    }
}
