package uz.savdo.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import uz.savdo.tenant.TenantDataSourceRegistry;

import javax.sql.DataSource;

/**
 * DIQQAT: bu bean ATAYLAB platform_db/CompanyRepository'ga BOG'LIQ EMAS — chunki bu bean
 * ("dataSource") Flyway/JPA'dan OLDIN qurilishi shart, lekin CompanyRepository to'liq
 * Spring kontekstini talab qiladi. Bog'lansa soxta circular-dependency xatosi chiqadi.
 * Yechim: bu yerda faqat bootstrap (spring.datasource.url'dan) DataSource qo'lda
 * ro'yxatga olinadi. Qolgan barcha kompaniyalar TenantRegistryInitializer orqali,
 * kontekst TO'LIQ qurilgandan KEYIN (ApplicationRunner), platform_db'dan yuklanadi.
 *
 * spring.datasource.url bootstrap uchun ATAYLAB tenant yoki platform_db emas, balki har
 * doim mavjud bo'lgan neytral baza (odatda Postgres tizim bazasi "postgres")ga ishora
 * qiladi — shu bilan bootstrap ulanish hech qanday haqiqiy kompaniya yoki platform
 * ma'lumotlari bilan to'qnashmaydi.
 */
@Configuration
@Slf4j
public class TenantDataSourceConfig {

    @Value("${spring.datasource.url}")
    private String defaultUrl;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Value("${spring.datasource.driver-class-name}")
    private String driverClassName;

    @Bean(name = "dataSource")
    @Primary
    public DataSource dataSource(TenantDataSourceRegistry registry) {
        registry.init(username, password, driverClassName);
        DataSource defaultDs = registry.buildDataSourceFromUrl(defaultUrl);
        registry.register("default-bootstrap", defaultDs, true);

        log.info("Tenant routing DataSource boshlang'ich (bootstrap) holatda tayyor");
        return registry.getRoutingDataSource();
    }
}
