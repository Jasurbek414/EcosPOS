package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.attendance.AttendanceBulkMarkRequest;
import uz.savdo.dto.attendance.AttendanceEntryDto;
import uz.savdo.dto.attendance.AttendanceResponse;
import uz.savdo.entity.EmployeeAttendance;
import uz.savdo.entity.User;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.EmployeeAttendanceRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Xodimlar davomati. Bitta xodimning bitta kunlik yozuvi (userId, attendanceDate) noyob —
 * bulk belgilash har doim UPSERT qiladi (qayta yuborilsa eski qator YANGILANADI, dublikat
 * qator yaratilmaydi, qarang: V11 migratsiyasidagi uq_attendance_user_date).
 */
@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final EmployeeAttendanceRepository employeeAttendanceRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<AttendanceResponse> list(@RequestParam(required = false) Long branchId,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                          @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                          @RequestParam(required = false) Long userId) {
        List<EmployeeAttendance> records;
        if (branchId != null) {
            currentUserService.assertCanManageAttendance(branchId);
            records = employeeAttendanceRepository.findAllByBranchIdAndIsDeletedFalse(branchId);
        } else {
            List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
            records = allowedBranchIds == null
                    ? employeeAttendanceRepository.findAllByIsDeletedFalse()
                    : allowedBranchIds.stream()
                            .flatMap(id -> employeeAttendanceRepository.findAllByBranchIdAndIsDeletedFalse(id).stream())
                            .toList();
        }

        List<EmployeeAttendance> filtered = records.stream()
                .filter(a -> userId == null || userId.equals(a.getUserId()))
                .filter(a -> from == null || !a.getAttendanceDate().isBefore(from))
                .filter(a -> to == null || !a.getAttendanceDate().isAfter(to))
                .toList();

        Map<Long, String> fullNamesById = resolveFullNames(filtered.stream().map(EmployeeAttendance::getUserId).distinct().toList());
        return filtered.stream()
                .map(a -> AttendanceResponse.from(a, fullNamesById.get(a.getUserId())))
                .toList();
    }

    @PostMapping("/bulk")
    public List<AttendanceResponse> bulkMark(@Valid @RequestBody AttendanceBulkMarkRequest request) {
        currentUserService.assertCanManageAttendance(request.getBranchId());
        Long markedByUserId = currentUserService.getCurrentUser().getId();

        List<EmployeeAttendance> saved = request.getEntries().stream()
                .map(entry -> upsert(request.getBranchId(), request.getAttendanceDate(), entry, markedByUserId))
                .toList();

        Map<Long, String> fullNamesById = resolveFullNames(saved.stream().map(EmployeeAttendance::getUserId).distinct().toList());
        return saved.stream().map(a -> AttendanceResponse.from(a, fullNamesById.get(a.getUserId()))).toList();
    }

    private EmployeeAttendance upsert(Long branchId, LocalDate attendanceDate, AttendanceEntryDto entry, Long markedByUserId) {
        EmployeeAttendance record = employeeAttendanceRepository
                .findByUserIdAndAttendanceDateAndIsDeletedFalse(entry.getUserId(), attendanceDate)
                .orElseGet(() -> EmployeeAttendance.builder()
                        .userId(entry.getUserId())
                        .branchId(branchId)
                        .attendanceDate(attendanceDate)
                        .build());

        record.setBranchId(branchId);
        record.setStatus(entry.getStatus());
        record.setNote(entry.getNote());
        record.setMarkedByUserId(markedByUserId);

        return employeeAttendanceRepository.save(record);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        EmployeeAttendance record = employeeAttendanceRepository.findById(id)
                .filter(a -> !Boolean.TRUE.equals(a.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Davomat yozuvi topilmadi: " + id));
        currentUserService.assertCanManageAttendance(record.getBranchId());

        record.setIsDeleted(true);
        record.setDeletedAt(LocalDateTime.now());
        employeeAttendanceRepository.save(record);

        return ResponseEntity.noContent().build();
    }

    private Map<Long, String> resolveFullNames(List<Long> userIds) {
        if (userIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
    }
}
