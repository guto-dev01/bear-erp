package br.com.bearerp.empresa.domain.repository;

import br.com.bearerp.empresa.domain.model.Empresa;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface EmpresaRepository extends MongoRepository<Empresa, String> {

    Page<Empresa> findByTenantId(String tenantId, Pageable pageable);

    Optional<Empresa> findByCnpjAndTenantId(String cnpj, String tenantId);

    boolean existsByCnpjAndTenantId(String cnpj, String tenantId);

    long countByTenantId(String tenantId);

    Page<Empresa> findByTenantIdAndStatus(String tenantId, Empresa.Status status, Pageable pageable);

    Page<Empresa> findByTenantIdAndRegimeTributario(String tenantId, Empresa.RegimeTributario regime, Pageable pageable);
}
