package br.com.bearerp.fiscalservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.fiscalservice.application.dto.CreateEscrituracaoRequest;
import br.com.bearerp.fiscalservice.application.dto.EscrituracaoFiscalResponse;
import br.com.bearerp.fiscalservice.domain.model.EscrituracaoFiscal;
import br.com.bearerp.fiscalservice.domain.model.EscrituracaoFiscal.TipoEscrituracao;
import br.com.bearerp.fiscalservice.domain.repository.EscrituracaoFiscalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class EscrituracaoFiscalUseCase {

    private final EscrituracaoFiscalRepository escrituracaoRepository;

    public EscrituracaoFiscalResponse criarEscrituracao(CreateEscrituracaoRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        if (request.getNfeId() != null && escrituracaoRepository.existsByTenantIdAndEmpresaIdAndNfeId(tenantId, empresaId, request.getNfeId())) {
            throw new BusinessException("ESCRITURACAO_DUPLICADA", "NF-e já escriturada");
        }

        int ano = request.getDataEmissao().getYear();
        int mes = request.getDataEmissao().getMonthValue();

        EscrituracaoFiscal escrituracao = EscrituracaoFiscal.builder()
                .tipoEscrituracao(TipoEscrituracao.valueOf(request.getTipoEscrituracao()))
                .nfeId(request.getNfeId())
                .chaveAcesso(request.getChaveAcesso())
                .numeroNfe(request.getNumeroNfe())
                .serie(request.getSerie())
                .modeloDocumento(request.getModeloDocumento())
                .participanteCnpjCpf(request.getParticipanteCnpjCpf())
                .participanteRazaoSocial(request.getParticipanteRazaoSocial())
                .participanteUf(request.getParticipanteUf())
                .participanteIe(request.getParticipanteIe())
                .dataEmissao(request.getDataEmissao())
                .dataEntradaSaida(request.getDataEntradaSaida())
                .cfop(request.getCfop())
                .naturezaOperacao(request.getNaturezaOperacao())
                .valorContabil(request.getValorContabil())
                .baseCalculoIcms(request.getBaseCalculoIcms())
                .aliquotaIcms(request.getAliquotaIcms())
                .valorIcms(request.getValorIcms())
                .valorIcmsSt(request.getValorIcmsSt())
                .valorIpi(request.getValorIpi())
                .valorPis(request.getValorPis())
                .valorCofins(request.getValorCofins())
                .outrasDespesas(request.getOutrasDespesas())
                .codigoSituacao(request.getCodigoSituacao() != null ? request.getCodigoSituacao() : "00")
                .observacao(request.getObservacao())
                .ano(ano).mes(mes)
                .build();
        escrituracao.setTenantId(tenantId);
        escrituracao.setEmpresaId(empresaId);

        escrituracao = escrituracaoRepository.save(escrituracao);
        log.info("Escrituração fiscal criada: {} {} (tenant: {})", request.getTipoEscrituracao(), request.getNumeroNfe(), tenantId);
        return toResponse(escrituracao);
    }

    public List<EscrituracaoFiscalResponse> listarPorPeriodo(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return escrituracaoRepository.findByTenantIdAndEmpresaIdAndAnoAndMesOrderByDataEmissaoAsc(tenantId, empresaId, ano, mes)
                .stream().map(this::toResponse).toList();
    }

    public List<EscrituracaoFiscalResponse> listarPorTipoEPeriodo(String tipo, int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return escrituracaoRepository.findByTenantIdAndEmpresaIdAndTipoEscrituracaoAndAnoAndMes(
                        tenantId, empresaId, TipoEscrituracao.valueOf(tipo), ano, mes)
                .stream().map(this::toResponse).toList();
    }

    public void deletarEscrituracao(String id) {
        String tenantId = TenantContext.getTenantId();
        EscrituracaoFiscal escrituracao = escrituracaoRepository.findById(id)
                .orElseThrow(() -> new BusinessException("ESCRITURACAO_NAO_ENCONTRADA", "Escrituração não encontrada"));
        if (!escrituracao.getTenantId().equals(tenantId)) {
            throw new BusinessException("ACESSO_NEGADO", "Acesso negado");
        }
        escrituracaoRepository.delete(escrituracao);
    }

    private EscrituracaoFiscalResponse toResponse(EscrituracaoFiscal e) {
        return EscrituracaoFiscalResponse.builder()
                .id(e.getId())
                .tipoEscrituracao(e.getTipoEscrituracao().name())
                .nfeId(e.getNfeId()).chaveAcesso(e.getChaveAcesso())
                .numeroNfe(e.getNumeroNfe()).serie(e.getSerie())
                .modeloDocumento(e.getModeloDocumento())
                .participanteCnpjCpf(e.getParticipanteCnpjCpf())
                .participanteRazaoSocial(e.getParticipanteRazaoSocial())
                .participanteUf(e.getParticipanteUf())
                .dataEmissao(e.getDataEmissao()).dataEntradaSaida(e.getDataEntradaSaida())
                .cfop(e.getCfop()).naturezaOperacao(e.getNaturezaOperacao())
                .valorContabil(e.getValorContabil()).baseCalculoIcms(e.getBaseCalculoIcms())
                .aliquotaIcms(e.getAliquotaIcms()).valorIcms(e.getValorIcms())
                .valorIcmsSt(e.getValorIcmsSt()).valorIpi(e.getValorIpi())
                .valorPis(e.getValorPis()).valorCofins(e.getValorCofins())
                .codigoSituacao(e.getCodigoSituacao())
                .ano(e.getAno()).mes(e.getMes())
                .build();
    }
}
