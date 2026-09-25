package uz.savdo.platform.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Component;
import uz.savdo.platform.entity.PlatformUser;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Component
public class PlatformUserRepository {

    private final JdbcTemplate jdbc;

    public PlatformUserRepository(@Qualifier("platformJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final RowMapper<PlatformUser> MAPPER = (rs, rowNum) -> PlatformUser.builder()
            .id(rs.getLong("id"))
            .username(rs.getString("username"))
            .password(rs.getString("password"))
            .fullName(rs.getString("full_name"))
            .isActive(rs.getBoolean("is_active"))
            .failedLoginAttempts(rs.getObject("failed_login_attempts") == null ? 0 : rs.getInt("failed_login_attempts"))
            .lockedUntil(toLocalDateTime(rs, "locked_until"))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .build();

    private static LocalDateTime toLocalDateTime(ResultSet rs, String column) throws SQLException {
        java.sql.Timestamp ts = rs.getTimestamp(column);
        return ts == null ? null : ts.toLocalDateTime();
    }

    public Optional<PlatformUser> findByUsername(String username) {
        List<PlatformUser> results = jdbc.query(
                "SELECT * FROM platform_users WHERE username = ?", MAPPER, username);
        return results.stream().findFirst();
    }

    public Optional<PlatformUser> findById(Long id) {
        List<PlatformUser> results = jdbc.query(
                "SELECT * FROM platform_users WHERE id = ?", MAPPER, id);
        return results.stream().findFirst();
    }

    public List<PlatformUser> findAll() {
        return jdbc.query("SELECT * FROM platform_users ORDER BY created_at DESC", MAPPER);
    }

    public boolean existsByUsername(String username) {
        Integer count = jdbc.queryForObject(
                "SELECT count(*) FROM platform_users WHERE username = ?", Integer.class, username);
        return count != null && count > 0;
    }

    /** Yangi superadmin hisobi yaratish — bir martalik tasodifiy parol allaqachon shifrlangan holda keladi. */
    public Long insert(PlatformUser user) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO platform_users (username, password, full_name, is_active) VALUES (?, ?, ?, ?)",
                    new String[]{"id"});
            ps.setString(1, user.getUsername());
            ps.setString(2, user.getPassword());
            ps.setString(3, user.getFullName());
            ps.setBoolean(4, user.getIsActive());
            return ps;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    /** Superadminning o'z to'liq ismini o'zgartirish (o'z-o'ziga xizmat ko'rsatish profili). */
    public void updateFullName(Long id, String fullName) {
        jdbc.update("UPDATE platform_users SET full_name = ? WHERE id = ?", fullName, id);
    }

    /** Superadminning o'z parolini o'zgartirish (o'z-o'ziga xizmat ko'rsatish profili). */
    public void updatePassword(Long id, String encodedPassword) {
        jdbc.update("UPDATE platform_users SET password = ? WHERE id = ?", encodedPassword, id);
    }

    /** Boshqa superadmin tomonidan hisobni faol/nofaol qilish. */
    public void updateActive(Long id, boolean isActive) {
        jdbc.update("UPDATE platform_users SET is_active = ? WHERE id = ?", isActive, id);
    }

    /** Brute-force himoyasi: muvaffaqiyatsiz urinishlar sonini yangilash va kerak bo'lsa hisobni bloklash. */
    public void updateLoginState(Long id, int attempts, LocalDateTime lockedUntil) {
        jdbc.update("UPDATE platform_users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
                attempts, lockedUntil, id);
    }

    /** Brute-force himoyasi: muvaffaqiyatli login paytida hisoblagich va blokni nollash. */
    public void resetLoginState(Long id) {
        jdbc.update("UPDATE platform_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?", id);
    }
}
