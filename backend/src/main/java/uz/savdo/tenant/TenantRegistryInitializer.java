package uz.savdo.tenant;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
            // savdo'da "default" legacy kompaniya yo'q (inventarizatsiya'dan farqli) — shu sababli
            // bootstrap DataSource TenantDataSourceConfig'da o'rnatilgan default bo'lib qolaveradi.
            boolean isDefault = false;
            registry.register(company.getDbName(), ds, isDefault);
        }

        registry.removeAndClose("default-bootstrap");

        log.info("Tenant routing DataSource {} ta kompaniya bilan to'liq yuklandi", companies.size());
    }
}
