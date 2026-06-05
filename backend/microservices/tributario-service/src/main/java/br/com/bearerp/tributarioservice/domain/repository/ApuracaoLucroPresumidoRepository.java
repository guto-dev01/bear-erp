package br.com.bearerp.tributarioservice.domain.repository;

import br.com.bearerp.tributarioservice.domain.model.ApuracaoLucroPresumido;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ApuracaoLucroPresumidoRepository extends MongoRepository<ApuracaoLucroPresumido, String> {
    Optional<ApuracaoLucroPresumido> findByTenantIdAndEmpresaIdAndTrimestre(String tenantId, String empresaId, String trimestre);
    List<ApuracaoLucroPresumido> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
}
