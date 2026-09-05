package uz.savdo.dto.attendance;

import jakarta.validation.constraints.NotNull;
import lombok.Data;
import uz.savdo.enums.AttendanceStatus;

/** AttendanceBulkMarkRequest ichidagi bitta xodim uchun bitta kunlik yozuv. */
@Data
public class AttendanceEntryDto {

    @NotNull(message = "Xodim (userId) kiritilishi shart")
    private Long userId;

    @NotNull(message = "Holat (status) kiritilishi shart")
    private AttendanceStatus status;

    private String note;
}
