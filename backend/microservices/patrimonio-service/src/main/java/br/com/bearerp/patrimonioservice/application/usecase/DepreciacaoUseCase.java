package br.com.bearerp.patrimonioservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.patrimonioservice.application.dto.DepreciacaoResponse;
import br.com.bearerp.patrimonioservice.domain.model.BemPatrimonial;
import br.com.bearerp.patrimonioservice.domain.model.Depreciacao;
import br.com.bearerp.patrimonioservice.domain.repository.BemPatrimonialRepository;
import br.com.bearerp.patrimonioservice.domain.repository.DepreciacaoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service @RequiredArgsConstructor
public class DepreciacaoUseCase {
    private final DepreciacaoRepository depreciacaoRepository;
    private final BemPatrimonialRepository bemRepository;

    private static final DateTimeFormatter COMPETENCIA_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    public List<DepreciacaoResponse> calcularDepreciacaoMensal(String competencia) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        List<BemPatrimonial> bensAtivos = bemRepository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, BemPatrimonial.StatusBem.ATIVO);
        List<DepreciacaoResponse> resultados = new ArrayList<>();

        YearMonth competenciaYm = YearMonth.parse(competencia, COMPETENCIA_FMT);

        for (BemPatrimonial bem : bensAtivos) {
            // Terrenos não depreciam
            if (bem.getGrupoContabil() == BemPatrimonial.GrupoContabil.TERRENOS) continue;
            // Já totalmente depreciado
            if (bem.getValorAtual().compareTo(bem.getValorResidual()) <= 0) continue;
            // Depreciação não iniciada
            if (bem.getDataInicioDepreciacao() != null) {
                YearMonth inicioYm = YearMonth.from(bem.getDataInicioDepreciacao());
                if (competenciaYm.isBefore(inicioYm)) continue;
            }
            // Já calculada para esta competência
            if (depreciacaoRepository.findByTenantIdAndEmpresaIdAndBemIdAndCompetencia(tenantId, empresaId, bem.getId(), competencia).isPresent()) continue;

            BigDecimal valorDepreciacao = calcularValorDepreciacao(bem);

            // Não depreciar abaixo do residual
            BigDecimal maxDepreciacao = bem.getValorAtual().subtract(bem.getValorResidual());
            if (valorDepreciacao.compareTo(maxDepreciacao) > 0) {
                valorDepreciacao = maxDepreciacao;
            }

            BigDecimal novaDepreciacaoAcumulada = bem.getValorDepreciadoAcumulado().add(valorDepreciacao);
            BigDecimal novoValorAtual = bem.getValorAquisicao().subtract(novaDepreciacaoAcumulada);

            // Calcular mês da vida útil
            int mesVidaUtil = 1;
            if (bem.getDataInicioDepreciacao() != null) {
                YearMonth inicio = YearMonth.from(bem.getDataInicioDepreciacao());
                mesVidaUtil = (int) (inicio.until(competenciaYm, java.time.temporal.ChronoUnit.MONTHS) + 1);
            }

            Depreciacao dep = Depreciacao.builder()
                    .tenantId(tenantId).empresaId(empresaId)
                    .bemId(bem.getId()).competencia(competencia)
                    .dataCalculo(LocalDate.now())
                    .valorDepreciacao(valorDepreciacao)
                    .depreciacaoAcumulada(novaDepreciacaoAcumulada)
                    .valorResidualAtual(novoValorAtual)
                    .taxaAplicada(bem.getTaxaDepreciacaoAnual())
                    .mesVidaUtil(mesVidaUtil)
                    .contabilizado(false)
                    .build();

            depreciacaoRepository.save(dep);

            // Atualizar bem
            bem.setValorDepreciadoAcumulado(novaDepreciacaoAcumulada);
            bem.setValorAtual(novoValorAtual);
            bemRepository.save(bem);

            resultados.add(DepreciacaoResponse.fromEntity(dep));
        }

        return resultados;
    }

    private BigDecimal calcularValorDepreciacao(BemPatrimonial bem) {
        BigDecimal baseDepreciavel = bem.getValorAquisicao().subtract(bem.getValorResidual());

        return switch (bem.getMetodoDepreciacao()) {
            case LINEAR -> {
                // Depreciação linear: valor mensal = (valor aquisição - valor residual) / vida útil em meses
                if (bem.getVidaUtilMeses() <= 0) yield BigDecimal.ZERO;
                yield baseDepreciavel.divide(BigDecimal.valueOf(bem.getVidaUtilMeses()), 2, RoundingMode.HALF_UP);
            }
            case SOMA_DIGITOS -> {
                // Método da soma dos dígitos dos anos
                int anosVidaUtil = bem.getVidaUtilMeses() / 12;
                if (anosVidaUtil <= 0) yield BigDecimal.ZERO;
                int somaDigitos = anosVidaUtil * (anosVidaUtil + 1) / 2;
                // Anos restantes
                long mesesUsados = bem.getValorDepreciadoAcumulado().compareTo(BigDecimal.ZERO) == 0 ? 0 :
                        bem.getValorDepreciadoAcumulado().multiply(BigDecimal.valueOf(bem.getVidaUtilMeses()))
                                .divide(baseDepreciavel, 0, RoundingMode.HALF_UP).longValue();
                int anoCorrente = (int) (mesesUsados / 12) + 1;
                int anosRestantes = Math.max(anosVidaUtil - anoCorrente + 1, 0);
                BigDecimal deprecAnual = baseDepreciavel.multiply(BigDecimal.valueOf(anosRestantes))
                        .divide(BigDecimal.valueOf(somaDigitos), 2, RoundingMode.HALF_UP);
                yield deprecAnual.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);
            }
            case HORAS_TRABALHADAS -> {
                // Fallback para linear se não houver controle de horas
                if (bem.getVidaUtilMeses() <= 0) yield BigDecimal.ZERO;
                yield baseDepreciavel.divide(BigDecimal.valueOf(bem.getVidaUtilMeses()), 2, RoundingMode.HALF_UP);
            }
        };
    }

    public List<DepreciacaoResponse> listarPorBem(String bemId) {
        return depreciacaoRepository.findByTenantIdAndEmpresaIdAndBemId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), bemId)
                .stream().map(DepreciacaoResponse::fromEntity).toList();
    }

    public List<DepreciacaoResponse> listarPorCompetencia(String competencia) {
        return depreciacaoRepository.findByTenantIdAndEmpresaIdAndCompetencia(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), competencia)
                .stream().map(DepreciacaoResponse::fromEntity).toList();
    }
}
