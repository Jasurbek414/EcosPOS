package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.expensecategory.ExpenseCategoryRequest;
import uz.savdo.dto.expensecategory.ExpenseCategoryResponse;
import uz.savdo.entity.ExpenseCategory;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.ExpenseCategoryRepository;
import uz.savdo.security.CurrentUserService;

import java.util.List;

/**
 * Xarajat kategoriyalari. Barcha autentifikatsiyalangan foydalanuvchilar ko'ra oladi
 * (faol va nofaollarni ham — frontend tanlagichlar uchun o'zi filtrlaydi);
 * yozish (POST/PUT/PATCH) faqat OWNER/MANAGER uchun (assertCanManageCatalog).
 * Xarajatlar kod orqali bog'langani uchun qattiq o'chirish (DELETE) yo'q —
 * faqat faol/nofaol holat almashtiriladi.
 */
@RestController
@RequestMapping("/api/v1/expense-categories")
@RequiredArgsConstructor
public class ExpenseCategoryController {

    private final ExpenseCategoryRepository expenseCategoryRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<ExpenseCategoryResponse> list() {
        return expenseCategoryRepository.findAllByIsDeletedFalseOrderByIdAsc().stream()
                .map(ExpenseCategoryResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<ExpenseCategoryResponse> create(@Valid @RequestBody ExpenseCategoryRequest request) {
        currentUserService.assertCanManageCatalog();

        String code = request.getCode().trim().toUpperCase();
        if (expenseCategoryRepository.findByCodeIgnoreCaseAndIsDeletedFalse(code).isPresent()) {
            throw new BadRequestException("Bu kod bilan xarajat kategoriyasi allaqachon mavjud: " + code);
        }

        ExpenseCategory category = ExpenseCategory.builder()
                .code(code)
                .name(request.getName())
                .isActive(true)
                .build();
        category = expenseCategoryRepository.save(category);

        return ResponseEntity.ok(ExpenseCategoryResponse.from(category));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExpenseCategoryResponse> update(@PathVariable Long id, @Valid @RequestBody ExpenseCategoryRequest request) {
        currentUserService.assertCanManageCatalog();

        ExpenseCategory category = expenseCategoryRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarajat kategoriyasi topilmadi: " + id));

        String code = request.getCode().trim().toUpperCase();
        if (expenseCategoryRepository.existsByCodeIgnoreCaseAndIsDeletedFalseAndIdNot(code, id)) {
            throw new BadRequestException("Bu kod bilan xarajat kategoriyasi allaqachon mavjud: " + code);
        }

        category.setCode(code);
        category.setName(request.getName());
        category = expenseCategoryRepository.save(category);

        return ResponseEntity.ok(ExpenseCategoryResponse.from(category));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<ExpenseCategoryResponse> activate(@PathVariable Long id) {
        currentUserService.assertCanManageCatalog();

        ExpenseCategory category = expenseCategoryRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarajat kategoriyasi topilmadi: " + id));
        category.setIsActive(true);
        category = expenseCategoryRepository.save(category);

        return ResponseEntity.ok(ExpenseCategoryResponse.from(category));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<ExpenseCategoryResponse> deactivate(@PathVariable Long id) {
        currentUserService.assertCanManageCatalog();

        ExpenseCategory category = expenseCategoryRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Xarajat kategoriyasi topilmadi: " + id));
        category.setIsActive(false);
        category = expenseCategoryRepository.save(category);

        return ResponseEntity.ok(ExpenseCategoryResponse.from(category));
    }
}
