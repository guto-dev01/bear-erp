package br.com.bearerp.spedservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.spedservice.application.dto.SpedFiscalResponse;
import br.com.bearerp.spedservice.domain.model.SpedFiscal;
import br.com.bearerp.spedservice.domain.model.SpedFiscal.*;
import br.com.bearerp.spedservice.domain.repository.SpedFiscalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpedFiscalUseCase {

    private final SpedFiscalRepository spedRepository;

    public SpedFiscalResponse gerarSpedFiscal(int ano, int mes, String perfil) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        SpedFiscal sped = spedRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .orElseGet(() -> {
                    SpedFiscal novo = SpedFiscal.builder()
                            .ano(ano).mes(mes).perfil(perfil != null ? perfil : "A")
                            .finalidade("0").tipo(TipoSped.EFD_ICMS_IPI)
                            .status(StatusSped.RASCUNHO).build();
                    novo.setTenantId(tenantId);
                    novo.setEmpresaId(empresaId);
                    return novo;
                });

        // Simulação de geração do arquivo SPED
        sped.setStatus(StatusSped.GERADO);
        sped.setNomeArquivo(String.format("SPED_FISCAL_%d_%02d_%s.txt", ano, mes, empresaId));
        sped.setHashArquivo(UUID.randomUUID().toString().replace("-", "").toUpperCase());
        sped.setTotalRegistros(500 + (int) (Math.random() * 2000));
        sped.setTamanhoArquivo(sped.getTotalRegistros() * 120L);
        sped = spedRepository.save(sped);

        log.info("SPED Fiscal {}/{} gerado (tenant: {})", mes, ano, tenantId);
        return toResponse(sped);
    }

    public SpedFiscalResponse transmitirSped(String id) {
        String tenantId = TenantContext.getTenantId();
        SpedFiscal sped = spedRepository.findById(id)
                .orElseThrow(() -> new BusinessException("SPED_NAO_ENCONTRADO", "SPED não encontrado"));
        if (!sped.getTenantId().equals(tenantId)) throw new BusinessException("ACESSO_NEGADO", "Acesso negado");
        if (sped.getStatus() != StatusSped.GERADO && sped.getStatus() != StatusSped.VALIDADO) {
            throw new BusinessException("SPED_NAO_PRONTO", "SPED não está pronto para transmissão");
        }
        sped.setStatus(StatusSped.TRANSMITIDO);
        sped.setProtocoloRecibo("REC-" + UUID.randomUUID().toString().substring(0, 12).toUpperCase());
        sped.setDataTransmissao(Instant.now());
        sped = spedRepository.save(sped);
        log.info("SPED Fiscal {}/{} transmitido - recibo: {} (tenant: {})", sped.getMes(), sped.getAno(), sped.getProtocoloRecibo(), tenantId);
        return toResponse(sped);
    }

    public List<SpedFiscalResponse> listarPorAno(int ano) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return spedRepository.findByTenantIdAndEmpresaIdAndAnoOrderByMesAsc(tenantId, empresaId, ano)
                .stream().map(this::toResponse).toList();
    }

    public SpedFiscalResponse getByPeriodo(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return spedRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .map(this::toResponse)
                .orElseThrow(() -> new BusinessException("SPED_NAO_ENCONTRADO", "SPED Fiscal não encontrado"));
    }

    private SpedFiscalResponse toResponse(SpedFiscal s) {
        return SpedFiscalResponse.builder()
                .id(s.getId()).ano(s.getAno()).mes(s.getMes())
                .perfil(s.getPerfil()).finalidade(s.getFinalidade())
                .tipo(s.getTipo().name()).status(s.getStatus().name())
                .hashArquivo(s.getHashArquivo()).protocoloRecibo(s.getProtocoloRecibo())
                .dataTransmissao(s.getDataTransmissao()).nomeArquivo(s.getNomeArquivo())
                .tamanhoArquivo(s.getTamanhoArquivo()).totalRegistros(s.getTotalRegistros())
                .build();
    }
}
