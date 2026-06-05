package br.com.bearerp.auth.domain.repository;

import br.com.bearerp.auth.domain.model.Usuario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface UsuarioRepository extends MongoRepository<Usuario, String> {

    Optional<Usuario> findByEmailAndTenantId(String email, String tenantId);

    Optional<Usuario> findByEmail(String email);

    Optional<Usuario> findByRefreshToken(String refreshToken);

    boolean existsByEmailAndTenantId(String email, String tenantId);

    Page<Usuario> findByTenantId(String tenantId, Pageable pageable);

    Page<Usuario> findByTenantIdAndEmpresaIdsContaining(String tenantId, String empresaId, Pageable pageable);

    long countByTenantId(String tenantId);
}
