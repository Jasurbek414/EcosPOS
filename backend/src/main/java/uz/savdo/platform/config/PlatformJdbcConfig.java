package uz.savdo.platform.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Platform (master) bazasi uchun mustaqil ulanish.
 *
 * DIQQAT: bu yerda ataylab {@link javax.sql.DataSource} yoki {@link Flyway} turidagi bean
 * e'lon QILINMAYDI. Spring Boot'ning avtomatik DataSource/Flyway konfiguratsiyasi
 * {@code @ConditionalOnMissingBean(DataSource.class)} kabi shartlarga asoslangan — agar
 * shu turdagi ikkinchi bean paydo bo'lsa, Boot tenant DataSource uchun avtomatik
 * konfiguratsiyani BUTUNLAY o'chirib qo'yadi. Shu sababli platform DataSource faqat
 * ichki obyekt sifatida yaratiladi va faqat JdbcTemplate orqali tashqariga chiqariladi.
 */
@Configuration
@Slf4j
public class PlatformJdbcConfig {

    @Value("${platform.datasource.url}")
    private String url;

    @Value("${platform.datasource.username}")
    private String username;

    @Value("${platform.datasource.password}")
    private String password;

    @Value("${platform.datasource.driver-class-name}")
    private String driverClassName;

    @Value("${platform.flyway.locations}")
    private String flywayLocations;

    @Bean(name = "platformJdbcTemplate")
    public JdbcTemplate platformJdbcTemplate() {
        migrate();

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName(driverClassName);
        config.setPoolName("platform-pool");
        config.setMaximumPoolSize(5);

        return new JdbcTemplate(new HikariDataSource(config));
    }

    private void migrate() {
        log.info("Platform bazasi migratsiyasi boshlanmoqda...");
        Flyway.configure()
                .dataSource(url, username, password)
                .locations(flywayLocations)
                .baselineOnMigrate(true)
                .load()
                .migrate();
        log.info("Platform bazasi migratsiyasi tugadi.");
    }
}
