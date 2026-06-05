package br.com.bearerp.fiscalservice.domain.repository;

import br.com.bearerp.fiscalservice.domain.model.GuiaFiscal;
import br.com.bearerp.fiscalservice.domain.model.GuiaFiscal.StatusGuia;
import br.com.bearerp.fiscalservice.domain.model.GuiaFiscal.TipoGuia;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface GuiaFiscalRepository extends MongoRepository<GuiaFiscal, String> {
    List<GuiaFiscal> findByTenantIdAndEmpresaIdAndCompetenciaOrderByDataVencimentoAsc(String tenantId, String empresaId, String competencia);
    List<GuiaFiscal> findByTenantIdAndEmpresaIdAndTipoGuia(String tenantId, String empresaId, TipoGuia tipoGuia);
    List<GuiaFiscal> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, StatusGuia status);
    List<GuiaFiscal> findByTenantIdAndEmpresaIdAndDataVencimentoBetween(String tenantId, String empresaId, LocalDate inicio, LocalDate fim);
}
