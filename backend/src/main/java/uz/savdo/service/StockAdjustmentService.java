package uz.savdo.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import uz.savdo.entity.Branch;
import uz.savdo.entity.Product;
import uz.savdo.entity.StockLevel;
import uz.savdo.entity.StockMovement;
import uz.savdo.enums.MovementType;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.ProductRepository;
import uz.savdo.repository.StockLevelRepository;
import uz.savdo.repository.StockMovementRepository;

import java.math.BigDecimal;

/**
 * Qo'lda ombor tuzatishi (buzilgan mahsulot, inventarizatsiya farqi va h.k.) —
 * kirim hujjati orqali EMAS, bitta mahsulot/filial uchun ishorali delta bilan.
 */
@Service
@RequiredArgsConstructor
public class StockAdjustmentService {

    private final BranchRepository branchRepository;
    private final ProductRepository productRepository;
    private final StockLevelRepository stockLevelRepository;
    private final StockMovementRepository stockMovementRepository;

    @Transactional
    public StockLevel adjust(Long branchId, Long productId, BigDecimal quantityDelta, String reason, Long currentUserId) {
        Branch branch = branchRepository.findByIdAndIsDeletedFalse(branchId)
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: " + branchId));
        Product product = productRepository.findByIdAndIsDeletedFalse(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Mahsulot topilmadi: " + productId));

        // QULFLANGAN o'qish. Avval bu yerda oddiy findBy... ishlatilardi va bu butun
        // loyihadagi yagona qulflanmagan qoldiq o'zgartirish yo'li edi: menejer
        // inventarizatsiya qilayotganda kassir shu mahsulotni sotsa, ikkalasi ham bir
        // xil eski qiymatni o'qib, keyin yozgani birinchisining o'zgarishini jimgina
        // bosib ketardi. GoodsReceiptService va SaleService bilan bir xil naqshga
        // keltirildi.
        StockLevel stockLevel = stockLevelRepository.findWithLockByProductIdAndBranchIdAndIsDeletedFalse(product.getId(), branch.getId())
                .orElseGet(() -> StockLevel.builder()
                        .productId(product.getId())
                        .branchId(branch.getId())
                        .quantity(BigDecimal.ZERO)
                        .build());
        BigDecimal newQty = stockLevel.getQuantity().add(quantityDelta);
        if (newQty.compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("Tuzatish qoldiqni manfiyga tushira olmaydi " +
                    "(mavjud: " + stockLevel.getQuantity() + ", delta: " + quantityDelta + ")");
        }
        stockLevel.setQuantity(newQty);
        stockLevel = stockLevelRepository.save(stockLevel);

        StockMovement movement = StockMovement.builder()
                .productId(product.getId())
                .branchId(branch.getId())
                .type(MovementType.ADJUSTMENT)
                .quantity(quantityDelta)
                .note(reason)
                .createdByUserId(currentUserId)
                .build();
        stockMovementRepository.save(movement);

        return stockLevel;
    }
}
