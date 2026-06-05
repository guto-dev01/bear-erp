package br.com.bearerp.spedservice.domain.repository;

import br.com.bearerp.spedservice.domain.model.CalendarioObrigacoes;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.time.LocalDate;
import java.util.List;

public interface CalendarioObrigacoesRepository extends MongoRepository<CalendarioObrigacoes, String> {
    List<CalendarioObrigacoes> findByTenantIdAndEmpresaIdAndDataVencimentoBetweenOrderByDataVencimentoAsc(
            String tenantId, String empresaId, LocalDate inicio, LocalDate fim);
    List<CalendarioObrigacoes> findByTenantIdAndEmpresaIdAndRegimeTributario(String tenantId, String empresaId, String regime);
}
