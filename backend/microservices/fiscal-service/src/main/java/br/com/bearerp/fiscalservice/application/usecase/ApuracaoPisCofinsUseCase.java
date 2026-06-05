package br.com.bearerp.fiscalservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.fiscalservice.application.dto.ApuracaoPisCofinsResponse;
import br.com.bearerp.fiscalservice.domain.model.ApuracaoIcms.StatusApuracao;
import br.com.bearerp.fiscalservice.domain.model.ApuracaoPisCofins;
import br.com.bearerp.fiscalservice.domain.model.ApuracaoPisCofins.RegimeApuracao;
import br.com.bearerp.fiscalservice.domain.model.EscrituracaoFiscal;
import br.com.bearerp.fiscalservice.domain.repository.ApuracaoPisCofinsRepository;
import br.com.bearerp.fiscalservice.domain.repository.EscrituracaoFiscalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApuracaoPisCofinsUseCase {

    private final ApuracaoPisCofinsRepository apuracaoRepository;
    private final EscrituracaoFiscalRepository escrituracaoRepository;

    public ApuracaoPisCofinsResponse calcularApuracao(int ano, int mes, String regime) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        RegimeApuracao regimeApuracao = RegimeApuracao.valueOf(regime);

        ApuracaoPisCofins apuracao = apuracaoRepository
                .findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .orElseGet(() -> {
                    ApuracaoPisCofins nova = ApuracaoPisCofins.builder()
                            .ano(ano).mes(mes).regime(regimeApuracao).status(StatusApuracao.EM_ABERTO).build();
                    nova.setTenantId(tenantId);
                    nova.setEmpresaId(empresaId);
                    return nova;
                });

        List<EscrituracaoFiscal> entradas = escrituracaoRepository
                .findByTenantIdAndEmpresaIdAndTipoEscrituracaoAndAnoAndMes(tenantId, empresaId, EscrituracaoFiscal.TipoEscrituracao.ENTRADA, ano, mes);
        List<EscrituracaoFiscal> saidas = escrituracaoRepository
                .findByTenantIdAndEmpresaIdAndTipoEscrituracaoAndAnoAndMes(tenantId, empresaId, EscrituracaoFiscal.TipoEscrituracao.SAIDA, ano, mes);

        // PIS - débitos das saídas
        BigDecimal pisDebitoSaidas = saidas.stream()
                .map(e -> e.getValorPis() != null ? e.getValorPis() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // PIS - créditos das entradas (só no regime não-cumulativo)
        BigDecimal pisCreditoEntradas = BigDecimal.ZERO;
        if (regimeApuracao == RegimeApuracao.NAO_CUMULATIVO) {
            pisCreditoEntradas = entradas.stream()
                    .map(e -> e.getValorPis() != null ? e.getValorPis() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        // COFINS - débitos das saídas
        BigDecimal cofinsDebitoSaidas = saidas.stream()
                .map(e -> e.getValorCofins() != null ? e.getValorCofins() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // COFINS - créditos das entradas (só no regime não-cumulativo)
        BigDecimal cofinsCreditoEntradas = BigDecimal.ZERO;
        if (regimeApuracao == RegimeApuracao.NAO_CUMULATIVO) {
            cofinsCreditoEntradas = entradas.stream()
                    .map(e -> e.getValorCofins() != null ? e.getValorCofins() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        // Saldo credor anterior
        BigDecimal pisSaldoCredorAnterior = BigDecimal.ZERO;
        BigDecimal cofinsSaldoCredorAnterior = BigDecimal.ZERO;
        int mesAnterior = mes == 1 ? 12 : mes - 1;
        int anoAnterior = mes == 1 ? ano - 1 : ano;
        apuracaoRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, anoAnterior, mesAnterior)
                .ifPresent(ant -> {
                    apuracao.setPisSaldoCredorAnterior(ant.getPisSaldoCredorTransportar() != null ? ant.getPisSaldoCredorTransportar() : BigDecimal.ZERO);
                    apuracao.setCofinsSaldoCredorAnterior(ant.getCofinsSaldoCredorTransportar() != null ? ant.getCofinsSaldoCredorTransportar() : BigDecimal.ZERO);
                });
        if (apuracao.getPisSaldoCredorAnterior() != null) pisSaldoCredorAnterior = apuracao.getPisSaldoCredorAnterior();
        if (apuracao.getCofinsSaldoCredorAnterior() != null) cofinsSaldoCredorAnterior = apuracao.getCofinsSaldoCredorAnterior();

        BigDecimal pisRetido = apuracao.getPisRetidoFonte() != null ? apuracao.getPisRetidoFonte() : BigDecimal.ZERO;
        BigDecimal cofinsRetido = apuracao.getCofinsRetidoFonte() != null ? apuracao.getCofinsRetidoFonte() : BigDecimal.ZERO;

        // PIS a recolher
        BigDecimal pisSaldo = pisDebitoSaidas.subtract(pisCreditoEntradas).subtract(pisSaldoCredorAnterior).subtract(pisRetido);
        BigDecimal pisRecolher = pisSaldo.signum() > 0 ? pisSaldo : BigDecimal.ZERO;
        BigDecimal pisSaldoCredorTransportar = pisSaldo.signum() < 0 ? pisSaldo.negate() : BigDecimal.ZERO;

        // COFINS a recolher
        BigDecimal cofinsSaldo = cofinsDebitoSaidas.subtract(cofinsCreditoEntradas).subtract(cofinsSaldoCredorAnterior).subtract(cofinsRetido);
        BigDecimal cofinsRecolher = cofinsSaldo.signum() > 0 ? cofinsSaldo : BigDecimal.ZERO;
        BigDecimal cofinsSaldoCredorTransportar = cofinsSaldo.signum() < 0 ? cofinsSaldo.negate() : BigDecimal.ZERO;

        apuracao.setRegime(regimeApuracao);
        apuracao.setPisDebitoSaidas(pisDebitoSaidas);
        apuracao.setPisCreditoEntradas(pisCreditoEntradas);
        apuracao.setPisRetidoFonte(pisRetido);
        apuracao.setPisSaldoCredorAnterior(pisSaldoCredorAnterior);
        apuracao.setPisRecolher(pisRecolher);
        apuracao.setPisSaldoCredorTransportar(pisSaldoCredorTransportar);
        apuracao.setCofinsDebitoSaidas(cofinsDebitoSaidas);
        apuracao.setCofinsCreditoEntradas(cofinsCreditoEntradas);
        apuracao.setCofinsRetidoFonte(cofinsRetido);
        apuracao.setCofinsSaldoCredorAnterior(cofinsSaldoCredorAnterior);
        apuracao.setCofinsRecolher(cofinsRecolher);
        apuracao.setCofinsSaldoCredorTransportar(cofinsSaldoCredorTransportar);
        apuracao.setStatus(StatusApuracao.CALCULADA);

        apuracao = apuracaoRepository.save(apuracao);
        log.info("Apuração PIS/COFINS {}/{} calculada - PIS: {} COFINS: {} (tenant: {})", mes, ano, pisRecolher, cofinsRecolher, tenantId);
        return toResponse(apuracao);
    }

    public ApuracaoPisCofinsResponse getApuracao(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return apuracaoRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .map(this::toResponse)
                .orElseThrow(() -> new BusinessException("APURACAO_NAO_ENCONTRADA", "Apuração PIS/COFINS não encontrada"));
    }

    public List<ApuracaoPisCofinsResponse> listarPorAno(int ano) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return apuracaoRepository.findByTenantIdAndEmpresaIdAndAnoOrderByMesAsc(tenantId, empresaId, ano)
                .stream().map(this::toResponse).toList();
    }

    private ApuracaoPisCofinsResponse toResponse(ApuracaoPisCofins a) {
        return ApuracaoPisCofinsResponse.builder()
                .id(a.getId()).ano(a.getAno()).mes(a.getMes())
                .regime(a.getRegime() != null ? a.getRegime().name() : null)
                .pisDebitoSaidas(a.getPisDebitoSaidas()).pisCreditoEntradas(a.getPisCreditoEntradas())
                .pisRetidoFonte(a.getPisRetidoFonte()).pisSaldoCredorAnterior(a.getPisSaldoCredorAnterior())
                .pisRecolher(a.getPisRecolher()).pisSaldoCredorTransportar(a.getPisSaldoCredorTransportar())
                .cofinsDebitoSaidas(a.getCofinsDebitoSaidas()).cofinsCreditoEntradas(a.getCofinsCreditoEntradas())
                .cofinsRetidoFonte(a.getCofinsRetidoFonte()).cofinsSaldoCredorAnterior(a.getCofinsSaldoCredorAnterior())
                .cofinsRecolher(a.getCofinsRecolher()).cofinsSaldoCredorTransportar(a.getCofinsSaldoCredorTransportar())
                .status(a.getStatus() != null ? a.getStatus().name() : null)
                .build();
    }
}
