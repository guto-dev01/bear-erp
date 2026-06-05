package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.LancamentoContabil;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface LancamentoContabilRepository extends MongoRepository<LancamentoContabil, String> {
    Page<LancamentoContabil> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    List<LancamentoContabil> findByTenantIdAndEmpresaIdAndDataLancamentoBetween(String tenantId, String empresaId, LocalDate inicio, LocalDate fim);
    List<LancamentoContabil> findByTenantIdAndEmpresaIdAndDataCompetenciaBetween(String tenantId, String empresaId, LocalDate inicio, LocalDate fim);
    Page<LancamentoContabil> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, LancamentoContabil.StatusLancamento status, Pageable pageable);
    List<LancamentoContabil> findByTenantIdAndEmpresaIdAndLoteId(String tenantId, String empresaId, String loteId);
    Optional<LancamentoContabil> findByTenantIdAndEmpresaIdAndOrigemTipoAndOrigemId(String tenantId, String empresaId, LancamentoContabil.OrigemTipo origemTipo, String origemId);
    long countByTenantIdAndEmpresaIdAndDataLancamentoBetween(String tenantId, String empresaId, LocalDate inicio, LocalDate fim);

    @Query("{'tenantId': ?0, 'empresaId': ?1, 'partidas.contaId': ?2, 'dataLancamento': {$gte: ?3, $lte: ?4}, 'status': 'CONFIRMADO'}")
    List<LancamentoContabil> findByContaAndPeriodo(String tenantId, String empresaId, String contaId, LocalDate inicio, LocalDate fim);

    @Query("{'tenantId': ?0, 'empresaId': ?1, 'status': 'CONFIRMADO', 'dataLancamento': {$gte: ?2, $lte: ?3}}")
    List<LancamentoContabil> findConfirmadosByPeriodo(String tenantId, String empresaId, LocalDate inicio, LocalDate fim);

    Optional<LancamentoContabil> findTopByTenantIdAndEmpresaIdOrderByNumeroDesc(String tenantId, String empresaId);

    boolean existsByTenantIdAndEmpresaIdAndPartidasContaId(String tenantId, String empresaId, String contaId);
}
