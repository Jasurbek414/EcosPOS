package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.branch.BranchNameResponse;
import uz.savdo.dto.branch.BranchRequest;
import uz.savdo.dto.branch.BranchResponse;
import uz.savdo.entity.Branch;
import uz.savdo.exception.BadRequestException;
import uz.savdo.exception.ResourceNotFoundException;
import uz.savdo.repository.BranchRepository;
import uz.savdo.security.CurrentUserService;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchRepository branchRepository;
    private final CurrentUserService currentUserService;

    @GetMapping
    public List<BranchResponse> list() {
        List<Long> allowedBranchIds = currentUserService.allowedBranchIds();
        List<Branch> branches = allowedBranchIds == null
                ? branchRepository.findAllByIsDeletedFalseOrderByIdAsc()
                : branchRepository.findAllById(allowedBranchIds).stream()
                        .filter(b -> !b.getIsDeleted())
                        .toList();
        return branches.stream().map(BranchResponse::from).toList();
    }

    /**
     * Rolga qaramasdan BARCHA faol filiallar nomi — filiallar orasida ko'chirish
     * formasidagi "qayerga" pikeri uchun (MANAGER/CASHIER {@code list()} orqali faqat
     * o'z filialini ko'radi, lekin transfer qabul qiluvchi filialni tanlashi kerak).
     */
    @GetMapping("/all-names")
    public List<BranchNameResponse> listAllNames() {
        return branchRepository.findAllByIsDeletedFalseOrderByIdAsc().stream()
                .filter(Branch::getIsActive)
                .map(BranchNameResponse::from)
                .toList();
    }

    @PostMapping
    public ResponseEntity<BranchResponse> create(@Valid @RequestBody BranchRequest request) {
        currentUserService.assertIsOwner();

        Branch branch = Branch.builder()
                .name(request.getName())
                .address(request.getAddress())
                .isActive(true)
                .build();
        branch = branchRepository.save(branch);

        return ResponseEntity.ok(BranchResponse.from(branch));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BranchResponse> update(@PathVariable Long id, @Valid @RequestBody BranchRequest request) {
        currentUserService.assertIsOwner();
        if (request.getIsActive() == null) {
            throw new BadRequestException("isActive kiritilishi shart");
        }

        Branch branch = branchRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: " + id));
        branch.setName(request.getName());
        branch.setAddress(request.getAddress());
        branch.setIsActive(request.getIsActive());
        branch = branchRepository.save(branch);

        return ResponseEntity.ok(BranchResponse.from(branch));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        currentUserService.assertIsOwner();

        Branch branch = branchRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Filial topilmadi: " + id));
        branch.setIsDeleted(true);
        branch.setDeletedAt(LocalDateTime.now());
        branchRepository.save(branch);

        return ResponseEntity.noContent().build();
    }
}
