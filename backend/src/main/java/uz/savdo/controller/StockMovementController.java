package uz.savdo.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uz.savdo.dto.stock.StockMovementResponse;
import uz.savdo.entity.Branch;
import uz.savdo.entity.Product;
import uz.savdo.entity.StockMovement;
import uz.savdo.entity.User;
import uz.savdo.enums.MovementType;
import uz.savdo.enums.UserRole;
import uz.savdo.exception.BadRequestException;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.StockMovementRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * Ombor harakatlari tarixi (StockMovement append-only audit jurnalini ko'rish uchun,
 * hech qanday yozish yo'q). Ko'rish huquqi StockController bilan bir xil: OWNER
 * istalgan filialni (aniq ko'rsatib) ko'radi, MANAGER/CASHIER faqat o'z filialini.
 */
@RestController
@RequestMapping("/api/v1/stock/movements")
@RequiredArgsConstructor
public class StockMovementController {

    private final StockMovementRepository stockMovementRepository;
    private final ProductRepository productRepository;
    private final BranchRepository branchRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<StockMovementResponse> list(@RequestParam(required = false) Long branchId,
                                             @RequestParam(required = false) Long productId,
                                             @RequestParam(required = false) MovementType type,
                                             @RequestParam(required = false) LocalDate from,
                                             @RequestParam(required = false) LocalDate to) {
        Long resolvedBranchId = resolveBranchId(branchId);
        List<StockMovement> movements = stockMovementRepository
                .findAllByBranchIdAndIsDeletedFalseOrderByCreatedAtDesc(resolvedBranchId);

        LocalDateTime fromDateTime = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDateTime = to != null ? to.atTime(LocalTime.MAX) : null;

        List<StockMovement> filtered = movements.stream()
                .filter(m -> productId == null || productId.equals(m.getProductId()))
                .filter(m -> type == null || type == m.getType())
                .filter(m -> fromDateTime == null || !m.getCreatedAt().isBefore(fromDateTime))
                .filter(m -> toDateTime == null || !m.getCreatedAt().isAfter(toDateTime))
                .toList();

        Map<Long, Product> productsById = loadProducts(filtered);
        Map<Long, Branch> branchesById = loadBranches(filtered);
        Map<Long, User> usersById = loadUsers(filtered);

        return filtered.stream()
                .map(m -> StockMovementResponse.from(m, productsById.get(m.getProductId()),
                        branchesById.get(m.getBranchId()),
                        resolveUserName(usersById.get(m.getCreatedByUserId()))))
                .toList();
    }

    private String resolveUserName(User user) {
        return user != null ? user.getFullName() : null;
    }

    /** StockController.resolveBranchId bilan bir xil naqsh: branchId berilsa kirish
     * huquqi tekshiriladi, berilmasa MANAGER/CASHIER'ning o'z filiali olinadi,
     * OWNER uchun esa aniq filial talab qilinganidan 400 qaytariladi. */
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

    private Map<Long, Product> loadProducts(List<StockMovement> movements) {
        List<Long> productIds = movements.stream().map(StockMovement::getProductId).distinct().toList();
        return productRepository.findAllById(productIds).stream()
                .collect(java.util.stream.Collectors.toMap(Product::getId, Function.identity()));
    }

    private Map<Long, Branch> loadBranches(List<StockMovement> movements) {
        List<Long> branchIds = movements.stream().map(StockMovement::getBranchId).distinct().toList();
        return branchRepository.findAllById(branchIds).stream()
                .collect(java.util.stream.Collectors.toMap(Branch::getId, Function.identity()));
    }

    private Map<Long, User> loadUsers(List<StockMovement> movements) {
        List<Long> userIds = movements.stream().map(StockMovement::getCreatedByUserId).distinct().toList();
        return userRepository.findAllById(userIds).stream()
                .collect(java.util.stream.Collectors.toMap(User::getId, Function.identity()));
    }
}
