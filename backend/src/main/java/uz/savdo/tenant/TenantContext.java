package uz.savdo.tenant;

/**
 * Joriy so'rov qaysi kompaniya (tenant) bazasiga ulanishi kerakligini saqlaydi.
 * ThreadLocal — har bir HTTP so'rov o'z ipida ishlaydi, lekin Tomcat threadlarni qayta
 * ishlatgani uchun har doim {@link #clear()} chaqirilishi SHART (finally blokida),
 * aks holda keyingi so'rov oldingi kompaniya kontekstida qolib ketishi mumkin.
 */
public final class TenantContext {

    private static final ThreadLocal<String> CURRENT_DB = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void set(String dbName) {
        CURRENT_DB.set(dbName);
    }

    public static String get() {
        return CURRENT_DB.get();
    }

    public static void clear() {
        CURRENT_DB.remove();
    }
}
