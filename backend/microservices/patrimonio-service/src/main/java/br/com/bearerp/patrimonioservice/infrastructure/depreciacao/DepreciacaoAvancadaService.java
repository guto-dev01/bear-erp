package br.com.bearerp.patrimonioservice.infrastructure.depreciacao;

import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Depreciação com múltiplos métodos:
 * - Linear (linha reta)
 * - Acelerada (coeficientes 1.5x ou 2.0x)
 * - Soma dos dígitos dos anos (decrescente)
 * - Unidades produzidas
 * - Teste de impairment (CPC 01 - Redução ao Valor Recuperável)
 */
@Slf4j
@Service
public class DepreciacaoAvancadaService {

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CalculoDepreciacao {
        private String metodo;
        private BigDecimal valorOriginal;
        private BigDecimal valorResidual;
        private BigDecimal baseDepreciavel;
        private int vidaUtilAnos;
        private int anoAtual;
        private BigDecimal depreciacaoAnual;
        private BigDecimal depreciacaoMensal;
        private BigDecimal depreciacaoAcumulada;
        private BigDecimal valorContabil;        // Valor original - depreciação acumulada
        private double taxaAnual;
        private List<ParcelaDepreciacao> cronograma;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ParcelaDepreciacao {
        private int ano;
        private BigDecimal depreciacaoAnual;
        private BigDecimal depreciacaoAcumulada;
        private BigDecimal valorContabil;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ResultadoImpairment {
        private BigDecimal valorContabil;
        private BigDecimal valorRecuperavel;     // Maior entre: valor em uso e valor justo
        private BigDecimal valorEmUso;           // Fluxo de caixa descontado
        private BigDecimal valorJusto;           // Valor de mercado menos custos de venda
        private BigDecimal perdaImpairment;
        private boolean temPerda;
        private String recomendacao;
    }

    // === MÉTODO LINEAR (Linha Reta) ===

    public CalculoDepreciacao calcularLinear(BigDecimal valorOriginal, BigDecimal valorResidual,
                                              int vidaUtilAnos, int anoAtual) {
        BigDecimal base = valorOriginal.subtract(valorResidual);
        BigDecimal depAnual = base.divide(BigDecimal.valueOf(vidaUtilAnos), 2, RoundingMode.HALF_UP);
        BigDecimal depMensal = depAnual.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);

        List<ParcelaDepreciacao> cronograma = new ArrayList<>();
        BigDecimal acumulada = BigDecimal.ZERO;
        for (int i = 1; i <= vidaUtilAnos; i++) {
            acumulada = acumulada.add(depAnual);
            cronograma.add(ParcelaDepreciacao.builder()
                    .ano(i)
                    .depreciacaoAnual(depAnual)
                    .depreciacaoAcumulada(acumulada.min(base))
                    .valorContabil(valorOriginal.subtract(acumulada.min(base)))
                    .build());
        }

        BigDecimal acumAtual = depAnual.multiply(BigDecimal.valueOf(Math.min(anoAtual, vidaUtilAnos)));

        return CalculoDepreciacao.builder()
                .metodo("LINEAR")
                .valorOriginal(valorOriginal)
                .valorResidual(valorResidual)
                .baseDepreciavel(base)
                .vidaUtilAnos(vidaUtilAnos)
                .anoAtual(anoAtual)
                .depreciacaoAnual(depAnual)
                .depreciacaoMensal(depMensal)
                .depreciacaoAcumulada(acumAtual.min(base))
                .valorContabil(valorOriginal.subtract(acumAtual.min(base)))
                .taxaAnual(100.0 / vidaUtilAnos)
                .cronograma(cronograma)
                .build();
    }

    // === MÉTODO ACELERADO ===

    public CalculoDepreciacao calcularAcelerada(BigDecimal valorOriginal, BigDecimal valorResidual,
                                                  int vidaUtilAnos, int anoAtual, double coeficiente) {
        // Coeficiente: 1.0 (1 turno), 1.5 (2 turnos), 2.0 (3 turnos)
        BigDecimal base = valorOriginal.subtract(valorResidual);
        double taxaNormal = 100.0 / vidaUtilAnos;
        double taxaAcelerada = taxaNormal * coeficiente;
        BigDecimal depAnual = base.multiply(BigDecimal.valueOf(taxaAcelerada / 100)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal depMensal = depAnual.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP);

        int vidaUtilAcelerada = (int) Math.ceil(vidaUtilAnos / coeficiente);

        List<ParcelaDepreciacao> cronograma = new ArrayList<>();
        BigDecimal acumulada = BigDecimal.ZERO;
        for (int i = 1; i <= vidaUtilAcelerada; i++) {
            BigDecimal dep = depAnual.min(base.subtract(acumulada));
            acumulada = acumulada.add(dep);
            cronograma.add(ParcelaDepreciacao.builder()
                    .ano(i)
                    .depreciacaoAnual(dep)
                    .depreciacaoAcumulada(acumulada)
                    .valorContabil(valorOriginal.subtract(acumulada))
                    .build());
            if (acumulada.compareTo(base) >= 0) break;
        }

        BigDecimal acumAtual = depAnual.multiply(BigDecimal.valueOf(Math.min(anoAtual, vidaUtilAcelerada))).min(base);

        return CalculoDepreciacao.builder()
                .metodo("ACELERADA_" + coeficiente + "X")
                .valorOriginal(valorOriginal)
                .valorResidual(valorResidual)
                .baseDepreciavel(base)
                .vidaUtilAnos(vidaUtilAcelerada)
                .anoAtual(anoAtual)
                .depreciacaoAnual(depAnual)
                .depreciacaoMensal(depMensal)
                .depreciacaoAcumulada(acumAtual)
                .valorContabil(valorOriginal.subtract(acumAtual))
                .taxaAnual(taxaAcelerada)
                .cronograma(cronograma)
                .build();
    }

    // === SOMA DOS DÍGITOS DOS ANOS (Decrescente) ===

    public CalculoDepreciacao calcularSomaDigitos(BigDecimal valorOriginal, BigDecimal valorResidual,
                                                    int vidaUtilAnos, int anoAtual) {
        BigDecimal base = valorOriginal.subtract(valorResidual);
        int somaDigitos = vidaUtilAnos * (vidaUtilAnos + 1) / 2;

        List<ParcelaDepreciacao> cronograma = new ArrayList<>();
        BigDecimal acumulada = BigDecimal.ZERO;
        BigDecimal depAnoAtual = BigDecimal.ZERO;

        for (int i = 1; i <= vidaUtilAnos; i++) {
            int fator = vidaUtilAnos - i + 1; // Decrescente
            BigDecimal dep = base.multiply(BigDecimal.valueOf(fator))
                    .divide(BigDecimal.valueOf(somaDigitos), 2, RoundingMode.HALF_UP);
            acumulada = acumulada.add(dep);

            if (i == anoAtual) depAnoAtual = dep;

            cronograma.add(ParcelaDepreciacao.builder()
                    .ano(i)
                    .depreciacaoAnual(dep)
                    .depreciacaoAcumulada(acumulada)
                    .valorContabil(valorOriginal.subtract(acumulada))
                    .build());
        }

        BigDecimal acumAtual = cronograma.stream()
                .filter(p -> p.getAno() <= anoAtual)
                .map(ParcelaDepreciacao::getDepreciacaoAnual)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return CalculoDepreciacao.builder()
                .metodo("SOMA_DIGITOS")
                .valorOriginal(valorOriginal)
                .valorResidual(valorResidual)
                .baseDepreciavel(base)
                .vidaUtilAnos(vidaUtilAnos)
                .anoAtual(anoAtual)
                .depreciacaoAnual(depAnoAtual)
                .depreciacaoMensal(depAnoAtual.divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP))
                .depreciacaoAcumulada(acumAtual)
                .valorContabil(valorOriginal.subtract(acumAtual))
                .taxaAnual(depAnoAtual.divide(base, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).doubleValue())
                .cronograma(cronograma)
                .build();
    }

    // === UNIDADES PRODUZIDAS ===

    public CalculoDepreciacao calcularUnidadesProduzidas(BigDecimal valorOriginal, BigDecimal valorResidual,
                                                          long capacidadeTotal, long unidadesProduzidas) {
        BigDecimal base = valorOriginal.subtract(valorResidual);
        BigDecimal taxaPorUnidade = base.divide(BigDecimal.valueOf(capacidadeTotal), 6, RoundingMode.HALF_UP);
        BigDecimal depAtual = taxaPorUnidade.multiply(BigDecimal.valueOf(unidadesProduzidas)).setScale(2, RoundingMode.HALF_UP);

        return CalculoDepreciacao.builder()
                .metodo("UNIDADES_PRODUZIDAS")
                .valorOriginal(valorOriginal)
                .valorResidual(valorResidual)
                .baseDepreciavel(base)
                .depreciacaoAnual(depAtual) // Depreciação do período
                .depreciacaoAcumulada(depAtual.min(base))
                .valorContabil(valorOriginal.subtract(depAtual.min(base)))
                .cronograma(List.of())
                .build();
    }

    // === TESTE DE IMPAIRMENT (CPC 01) ===

    public ResultadoImpairment testeImpairment(BigDecimal valorContabil, BigDecimal valorEmUso,
                                                 BigDecimal valorJusto) {
        BigDecimal valorRecuperavel = valorEmUso.max(valorJusto);
        boolean temPerda = valorContabil.compareTo(valorRecuperavel) > 0;
        BigDecimal perda = temPerda ? valorContabil.subtract(valorRecuperavel) : BigDecimal.ZERO;

        String recomendacao;
        if (!temPerda) {
            recomendacao = "Não há necessidade de reconhecer perda por impairment. Valor contábil está abaixo do valor recuperável.";
        } else {
            recomendacao = String.format(
                    "Reconhecer perda por impairment de R$ %s. Reduzir o valor contábil de R$ %s para R$ %s. " +
                    "Registrar: D - Perda por Desvalorização (Resultado) / C - Perda por Impairment Acumulada (Retificadora do Ativo).",
                    perda, valorContabil, valorRecuperavel);
        }

        return ResultadoImpairment.builder()
                .valorContabil(valorContabil)
                .valorRecuperavel(valorRecuperavel)
                .valorEmUso(valorEmUso)
                .valorJusto(valorJusto)
                .perdaImpairment(perda)
                .temPerda(temPerda)
                .recomendacao(recomendacao)
                .build();
    }

    /**
     * Comparar todos os métodos lado a lado
     */
    public Map<String, CalculoDepreciacao> compararMetodos(BigDecimal valorOriginal, BigDecimal valorResidual,
                                                             int vidaUtilAnos, int anoAtual) {
        Map<String, CalculoDepreciacao> comparativo = new LinkedHashMap<>();
        comparativo.put("linear", calcularLinear(valorOriginal, valorResidual, vidaUtilAnos, anoAtual));
        comparativo.put("acelerada_1.5x", calcularAcelerada(valorOriginal, valorResidual, vidaUtilAnos, anoAtual, 1.5));
        comparativo.put("acelerada_2.0x", calcularAcelerada(valorOriginal, valorResidual, vidaUtilAnos, anoAtual, 2.0));
        comparativo.put("soma_digitos", calcularSomaDigitos(valorOriginal, valorResidual, vidaUtilAnos, anoAtual));
        return comparativo;
    }

    /**
     * Taxas de depreciação por categoria de bem (RFB)
     */
    public Map<String, Object> tabelaTaxasRfb() {
        Map<String, Object> taxas = new LinkedHashMap<>();
        taxas.put("Edificações", Map.of("taxaAnual", "4%", "vidaUtil", 25));
        taxas.put("Máquinas e Equipamentos", Map.of("taxaAnual", "10%", "vidaUtil", 10));
        taxas.put("Instalações", Map.of("taxaAnual", "10%", "vidaUtil", 10));
        taxas.put("Móveis e Utensílios", Map.of("taxaAnual", "10%", "vidaUtil", 10));
        taxas.put("Veículos", Map.of("taxaAnual", "20%", "vidaUtil", 5));
        taxas.put("Computadores e Periféricos", Map.of("taxaAnual", "20%", "vidaUtil", 5));
        taxas.put("Software", Map.of("taxaAnual", "20%", "vidaUtil", 5));
        taxas.put("Ferramentas", Map.of("taxaAnual", "10%", "vidaUtil", 10));
        taxas.put("Aeronaves", Map.of("taxaAnual", "10%", "vidaUtil", 10));
        taxas.put("Embarcações", Map.of("taxaAnual", "5%", "vidaUtil", 20));
        return taxas;
    }
}
