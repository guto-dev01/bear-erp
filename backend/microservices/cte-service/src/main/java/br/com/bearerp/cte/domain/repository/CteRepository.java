package br.com.bearerp.cte.domain.repository;

import br.com.bearerp.cte.domain.model.ConhecimentoTransporte;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CteRepository extends MongoRepository<ConhecimentoTransporte, String> {
    List<ConhecimentoTransporte> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<ConhecimentoTransporte> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, ConhecimentoTransporte.StatusCte status);
    Optional<ConhecimentoTransporte> findByTenantIdAndEmpresaIdAndChave(String tenantId, String empresaId, String chave);
    Optional<ConhecimentoTransporte> findTopByTenantIdAndEmpresaIdAndSerieOrderByNumeroDesc(String tenantId, String empresaId, int serie);
}
