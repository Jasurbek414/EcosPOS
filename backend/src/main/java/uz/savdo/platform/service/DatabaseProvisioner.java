package uz.savdo.platform.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import uz.savdo.exception.BadRequestException;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Yangi tenant ma'lumotlar bazasini jismonan yaratadi (raw JDBC, CREATE DATABASE).
 *
 * DIQQAT: {@code dbName} SQL identifikator sifatida to'g'ridan-to'g'ri DDL ichiga
 * qo'yiladi — PostgreSQL CREATE DATABASE'ni JDBC PreparedStatement parametri bilan
 * berib bo'lmaydi. Shu sababli chaqiruvchi (CompanyProvisioningService) validateSlug()
 * orqali qat'iy tekshiruvdan o'tgan qiymatni yuborishi SHART.
 */
@Service
@Slf4j
public class DatabaseProvisioner {

    private static final Pattern SLUG_PATTERN = Pattern.compile("^[a-z][a-z0-9_]{2,30}$");

    private static final Set<String> RESERVED_SLUGS = Set.of(
            "postgres", "platform_db", "template0", "template1", "default", "savdo_bootstrap"
    );

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    @Value("${tenant.db.host}")
    private String host;

    @Value("${tenant.db.port}")
    private int port;

    /**
     * Slug'ni tekshiradi va shu asosda baza nomini qaytaradi ("tenant_&lt;slug&gt;").
     * Noto'g'ri bo'lsa aniq xabar bilan BadRequestException otadi.
     */
    public String validateSlugAndBuildDbName(String slug) {
        if (slug == null || !SLUG_PATTERN.matcher(slug).matches()) {
            throw new BadRequestException(
                    "Kompaniya kodi noto'g'ri formatda. Faqat kichik lotin harflari, raqamlar va pastki chiziq, " +
                            "3-31 belgi, harf bilan boshlanishi kerak (masalan: acme, mening_dokonim)");
        }
        if (RESERVED_SLUGS.contains(slug)) {
            throw new BadRequestException("Bu kod band qilingan, boshqasini tanlang: " + slug);
        }
        return "tenant_" + slug;
    }

    public void createDatabase(String dbName) {
        String adminUrl = "jdbc:postgresql://" + host + ":" + port + "/postgres";
        try (Connection conn = DriverManager.getConnection(adminUrl, username, password)) {
            conn.setAutoCommit(true);
            try (Statement stmt = conn.createStatement()) {
                // dbName shu nuqtaga faqat validateSlugAndBuildDbName() orqali o'tgan bo'lishi kerak.
                stmt.executeUpdate("CREATE DATABASE \"" + dbName + "\" OWNER " + username + " ENCODING 'UTF8'");
            }
            log.info("Yangi tenant bazasi yaratildi: {}", dbName);
        } catch (SQLException e) {
            log.error("Tenant bazasini yaratishda xatolik: {}", dbName, e);
            throw new BadRequestException("Ma'lumotlar bazasini yaratib bo'lmadi: " + e.getMessage());
        }
    }

    public String getHost() {
        return host;
    }

    public int getPort() {
        return port;
    }
}
