package uz.savdo.tenant;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.repository.CompanyRepository;

import javax.sql.DataSource;
import java.util.List;

/**
 * Ilova to'liq ishga tushgandan keyin (Spring konteksti tayyor bo'lgach) platform_db'dagi
 * barcha kompaniyalarni tenant routing registriga yuklaydi. TenantDataSourceConfig'dagi
 * bootstrap DataSource'dan farqli — bu yerda CompanyRepository'ga bemalol bog'lanish
 * mumkin, chunki ApplicationRunner butun kontekst qurilgandan KEYIN ishga tushadi.
 */
@Component
@RequiredArgsConstructor
@Slf4j
@Order(0)
public class TenantRegistryInitializer implements ApplicationRunner {

    private final CompanyRepository companyRepository;
    private final TenantDataSourceRegistry registry;

    @Override
    public void run(ApplicationArguments args) {
        List<Company> companies = companyRepository.findAllNotDeleted();

        if (companies.isEmpty()) {
            log.warn("platform_db'da hech qanday kompaniya topilmadi — faqat bootstrap ulanish ishlatiladi");
            return;
        }

        for (Company company : companies) {
            DataSource ds = registry.buildDataSource(company.getDbHost(), company.getDbPort(), company.getDbName());

            // MUHIM (2026-09-04, V3 katalog+ombor migratsiyasi qo'shilganda jonli aniqlangan
            // xato): CompanyProvisioningService faqat YANGI kompaniya yaratilganda Flyway'ni
            // ishga tushiradi. Backend'ga yangi migratsiya fayli (masalan V3, V4, ...) qo'shib
            // qayta deploy qilinganda, ALLAQACHON mavjud kompaniyalarning bazasi hech qachon
            // yangilanmay qolib ketardi — ular V1/V2'da "muzlab qolgan", yangi jadval/ustunlar
            // (masalan "categories", "stock_levels") shunchaki YO'Q edi, va birinchi so'rovda
            // "relation does not exist" bilan yiqilardi. Yechim: ilova HAR ishga tushganda,
            // routing registrga qo'shishdan oldin, har bir mavjud tenant bazasini ham Flyway
            // orqali eng so'nggi migratsiyagacha yangilaymiz (Flyway o'zining flyway_schema_
            // history jadvali bilan buni xavfsiz/idempotent qiladi — allaqachon qo'llangan
            // migratsiyalarni qayta ishlatmaydi).
            try {
                Flyway.configure()
                        .dataSource(ds)
                        .locations("classpath:db/migration")
                        .baselineOnMigrate(true)
                        .load()
                        .migrate();
            } catch (Exception e) {
                // Bitta buzuq tenant bazasi butun ilova ishga tushishini to'xtatmasin —
                // shu kompaniya baribir ro'yxatga olinadi (eski sxema bilan bo'lsa ham),
                // xato aniq loglanadi va keyinroq qo'lda tekshirish mumkin.
                log.error("Tenant Flyway migratsiyasi muvaffaqiyatsiz: {} ({})", company.getSlug(), company.getDbName(), e);
            }

            // savdo'da "default" legacy kompaniya yo'q (inventarizatsiya'dan farqli) — shu sababli
            // bootstrap DataSource TenantDataSourceConfig'da o'rnatilgan default bo'lib qolaveradi.
            boolean isDefault = false;
            registry.register(company.getDbName(), ds, isDefault);
        }

        registry.removeAndClose("default-bootstrap");

        log.info("Tenant routing DataSource {} ta kompaniya bilan to'liq yuklandi", companies.size());
    }
}
