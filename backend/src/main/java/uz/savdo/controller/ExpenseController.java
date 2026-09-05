package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.expense.ExpenseRequest;
import uz.savdo.dto.expense.ExpenseResponse;
import uz.savdo.entity.Branch;
import uz.savdo.entity.Expense;
import uz.savdo.enums.ExpenseCategory;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.BranchRepository;
import uz.savdo.repository.ExpenseRepository;
import uz.savdo.security.CurrentUserService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Kompaniya xarajatlari. branchId=null bo'lgan xarajatlar "kompaniya bo'ylab" (umumiy)
 * hisoblanadi va FAQAT OWNER tomonidan yaratilishi/o'chirilishi mumkin — MANAGER faqat
 * o'z filiali doirasida (assertCanManageExpenses) ishlay oladi. Ro'yxatlash
 * ReportService/CashShiftController bilan bir xil naqsh: filial scoping so'rov
 * darajasida, sana/kategoriya filtri Java stream'da (GROUP BY ishlatilmaydi).
 */
@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseRepository expenseRepository;
    private final BranchRepository branchRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<ExpenseResponse> list(@RequestParam(required = false) Long branchId,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                       @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
                                       @RequestParam(required = false) String category) {
        currentUserService.assertCanViewReports();

        List<Expense> expenses;
        if (branchId != null) {
            currentUserService.assertCanAccessBranch(branchId);
            expenses = expenseRepository.findAllByBranchIdAndIsDeletedFalse(branchId);
        } else {
            List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
            expenses = allowedBranchIds == null
                    // OWNER, branchId ko'rsatilmagan -> hammasi: filialga tegishli VA umumiy (branchId=null) xarajatlar.
                    ? expenseRepository.findAllByIsDeletedFalse()
                    // MANAGER/CASHIER -> faqat o'z filiali (umumiy xarajatlar bu ko'rinishda ko'rsatilmaydi).
                    : allowedBranchIds.stream()
                            .flatMap(id -> expenseRepository.findAllByBranchIdAndIsDeletedFalse(id).stream())
                            .toList();
        }

        ExpenseCategory categoryFilter = parseCategory(category);
        List<Expense> filtered = expenses.stream()
                .filter(e -> from == null || !e.getExpenseDate().isBefore(from))
                .filter(e -> to == null || !e.getExpenseDate().isAfter(to))
                .filter(e -> categoryFilter == null || e.getCategory() == categoryFilter)
                .toList();

        return filtered.stream().map(e -> ExpenseResponse.from(e, resolveBranchName(e.getBranchId()))).toList();
    }

    @PostMapping
    public ResponseEntity<ExpenseResponse> create(@Valid @RequestBody ExpenseRequest request) {
        if (request.getBranchId() == null) {
            currentUserService.assertIsOwner();
        } else {
            currentUserService.assertCanManageExpenses(request.getBranchId());
        }

        Expense expense = Expense.builder()
                .branchId(request.getBranchId())
                .category(request.getCategory())
                .amount(request.getAmount())
                .description(request.getDescription())
                .expenseDate(request.getExpenseDate())
                .createdByUserId(currentUserService.getCurrentUser().getId())
                .build();
        expense = expenseRepository.save(expense);

        return ResponseEntity.ok(ExpenseResponse.from(expense, resolveBranchName(expense.getBranchId())));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        Expense expense = expenseRepository.findById(id)
                .filter(e -> !Boolean.TRUE.equals(e.getIsDeleted()))
                .orElseThrow(() -> new ResourceNotFoundException("Xarajat topilmadi: " + id));

        if (expense.getBranchId() == null) {
            currentUserService.assertIsOwner();
        } else {
            currentUserService.assertCanManageExpenses(expense.getBranchId());
        }

        expense.setIsDeleted(true);
        expense.setDeletedAt(LocalDateTime.now());
        expenseRepository.save(expense);

        return ResponseEntity.noContent().build();
    }

    private String resolveBranchName(Long branchId) {
        if (branchId == null) {
            return null;
        }
        return branchRepository.findById(branchId).map(Branch::getName).orElse(null);
    }

    private ExpenseCategory parseCategory(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return ExpenseCategory.valueOf(raw.trim().toUpperCase());
    }
}
