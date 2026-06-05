package br.com.bearerp.tributarioservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.tributarioservice.domain.model.ApuracaoSimples;
import br.com.bearerp.tributarioservice.domain.repository.ApuracaoSimplesRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

@Service @RequiredArgsConstructor
public class SimplesNacionalUseCase {
    private final ApuracaoSimplesRepository repository;

    /**
     * Calcula o DAS mensal com base nas tabelas do Simples Nacional (LC 123/2006 atualizada pela LC 155/2016)
     */
    public ApuracaoSimples calcular(String competencia, ApuracaoSimples.AnexoSimples anexo,
                                     BigDecimal receitaBruta12Meses, BigDecimal receitaBrutaMes) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        // Determinar faixa
        FaixaInfo faixa = determinarFaixa(anexo, receitaBruta12Meses);

        // Alíquota efetiva = ((RBT12 × Aliq) – PD) / RBT12
        BigDecimal aliqNominal = faixa.aliquota;
        BigDecimal parcelaDeducao = faixa.parcelaDeducao;
        BigDecimal aliquotaEfetiva;

        if (receitaBruta12Meses.compareTo(BigDecimal.ZERO) > 0) {
            aliquotaEfetiva = receitaBruta12Meses.multiply(aliqNominal.divide(BigDecimal.valueOf(100), 6, RoundingMode.HALF_UP))
                    .subtract(parcelaDeducao)
                    .divide(receitaBruta12Meses, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100));
        } else {
            aliquotaEfetiva = BigDecimal.ZERO;
        }

        BigDecimal valorDas = receitaBrutaMes.multiply(aliquotaEfetiva).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        // Repartição dos tributos
        List<ApuracaoSimples.ReparticaoTributo> reparticao = calcularReparticao(anexo, faixa.faixa, aliquotaEfetiva, valorDas);

        ApuracaoSimples apuracao = ApuracaoSimples.builder()
                .tenantId(tenantId).empresaId(empresaId)
                .competencia(competencia).anexo(anexo).faixa(faixa.faixa)
                .receitaBruta12Meses(receitaBruta12Meses).receitaBrutaMes(receitaBrutaMes)
                .aliquotaNominal(aliqNominal).parcelaDeducao(parcelaDeducao)
                .aliquotaEfetiva(aliquotaEfetiva).valorDas(valorDas)
                .reparticao(reparticao).dasGerado(false)
                .build();

        return repository.save(apuracao);
    }

    public ApuracaoSimples consultar(String competencia) {
        return repository.findByTenantIdAndEmpresaIdAndCompetencia(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), competencia)
                .orElseThrow(() -> new RuntimeException("Apuração não encontrada para competência " + competencia));
    }

    public List<ApuracaoSimples> listar(String competenciaInicio, String competenciaFim) {
        return repository.findByTenantIdAndEmpresaIdAndCompetenciaBetween(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), competenciaInicio, competenciaFim);
    }

    // Tabelas do Simples Nacional - Anexo I (Comércio)
    private FaixaInfo determinarFaixa(ApuracaoSimples.AnexoSimples anexo, BigDecimal rbt12) {
        return switch (anexo) {
            case ANEXO_I -> determinarFaixaAnexoI(rbt12);
            case ANEXO_II -> determinarFaixaAnexoII(rbt12);
            case ANEXO_III -> determinarFaixaAnexoIII(rbt12);
            case ANEXO_IV -> determinarFaixaAnexoIV(rbt12);
            case ANEXO_V -> determinarFaixaAnexoV(rbt12);
        };
    }

    private FaixaInfo determinarFaixaAnexoI(BigDecimal rbt12) {
        if (rbt12.compareTo(BigDecimal.valueOf(180000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_1, BigDecimal.valueOf(4), BigDecimal.ZERO);
        if (rbt12.compareTo(BigDecimal.valueOf(360000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_2, BigDecimal.valueOf(7.3), BigDecimal.valueOf(5940));
        if (rbt12.compareTo(BigDecimal.valueOf(720000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_3, BigDecimal.valueOf(9.5), BigDecimal.valueOf(13860));
        if (rbt12.compareTo(BigDecimal.valueOf(1800000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_4, BigDecimal.valueOf(10.7), BigDecimal.valueOf(22500));
        if (rbt12.compareTo(BigDecimal.valueOf(3600000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_5, BigDecimal.valueOf(14.3), BigDecimal.valueOf(87300));
        return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_6, BigDecimal.valueOf(19), BigDecimal.valueOf(378000));
    }

    private FaixaInfo determinarFaixaAnexoII(BigDecimal rbt12) {
        if (rbt12.compareTo(BigDecimal.valueOf(180000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_1, BigDecimal.valueOf(4.5), BigDecimal.ZERO);
        if (rbt12.compareTo(BigDecimal.valueOf(360000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_2, BigDecimal.valueOf(7.8), BigDecimal.valueOf(5940));
        if (rbt12.compareTo(BigDecimal.valueOf(720000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_3, BigDecimal.valueOf(10), BigDecimal.valueOf(13860));
        if (rbt12.compareTo(BigDecimal.valueOf(1800000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_4, BigDecimal.valueOf(11.2), BigDecimal.valueOf(22500));
        if (rbt12.compareTo(BigDecimal.valueOf(3600000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_5, BigDecimal.valueOf(14.7), BigDecimal.valueOf(85500));
        return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_6, BigDecimal.valueOf(30), BigDecimal.valueOf(720000));
    }

    private FaixaInfo determinarFaixaAnexoIII(BigDecimal rbt12) {
        if (rbt12.compareTo(BigDecimal.valueOf(180000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_1, BigDecimal.valueOf(6), BigDecimal.ZERO);
        if (rbt12.compareTo(BigDecimal.valueOf(360000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_2, BigDecimal.valueOf(11.2), BigDecimal.valueOf(9360));
        if (rbt12.compareTo(BigDecimal.valueOf(720000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_3, BigDecimal.valueOf(13.5), BigDecimal.valueOf(17640));
        if (rbt12.compareTo(BigDecimal.valueOf(1800000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_4, BigDecimal.valueOf(16), BigDecimal.valueOf(35640));
        if (rbt12.compareTo(BigDecimal.valueOf(3600000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_5, BigDecimal.valueOf(21), BigDecimal.valueOf(125640));
        return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_6, BigDecimal.valueOf(33), BigDecimal.valueOf(648000));
    }

    private FaixaInfo determinarFaixaAnexoIV(BigDecimal rbt12) {
        if (rbt12.compareTo(BigDecimal.valueOf(180000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_1, BigDecimal.valueOf(4.5), BigDecimal.ZERO);
        if (rbt12.compareTo(BigDecimal.valueOf(360000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_2, BigDecimal.valueOf(9), BigDecimal.valueOf(8100));
        if (rbt12.compareTo(BigDecimal.valueOf(720000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_3, BigDecimal.valueOf(10.2), BigDecimal.valueOf(12420));
        if (rbt12.compareTo(BigDecimal.valueOf(1800000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_4, BigDecimal.valueOf(14), BigDecimal.valueOf(39780));
        if (rbt12.compareTo(BigDecimal.valueOf(3600000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_5, BigDecimal.valueOf(22), BigDecimal.valueOf(183780));
        return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_6, BigDecimal.valueOf(33), BigDecimal.valueOf(828000));
    }

    private FaixaInfo determinarFaixaAnexoV(BigDecimal rbt12) {
        if (rbt12.compareTo(BigDecimal.valueOf(180000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_1, BigDecimal.valueOf(15.5), BigDecimal.ZERO);
        if (rbt12.compareTo(BigDecimal.valueOf(360000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_2, BigDecimal.valueOf(18), BigDecimal.valueOf(4500));
        if (rbt12.compareTo(BigDecimal.valueOf(720000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_3, BigDecimal.valueOf(19.5), BigDecimal.valueOf(9900));
        if (rbt12.compareTo(BigDecimal.valueOf(1800000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_4, BigDecimal.valueOf(20.5), BigDecimal.valueOf(17100));
        if (rbt12.compareTo(BigDecimal.valueOf(3600000)) <= 0)
            return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_5, BigDecimal.valueOf(23), BigDecimal.valueOf(62100));
        return new FaixaInfo(ApuracaoSimples.FaixaSimples.FAIXA_6, BigDecimal.valueOf(30.5), BigDecimal.valueOf(540000));
    }

    private List<ApuracaoSimples.ReparticaoTributo> calcularReparticao(
            ApuracaoSimples.AnexoSimples anexo, ApuracaoSimples.FaixaSimples faixa,
            BigDecimal aliqEfetiva, BigDecimal valorDas) {
        // Percentuais de repartição simplificados por anexo (Faixa 1)
        List<ApuracaoSimples.ReparticaoTributo> reparticao = new ArrayList<>();
        double[][] percentuais = getPercentuaisReparticao(anexo);
        String[] tributos = getTributosAnexo(anexo);

        for (int i = 0; i < tributos.length; i++) {
            BigDecimal pct = BigDecimal.valueOf(percentuais[0][i]);
            BigDecimal valor = valorDas.multiply(pct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            reparticao.add(ApuracaoSimples.ReparticaoTributo.builder()
                    .tributo(tributos[i]).percentual(pct).valor(valor).build());
        }
        return reparticao;
    }

    private String[] getTributosAnexo(ApuracaoSimples.AnexoSimples anexo) {
        return switch (anexo) {
            case ANEXO_I -> new String[]{"IRPJ", "CSLL", "COFINS", "PIS", "CPP", "ICMS"};
            case ANEXO_II -> new String[]{"IRPJ", "CSLL", "COFINS", "PIS", "CPP", "ICMS", "IPI"};
            case ANEXO_III, ANEXO_V -> new String[]{"IRPJ", "CSLL", "COFINS", "PIS", "CPP", "ISS"};
            case ANEXO_IV -> new String[]{"IRPJ", "CSLL", "COFINS", "PIS", "ISS"};
        };
    }

    private double[][] getPercentuaisReparticao(ApuracaoSimples.AnexoSimples anexo) {
        return switch (anexo) {
            case ANEXO_I -> new double[][]{{5.5, 3.5, 12.74, 2.76, 41.5, 34}};
            case ANEXO_II -> new double[][]{{5.5, 3.5, 11.51, 2.49, 37.5, 32, 7.5}};
            case ANEXO_III -> new double[][]{{6, 3.5, 12.82, 2.78, 43.4, 31.5}};
            case ANEXO_IV -> new double[][]{{18.8, 15.2, 17.67, 3.83, 44.5}};
            case ANEXO_V -> new double[][]{{14, 12, 14.09, 3.05, 28.85, 28.01}};
        };
    }

    private record FaixaInfo(ApuracaoSimples.FaixaSimples faixa, BigDecimal aliquota, BigDecimal parcelaDeducao) {}
}
