package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.Expense;

import java.util.List;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    List<Expense> findAllByIsDeletedFalse();

    List<Expense> findAllByBranchIdAndIsDeletedFalse(Long branchId);

    List<Expense> findAllByBranchIdIsNullAndIsDeletedFalse();
}
