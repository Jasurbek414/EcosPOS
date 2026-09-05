package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.SalaryPayment;

import java.util.List;

@Repository
public interface SalaryPaymentRepository extends JpaRepository<SalaryPayment, Long> {

    List<SalaryPayment> findAllByIsDeletedFalse();

    List<SalaryPayment> findAllByBranchIdAndIsDeletedFalse(Long branchId);

    List<SalaryPayment> findAllByBranchIdIsNullAndIsDeletedFalse();

    List<SalaryPayment> findAllByUserIdAndIsDeletedFalse(Long userId);
}
