package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.category.CategoryRequest;
import uz.savdo.dto.category.CategoryResponse;
import uz.savdo.entity.Category;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.CategoryRepository;
import uz.savdo.security.CurrentUserService;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Mahsulot kategoriyalari. Barcha autentifikatsiyalangan foydalanuvchilar ko'ra oladi;
 * yozish (POST/PUT/DELETE) faqat OWNER/MANAGER uchun (assertCanManageCatalog).
 */
@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryRepository categoryRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<CategoryResponse> list() {
        return categoryRepository.findAllByIsDeletedFalseOrderByIdAsc().stream()
                .map(CategoryResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<CategoryResponse> create(@Valid @RequestBody CategoryRequest request) {
        currentUserService.assertCanManageCatalog();

        Category category = Category.builder()
                .name(request.getName())
                .isActive(true)
                .build();
        category = categoryRepository.save(category);

        return ResponseEntity.ok(CategoryResponse.from(category));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponse> update(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        currentUserService.assertCanManageCatalog();

        Category category = categoryRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya topilmadi: " + id));
        category.setName(request.getName());
        category = categoryRepository.save(category);

        return ResponseEntity.ok(CategoryResponse.from(category));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        currentUserService.assertCanManageCatalog();

        Category category = categoryRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Kategoriya topilmadi: " + id));
        category.setIsDeleted(true);
        category.setDeletedAt(LocalDateTime.now());
        categoryRepository.save(category);

        return ResponseEntity.noContent().build();
    }
}
