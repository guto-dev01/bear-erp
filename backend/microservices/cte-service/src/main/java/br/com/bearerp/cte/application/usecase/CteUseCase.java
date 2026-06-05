package br.com.bearerp.cte.application.usecase;

import br.com.bearerp.cte.application.dto.*;
import br.com.bearerp.cte.domain.model.ConhecimentoTransporte;
import br.com.bearerp.cte.domain.model.ConhecimentoTransporte.*;
import br.com.bearerp.cte.domain.repository.CteRepository;
import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CteUseCase {

    private final CteRepository cteRepository;

    public CteResponse create(CreateCteRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        Long nextNumero = cteRepository.findTopByTenantIdAndEmpresaIdAndSerieOrderByNumeroDesc(tenantId, empresaId, request.getSerie())
                .map(c -> c.getNumero() + 1).orElse(1L);

        BigDecimal icmsValor = BigDecimal.ZERO;
        if (request.getIcmsBase() != null && request.getIcmsAliquota() != null) {
            icmsValor = request.getIcmsBase().multiply(request.getIcmsAliquota()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }

        ConhecimentoTransporte cte = ConhecimentoTransporte.builder()
                .numero(nextNumero)
                .serie(request.getSerie())
                .chave(generateChave())
                .tipoCte(TipoCte.valueOf(request.getTipoCte()))
                .modal(ModalCte.valueOf(request.getModal()))
                .naturezaOperacao(request.getNaturezaOperacao())
                .remetente(DadosPessoa.builder()
                        .cnpjCpf(request.getRemetenteCnpjCpf()).razaoSocial(request.getRemetenteRazaoSocial())
                        .inscricaoEstadual(request.getRemetenteIe()).endereco(request.getRemetenteEndereco())
                        .cidade(request.getRemetenteCidade()).uf(request.getRemetenteUf())
                        .build())
                .destinatario(DadosPessoa.builder()
                        .cnpjCpf(request.getDestinatarioCnpjCpf()).razaoSocial(request.getDestinatarioRazaoSocial())
                        .inscricaoEstadual(request.getDestinatarioIe()).endereco(request.getDestinatarioEndereco())
                        .cidade(request.getDestinatarioCidade()).uf(request.getDestinatarioUf())
                        .build())
                .informacoesCarga(InformacoesCarga.builder()
                        .valorCarga(request.getValorCarga()).produtoPredominante(request.getProdutoPredominante())
                        .qtdVolumes(request.getQtdVolumes()).pesoTotal(request.getPesoTotal())
                        .unidadePeso("KG")
                        .build())
                .valorTotalServico(request.getValorTotalServico())
                .valorTotalCarga(request.getValorCarga())
                .impostos(ImpostosCte.builder()
                        .icmsBase(request.getIcmsBase()).icmsAliquota(request.getIcmsAliquota())
                        .icmsValor(icmsValor)
                        .build())
                .dataEmissao(LocalDateTime.now())
                .status(StatusCte.DIGITACAO)
                .build();
        cte.setTenantId(tenantId);
        cte.setEmpresaId(empresaId);

        cte = cteRepository.save(cte);
        log.info("CT-e criado: número {} série {} (tenant: {})", cte.getNumero(), cte.getSerie(), tenantId);
        return toResponse(cte);
    }

    public List<CteResponse> list() {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return cteRepository.findByTenantIdAndEmpresaId(tenantId, empresaId)
                .stream().map(this::toResponse).toList();
    }

    public CteResponse getById(String id) {
        return toResponse(cteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CT-e", id)));
    }

    public CteResponse autorizar(String id) {
        ConhecimentoTransporte cte = cteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CT-e", id));
        if (cte.getStatus() != StatusCte.DIGITACAO) {
            throw new BusinessException("CTE_STATUS_INVALID", "CT-e não está em digitação");
        }
        cte.setStatus(StatusCte.AUTORIZADO);
        cte.setProtocolo("CTE" + System.currentTimeMillis());
        cte = cteRepository.save(cte);
        log.info("CT-e autorizado: {} protocolo {}", cte.getNumero(), cte.getProtocolo());
        return toResponse(cte);
    }

    public CteResponse cancelar(String id, String motivo) {
        ConhecimentoTransporte cte = cteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CT-e", id));
        if (cte.getStatus() != StatusCte.AUTORIZADO) {
            throw new BusinessException("CTE_NAO_AUTORIZADO", "Somente CT-e autorizado pode ser cancelado");
        }
        cte.setStatus(StatusCte.CANCELADO);
        cte.setMotivoCancelamento(motivo);
        cte = cteRepository.save(cte);
        log.info("CT-e cancelado: {}", cte.getNumero());
        return toResponse(cte);
    }

    private String generateChave() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 44);
    }

    private CteResponse toResponse(ConhecimentoTransporte c) {
        return CteResponse.builder()
                .id(c.getId()).numero(c.getNumero()).serie(c.getSerie()).chave(c.getChave())
                .tipoCte(c.getTipoCte() != null ? c.getTipoCte().name() : null)
                .modal(c.getModal() != null ? c.getModal().name() : null)
                .naturezaOperacao(c.getNaturezaOperacao())
                .remetenteNome(c.getRemetente() != null ? c.getRemetente().getRazaoSocial() : null)
                .remetenteCnpjCpf(c.getRemetente() != null ? c.getRemetente().getCnpjCpf() : null)
                .destinatarioNome(c.getDestinatario() != null ? c.getDestinatario().getRazaoSocial() : null)
                .destinatarioCnpjCpf(c.getDestinatario() != null ? c.getDestinatario().getCnpjCpf() : null)
                .valorTotalServico(c.getValorTotalServico())
                .valorCarga(c.getInformacoesCarga() != null ? c.getInformacoesCarga().getValorCarga() : null)
                .produtoPredominante(c.getInformacoesCarga() != null ? c.getInformacoesCarga().getProdutoPredominante() : null)
                .icmsBase(c.getImpostos() != null ? c.getImpostos().getIcmsBase() : null)
                .icmsAliquota(c.getImpostos() != null ? c.getImpostos().getIcmsAliquota() : null)
                .icmsValor(c.getImpostos() != null ? c.getImpostos().getIcmsValor() : null)
                .dataEmissao(c.getDataEmissao())
                .status(c.getStatus() != null ? c.getStatus().name() : null)
                .protocolo(c.getProtocolo()).createdAt(c.getCreatedAt())
                .build();
    }
}
