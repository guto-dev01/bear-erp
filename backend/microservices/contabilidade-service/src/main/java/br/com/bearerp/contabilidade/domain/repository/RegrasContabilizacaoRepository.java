package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.RegrasContabilizacao;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface RegrasContabilizacaoRepository extends MongoRepository<RegrasContabilizacao, String> {
    List<RegrasContabilizacao> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<RegrasContabilizacao> findByTenantIdAndEmpresaIdAndAtiva(String tenantId, String empresaId, boolean ativa);
    List<RegrasContabilizacao> findByTenantIdAndEmpresaIdAndTipoEvento(String tenantId, String empresaId, RegrasContabilizacao.TipoEvento tipoEvento);
    boolean existsByTenantIdAndEmpresaIdAndNome(String tenantId, String empresaId, String nome);
}
