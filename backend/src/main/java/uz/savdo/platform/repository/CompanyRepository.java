package uz.savdo.platform.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Component;
import uz.savdo.platform.entity.Company;
import uz.savdo.platform.enums.CompanyStatus;

import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
public class CompanyRepository {

    private final JdbcTemplate jdbc;

    public CompanyRepository(@Qualifier("platformJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final RowMapper<Company> MAPPER = (rs, rowNum) -> Company.builder()
            .id(rs.getLong("id"))
            .slug(rs.getString("slug"))
            .name(rs.getString("name"))
            .dbHost(rs.getString("db_host"))
            .dbPort(rs.getInt("db_port"))
            .dbName(rs.getString("db_name"))
            .dbUsername(rs.getString("db_username"))
            .address(rs.getString("address"))
            .phone(rs.getString("phone"))
            .logoUrl(rs.getString("logo_url"))
            .status(CompanyStatus.valueOf(rs.getString("status")))
            .blockedReason(rs.getString("blocked_reason"))
            .blockedAt(rs.getTimestamp("blocked_at") != null ? rs.getTimestamp("blocked_at").toLocalDateTime() : null)
            .planId(rs.getObject("plan_id", Long.class))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .updatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
            .isDeleted(rs.getBoolean("is_deleted"))
            .deletedAt(rs.getTimestamp("deleted_at") != null ? rs.getTimestamp("deleted_at").toLocalDateTime() : null)
            .build();

    public List<Company> findAllNotDeleted() {
        return jdbc.query("SELECT * FROM companies WHERE is_deleted = false ORDER BY created_at DESC", MAPPER);
    }

    public Optional<Company> findBySlug(String slug) {
        List<Company> results = jdbc.query(
                "SELECT * FROM companies WHERE slug = ? AND is_deleted = false", MAPPER, slug);
        return results.stream().findFirst();
    }

    public Optional<Company> findById(Long id) {
        List<Company> results = jdbc.query(
                "SELECT * FROM companies WHERE id = ? AND is_deleted = false", MAPPER, id);
        return results.stream().findFirst();
    }

    /** O'chirilgan (is_deleted=true) kompaniyalarni ham qaytaradi — audit jurnalida nom ko'rsatish uchun. */
    public Optional<Company> findByIdIncludingDeleted(Long id) {
        List<Company> results = jdbc.query("SELECT * FROM companies WHERE id = ?", MAPPER, id);
        return results.stream().findFirst();
    }

    public boolean existsBySlug(String slug) {
        Integer count = jdbc.queryForObject(
                "SELECT count(*) FROM companies WHERE slug = ?", Integer.class, slug);
        return count != null && count > 0;
    }

    public Long insert(Company company) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO companies (slug, name, db_host, db_port, db_name, db_username, status, plan_id) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    new String[]{"id"});
            ps.setString(1, company.getSlug());
            ps.setString(2, company.getName());
            ps.setString(3, company.getDbHost());
            ps.setInt(4, company.getDbPort());
            ps.setString(5, company.getDbName());
            ps.setString(6, company.getDbUsername());
            ps.setString(7, company.getStatus().name());
            if (company.getPlanId() != null) {
                ps.setLong(8, company.getPlanId());
            } else {
                ps.setNull(8, java.sql.Types.BIGINT);
            }
            return ps;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public void updateStatus(Long id, CompanyStatus status, String blockedReason, LocalDateTime blockedAt) {
        jdbc.update(
                "UPDATE companies SET status = ?, blocked_reason = ?, blocked_at = ?, updated_at = now() WHERE id = ?",
                status.name(), blockedReason, blockedAt != null ? Timestamp.valueOf(blockedAt) : null, id);
    }

    /** Kompaniya nomini (display name) o'zgartirish — slug (login uchun) O'ZGARMAYDI. */
    public void updateName(Long id, String name) {
        jdbc.update("UPDATE companies SET name = ?, updated_at = now() WHERE id = ?", name, id);
    }

    /**
     * Tenant OWNER'ning o'z-o'ziga xizmat ko'rsatish profilini yangilashi — nom, manzil,
     * telefon va logo URL (chek/kvitansiyalarda ko'rsatish uchun). slug O'ZGARMAYDI.
     */
    public void updateProfile(Long id, String name, String address, String phone, String logoUrl) {
        jdbc.update("UPDATE companies SET name = ?, address = ?, phone = ?, logo_url = ?, updated_at = now() WHERE id = ?",
                name, address, phone, logoUrl, id);
    }

    /** Kompaniyaga biriktirilgan rejani o'zgartirish/olib tashlash (planId null bo'lsa — rejasiz). */
    public void updatePlan(Long id, Long planId) {
        jdbc.update("UPDATE companies SET plan_id = ?, updated_at = now() WHERE id = ?", planId, id);
    }
}
