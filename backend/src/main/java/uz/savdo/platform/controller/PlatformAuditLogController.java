package uz.savdo.platform.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import uz.savdo.platform.dto.AuditLogResponse;
import uz.savdo.platform.service.PlatformAuditLogService;

import java.util.List;

/**
 * Superadmin harakatlari jurnali (kompaniya yaratish/bloklash/parol tiklash va h.k.),
 * ixtiyoriy ravishda bitta kompaniya bo'yicha filtrlash bilan, eng yangisi birinchi.
 */
@RestController
@RequestMapping("/api/v1/platform/audit-log")
@RequiredArgsConstructor
public class PlatformAuditLogController {

    private final PlatformAuditLogService platformAuditLogService;

    @GetMapping
    public List<AuditLogResponse> list(@RequestParam(required = false) Long companyId,
                                        @RequestParam(defaultValue = "0") int page,
                                        @RequestParam(defaultValue = "50") int size) {
        return platformAuditLogService.list(companyId, page, size);
    }
}
