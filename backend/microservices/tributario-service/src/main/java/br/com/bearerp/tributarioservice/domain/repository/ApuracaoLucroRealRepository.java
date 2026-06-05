package br.com.bearerp.tributarioservice.domain.repository;

import br.com.bearerp.tributarioservice.domain.model.ApuracaoLucroReal;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ApuracaoLucroRealRepository extends MongoRepository<ApuracaoLucroReal, String> {
    Optional<ApuracaoLucroReal> findByTenantIdAndEmpresaIdAndPeriodo(String tenantId, String empresaId, String periodo);
    List<ApuracaoLucroReal> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
}
