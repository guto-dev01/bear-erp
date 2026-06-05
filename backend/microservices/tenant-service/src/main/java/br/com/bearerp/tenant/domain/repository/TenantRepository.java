package br.com.bearerp.tenant.domain.repository;

import br.com.bearerp.tenant.domain.model.Tenant;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface TenantRepository extends MongoRepository<Tenant, String> {

    Optional<Tenant> findByCnpj(String cnpj);

    boolean existsByCnpj(String cnpj);

    Page<Tenant> findByStatus(Tenant.Status status, Pageable pageable);
}
