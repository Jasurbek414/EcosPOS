package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.StockTransfer;

import java.util.List;

@Repository
public interface StockTransferRepository extends JpaRepository<StockTransfer, Long> {

    List<StockTransfer> findAllByIsDeletedFalseOrderByIdDesc();

    List<StockTransfer> findAllByFromBranchIdAndIsDeletedFalseOrderByIdDesc(Long fromBranchId);

    List<StockTransfer> findAllByToBranchIdAndIsDeletedFalseOrderByIdDesc(Long toBranchId);
}
