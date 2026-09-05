package uz.savdo.platform.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.platform.dto.PlanRequest;
import uz.savdo.platform.dto.PlanResponse;
import uz.savdo.platform.entity.Plan;
import uz.savdo.platform.entity.PlatformUser;
import uz.savdo.platform.repository.PlanRepository;
import uz.savdo.platform.service.PlatformAuditLogService;

import java.util.List;

/**
 * Superadmin uchun obuna rejalari (tariflar) boshqaruvi: ro'yxat, yaratish, tahrirlash,
 * faol/nofaol qilish. Boshqa superadmin hisoblar kabi — qattiq o'chirish (DELETE) yo'q,
 * faqat faol/nofaol holat almashtiriladi (PlatformAdminController'dagi uslub bilan bir xil).
 */
@RestController
@RequestMapping("/api/v1/platform/plans")
@RequiredArgsConstructor
public class PlanController {

    private final PlanRepository planRepository;
    private final PlatformAuditLogService platformAuditLogService;

    @GetMapping
    public List<PlanResponse> list() {
        return planRepository.findAll().stream()
                .map(PlanResponse::from)
                .toList();
    }

    @GetMapping("/{id}")
    public PlanResponse detail(@PathVariable Long id) {
        return planRepository.findById(id)
                .map(PlanResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Reja topilmadi"));
    }

    @PostMapping
    public ResponseEntity<PlanResponse> create(@AuthenticationPrincipal PlatformUser currentAdmin,
                                                @Valid @RequestBody PlanRequest request) {
        if (planRepository.existsByNameIgnoreCaseExcludingId(request.getName(), null)) {
            throw new BadRequestException("Bu nomdagi reja allaqachon mavjud");
        }

        Plan plan = Plan.builder()
                .name(request.getName())
                .priceMonthly(request.getPriceMonthly())
                .maxBranches(request.getMaxBranches())
                .maxUsers(request.getMaxUsers())
                .maxProducts(request.getMaxProducts())
                .description(request.getDescription())
                .isActive(true)
                .build();
        Long id = planRepository.insert(plan);

        platformAuditLogService.log(currentAdmin.getId(), "PLAN_CREATED", null,
                "Yangi reja yaratildi: " + request.getName());

        return ResponseEntity.ok(PlanResponse.from(planRepository.findById(id).orElseThrow()));
    }

    @PutMapping("/{id}")
    public PlanResponse update(@AuthenticationPrincipal PlatformUser currentAdmin,
                                @PathVariable Long id,
                                @Valid @RequestBody PlanRequest request) {
        Plan existing = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reja topilmadi"));
        if (planRepository.existsByNameIgnoreCaseExcludingId(request.getName(), id)) {
            throw new BadRequestException("Bu nomdagi reja allaqachon mavjud");
        }

        String oldName = existing.getName();

        Plan updated = Plan.builder()
                .name(request.getName())
                .priceMonthly(request.getPriceMonthly())
                .maxBranches(request.getMaxBranches())
                .maxUsers(request.getMaxUsers())
                .maxProducts(request.getMaxProducts())
                .description(request.getDescription())
                .build();
        planRepository.update(id, updated);

        platformAuditLogService.log(currentAdmin.getId(), "PLAN_UPDATED", null,
                "Reja tahrirlandi: '" + oldName + "' -> '" + request.getName() + "'");

        return PlanResponse.from(planRepository.findById(id).orElseThrow());
    }

    @PatchMapping("/{id}/activate")
    public PlanResponse activate(@AuthenticationPrincipal PlatformUser currentAdmin, @PathVariable Long id) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reja topilmadi"));

        planRepository.updateActive(id, true);
        platformAuditLogService.log(currentAdmin.getId(), "PLAN_ACTIVATED", null,
                "Reja faollashtirildi: " + plan.getName());

        return PlanResponse.from(planRepository.findById(id).orElseThrow());
    }

    @PatchMapping("/{id}/deactivate")
    public PlanResponse deactivate(@AuthenticationPrincipal PlatformUser currentAdmin, @PathVariable Long id) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Reja topilmadi"));

        planRepository.updateActive(id, false);
        platformAuditLogService.log(currentAdmin.getId(), "PLAN_DEACTIVATED", null,
                "Reja nofaollashtirildi: " + plan.getName());

        return PlanResponse.from(planRepository.findById(id).orElseThrow());
    }
}
