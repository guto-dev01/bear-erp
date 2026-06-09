package br.com.bearerp.gateway.filter;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Filtro global de autenticação do gateway.
 *
 * O frontend autentica via Appwrite Cloud e envia um JWT do Appwrite
 * (account.createJWT) no header Authorization: Bearer. Este filtro valida o JWT
 * chamando o Appwrite (GET /account com X-Appwrite-Project + X-Appwrite-JWT) e,
 * em caso de sucesso, injeta X-User-Id (= $id do Appwrite) para os serviços
 * downstream. X-Tenant-Id / X-Empresa-Id vêm do cliente e são repassados como
 * estão (uso de auditoria nesta fase).
 *
 * Um cache curto por token evita uma chamada ao Appwrite a cada request (o JWT
 * do Appwrite vive ~15 min).
 */
@Slf4j
@Component
public class JwtAuthGatewayFilter implements GlobalFilter, Ordered {

    private static final List<String> PUBLIC_PATHS = List.of(
            "/api/v1/auth/login",
            "/api/v1/auth/refresh",
            "/api/v1/auth/register",
            "/api/v1/tenants/register",
            "/actuator",
            "/v3/api-docs",
            "/swagger-ui"
    );

    private final WebClient webClient;
    private final String projectId;
    private final long cacheMillis;
    private final ConcurrentHashMap<String, CachedUser> cache = new ConcurrentHashMap<>();

    private record CachedUser(String userId, long expiresAt) {}

    public JwtAuthGatewayFilter(
            WebClient.Builder webClientBuilder,
            @Value("${appwrite.endpoint}") String endpoint,
            @Value("${appwrite.project-id}") String projectId,
            @Value("${appwrite.jwt-cache-seconds:300}") long cacheSeconds) {
        this.webClient = webClientBuilder.baseUrl(endpoint).build();
        this.projectId = projectId;
        this.cacheMillis = cacheSeconds * 1000L;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getURI().getPath();
        if (PUBLIC_PATHS.stream().anyMatch(path::startsWith)) {
            return chain.filter(exchange);
        }

        String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return unauthorized(exchange);
        }
        String token = authHeader.substring(7);

        String cachedUserId = lookupCache(token);
        if (cachedUserId != null) {
            return chain.filter(withUser(exchange, cachedUserId));
        }

        return webClient.get()
                .uri("/account")
                .header("X-Appwrite-Project", projectId)
                .header("X-Appwrite-JWT", token)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .flatMap(body -> {
                    String userId = body.path("$id").asText("");
                    if (userId.isBlank()) {
                        return unauthorized(exchange);
                    }
                    cache.put(token, new CachedUser(userId, System.currentTimeMillis() + cacheMillis));
                    return chain.filter(withUser(exchange, userId));
                })
                .onErrorResume(e -> {
                    log.warn("Falha ao validar JWT do Appwrite no gateway: {}", e.getMessage());
                    return unauthorized(exchange);
                });
    }

    private String lookupCache(String token) {
        CachedUser cached = cache.get(token);
        if (cached == null) return null;
        if (cached.expiresAt() < System.currentTimeMillis()) {
            cache.remove(token);
            return null;
        }
        return cached.userId();
    }

    /** Injeta/override X-User-Id (não pode ser forjado pelo cliente). */
    private ServerWebExchange withUser(ServerWebExchange exchange, String userId) {
        ServerHttpRequest mutated = exchange.getRequest().mutate()
                .header("X-User-Id", userId)
                .build();
        return exchange.mutate().request(mutated).build();
    }

    private Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }

    @Override
    public int getOrder() {
        return -1;
    }
}
