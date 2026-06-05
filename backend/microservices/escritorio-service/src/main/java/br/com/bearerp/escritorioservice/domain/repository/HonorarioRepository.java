package br.com.bearerp.escritorioservice.domain.repository;

import br.com.bearerp.escritorioservice.domain.model.Honorario;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface HonorarioRepository extends MongoRepository<Honorario, String> {
    Page<Honorario> findByTenantIdAndEmpresaId(String tenantId, String empresaId, Pageable pageable);
    List<Honorario> findByTenantIdAndEmpresaIdAndCompetencia(String tenantId, String empresaId, String competencia);
    List<Honorario> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, Honorario.StatusHonorario status);
    List<Honorario> findByTenantIdAndEmpresaIdAndClienteEmpresaId(String tenantId, String empresaId, String clienteEmpresaId);
}
