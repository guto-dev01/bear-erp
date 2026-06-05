package br.com.bearerp.financeiroservice.domain.repository;

import br.com.bearerp.financeiroservice.domain.model.ContaPagar;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface ContaPagarRepository extends MongoRepository<ContaPagar, String> {
    Page<ContaPagar> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    Page<ContaPagar> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, ContaPagar.StatusConta status, Pageable pageable);
    List<ContaPagar> findByTenantIdAndEmpresaIdAndDataVencimentoBetween(String tenantId, String empresaId, LocalDate inicio, LocalDate fim);
    List<ContaPagar> findByTenantIdAndEmpresaIdAndStatusAndDataVencimentoLessThanEqual(String tenantId, String empresaId, ContaPagar.StatusConta status, LocalDate data);
    List<ContaPagar> findByTenantIdAndEmpresaIdAndFornecedorId(String tenantId, String empresaId, String fornecedorId);
    List<ContaPagar> findByTenantIdAndEmpresaIdAndParcelamentoId(String tenantId, String empresaId, String parcelamentoId);
}
