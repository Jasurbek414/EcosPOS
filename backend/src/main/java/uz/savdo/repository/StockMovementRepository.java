package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.StockMovement;

import java.util.List;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {

    /** resolveBranchId() har doim aniq bitta filial qaytaradi (OWNER ham branchId
     * ko'rsatishi shart — StockController.resolveBranchId bilan bir xil naqsh),
     * shuning uchun bitta filial bo'yicha so'rov yetarli. Qolgan filtrlar (mahsulot,
     * turi, sana oralig'i) StockMovementController'da stream orqali qo'llaniladi —
     * StockController.low() bilan bir xil uslub (bu loyihada murakkab JPQL o'rniga
     * xotirada filtrlash afzal ko'rilgan). */
    List<StockMovement> findAllByBranchIdAndIsDeletedFalseOrderByCreatedAtDesc(Long branchId);
}
