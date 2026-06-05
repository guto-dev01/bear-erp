package br.com.bearerp.common.domain;

public final class TenantContext {

    private static final ThreadLocal<String> TENANT_ID = new ThreadLocal<>();
    private static final ThreadLocal<String> EMPRESA_ID = new ThreadLocal<>();

    private TenantContext() {}

    public static String getTenantId() {
        return TENANT_ID.get();
    }

    public static void setTenantId(String tenantId) {
        TENANT_ID.set(tenantId);
    }

    public static String getEmpresaId() {
        return EMPRESA_ID.get();
    }

    public static void setEmpresaId(String empresaId) {
        EMPRESA_ID.set(empresaId);
    }

    public static void clear() {
        TENANT_ID.remove();
        EMPRESA_ID.remove();
    }
}
