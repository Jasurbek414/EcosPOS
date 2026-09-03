package uz.savdo.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import uz.savdo.dto.user.UserRequest;
import uz.savdo.dto.user.UserResponse;
import uz.savdo.entity.User;
import uz.savdo.enums.UserRole;
import uz.savdo.exception.BadRequestException;
import uz.savdo.repository.UserRepository;
import uz.savdo.security.CurrentUserService;

import java.util.List;

/**
 * Xodimlar (foydalanuvchilar) boshqaruvi. OWNER barcha xodimlarni ko'radi/yaratadi;
 * MANAGER faqat o'z filialidagi xodimlarni ko'ra oladi (yaratish esa faqat OWNER'ga
 * ruxsat etilgan — assertIsOwner()).
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final CurrentUserService currentUserService;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    public List<UserResponse> list() {
        User current = currentUserService.getCurrentUser();
        List<User> users;
        if (current.getRole() == UserRole.OWNER) {
            users = userRepository.findAllByIsDeletedFalseOrderByIdAsc();
        } else if (current.getRole() == UserRole.MANAGER) {
            users = userRepository.findAllByBranchIdAndIsDeletedFalseOrderByIdAsc(current.getBranchId());
        } else {
            currentUserService.assertIsOwner(); // CASHIER uchun har doim 403
            users = List.of();
        }
        return users.stream().map(UserResponse::from).toList();
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserRequest request) {
        currentUserService.assertIsOwner();

        if (userRepository.existsByUsernameAndIsDeletedFalse(request.getUsername())) {
            throw new BadRequestException("Bu username allaqachon band: " + request.getUsername());
        }
        if (request.getRole() != UserRole.OWNER && request.getBranchId() == null) {
            throw new BadRequestException("MANAGER/CASHIER uchun filial (branchId) kiritilishi shart");
        }

        User user = User.builder()
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(request.getRole())
                .branchId(request.getRole() == UserRole.OWNER ? null : request.getBranchId())
                .isActive(true)
                .build();
        user = userRepository.save(user);

        return ResponseEntity.ok(UserResponse.from(user));
    }
}
