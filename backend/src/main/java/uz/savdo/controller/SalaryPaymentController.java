package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.payroll.SalaryPaymentRequest;
import uz.savdo.dto.payroll.SalaryPaymentResponse;
import uz.savdo.entity.SalaryPayment;
import uz.savdo.entity.User;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.SalaryPaymentRepository;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Xodimlarga to'langan ish haqi to'lovlari. Yozish (POST/DELETE) FAQAT OWNER uchun —
 * ish haqi to'lash moliyaviy jihatdan sezgir amal, MANAGER'ga ishonib topshirilmagan
 * (UserController'dagi xodim boshqaruvi bilan bir xil OWNER-only uslub). branchId
 * client'dan qabul qilinmaydi — target xodimning o'zining branchId'sidan ko'chiriladi.
 */
@RestController
@RequestMapping("/api/v1/salary-payments")
@RequiredArgsConstructor
public class SalaryPaymentController {

    private final SalaryPaymentRepository salaryPaymentRepository;
    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<SalaryPaymentResponse> list(@RequestParam(required = false) Long branchId,
                                             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                             @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                             @RequestParam(required = false) Long userId) {
        currentUserService.assertCanViewReports();

        List<SalaryPayment> payments;
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            payments = salaryPaymentRepository.findAllByBranchIdAndIsDeletedFalse(branchId);
        } else {
            List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
            payments = allowedBranchIds == null
                    ? salaryPaymentRepository.findAllByIsDeletedFalse()
                    : allowedBranchIds.stream()
                            .flatMap(id -> salaryPaymentRepository.findAllByBranchIdAndIsDeletedFalse(id).stream())
                            .toList();
        }

        List<SalaryPayment> filtered = payments.stream()
                .filter(p -> userId == null || userId.equals(p.getUserId()))
                .filter(p -> from == null || !p.getPaymentDate().isBefore(from))
                .filter(p -> to == null || !p.getPaymentDate().isAfter(to))
                .toList();

        Map<Long, User> usersById = userRepository.findAllById(filtered.stream().map(SalaryPayment::getUserId).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));

        return filtered.stream()
                .map(p -> SalaryPaymentResponse.from(p, resolveFullName(usersById, p.getUserId())))
                .toList();
    }

    @PostMapping
    public ResponseEntity<SalaryPaymentResponse> create(@Valid @RequestBody SalaryPaymentRequest request) {
        currentUserService.assertIsOwner();

        User targetUser = userRepository.findByIdAndIsDeletedFalse(request.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("Xodim topilmadi: " + request.getUserId()));

        SalaryPayment payment = SalaryPayment.builder()
                .userId(targetUser.getId())
                .branchId(targetUser.getBranchId())
                .amount(request.getAmount())
                .periodMonth(request.getPeriodMonth())
                .paymentDate(request.getPaymentDate())
                .note(request.getNote())
                .createdByUserId(currentUserService.getCurrentUser().getId())
                .build();
        payment = salaryPaymentRepository.save(payment);

        return ResponseEntity.ok(SalaryPaymentResponse.from(payment, targetUser.getFullName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        currentUserService.assertIsOwner();

        SalaryPayment payment = salaryPaymentRepository.findById(id)
                .filter(p -> !Boolean.TRUE.equals(p.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Ish haqi to'lovi topilmadi: " + id));
        payment.setIsDeleted(true);
        payment.setDeletedAt(LocalDateTime.now());
        salaryPaymentRepository.save(payment);

        return ResponseEntity.noContent().build();
    }

    private String resolveFullName(Map<Long, User> usersById, Long userId) {
        User user = usersById.get(userId);
        return user != null ? user.getFullName() : null;
    }
}
