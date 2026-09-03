package uz.savdo.platform.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import uz.savdo.entity.User;
import uz.savdo.enums.UserRole;
import uz.savdo.exception.BadRequestException;
import uz.savdo.platform.dto.CreateCompanyRequest;
import uz.savdo.platform.dto.CreateCompanyResponse;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.enums.CompanyStatus;
import uz.savdo.platform.repository.CompanyRepository;
import uz.savdo.platform.util.RandomPasswordGenerator;
import uz.savdo.repository.UserRepository;
import uz.savdo.tenant.TenantContext;
import uz.savdo.tenant.TenantDataSourceRegistry;

import javax.sql.DataSource;

/**
 * Yangi kompaniya (tenant) yaratish: alohida baza + sxema + birinchi OWNER foydalanuvchi.
 *
 * Bosqichlar (har biri muvaffaqiyatsiz bo'lsa kompaniya FAILED holatiga o'tadi, baza
 * avtomatik o'chirilmaydi — qo'lda tozalash uchun qoldiriladi, xavfsizroq):
 * 1) slug tekshiruvi, 2) companies qatori (PROVISIONING), 3) CREATE DATABASE,
 * 4) routing registrga jonli qo'shish, 5) Flyway migratsiya, 6) seed admin
 * foydalanuvchisini yangi tasodifiy parol bilan almashtirish, 7) ACTIVE, 8) audit log.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyProvisioningService {

    private static final String TENANT_MIGRATION_LOCATIONS = "classpath:db/migration";
    private static final String DEFAULT_SEEDED_ADMIN_USERNAME = "admin";

    private final CompanyRepository companyRepository;
    private final DatabaseProvisioner databaseProvisioner;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PlatformAuditLogService platformAuditLogService;

    @Value("${spring.datasource.username}")
    private String tenantDbUsername;

    public CreateCompanyResponse createCompany(CreateCompanyRequest request, Long actingPlatformUserId) {
        String dbName = databaseProvisioner.validateSlugAndBuildDbName(request.getSlug());

        if (companyRepository.existsBySlug(request.getSlug())) {
            throw new BadRequestException("Bu kompaniya kodi allaqachon band: " + request.getSlug());
        }

        Company company = Company.builder()
                .slug(request.getSlug())
                .name(request.getName())
                .dbHost(databaseProvisioner.getHost())
                .dbPort(databaseProvisioner.getPort())
                .dbName(dbName)
                .dbUsername(tenantDbUsername)
                .status(CompanyStatus.PROVISIONING)
                .plan(request.getPlan())
                .build();
        Long companyId = companyRepository.insert(company);

        String ownerUsername = request.getAdminUsername() == null || request.getAdminUsername().isBlank()
                ? DEFAULT_SEEDED_ADMIN_USERNAME
                : request.getAdminUsername().trim();
        String ownerFullName = request.getAdminFullName() == null || request.getAdminFullName().isBlank()
                ? "Administrator"
                : request.getAdminFullName().trim();

        try {
            databaseProvisioner.createDatabase(dbName);

            DataSource tenantDs = tenantDataSourceRegistry.buildDataSource(
                    databaseProvisioner.getHost(), databaseProvisioner.getPort(), dbName);
            tenantDataSourceRegistry.register(dbName, tenantDs, false);

            migrateTenantSchema(tenantDs);

            String generatedPassword = RandomPasswordGenerator.generate();
            replaceSeededAdmin(dbName, ownerUsername, ownerFullName, generatedPassword);

            companyRepository.updateStatus(companyId, CompanyStatus.ACTIVE, null, null);
            platformAuditLogService.log(actingPlatformUserId, "COMPANY_CREATED", companyId,
                    "Kompaniya yaratildi: " + request.getSlug());

            log.info("Yangi kompaniya to'liq yaratildi va faollashtirildi: {} ({})", request.getSlug(), dbName);

            return CreateCompanyResponse.builder()
                    .id(companyId)
                    .slug(request.getSlug())
                    .name(request.getName())
                    .status(CompanyStatus.ACTIVE.name())
                    .adminUsername(ownerUsername)
                    .adminPassword(generatedPassword)
                    .build();
        } catch (Exception e) {
            log.error("Kompaniya provisioning muvaffaqiyatsiz tugadi: {} ({})", request.getSlug(), dbName, e);
            companyRepository.updateStatus(companyId, CompanyStatus.FAILED, null, null);
            throw new BadRequestException("Kompaniya yaratishda xatolik: " + e.getMessage());
        }
    }

    private void migrateTenantSchema(DataSource tenantDs) {
        Flyway.configure()
                .dataSource(tenantDs)
                .locations(TENANT_MIGRATION_LOCATIONS)
                .baselineOnMigrate(true)
                .load()
                .migrate();
    }

    /**
     * V2 migratsiyasi har doim "admin" username va tenant seed shablonidagi (hech qachon
     * ishlatilmaydigan) bcrypt hash bilan foydalanuvchi yaratadi. Yangi har bir kompaniya
     * uchun shu seed qatorni superadmin tanlagan username/full name va yangi tasodifiy
     * parolga almashtiramiz — shu bilan shablon parol hech qachon haqiqiy hisobda qolmaydi.
     */
    private void replaceSeededAdmin(String dbName, String ownerUsername, String ownerFullName, String rawPassword) {
        TenantContext.set(dbName);
        try {
            User seededAdmin = userRepository.findByUsernameAndIsDeletedFalse(DEFAULT_SEEDED_ADMIN_USERNAME)
                    .orElseThrow(() -> new IllegalStateException("Seed admin foydalanuvchisi topilmadi"));

            seededAdmin.setUsername(ownerUsername);
            seededAdmin.setFullName(ownerFullName);
            seededAdmin.setRole(UserRole.OWNER);
            seededAdmin.setBranchId(null);
            seededAdmin.setPassword(passwordEncoder.encode(rawPassword));
            seededAdmin.setFailedLoginAttempts(0);
            seededAdmin.setLockedUntil(null);
            userRepository.save(seededAdmin);
        } finally {
            TenantContext.clear();
        }
    }
}
