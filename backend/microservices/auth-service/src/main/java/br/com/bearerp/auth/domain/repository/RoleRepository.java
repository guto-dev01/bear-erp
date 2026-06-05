package br.com.bearerp.auth.domain.repository;

import br.com.bearerp.auth.domain.model.Role;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends MongoRepository<Role, String> {

    List<Role> findByTenantId(String tenantId);

    Optional<Role> findByNomeAndTenantId(String nome, String tenantId);

    List<Role> findByIdInAndTenantId(List<String> ids, String tenantId);
}
