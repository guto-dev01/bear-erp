package br.com.bearerp.fiscalservice.domain.repository;

import br.com.bearerp.fiscalservice.domain.model.Ciap;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CiapRepository extends MongoRepository<Ciap, String> {
    List<Ciap> findByTenantIdAndEmpresaIdOrderByDataAquisicaoDesc(String tenantId, String empresaId);
    List<Ciap> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, Ciap.StatusCiap status);
}
