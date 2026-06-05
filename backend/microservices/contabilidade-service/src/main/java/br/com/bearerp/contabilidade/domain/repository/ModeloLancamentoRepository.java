package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.ModeloLancamento;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ModeloLancamentoRepository extends MongoRepository<ModeloLancamento, String> {
    List<ModeloLancamento> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<ModeloLancamento> findByTenantIdAndEmpresaIdAndAtivo(String tenantId, String empresaId, boolean ativo);
    List<ModeloLancamento> findByTenantIdAndEmpresaIdAndTipo(String tenantId, String empresaId, ModeloLancamento.TipoModelo tipo);
}
