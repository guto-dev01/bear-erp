package br.com.bearerp.fiscalservice.domain.repository;

import br.com.bearerp.fiscalservice.domain.model.EscrituracaoFiscal;
import br.com.bearerp.fiscalservice.domain.model.EscrituracaoFiscal.TipoEscrituracao;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface EscrituracaoFiscalRepository extends MongoRepository<EscrituracaoFiscal, String> {
    List<EscrituracaoFiscal> findByTenantIdAndEmpresaIdAndAnoAndMesOrderByDataEmissaoAsc(String tenantId, String empresaId, int ano, int mes);
    List<EscrituracaoFiscal> findByTenantIdAndEmpresaIdAndTipoEscrituracaoAndAnoAndMes(String tenantId, String empresaId, TipoEscrituracao tipo, int ano, int mes);
    Optional<EscrituracaoFiscal> findByTenantIdAndEmpresaIdAndNfeId(String tenantId, String empresaId, String nfeId);
    boolean existsByTenantIdAndEmpresaIdAndNfeId(String tenantId, String empresaId, String nfeId);
}
