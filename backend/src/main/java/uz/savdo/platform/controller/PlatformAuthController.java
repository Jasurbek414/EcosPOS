package uz.savdo.platform.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import uz.savdo.platform.dto.PlatformAuthResponse;
import uz.savdo.platform.dto.PlatformLoginRequest;
import uz.savdo.platform.service.PlatformAuthService;

@RestController
@RequestMapping("/api/v1/platform/auth")
@RequiredArgsConstructor
public class PlatformAuthController {

    private final PlatformAuthService platformAuthService;

    @PostMapping("/login")
    public ResponseEntity<PlatformAuthResponse> login(@Valid @RequestBody PlatformLoginRequest request) {
        return ResponseEntity.ok(platformAuthService.login(request));
    }
}
