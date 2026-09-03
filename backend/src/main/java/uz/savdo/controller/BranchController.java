package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.branch.BranchRequest;
import uz.savdo.dto.branch.BranchResponse;
import uz.savdo.entity.Branch;
import uz.savdo.repository.BranchRepository;
import uz.savdo.security.CurrentUserService;

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
}
