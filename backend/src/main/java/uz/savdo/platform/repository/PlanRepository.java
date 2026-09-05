package uz.savdo.platform.repository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Component;
import uz.savdo.platform.entity.Plan;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Types;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class PlanRepository {

    private final JdbcTemplate jdbc;

    public PlanRepository(@Qualifier("platformJdbcTemplate") JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private static final RowMapper<Plan> MAPPER = (rs, rowNum) -> Plan.builder()
            .id(rs.getLong("id"))
            .name(rs.getString("name"))
            .priceMonthly(rs.getBigDecimal("price_monthly"))
            .maxBranches(rs.getObject("max_branches", Integer.class))
            .maxUsers(rs.getObject("max_users", Integer.class))
            .maxProducts(rs.getObject("max_products", Integer.class))
            .description(rs.getString("description"))
            .isActive(rs.getBoolean("is_active"))
            .createdAt(rs.getTimestamp("created_at").toLocalDateTime())
            .updatedAt(rs.getTimestamp("updated_at") != null ? rs.getTimestamp("updated_at").toLocalDateTime() : null)
            .build();

    public List<Plan> findAll() {
        return jdbc.query("SELECT * FROM plans ORDER BY price_monthly ASC", MAPPER);
    }

    public Optional<Plan> findById(Long id) {
        List<Plan> results = jdbc.query("SELECT * FROM plans WHERE id = ?", MAPPER, id);
        return results.stream().findFirst();
    }

    /** Berilgan id'lar bo'yicha rejalarni bitta so'rovda olib, Map sifatida qaytaradi (batch-resolve). */
    public Map<Long, Plan> findByIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Long> distinctIds = ids.stream().distinct().toList();
        String placeholders = distinctIds.stream().map(id -> "?").collect(Collectors.joining(","));
        List<Plan> results = jdbc.query(
                "SELECT * FROM plans WHERE id IN (" + placeholders + ")", MAPPER, distinctIds.toArray());
        return results.stream().collect(Collectors.toMap(Plan::getId, Function.identity()));
    }

    public boolean existsByNameIgnoreCaseExcludingId(String name, Long excludeId) {
        Integer count;
        if (excludeId != null) {
            count = jdbc.queryForObject(
                    "SELECT count(*) FROM plans WHERE lower(name) = lower(?) AND id <> ?",
                    Integer.class, name, excludeId);
        } else {
            count = jdbc.queryForObject(
                    "SELECT count(*) FROM plans WHERE lower(name) = lower(?)", Integer.class, name);
        }
        return count != null && count > 0;
    }

    public Long insert(Plan plan) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO plans (name, price_monthly, max_branches, max_users, max_products, description, is_active) " +
                            "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    new String[]{"id"});
            ps.setString(1, plan.getName());
            ps.setBigDecimal(2, plan.getPriceMonthly());
            setNullableInt(ps, 3, plan.getMaxBranches());
            setNullableInt(ps, 4, plan.getMaxUsers());
            setNullableInt(ps, 5, plan.getMaxProducts());
            ps.setString(6, plan.getDescription());
            ps.setBoolean(7, plan.getIsActive() != null ? plan.getIsActive() : true);
            return ps;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    public void update(Long id, Plan plan) {
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "UPDATE plans SET name = ?, price_monthly = ?, max_branches = ?, max_users = ?, " +
                            "max_products = ?, description = ?, updated_at = now() WHERE id = ?");
            ps.setString(1, plan.getName());
            ps.setBigDecimal(2, plan.getPriceMonthly());
            setNullableInt(ps, 3, plan.getMaxBranches());
            setNullableInt(ps, 4, plan.getMaxUsers());
            setNullableInt(ps, 5, plan.getMaxProducts());
            ps.setString(6, plan.getDescription());
            ps.setLong(7, id);
            return ps;
        });
    }

    public void updateActive(Long id, boolean isActive) {
        jdbc.update("UPDATE plans SET is_active = ?, updated_at = now() WHERE id = ?", isActive, id);
    }

    private void setNullableInt(PreparedStatement ps, int index, Integer value) throws java.sql.SQLException {
        if (value != null) {
            ps.setInt(index, value);
        } else {
            ps.setNull(index, Types.INTEGER);
        }
    }
}
