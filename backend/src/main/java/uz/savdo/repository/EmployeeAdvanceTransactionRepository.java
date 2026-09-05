package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.EmployeeAdvanceTransaction;

import java.util.List;

@Repository
public interface EmployeeAdvanceTransactionRepository extends JpaRepository<EmployeeAdvanceTransaction, Long> {

    List<EmployeeAdvanceTransaction> findAllByIsDeletedFalse();

    List<EmployeeAdvanceTransaction> findAllByBranchIdAndIsDeletedFalse(Long branchId);

    List<EmployeeAdvanceTransaction> findAllByUserIdAndIsDeletedFalse(Long userId);

    List<EmployeeAdvanceTransaction> findAllByUserIdInAndIsDeletedFalse(List<Long> userIds);
}
