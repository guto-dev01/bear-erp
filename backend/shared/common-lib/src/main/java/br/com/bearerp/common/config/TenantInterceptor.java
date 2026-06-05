package br.com.bearerp.common.config;

import br.com.bearerp.common.domain.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class TenantInterceptor implements HandlerInterceptor {

    private static final String TENANT_HEADER = "X-Tenant-Id";
    private static final String EMPRESA_HEADER = "X-Empresa-Id";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String tenantId = request.getHeader(TENANT_HEADER);
        String empresaId = request.getHeader(EMPRESA_HEADER);

        if (tenantId != null) {
            TenantContext.setTenantId(tenantId);
        }
        if (empresaId != null) {
            TenantContext.setEmpresaId(empresaId);
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        TenantContext.clear();
    }
}
