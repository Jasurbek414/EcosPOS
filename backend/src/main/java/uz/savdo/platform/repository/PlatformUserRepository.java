package uz.savdo.platform.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Component;
import uz.savdo.platform.entity.PlatformUser;

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
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .build();

    public Optional<PlatformUser> findByUsername(String username) {
        List<PlatformUser> results = jdbc.query(
                "SELECT * FROM platform_users WHERE username = ?", MAPPER, username);
        return results.stream().findFirst();
    }

    public List<PlatformUser> findAll() {
        return jdbc.query("SELECT * FROM platform_users ORDER BY created_at DESC", MAPPER);
    }
}
