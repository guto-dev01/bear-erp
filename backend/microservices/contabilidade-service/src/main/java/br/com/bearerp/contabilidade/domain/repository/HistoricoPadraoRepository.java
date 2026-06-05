package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.HistoricoPadrao;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface HistoricoPadraoRepository extends MongoRepository<HistoricoPadrao, String> {
    List<HistoricoPadrao> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    Optional<HistoricoPadrao> findByTenantIdAndEmpresaIdAndCodigo(String tenantId, String empresaId, String codigo);
    List<HistoricoPadrao> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, HistoricoPadrao.StatusHistorico status);
}
