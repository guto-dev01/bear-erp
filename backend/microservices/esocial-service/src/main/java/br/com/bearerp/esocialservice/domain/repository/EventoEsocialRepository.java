package br.com.bearerp.esocialservice.domain.repository;

import br.com.bearerp.esocialservice.domain.model.EventoEsocial;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface EventoEsocialRepository extends MongoRepository<EventoEsocial, String> {
    Page<EventoEsocial> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    Page<EventoEsocial> findByTenantIdAndEmpresaIdAndTipoEvento(String tenantId, String empresaId, EventoEsocial.TipoEvento tipo, Pageable pageable);
    List<EventoEsocial> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, EventoEsocial.StatusEvento status);
    List<EventoEsocial> findByTenantIdAndEmpresaIdAndCompetencia(String tenantId, String empresaId, String competencia);
    List<EventoEsocial> findByTenantIdAndEmpresaIdAndFuncionarioId(String tenantId, String empresaId, String funcionarioId);
}
