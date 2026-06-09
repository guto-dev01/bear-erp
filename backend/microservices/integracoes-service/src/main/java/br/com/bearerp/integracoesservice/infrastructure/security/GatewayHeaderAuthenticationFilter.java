package br.com.bearerp.integracoesservice.infrastructure.security;

import br.com.bearerp.common.domain.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Autentica a requisição com base nos headers injetados pelo api-gateway.
 *
 * O gateway valida o JWT do Appwrite e propaga a identidade (X-User-Id) +
 * contexto (X-Tenant-Id / X-Empresa-Id). Os serviços só são alcançáveis através
 * do gateway na rede interna, então confiamos nesses headers aqui (padrão de
 * gateway com serviços de borda fechada). Não há revalidação de token no serviço.
 */
@Component
public class GatewayHeaderAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String userId = request.getHeader("X-User-Id");
        if (StringUtils.hasText(userId)) {
            TenantContext.setTenantId(request.getHeader("X-Tenant-Id"));
            TenantContext.setEmpresaId(request.getHeader("X-Empresa-Id"));
            SecurityContextHolder.getContext().setAuthentication(
                    new UsernamePasswordAuthenticationToken(userId, null, List.of()));
        }
        try {
            filterChain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }
}
