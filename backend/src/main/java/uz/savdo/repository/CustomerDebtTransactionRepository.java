package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.CustomerDebtTransaction;

import java.util.List;

@Repository
public interface CustomerDebtTransactionRepository extends JpaRepository<CustomerDebtTransaction, Long> {

    List<CustomerDebtTransaction> findAllByIsDeletedFalse();

    List<CustomerDebtTransaction> findAllByCustomerIdAndIsDeletedFalse(Long customerId);

    List<CustomerDebtTransaction> findAllByCustomerIdInAndIsDeletedFalse(List<Long> customerIds);
}
