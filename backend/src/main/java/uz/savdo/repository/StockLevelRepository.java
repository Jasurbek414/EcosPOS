package uz.savdo.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.StockLevel;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockLevelRepository extends JpaRepository<StockLevel, Long> {

    List<StockLevel> findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(Long branchId);

    Optional<StockLevel> findByProductIdAndBranchIdAndIsDeletedFalse(Long productId, Long branchId);

    /**
     * Sotuv/ko'chirish paytida zaxirani o'qib-kamaytirish/oshirish ATOMIK bo'lishi uchun —
     * qatorni tranzaksiya oxirigacha qulflaydi (PESSIMISTIC_WRITE), shu bilan bir xil
     * mahsulot+filial ustida ikkita parallel so'rov (yoki bitta so'rovda takrorlangan
     * mahsulot qatori) qoldiqni manfiy qilib qo'yishining oldini oladi.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<StockLevel> findWithLockByProductIdAndBranchIdAndIsDeletedFalse(Long productId, Long branchId);
}
