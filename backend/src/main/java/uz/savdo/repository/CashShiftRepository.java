package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
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
}
