package uz.savdo.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.CashShift;
import uz.savdo.enums.ShiftStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface CashShiftRepository extends JpaRepository<CashShift, Long> {

    Optional<CashShift> findByCashierIdAndStatusAndIsDeletedFalse(Long cashierId, ShiftStatus status);

    List<CashShift> findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(Long branchId);

    List<CashShift> findAllByIsDeletedFalseOrderByIdDesc();

    Optional<CashShift> findByIdAndIsDeletedFalse(Long id);

    /**
     * Smenani qulflab o'qish — sotuv yaratish (SaleService) va smenani yopish
     * (closeShift) bir xil smena qatori ustida bir vaqtda ishlamasligi uchun: kim
     * birinchi bo'lib qulflasa, ikkinchisi shu tranzaksiya commit bo'lgunicha kutadi.
     * Shu bilan "smena yopilayotganda kirgan sotuv kutilgan naqd hisobidan tushib
     * qolishi" kabi tor oynali poyga holati oldini olinadi.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CashShift> findWithLockByIdAndIsDeletedFalse(Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CashShift> findWithLockByCashierIdAndStatusAndIsDeletedFalse(Long cashierId, ShiftStatus status);
}
