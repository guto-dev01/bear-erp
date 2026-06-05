package br.com.bearerp.integracoesservice.domain.repository;

import br.com.bearerp.integracoesservice.domain.model.Integracao;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface IntegracaoRepository extends MongoRepository<Integracao, String> {
    List<Integracao> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<Integracao> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, Integracao.StatusIntegracao status);
    List<Integracao> findByTenantIdAndEmpresaIdAndTipo(String tenantId, String empresaId, Integracao.TipoIntegracao tipo);
}
