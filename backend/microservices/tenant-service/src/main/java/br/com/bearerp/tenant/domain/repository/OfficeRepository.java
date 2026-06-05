package br.com.bearerp.tenant.domain.repository;

import br.com.bearerp.tenant.domain.model.Office;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface OfficeRepository extends MongoRepository<Office, String> {

    List<Office> findByTenantId(String tenantId);

    Page<Office> findByTenantId(String tenantId, Pageable pageable);

    boolean existsByNomeAndTenantId(String nome, String tenantId);

    long countByTenantId(String tenantId);
}
