package uz.savdo.tenant;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Kompaniya (tenant) bazalari uchun ulanish havzalarini boshqaradi.
 * Ilova ishga tushganda platform_db'dagi barcha kompaniyalar uchun oldindan yaratiladi;
 * yangi kompaniya ro'yxatdan o'tganda (provisioning funksiyasi) qayta ishga tushirmasdan
 * {@link #register} orqali qo'shiladi.
 */
@Component
@Slf4j
public class TenantDataSourceRegistry {

    private final Map<String, DataSource> dataSources = new ConcurrentHashMap<>();
    private final TenantRoutingDataSource routingDataSource = new TenantRoutingDataSource();

    private String username;
    private String password;
    private String driverClassName;

    public void init(String username, String password, String driverClassName) {
        this.username = username;
        this.password = password;
        this.driverClassName = driverClassName;
    }

    public DataSource buildDataSource(String host, int port, String dbName) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:postgresql://" + host + ":" + port + "/" + dbName);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName(driverClassName);
        config.setPoolName("tenant-" + dbName);
        // Har bir kompaniyaga ALOHIDA pool ochiladi, shuning uchun bu sonlar
        // kompaniyalar soniga ko'paytiriladi. Avval 10 edi va minimumIdle
        // belgilanmagani uchun Hikari uni ham 10 ga tenglashtirardi — ya'ni har
        // bir kompaniya hech qanday trafiksiz 10 ta ulanishni band qilardi va
        // Postgres'ning standart 100 ta chegarasi ~10 kompaniyada to'lardi.
        config.setMaximumPoolSize(3);
        config.setMinimumIdle(0);
        config.setIdleTimeout(60_000);
        config.setMaxLifetime(1_800_000);
        config.setConnectionTimeout(10_000);
        return new HikariDataSource(config);
    }

    /**
     * Ilova ishga tushish bosqichida (platform_db hali so'ralmasdan) foydalaniladi —
     * to'liq JDBC URL asosida.
     */
    public DataSource buildDataSourceFromUrl(String jdbcUrl) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName(driverClassName);
        config.setPoolName("tenant-bootstrap");
        config.setMaximumPoolSize(10);
        return new HikariDataSource(config);
    }

    public void removeAndClose(String key) {
        DataSource removed = dataSources.remove(key);
        routingDataSource.setTargetDataSources(Map.copyOf(dataSources));
        routingDataSource.afterPropertiesSet();
        if (removed instanceof HikariDataSource hikari) {
            hikari.close();
        }
    }

    public void register(String dbName, DataSource dataSource, boolean isDefault) {
        dataSources.put(dbName, dataSource);
        routingDataSource.setTargetDataSources(Map.copyOf(dataSources));
        if (isDefault) {
            routingDataSource.setDefaultTargetDataSource(dataSource);
        }
        routingDataSource.afterPropertiesSet();
        log.info("Tenant DataSource registratsiya qilindi: {}", dbName);
    }

    public TenantRoutingDataSource getRoutingDataSource() {
        return routingDataSource;
    }
}
