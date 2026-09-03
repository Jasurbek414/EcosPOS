package uz.savdo.platform.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import uz.savdo.platform.dto.AuditLogResponse;
import uz.savdo.platform.entity.PlatformAuditLog;
import uz.savdo.platform.entity.PlatformUser;
import uz.savdo.platform.repository.CompanyRepository;
import uz.savdo.platform.repository.PlatformAuditLogRepository;
import uz.savdo.platform.repository.PlatformUserRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlatformAuditLogService {

    private final PlatformAuditLogRepository repository;
    private final PlatformUserRepository platformUserRepository;
    private final CompanyRepository companyRepository;

    public void log(Long platformUserId, String action, Long companyId, String details) {
        repository.insert(platformUserId, action, companyId, details);
    }

    public List<AuditLogResponse> list(int page, int size) {
        Map<Long, String> platformUserNames = platformUserRepository.findAll().stream()
                .collect(Collectors.toMap(PlatformUser::getId, PlatformUser::getFullName));

        return repository.findAllPaged(page, size).stream()
                .map(entry -> AuditLogResponse.from(
                        entry,
                        platformUserNames.get(entry.getPlatformUserId()),
                        entry.getCompanyId() != null
                                ? companyRepository.findByIdIncludingDeleted(entry.getCompanyId())
                                        .map(c -> c.getName())
                                        .orElse(null)
                                : null))
                .toList();
    }

    public long count() {
        return repository.count();
    }
}
