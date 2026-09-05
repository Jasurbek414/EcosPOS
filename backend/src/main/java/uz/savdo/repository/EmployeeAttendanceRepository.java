package uz.savdo.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uz.savdo.entity.EmployeeAttendance;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeAttendanceRepository extends JpaRepository<EmployeeAttendance, Long> {

    List<EmployeeAttendance> findAllByIsDeletedFalse();

    List<EmployeeAttendance> findAllByBranchIdAndIsDeletedFalse(Long branchId);

    /** Bulk belgilashda UPSERT uchun — bitta xodimning bitta kunlik yozuvini topadi. */
    Optional<EmployeeAttendance> findByUserIdAndAttendanceDateAndIsDeletedFalse(Long userId, LocalDate attendanceDate);

    List<EmployeeAttendance> findAllByUserIdAndIsDeletedFalse(Long userId);
}
