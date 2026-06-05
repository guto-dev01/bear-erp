package br.com.bearerp.spedservice.domain.repository;

import br.com.bearerp.spedservice.domain.model.ObrigacaoAcessoria;
import br.com.bearerp.spedservice.domain.model.ObrigacaoAcessoria.StatusObrigacao;
import br.com.bearerp.spedservice.domain.model.ObrigacaoAcessoria.TipoObrigacao;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ObrigacaoAcessoriaRepository extends MongoRepository<ObrigacaoAcessoria, String> {
    List<ObrigacaoAcessoria> findByTenantIdAndEmpresaIdAndCompetencia(String tenantId, String empresaId, String competencia);
    List<ObrigacaoAcessoria> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, StatusObrigacao status);
    Optional<ObrigacaoAcessoria> findByTenantIdAndEmpresaIdAndTipoAndCompetencia(String tenantId, String empresaId, TipoObrigacao tipo, String competencia);
    List<ObrigacaoAcessoria> findByTenantIdAndEmpresaIdAndPrazoEntregaBetween(String tenantId, String empresaId, LocalDate inicio, LocalDate fim);
    List<ObrigacaoAcessoria> findByTenantIdAndEmpresaIdAndStatusAndPrazoEntregaBefore(String tenantId, String empresaId, StatusObrigacao status, LocalDate data);
}
