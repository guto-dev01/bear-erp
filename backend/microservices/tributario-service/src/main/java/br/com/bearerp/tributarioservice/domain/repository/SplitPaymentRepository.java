package br.com.bearerp.tributarioservice.domain.repository;

import br.com.bearerp.tributarioservice.domain.model.SplitPayment;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SplitPaymentRepository extends MongoRepository<SplitPayment, String> {
    List<SplitPayment> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
}
