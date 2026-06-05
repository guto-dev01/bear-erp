package br.com.bearerp.contabilidade.domain.repository;

import br.com.bearerp.contabilidade.domain.model.ExercicioContabil;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ExercicioContabilRepository extends MongoRepository<ExercicioContabil, String> {
    Optional<ExercicioContabil> findByTenantIdAndEmpresaIdAndAno(String tenantId, String empresaId, int ano);
    List<ExercicioContabil> findByTenantIdAndEmpresaIdAndStatus(String tenantId, String empresaId, ExercicioContabil.StatusExercicio status);
    List<ExercicioContabil> findByTenantIdAndEmpresaId(String tenantId, String empresaId);
}
