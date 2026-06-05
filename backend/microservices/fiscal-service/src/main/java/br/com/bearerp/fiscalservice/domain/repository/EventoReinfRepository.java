package br.com.bearerp.fiscalservice.domain.repository;

import br.com.bearerp.fiscalservice.domain.model.EventoReinf;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface EventoReinfRepository extends MongoRepository<EventoReinf, String> {
    Page<EventoReinf> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    List<EventoReinf> findByTenantIdAndEmpresaIdAndCompetencia(String tenantId, String empresaId, String competencia);
    List<EventoReinf> findByTenantIdAndEmpresaIdAndTipoEventoAndCompetencia(
            String tenantId, String empresaId, EventoReinf.TipoEventoReinf tipo, String competencia);
    List<EventoReinf> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, EventoReinf.StatusEventoReinf status);
}
