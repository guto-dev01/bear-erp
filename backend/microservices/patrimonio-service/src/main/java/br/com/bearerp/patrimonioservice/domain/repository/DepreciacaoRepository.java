package br.com.bearerp.patrimonioservice.domain.repository;

import br.com.bearerp.patrimonioservice.domain.model.Depreciacao;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface DepreciacaoRepository extends MongoRepository<Depreciacao, String> {
    List<Depreciacao> findByTenantIdAndEmpresaIdAndBemId(String tenantId, String empresaId, String bemId);
    List<Depreciacao> findByTenantIdAndEmpresaIdAndCompetencia(String tenantId, String empresaId, String competencia);
    Optional<Depreciacao> findByTenantIdAndEmpresaIdAndBemIdAndCompetencia(String tenantId, String empresaId, String bemId, String competencia);
}
