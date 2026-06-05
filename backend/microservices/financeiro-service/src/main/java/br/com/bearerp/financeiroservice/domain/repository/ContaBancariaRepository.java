package br.com.bearerp.financeiroservice.domain.repository;

import br.com.bearerp.financeiroservice.domain.model.ContaBancaria;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ContaBancariaRepository extends MongoRepository<ContaBancaria, String> {
    List<ContaBancaria> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<ContaBancaria> findByTenantIdAndEmpresaIdAndAtiva(String tenantId, String empresaId, boolean ativa);
    Optional<ContaBancaria> findByTenantIdAndEmpresaIdAndPrincipal(String tenantId, String empresaId, boolean principal);
    Optional<ContaBancaria> findByTenantIdAndEmpresaIdAndId(String tenantId, String empresaId, String id);
}
