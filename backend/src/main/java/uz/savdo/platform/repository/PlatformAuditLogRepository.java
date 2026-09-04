package uz.savdo.platform.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;
import uz.savdo.platform.entity.PlatformAuditLog;

import java.sql.Types;
import java.util.List;

@Component
public class PlatformAuditLogRepository {

    private final JdbcTemplate jdbc;

    public PlatformAuditLogRepository(@Qualifier("platformJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final RowMapper<PlatformAuditLog> MAPPER = (rs, rowNum) -> PlatformAuditLog.builder()
            .id(rs.getLong("id"))
            .platformUserId(rs.getObject("platform_user_id") != null ? rs.getLong("platform_user_id") : null)
            .action(rs.getString("action"))
            .companyId(rs.getObject("company_id") != null ? rs.getLong("company_id") : null)
            .details(rs.getString("details"))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .build();

    public void insert(Long platformUserId, String action, Long companyId, String details) {
        jdbc.update(connection -> {
            var ps = connection.prepareStatement(
                    "INSERT INTO platform_audit_log (platform_user_id, action, company_id, details) VALUES (?, ?, ?, ?)");
            if (platformUserId != null) {
                ps.setLong(1, platformUserId);
            } else {
                ps.setNull(1, Types.BIGINT);
            }
            ps.setString(2, action);
            if (companyId != null) {
                ps.setLong(3, companyId);
            } else {
                ps.setNull(3, Types.BIGINT);
            }
            ps.setString(4, details);
            return ps;
        });
    }

    /** companyId null bo'lsa barcha kompaniyalar bo'yicha, aks holda faqat shu kompaniya bo'yicha. */
    public List<PlatformAuditLog> findAllPaged(Long companyId, int page, int size) {
        if (companyId != null) {
            return jdbc.query(
                    "SELECT * FROM platform_audit_log WHERE company_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                    MAPPER, companyId, size, page * size);
        }
        return jdbc.query(
                "SELECT * FROM platform_audit_log ORDER BY created_at DESC LIMIT ? OFFSET ?",
                MAPPER, size, page * size);
    }

    public long count(Long companyId) {
        Long total = companyId != null
                ? jdbc.queryForObject("SELECT count(*) FROM platform_audit_log WHERE company_id = ?", Long.class, companyId)
                : jdbc.queryForObject("SELECT count(*) FROM platform_audit_log", Long.class);
        return total != null ? total : 0L;
    }
}
