package uz.savdo.tenant;

import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource;

/**
 * Har bir so'rovni {@link TenantContext}da belgilangan kompaniya bazasiga yo'naltiradi.
 * Kontekst bo'sh bo'lsa (masalan, ilova ishga tushayotganda Flyway/Hibernate schema
 * tekshiruvi paytida), {@code defaultTargetDataSource} (bootstrap ulanish) ishlatiladi.
 */
public class TenantRoutingDataSource extends AbstractRoutingDataSource {

    @Override
    protected Object determineCurrentLookupKey() {
        return TenantContext.get();
    }
}
