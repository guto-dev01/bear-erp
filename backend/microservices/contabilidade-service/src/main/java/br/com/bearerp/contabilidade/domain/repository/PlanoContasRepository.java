package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.PlanoContas;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PlanoContasRepository extends MongoRepository<PlanoContas, String> {
    List<PlanoContas> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<PlanoContas> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, PlanoContas.StatusConta status);
    Optional<PlanoContas> findByTenantIdAndEmpresaIdAndCodigo(String tenantId, String empresaId, String codigo);
    List<PlanoContas> findByTenantIdAndEmpresaIdAndContaPaiId(String tenantId, String empresaId, String contaPaiId);
    List<PlanoContas> findByTenantIdAndEmpresaIdAndClassificacao(String tenantId, String empresaId, PlanoContas.Classificacao classificacao);
    List<PlanoContas> findByTenantIdAndEmpresaIdAndAceitaLancamentoAndStatus(String tenantId, String empresaId, boolean aceitaLancamento, PlanoContas.StatusConta status);
    boolean existsByTenantIdAndEmpresaIdAndCodigo(String tenantId, String empresaId, String codigo);
    List<PlanoContas> findByTenantIdAndEmpresaIdAndCodigoStartingWith(String tenantId, String empresaId, String prefixo);
    List<PlanoContas> findByTenantIdAndEmpresaIdOrderByCodigoAsc(String tenantId, String empresaId);
}
