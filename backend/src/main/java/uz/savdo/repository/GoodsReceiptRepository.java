package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.GoodsReceipt;

import java.util.List;
import java.util.Optional;

@Repository
public interface GoodsReceiptRepository extends JpaRepository<GoodsReceipt, Long> {

    List<GoodsReceipt> findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(Long branchId);

    List<GoodsReceipt> findAllByIsDeletedFalseOrderByIdDesc();

    Optional<GoodsReceipt> findByIdAndIsDeletedFalse(Long id);
}
