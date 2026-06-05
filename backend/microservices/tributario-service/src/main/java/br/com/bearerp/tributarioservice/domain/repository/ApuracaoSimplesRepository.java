package br.com.bearerp.tributarioservice.domain.repository;

import br.com.bearerp.tributarioservice.domain.model.ApuracaoSimples;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ApuracaoSimplesRepository extends MongoRepository<ApuracaoSimples, String> {
    Optional<ApuracaoSimples> findByTenantIdAndEmpresaIdAndCompetencia(String tenantId, String empresaId, String competencia);
    List<ApuracaoSimples> findByTenantIdAndEmpresaIdAndCompetenciaBetween(String tenantId, String empresaId, String inicio, String fim);
}
