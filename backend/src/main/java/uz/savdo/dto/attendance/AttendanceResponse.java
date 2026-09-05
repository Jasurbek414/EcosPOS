package uz.savdo.dto.attendance;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.EmployeeAttendance;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
public class AttendanceResponse {
    private Long id;
    private Long userId;
    private String userFullName;
    private Long branchId;
    private LocalDate attendanceDate;
    private String status;
    private String note;
    private Long markedByUserId;
    private LocalDateTime createdAt;

    public static AttendanceResponse from(EmployeeAttendance attendance, String userFullName) {
        return AttendanceResponse.builder()
                .id(attendance.getId())
                .userId(attendance.getUserId())
                .userFullName(userFullName)
                .branchId(attendance.getBranchId())
                .attendanceDate(attendance.getAttendanceDate())
                .status(attendance.getStatus().name())
                .note(attendance.getNote())
                .markedByUserId(attendance.getMarkedByUserId())
                .createdAt(attendance.getCreatedAt())
                .build();
    }
}
