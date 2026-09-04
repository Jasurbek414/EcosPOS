package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.StockMovement;

@Repository
public interface StockMovementRepository extends JpaRepository<StockMovement, Long> {
}
