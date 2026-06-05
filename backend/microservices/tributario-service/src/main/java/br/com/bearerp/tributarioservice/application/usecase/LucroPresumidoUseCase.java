package br.com.bearerp.tributarioservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.tributarioservice.domain.model.ApuracaoLucroPresumido;
import br.com.bearerp.tributarioservice.domain.repository.ApuracaoLucroPresumidoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

@Service @RequiredArgsConstructor
public class LucroPresumidoUseCase {
    private final ApuracaoLucroPresumidoRepository repository;

    public ApuracaoLucroPresumido calcular(String trimestre, ApuracaoLucroPresumido.TipoAtividade tipoAtividade,
                                            BigDecimal receitaBrutaTrimestre, BigDecimal demaisReceitas) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        BigDecimal pctIrpj = getPercentualPresuncaoIrpj(tipoAtividade);
        BigDecimal pctCsll = getPercentualPresuncaoCsll(tipoAtividade);

        // Base de cálculo IRPJ = Receita Bruta × % Presunção + Demais Receitas
        BigDecimal demais = demaisReceitas != null ? demaisReceitas : BigDecimal.ZERO;
        BigDecimal baseIrpj = receitaBrutaTrimestre.multiply(pctIrpj).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP).add(demais);
        BigDecimal baseCsll = receitaBrutaTrimestre.multiply(pctCsll).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP).add(demais);

        // IRPJ Normal: 15%
        BigDecimal irpjNormal = baseIrpj.multiply(BigDecimal.valueOf(0.15)).setScale(2, RoundingMode.HALF_UP);
        // IRPJ Adicional: 10% sobre o que exceder R$60.000,00 no trimestre
        BigDecimal irpjAdicional = BigDecimal.ZERO;
        if (baseIrpj.compareTo(BigDecimal.valueOf(60000)) > 0) {
            irpjAdicional = baseIrpj.subtract(BigDecimal.valueOf(60000)).multiply(BigDecimal.valueOf(0.10)).setScale(2, RoundingMode.HALF_UP);
        }
        BigDecimal irpjTotal = irpjNormal.add(irpjAdicional);

        // CSLL: 9%
        BigDecimal csll = baseCsll.multiply(BigDecimal.valueOf(0.09)).setScale(2, RoundingMode.HALF_UP);

        // PIS cumulativo: 0,65%
        BigDecimal pis = receitaBrutaTrimestre.multiply(BigDecimal.valueOf(0.0065)).setScale(2, RoundingMode.HALF_UP);
        // COFINS cumulativo: 3%
        BigDecimal cofins = receitaBrutaTrimestre.multiply(BigDecimal.valueOf(0.03)).setScale(2, RoundingMode.HALF_UP);

        BigDecimal total = irpjTotal.add(csll).add(pis).add(cofins);

        ApuracaoLucroPresumido apuracao = ApuracaoLucroPresumido.builder()
                .tenantId(tenantId).empresaId(empresaId)
                .trimestre(trimestre).tipoAtividade(tipoAtividade)
                .receitaBrutaTrimestre(receitaBrutaTrimestre).demaisReceitas(demais)
                .percentualPresuncaoIrpj(pctIrpj).baseCalculoIrpj(baseIrpj)
                .irpjNormal(irpjNormal).irpjAdicional(irpjAdicional).irpjTotal(irpjTotal)
                .percentualPresuncaoCsll(pctCsll).baseCalculoCsll(baseCsll).csll(csll)
                .pisCumulativo(pis).cofinsCumulativo(cofins)
                .totalTributos(total)
                .build();

        return repository.save(apuracao);
    }

    public ApuracaoLucroPresumido consultar(String trimestre) {
        return repository.findByTenantIdAndEmpresaIdAndTrimestre(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), trimestre)
                .orElseThrow(() -> new RuntimeException("Apuração não encontrada para trimestre " + trimestre));
    }

    public List<ApuracaoLucroPresumido> listar() {
        return repository.findByTenantIdAndEmpresaId(TenantContext.getTenantId(), TenantContext.getEmpresaId());
    }

    private BigDecimal getPercentualPresuncaoIrpj(ApuracaoLucroPresumido.TipoAtividade tipo) {
        return switch (tipo) {
            case COMERCIO_INDUSTRIA, TRANSPORTE_CARGAS, SERVICOS_HOSPITALARES -> BigDecimal.valueOf(8);
            case TRANSPORTE_PASSAGEIROS -> BigDecimal.valueOf(16);
            case SERVICOS_GERAL -> BigDecimal.valueOf(32);
            case REVENDA_COMBUSTIVEIS -> BigDecimal.valueOf(1.6);
        };
    }

    private BigDecimal getPercentualPresuncaoCsll(ApuracaoLucroPresumido.TipoAtividade tipo) {
        return switch (tipo) {
            case SERVICOS_GERAL -> BigDecimal.valueOf(32);
            default -> BigDecimal.valueOf(12);
        };
    }
}
