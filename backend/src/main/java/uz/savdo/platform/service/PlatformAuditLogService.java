package uz.savdo.platform.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import uz.savdo.platform.dto.AuditLogResponse;
import uz.savdo.platform.entity.Company;
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

    /** companyId null bo'lsa barcha kompaniyalar bo'yicha, eng yangisi birinchi. */
    public List<AuditLogResponse> list(Long companyId, int page, int size) {
        Map<Long, String> actorUsernames = platformUserRepository.findAll().stream()
                .collect(Collectors.toMap(PlatformUser::getId, PlatformUser::getUsername));

        return repository.findAllPaged(companyId, page, size).stream()
                .map(entry -> {
                    Company company = entry.getCompanyId() != null
                            ? companyRepository.findByIdIncludingDeleted(entry.getCompanyId()).orElse(null)
                            : null;
                    return AuditLogResponse.from(
                            entry,
                            actorUsernames.get(entry.getPlatformUserId()),
                            company != null ? company.getSlug() : null,
                            company != null ? company.getName() : null);
                })
                .toList();
    }

    public long count(Long companyId) {
        return repository.count(companyId);
    }
}
