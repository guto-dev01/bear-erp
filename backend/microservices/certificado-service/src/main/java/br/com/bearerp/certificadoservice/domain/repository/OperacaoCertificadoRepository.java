package br.com.bearerp.certificadoservice.domain.repository;

import br.com.bearerp.certificadoservice.domain.model.OperacaoCertificado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.Instant;
import java.util.List;

public interface OperacaoCertificadoRepository extends MongoRepository<OperacaoCertificado, String> {
    Page<OperacaoCertificado> findByCertificadoId(String certificadoId, Pageable pageable);
    List<OperacaoCertificado> findByCertificadoIdAndDataOperacaoBetween(String certificadoId, Instant inicio, Instant fim);
    long countByCertificadoId(String certificadoId);
}
