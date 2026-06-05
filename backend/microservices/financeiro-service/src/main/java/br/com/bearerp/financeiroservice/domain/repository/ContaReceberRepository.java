package br.com.bearerp.financeiroservice.domain.repository;

import br.com.bearerp.financeiroservice.domain.model.ContaPagar;
import br.com.bearerp.financeiroservice.domain.model.ContaReceber;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface ContaReceberRepository extends MongoRepository<ContaReceber, String> {
    Page<ContaReceber> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    Page<ContaReceber> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, ContaPagar.StatusConta status, Pageable pageable);
    List<ContaReceber> findByTenantIdAndEmpresaIdAndDataVencimentoBetween(String tenantId, String empresaId, LocalDate inicio, LocalDate fim);
    List<ContaReceber> findByTenantIdAndEmpresaIdAndStatusAndDataVencimentoLessThanEqual(String tenantId, String empresaId, ContaPagar.StatusConta status, LocalDate data);
    List<ContaReceber> findByTenantIdAndEmpresaIdAndClienteId(String tenantId, String empresaId, String clienteId);
    List<ContaReceber> findByTenantIdAndEmpresaIdAndParcelamentoId(String tenantId, String empresaId, String parcelamentoId);
}
