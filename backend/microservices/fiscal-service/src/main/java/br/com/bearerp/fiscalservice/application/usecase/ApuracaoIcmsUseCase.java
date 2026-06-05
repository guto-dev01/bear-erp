package br.com.bearerp.fiscalservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.fiscalservice.application.dto.ApuracaoIcmsResponse;
import br.com.bearerp.fiscalservice.domain.model.ApuracaoIcms;
import br.com.bearerp.fiscalservice.domain.model.ApuracaoIcms.StatusApuracao;
import br.com.bearerp.fiscalservice.domain.model.EscrituracaoFiscal;
import br.com.bearerp.fiscalservice.domain.repository.ApuracaoIcmsRepository;
import br.com.bearerp.fiscalservice.domain.repository.EscrituracaoFiscalRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApuracaoIcmsUseCase {

    private final ApuracaoIcmsRepository apuracaoRepository;
    private final EscrituracaoFiscalRepository escrituracaoRepository;

    public ApuracaoIcmsResponse calcularApuracao(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        // Buscar apuração existente ou criar nova
        ApuracaoIcms apuracao = apuracaoRepository
                .findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .orElseGet(() -> {
                    ApuracaoIcms nova = ApuracaoIcms.builder().ano(ano).mes(mes).status(StatusApuracao.EM_ABERTO).build();
                    nova.setTenantId(tenantId);
                    nova.setEmpresaId(empresaId);
                    return nova;
                });

        // Buscar escriturações do período
        List<EscrituracaoFiscal> entradas = escrituracaoRepository
                .findByTenantIdAndEmpresaIdAndTipoEscrituracaoAndAnoAndMes(tenantId, empresaId, EscrituracaoFiscal.TipoEscrituracao.ENTRADA, ano, mes);
        List<EscrituracaoFiscal> saidas = escrituracaoRepository
                .findByTenantIdAndEmpresaIdAndTipoEscrituracaoAndAnoAndMes(tenantId, empresaId, EscrituracaoFiscal.TipoEscrituracao.SAIDA, ano, mes);

        // Calcular débitos (saídas)
        BigDecimal totalDebitosSaidas = saidas.stream()
                .map(e -> e.getValorIcms() != null ? e.getValorIcms() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Calcular créditos (entradas)
        BigDecimal totalCreditosEntradas = entradas.stream()
                .map(e -> e.getValorIcms() != null ? e.getValorIcms() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal outrosDebitos = apuracao.getOutrosDebitos() != null ? apuracao.getOutrosDebitos() : BigDecimal.ZERO;
        BigDecimal estornoCreditos = apuracao.getEstornoCreditos() != null ? apuracao.getEstornoCreditos() : BigDecimal.ZERO;
        BigDecimal outrosCreditos = apuracao.getOutrosCreditos() != null ? apuracao.getOutrosCreditos() : BigDecimal.ZERO;
        BigDecimal estornoDebitos = apuracao.getEstornoDebitos() != null ? apuracao.getEstornoDebitos() : BigDecimal.ZERO;

        BigDecimal totalDebitos = totalDebitosSaidas.add(outrosDebitos).add(estornoCreditos);
        BigDecimal totalCreditos = totalCreditosEntradas.add(outrosCreditos).add(estornoDebitos);

        // Buscar saldo credor anterior (mês anterior)
        BigDecimal saldoCredorAnterior = BigDecimal.ZERO;
        int mesAnterior = mes == 1 ? 12 : mes - 1;
        int anoAnterior = mes == 1 ? ano - 1 : ano;
        apuracaoRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, anoAnterior, mesAnterior)
                .ifPresent(ant -> {
                    if (ant.getSaldoCredorTransportar() != null && ant.getSaldoCredorTransportar().signum() > 0) {
                        apuracao.setSaldoCredorAnterior(ant.getSaldoCredorTransportar());
                    }
                });
        if (apuracao.getSaldoCredorAnterior() != null) {
            saldoCredorAnterior = apuracao.getSaldoCredorAnterior();
        }

        BigDecimal saldoDevedor = totalDebitos.subtract(totalCreditos).subtract(saldoCredorAnterior);
        BigDecimal deducoes = apuracao.getDeducoes() != null ? apuracao.getDeducoes() : BigDecimal.ZERO;

        BigDecimal icmsRecolher = BigDecimal.ZERO;
        BigDecimal saldoCredorTransportar = BigDecimal.ZERO;

        if (saldoDevedor.signum() > 0) {
            icmsRecolher = saldoDevedor.subtract(deducoes);
            if (icmsRecolher.signum() < 0) {
                saldoCredorTransportar = icmsRecolher.negate();
                icmsRecolher = BigDecimal.ZERO;
            }
        } else {
            saldoCredorTransportar = saldoDevedor.negate();
        }

        // ICMS-ST das saídas
        BigDecimal icmsStRecolher = saidas.stream()
                .map(e -> e.getValorIcmsSt() != null ? e.getValorIcmsSt() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Montar detalhes
        List<ApuracaoIcms.DetalheApuracao> detalhes = new ArrayList<>();
        for (EscrituracaoFiscal s : saidas) {
            if (s.getValorIcms() != null && s.getValorIcms().signum() > 0) {
                detalhes.add(ApuracaoIcms.DetalheApuracao.builder()
                        .nfeId(s.getNfeId()).chaveAcesso(s.getChaveAcesso()).numeroNfe(s.getNumeroNfe())
                        .cfop(s.getCfop()).baseCalculo(s.getBaseCalculoIcms())
                        .aliquota(s.getAliquotaIcms()).valorIcms(s.getValorIcms()).tipo("DEBITO").build());
            }
        }
        for (EscrituracaoFiscal e : entradas) {
            if (e.getValorIcms() != null && e.getValorIcms().signum() > 0) {
                detalhes.add(ApuracaoIcms.DetalheApuracao.builder()
                        .nfeId(e.getNfeId()).chaveAcesso(e.getChaveAcesso()).numeroNfe(e.getNumeroNfe())
                        .cfop(e.getCfop()).baseCalculo(e.getBaseCalculoIcms())
                        .aliquota(e.getAliquotaIcms()).valorIcms(e.getValorIcms()).tipo("CREDITO").build());
            }
        }

        apuracao.setTotalDebitosSaidas(totalDebitosSaidas);
        apuracao.setOutrosDebitos(outrosDebitos);
        apuracao.setEstornoCreditos(estornoCreditos);
        apuracao.setTotalDebitos(totalDebitos);
        apuracao.setTotalCreditosEntradas(totalCreditosEntradas);
        apuracao.setOutrosCreditos(outrosCreditos);
        apuracao.setEstornoDebitos(estornoDebitos);
        apuracao.setTotalCreditos(totalCreditos);
        apuracao.setSaldoCredorAnterior(saldoCredorAnterior);
        apuracao.setSaldoDevedorApurado(saldoDevedor.signum() > 0 ? saldoDevedor : BigDecimal.ZERO);
        apuracao.setDeducoes(deducoes);
        apuracao.setIcmsRecolher(icmsRecolher);
        apuracao.setSaldoCredorTransportar(saldoCredorTransportar);
        apuracao.setIcmsStRecolher(icmsStRecolher);
        apuracao.setDetalhes(detalhes);
        apuracao.setStatus(StatusApuracao.CALCULADA);

        apuracao = apuracaoRepository.save(apuracao);
        log.info("Apuração ICMS {}/{} calculada - ICMS a recolher: {} (tenant: {})", mes, ano, icmsRecolher, tenantId);
        return toResponse(apuracao);
    }

    public ApuracaoIcmsResponse fecharApuracao(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        ApuracaoIcms apuracao = apuracaoRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .orElseThrow(() -> new BusinessException("APURACAO_NAO_ENCONTRADA", "Apuração não encontrada"));
        if (apuracao.getStatus() == StatusApuracao.FECHADA) {
            throw new BusinessException("APURACAO_JA_FECHADA", "Apuração já está fechada");
        }
        apuracao.setStatus(StatusApuracao.FECHADA);
        apuracao = apuracaoRepository.save(apuracao);
        return toResponse(apuracao);
    }

    public ApuracaoIcmsResponse getApuracao(int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return apuracaoRepository.findByTenantIdAndEmpresaIdAndAnoAndMes(tenantId, empresaId, ano, mes)
                .map(this::toResponse)
                .orElseThrow(() -> new BusinessException("APURACAO_NAO_ENCONTRADA", "Apuração não encontrada"));
    }

    public List<ApuracaoIcmsResponse> listarPorAno(int ano) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return apuracaoRepository.findByTenantIdAndEmpresaIdAndAnoOrderByMesAsc(tenantId, empresaId, ano)
                .stream().map(this::toResponse).toList();
    }

    private ApuracaoIcmsResponse toResponse(ApuracaoIcms a) {
        return ApuracaoIcmsResponse.builder()
                .id(a.getId()).ano(a.getAno()).mes(a.getMes())
                .totalDebitosSaidas(a.getTotalDebitosSaidas()).outrosDebitos(a.getOutrosDebitos())
                .estornoCreditos(a.getEstornoCreditos()).totalDebitos(a.getTotalDebitos())
                .totalCreditosEntradas(a.getTotalCreditosEntradas()).outrosCreditos(a.getOutrosCreditos())
                .estornoDebitos(a.getEstornoDebitos()).totalCreditos(a.getTotalCreditos())
                .saldoCredorAnterior(a.getSaldoCredorAnterior()).saldoDevedorApurado(a.getSaldoDevedorApurado())
                .deducoes(a.getDeducoes()).icmsRecolher(a.getIcmsRecolher())
                .saldoCredorTransportar(a.getSaldoCredorTransportar())
                .icmsStRecolher(a.getIcmsStRecolher()).difalRecolher(a.getDifalRecolher())
                .status(a.getStatus().name())
                .detalhes(a.getDetalhes() != null ? a.getDetalhes().stream().map(d ->
                        ApuracaoIcmsResponse.DetalheDto.builder()
                                .nfeId(d.getNfeId()).chaveAcesso(d.getChaveAcesso()).numeroNfe(d.getNumeroNfe())
                                .cfop(d.getCfop()).baseCalculo(d.getBaseCalculo()).aliquota(d.getAliquota())
                                .valorIcms(d.getValorIcms()).tipo(d.getTipo()).build()
                ).toList() : List.of())
                .build();
    }
}
