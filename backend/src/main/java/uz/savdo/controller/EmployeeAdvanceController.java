package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.advance.AdvanceTransactionRequest;
import uz.savdo.dto.advance.AdvanceTransactionResponse;
import uz.savdo.dto.advance.EmployeeAdvanceBalanceResponse;
import uz.savdo.entity.EmployeeAdvanceTransaction;
import uz.savdo.entity.User;
import uz.savdo.enums.AdvanceTransactionType;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.EmployeeAdvanceTransactionRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Xodimlarga avans berish / avansni qaytarib olish. Yozish (POST/DELETE) FAQAT OWNER
 * uchun — SalaryPaymentController bilan bir xil sabab (moliyaviy jihatdan sezgir).
 * branchId client'dan qabul qilinmaydi — target xodimning o'zining branchId'sidan
 * ko'chiriladi. Balans hisoblash SQL GROUP BY'siz, Java'da: SUM(ADVANCE_GIVEN) -
 * SUM(ADVANCE_REPAYMENT).
 */
@RestController
@RequestMapping("/api/v1/employee-advances")
@RequiredArgsConstructor
public class EmployeeAdvanceController {

    private final EmployeeAdvanceTransactionRepository advanceTransactionRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<AdvanceTransactionResponse> list(@RequestParam(required = false) Long branchId,
                                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                  @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                                  @RequestParam(required = false) Long userId) {
        currentUserService.assertCanViewReports();

        List<EmployeeAdvanceTransaction> transactions;
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            transactions = advanceTransactionRepository.findAllByBranchIdAndIsDeletedFalse(branchId);
        } else {
            List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
            transactions = allowedBranchIds == null
                    ? advanceTransactionRepository.findAllByIsDeletedFalse()
                    : allowedBranchIds.stream()
                            .flatMap(id -> advanceTransactionRepository.findAllByBranchIdAndIsDeletedFalse(id).stream())
                            .toList();
        }

        List<EmployeeAdvanceTransaction> filtered = transactions.stream()
                .filter(t -> userId == null || userId.equals(t.getUserId()))
                .filter(t -> from == null || !t.getTransactionDate().isBefore(from))
                .filter(t -> to == null || !t.getTransactionDate().isAfter(to))
                .toList();

        Map<Long, User> usersById = userRepository.findAllById(filtered.stream().map(EmployeeAdvanceTransaction::getUserId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));

        return filtered.stream()
                .map(t -> AdvanceTransactionResponse.from(t, resolveFullName(usersById, t.getUserId())))
                .toList();
    }

    @GetMapping("/balances")
    public List<EmployeeAdvanceBalanceResponse> balances(@RequestParam(required = false) Long branchId) {
        currentUserService.assertCanViewReports();

        List<User> users;
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            users = userRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(branchId);
        } else {
            List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
            users = allowedBranchIds == null
                    ? userRepository.findAllByIsDeletedFalseOrderByIdAsc()
                    : allowedBranchIds.stream()
                            .flatMap(id -> userRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(id).stream())
                            .toList();
        }

        List<Long> userIds = users.stream().map(User::getId).toList();
        List<EmployeeAdvanceTransaction> transactions = userIds.isEmpty()
                ? List.of()
                : advanceTransactionRepository.findAllByUserIdInAndIsDeletedFalse(userIds);

        Map<Long, BigDecimal> balanceByUserId = transactions.stream()
                .collect(Collectors.groupingBy(EmployeeAdvanceTransaction::getUserId, Collectors.reducing(
                        BigDecimal.ZERO,
                        t -> t.getType() == AdvanceTransactionType.ADVANCE_GIVEN ? t.getAmount() : t.getAmount().negate(),
                        BigDecimal::add)));

        return users.stream()
                .map(u -> EmployeeAdvanceBalanceResponse.builder()
                        .userId(u.getId())
                        .userFullName(u.getFullName())
                        .branchId(u.getBranchId())
                        .balance(balanceByUserId.getOrDefault(u.getId(), BigDecimal.ZERO))
                        .build())
                .toList();
    }

    @PostMapping
    public ResponseEntity<AdvanceTransactionResponse> create(@Valid @RequestBody AdvanceTransactionRequest request) {
        currentUserService.assertIsOwner();

        User targetUser = userRepository.findByIdAndIsDeletedFalse(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Xodim topilmadi: " + request.getUserId()));

        EmployeeAdvanceTransaction transaction = EmployeeAdvanceTransaction.builder()
                .userId(targetUser.getId())
                .branchId(targetUser.getBranchId())
                .type(request.getType())
                .amount(request.getAmount())
                .transactionDate(request.getTransactionDate())
                .note(request.getNote())
                .createdByUserId(currentUserService.getCurrentUser().getId())
                .build();
        transaction = advanceTransactionRepository.save(transaction);

        return ResponseEntity.ok(AdvanceTransactionResponse.from(transaction, targetUser.getFullName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        currentUserService.assertIsOwner();

        EmployeeAdvanceTransaction transaction = advanceTransactionRepository.findById(id)
                .filter(t -> !Boolean.TRUE.equals(t.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Avans tranzaksiyasi topilmadi: " + id));
        transaction.setIsDeleted(true);
        transaction.setDeletedAt(LocalDateTime.now());
        advanceTransactionRepository.save(transaction);

        return ResponseEntity.noContent().build();
    }

    private String resolveFullName(Map<Long, User> usersById, Long userId) {
        User user = usersById.get(userId);
        return user != null ? user.getFullName() : null;
    }
}
