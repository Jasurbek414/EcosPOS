package uz.savdo.dto.attendance;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/** POST /api/v1/attendance/bulk — bitta filial, bitta kun uchun bir nechta xodim holatini belgilaydi (UPSERT). */
@Data
public class AttendanceBulkMarkRequest {

    @NotNull(message = "Filial (branchId) kiritilishi shart")
    private Long branchId;

    @NotNull(message = "Sana (attendanceDate) kiritilishi shart")
    private LocalDate attendanceDate;

    @NotEmpty(message = "Kamida bitta yozuv kiritilishi shart")
    @Valid
    private List<AttendanceEntryDto> entries;
}
