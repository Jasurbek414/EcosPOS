package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.StockLevel;

import java.util.List;
import java.util.Optional;

@Repository
public interface StockLevelRepository extends JpaRepository<StockLevel, Long> {

    List<StockLevel> findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(Long branchId);

    Optional<StockLevel> findByProductIdAndBranchIdAndIsDeletedFalse(Long productId, Long branchId);
}
