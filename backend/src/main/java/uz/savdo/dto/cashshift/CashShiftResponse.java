package uz.savdo.dto.cashshift;

import lombok.Builder;
import lombok.Data;
import uz.savdo.entity.CashShift;
import uz.savdo.enums.ShiftStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class CashShiftResponse {
    private Long id;
    private Long branchId;
    private Long cashierId;
    private String cashierName;
    private LocalDateTime openedAt;
    private LocalDateTime closedAt;
    private BigDecimal openingCash;
    private BigDecimal closingCash;
    private BigDecimal expectedCash;
    /** closingCash - expectedCash (musbat = ortiqcha, manfiy = kamomad). Faqat yopilgan smenada mavjud. */
    private BigDecimal cashDifference;
    private ShiftStatus status;
    private String note;

    public static CashShiftResponse from(CashShift shift, String cashierName) {
        BigDecimal cashDifference = (shift.getClosingCash() != null && shift.getExpectedCash() != null)
                ? shift.getClosingCash().subtract(shift.getExpectedCash())
                : null;
        return CashShiftResponse.builder()
                .id(shift.getId())
                .branchId(shift.getBranchId())
                .cashierId(shift.getCashierId())
                .cashierName(cashierName)
                .openedAt(shift.getOpenedAt())
                .closedAt(shift.getClosedAt())
                .openingCash(shift.getOpeningCash())
                .closingCash(shift.getClosingCash())
                .expectedCash(shift.getExpectedCash())
                .cashDifference(cashDifference)
                .status(shift.getStatus())
                .note(shift.getNote())
                .build();
    }
}
