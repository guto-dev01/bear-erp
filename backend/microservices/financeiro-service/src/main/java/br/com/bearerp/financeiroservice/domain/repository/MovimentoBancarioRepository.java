package br.com.bearerp.financeiroservice.domain.repository;

import br.com.bearerp.financeiroservice.domain.model.MovimentoBancario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;

public interface MovimentoBancarioRepository extends MongoRepository<MovimentoBancario, String> {
    Page<MovimentoBancario> findByTenantIdAndEmpresaIdAndContaBancariaId(String tenantId, String empresaId, String contaBancariaId, Pageable pageable);
    List<MovimentoBancario> findByTenantIdAndEmpresaIdAndContaBancariaIdAndDataBetween(String tenantId, String empresaId, String contaBancariaId, LocalDate inicio, LocalDate fim);
    List<MovimentoBancario> findByTenantIdAndEmpresaIdAndContaBancariaIdAndConciliado(String tenantId, String empresaId, String contaBancariaId, boolean conciliado);
}
