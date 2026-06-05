package br.com.bearerp.nfeservice.domain.repository;

import br.com.bearerp.nfeservice.domain.model.NotaFiscalEletronica;
import br.com.bearerp.nfeservice.domain.model.NotaFiscalEletronica.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NfeRepository extends MongoRepository<NotaFiscalEletronica, String> {
    Page<NotaFiscalEletronica> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    Optional<NotaFiscalEletronica> findByTenantIdAndEmpresaIdAndChaveAcesso(String tenantId, String empresaId, String chaveAcesso);
    List<NotaFiscalEletronica> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, StatusNfe status);
    List<NotaFiscalEletronica> findByTenantIdAndEmpresaIdAndTipoAndDataEmissaoBetween(String tenantId, String empresaId, TipoNfe tipo, LocalDateTime inicio, LocalDateTime fim);
    Page<NotaFiscalEletronica> findByTenantIdAndEmpresaIdAndTipo(String tenantId, String empresaId, TipoNfe tipo, Pageable pageable);
    Optional<NotaFiscalEletronica> findTopByTenantIdAndEmpresaIdAndSerieAndTipoOrderByNumeroDesc(String tenantId, String empresaId, Integer serie, TipoNfe tipo);
    boolean existsByTenantIdAndEmpresaIdAndChaveAcesso(String tenantId, String empresaId, String chaveAcesso);
    List<NotaFiscalEletronica> findByTenantIdAndEmpresaIdAndContabilizado(String tenantId, String empresaId, boolean contabilizado);
}
