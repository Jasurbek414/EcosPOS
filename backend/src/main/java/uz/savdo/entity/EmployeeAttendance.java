package uz.savdo.entity;

import jakarta.persistence.*;
import lombok.*;
import uz.savdo.enums.AttendanceStatus;

import java.time.LocalDate;

/**
 * Xodimning bir kunlik davomat yozuvi. (userId, attendanceDate) juftligi noyob
 * (qarang: V11 migratsiyasidagi uq_attendance_user_date) — bulk belgilash har doim
 * shu juftlik bo'yicha UPSERT qiladi (AttendanceController#bulkMark).
 */
@Entity
@Table(name = "employee_attendance")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeAttendance extends BaseEntity {

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(name = "attendance_date", nullable = false)
    private LocalDate attendanceDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private AttendanceStatus status;

    @Column(name = "note", length = 300)
    private String note;

    @Column(name = "marked_by_user_id", nullable = false)
    private Long markedByUserId;
}
