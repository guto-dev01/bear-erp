package br.com.bearerp.obrigacoes.domain.repository;

import br.com.bearerp.obrigacoes.domain.model.ObrigacaoAcessoria;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface ObrigacaoAcessoriaRepository extends MongoRepository<ObrigacaoAcessoria, String> {
    List<ObrigacaoAcessoria> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<ObrigacaoAcessoria> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, ObrigacaoAcessoria.StatusObrigacao status);
    List<ObrigacaoAcessoria> findByTenantIdAndEmpresaIdAndMesReferenciaAndAnoReferencia(String tenantId, String empresaId, int mes, int ano);
    List<ObrigacaoAcessoria> findByTenantIdAndEmpresaIdAndDataVencimentoBefore(String tenantId, String empresaId, LocalDate data);
    boolean existsByTenantIdAndEmpresaIdAndCodigoAndMesReferenciaAndAnoReferencia(String tenantId, String empresaId, String codigo, int mes, int ano);
}
