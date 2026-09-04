package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.SaleItem;

import java.util.List;

@Repository
public interface SaleItemRepository extends JpaRepository<SaleItem, Long> {

    List<SaleItem> findAllBySaleIdAndIsDeletedFalseOrderByIdAsc(Long saleId);

    /** Hisobotlar uchun — bir nechta sotuv hujjatining qatorlarini bitta so'rovda oladi. */
    List<SaleItem> findAllBySaleIdInAndIsDeletedFalse(List<Long> saleIds);
}
