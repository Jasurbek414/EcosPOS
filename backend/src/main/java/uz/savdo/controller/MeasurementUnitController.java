package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.unit.MeasurementUnitRequest;
import uz.savdo.dto.unit.MeasurementUnitResponse;
import uz.savdo.entity.MeasurementUnit;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.MeasurementUnitRepository;
import uz.savdo.security.CurrentUserService;

import java.util.List;

/**
 * O'lchov birliklari. Barcha autentifikatsiyalangan foydalanuvchilar ko'ra oladi
 * (faol va nofaollarni ham — frontend tanlagichlar uchun o'zi filtrlaydi);
 * yozish (POST/PUT/PATCH) faqat OWNER/MANAGER uchun (assertCanManageCatalog).
 * Mahsulotlar kod orqali bog'langani uchun qattiq o'chirish (DELETE) yo'q —
 * faqat faol/nofaol holat almashtiriladi.
 */
@RestController
@RequestMapping("/api/v1/units")
@RequiredArgsConstructor
public class MeasurementUnitController {

    private final MeasurementUnitRepository measurementUnitRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<MeasurementUnitResponse> list() {
        return measurementUnitRepository.findAllByIsDeletedFalseOrderByIdAsc().stream()
                .map(MeasurementUnitResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<MeasurementUnitResponse> create(@Valid @RequestBody MeasurementUnitRequest request) {
        currentUserService.assertCanManageCatalog();

        String code = request.getCode().trim().toUpperCase();
        if (measurementUnitRepository.findByCodeIgnoreCaseAndIsDeletedFalse(code).isPresent()) {
            throw new BadRequestException("Bu kod bilan o'lchov birligi allaqachon mavjud: " + code);
        }

        MeasurementUnit unit = MeasurementUnit.builder()
                .code(code)
                .name(request.getName())
                .isActive(true)
                .build();
        unit = measurementUnitRepository.save(unit);

        return ResponseEntity.ok(MeasurementUnitResponse.from(unit));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MeasurementUnitResponse> update(@PathVariable Long id, @Valid @RequestBody MeasurementUnitRequest request) {
        currentUserService.assertCanManageCatalog();

        MeasurementUnit unit = measurementUnitRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("O'lchov birligi topilmadi: " + id));

        String code = request.getCode().trim().toUpperCase();
        if (measurementUnitRepository.existsByCodeIgnoreCaseAndIsDeletedFalseAndIdNot(code, id)) {
            throw new BadRequestException("Bu kod bilan o'lchov birligi allaqachon mavjud: " + code);
        }

        unit.setCode(code);
        unit.setName(request.getName());
        unit = measurementUnitRepository.save(unit);

        return ResponseEntity.ok(MeasurementUnitResponse.from(unit));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<MeasurementUnitResponse> activate(@PathVariable Long id) {
        currentUserService.assertCanManageCatalog();

        MeasurementUnit unit = measurementUnitRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("O'lchov birligi topilmadi: " + id));
        unit.setIsActive(true);
        unit = measurementUnitRepository.save(unit);

        return ResponseEntity.ok(MeasurementUnitResponse.from(unit));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<MeasurementUnitResponse> deactivate(@PathVariable Long id) {
        currentUserService.assertCanManageCatalog();

        MeasurementUnit unit = measurementUnitRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("O'lchov birligi topilmadi: " + id));
        unit.setIsActive(false);
        unit = measurementUnitRepository.save(unit);

        return ResponseEntity.ok(MeasurementUnitResponse.from(unit));
    }
}
