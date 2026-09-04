package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.supplier.SupplierRequest;
import uz.savdo.dto.supplier.SupplierResponse;
import uz.savdo.entity.Supplier;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.SupplierRepository;
import uz.savdo.security.CurrentUserService;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Yetkazib beruvchilar. Barcha autentifikatsiyalangan foydalanuvchilar ko'ra oladi;
 * yozish (POST/PUT/DELETE) faqat OWNER/MANAGER uchun (assertCanManageCatalog).
 */
@RestController
@RequestMapping("/api/v1/suppliers")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierRepository supplierRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<SupplierResponse> list() {
        return supplierRepository.findAllByIsDeletedFalseOrderByIdAsc().stream()
                .map(SupplierResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<SupplierResponse> create(@Valid @RequestBody SupplierRequest request) {
        currentUserService.assertCanManageCatalog();

        Supplier supplier = Supplier.builder()
                .name(request.getName())
                .phone(request.getPhone())
                .address(request.getAddress())
                .contactPerson(request.getContactPerson())
                .isActive(true)
                .build();
        supplier = supplierRepository.save(supplier);

        return ResponseEntity.ok(SupplierResponse.from(supplier));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SupplierResponse> update(@PathVariable Long id, @Valid @RequestBody SupplierRequest request) {
        currentUserService.assertCanManageCatalog();

        Supplier supplier = supplierRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Yetkazib beruvchi topilmadi: " + id));
        supplier.setName(request.getName());
        supplier.setPhone(request.getPhone());
        supplier.setAddress(request.getAddress());
        supplier.setContactPerson(request.getContactPerson());
        supplier = supplierRepository.save(supplier);

        return ResponseEntity.ok(SupplierResponse.from(supplier));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        currentUserService.assertCanManageCatalog();

        Supplier supplier = supplierRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Yetkazib beruvchi topilmadi: " + id));
        supplier.setIsDeleted(true);
        supplier.setDeletedAt(LocalDateTime.now());
        supplierRepository.save(supplier);

        return ResponseEntity.noContent().build();
    }
}
