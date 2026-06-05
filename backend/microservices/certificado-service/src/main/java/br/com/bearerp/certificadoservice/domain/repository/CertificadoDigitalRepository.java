package br.com.bearerp.certificadoservice.domain.repository;

import br.com.bearerp.certificadoservice.domain.model.CertificadoDigital;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface CertificadoDigitalRepository extends MongoRepository<CertificadoDigital, String> {
    List<CertificadoDigital> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
    List<CertificadoDigital> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, CertificadoDigital.StatusCertificado status);
    List<CertificadoDigital> findByTenantIdAndEmpresaIdAndCnpjCpf(String tenantId, String empresaId, String cnpjCpf);
    List<CertificadoDigital> findByStatusAndDataValidadeBefore(CertificadoDigital.StatusCertificado status, LocalDate data);
    List<CertificadoDigital> findByDataValidadeBetween(LocalDate inicio, LocalDate fim);
}
