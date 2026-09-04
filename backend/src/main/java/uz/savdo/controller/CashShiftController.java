package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.cashshift.CashShiftResponse;
import uz.savdo.dto.cashshift.CloseShiftRequest;
import uz.savdo.dto.cashshift.OpenShiftRequest;
import uz.savdo.entity.CashShift;
import uz.savdo.entity.User;
import uz.savdo.repository.CashShiftRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;
import uz.savdo.service.CashShiftService;

import java.util.List;
import java.util.Optional;

/**
 * Kassa smenalari. Ochish/yopish — barcha uch rol uchun ham o'z filiali doirasida ruxsat
 * etilgan (OWNER — istalgan filial); huquq tekshiruvi CashShiftService ichida amalga
 * oshiriladi. Ro'yxat (tarix) esa GoodsReceiptController bilan bir xil scoping naqshi —
 * OWNER branchId bermasa barcha filiallar bo'yicha ko'radi (bu audit/tarix ko'rinishi,
 * yozish nuqtalaridan kamroq qattiq).
 */
@RestController
@RequestMapping("/api/v1/cash-shifts")
@RequiredArgsConstructor
public class CashShiftController {

    private final CashShiftRepository cashShiftRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final CashShiftService cashShiftService;

    @PostMapping("/open")
    public ResponseEntity<CashShiftResponse> open(@Valid @RequestBody OpenShiftRequest request) {
        User currentUser = currentUserService.getCurrentUser();
        CashShift shift = cashShiftService.openShift(request.getBranchId(), request.getOpeningCash(), currentUser.getId());
        return ResponseEntity.ok(CashShiftResponse.from(shift, currentUser.getFullName()));
    }

    @PostMapping("/{id}/close")
    public ResponseEntity<CashShiftResponse> close(@PathVariable Long id, @Valid @RequestBody CloseShiftRequest request) {
        CashShift shift = cashShiftService.closeShift(id, request.getClosingCash(), request.getNote(),
                currentUserService.getCurrentUser().getId());
        return ResponseEntity.ok(CashShiftResponse.from(shift, resolveCashierName(shift.getCashierId())));
    }

    @GetMapping("/current")
    public ResponseEntity<CashShiftResponse> current() {
        User currentUser = currentUserService.getCurrentUser();
        Optional<CashShift> shift = cashShiftService.getCurrentOpenShift(currentUser.getId());
        return shift.map(s -> ResponseEntity.ok(CashShiftResponse.from(s, currentUser.getFullName())))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping
    public List<CashShiftResponse> list(@RequestParam(required = false) Long branchId) {
        List<CashShift> shifts;
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            shifts = cashShiftRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(branchId);
        } else {
            List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
            shifts = allowedBranchIds == null
                    ? cashShiftRepository.findAllByIsDeletedFalseOrderByIdDesc()
                    : allowedBranchIds.stream()
                            .flatMap(id -> cashShiftRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdDesc(id).stream())
                            .toList();
        }

        return shifts.stream()
                .map(s -> CashShiftResponse.from(s, resolveCashierName(s.getCashierId())))
                .toList();
    }

    private String resolveCashierName(Long cashierId) {
        return userRepository.findById(cashierId).map(User::getFullName).orElse(null);
    }
}
