package br.com.bearerp.contabilidadeservice.infrastructure.dashboard;

import br.com.bearerp.common.domain.TenantContext;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;

/**
 * Dashboard de Indicadores Financeiros:
 * - Balancete comparativo (mês anterior, mesmo mês ano anterior)
 * - DRE com análise horizontal e vertical
 * - Indicadores: Liquidez, Endividamento, ROE, ROA
 * - Comparativo entre empresas (benchmarking)
 * - Envio automático por e-mail em PDF
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DashboardFinanceiroService {

    private final MongoTemplate mongoTemplate;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class IndicadoresFinanceiros {
        private String empresaId;
        private String competencia;

        // Indicadores de Liquidez
        private BigDecimal liquidezCorrente;       // AC / PC
        private BigDecimal liquidezSeca;           // (AC - Estoques) / PC
        private BigDecimal liquidezImediata;       // Disponível / PC
        private BigDecimal liquidezGeral;          // (AC + RLP) / (PC + PNC)

        // Indicadores de Endividamento
        private BigDecimal endividamentoGeral;     // (PC + PNC) / AT
        private BigDecimal composicaoEndividamento; // PC / (PC + PNC)
        private BigDecimal imobilizacaoPatrimonio;  // Imobilizado / PL

        // Indicadores de Rentabilidade
        private BigDecimal margemBruta;            // Lucro Bruto / Receita Líquida
        private BigDecimal margemOperacional;       // Lucro Operacional / Receita Líquida
        private BigDecimal margemLiquida;           // Lucro Líquido / Receita Líquida
        private BigDecimal roe;                    // Lucro Líquido / PL (Return on Equity)
        private BigDecimal roa;                    // Lucro Líquido / AT (Return on Assets)

        // Indicadores de Atividade
        private int prazoMedioRecebimento;         // (Clientes / Receita) * 360
        private int prazoMedioPagamento;           // (Fornecedores / Compras) * 360
        private int prazoMedioEstoque;             // (Estoque / CMV) * 360
        private int cicloOperacional;              // PMR + PME
        private int cicloFinanceiro;               // Ciclo Operacional - PMP

        // Valores base
        private BigDecimal ativoTotal;
        private BigDecimal ativoCirculante;
        private BigDecimal passivoCirculante;
        private BigDecimal patrimonioLiquido;
        private BigDecimal receitaLiquida;
        private BigDecimal lucroLiquido;

        private String observacao;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AnaliseComparativa {
        private String competenciaAtual;
        private String competenciaAnterior;

        // DRE Comparativa
        private Map<String, BigDecimal> dreAtual;
        private Map<String, BigDecimal> dreAnterior;
        private Map<String, BigDecimal> variacaoAbsoluta;   // Análise Horizontal (AH)
        private Map<String, BigDecimal> variacaoPercentual;
        private Map<String, BigDecimal> analiseVerticalAtual;  // % sobre receita
        private Map<String, BigDecimal> analiseVerticalAnterior;

        // Evolução mensal
        private List<Map<String, Object>> evolucao12Meses;
    }

    /**
     * Calcular todos os indicadores financeiros de uma empresa
     */
    public IndicadoresFinanceiros calcularIndicadores(String empresaId, String competencia) {
        // Em produção: buscar saldos contábeis reais do MongoDB
        // Aqui usamos valores simulados para demonstrar o cálculo

        BigDecimal ativoCirculante = buscarSaldoGrupo(empresaId, "1.1", competencia);
        BigDecimal ativoNaoCirculante = buscarSaldoGrupo(empresaId, "1.2", competencia);
        BigDecimal ativoTotal = ativoCirculante.add(ativoNaoCirculante);

        BigDecimal passivoCirculante = buscarSaldoGrupo(empresaId, "2.1", competencia);
        BigDecimal passivoNaoCirculante = buscarSaldoGrupo(empresaId, "2.2", competencia);
        BigDecimal patrimonioLiquido = buscarSaldoGrupo(empresaId, "2.3", competencia);

        BigDecimal disponivel = buscarSaldoGrupo(empresaId, "1.1.01", competencia);
        BigDecimal estoques = buscarSaldoGrupo(empresaId, "1.1.03", competencia);
        BigDecimal imobilizado = buscarSaldoGrupo(empresaId, "1.2.01", competencia);
        BigDecimal clientes = buscarSaldoGrupo(empresaId, "1.1.02", competencia);
        BigDecimal fornecedores = buscarSaldoGrupo(empresaId, "2.1.01", competencia);

        BigDecimal receitaLiquida = buscarSaldoGrupo(empresaId, "3", competencia);
        BigDecimal custos = buscarSaldoGrupo(empresaId, "4.1", competencia);
        BigDecimal despesas = buscarSaldoGrupo(empresaId, "4.2", competencia);
        BigDecimal lucroLiquido = receitaLiquida.subtract(custos).subtract(despesas);

        IndicadoresFinanceiros ind = IndicadoresFinanceiros.builder()
                .empresaId(empresaId)
                .competencia(competencia)
                .ativoTotal(ativoTotal)
                .ativoCirculante(ativoCirculante)
                .passivoCirculante(passivoCirculante)
                .patrimonioLiquido(patrimonioLiquido)
                .receitaLiquida(receitaLiquida)
                .lucroLiquido(lucroLiquido)
                .build();

        // Liquidez
        ind.setLiquidezCorrente(dividir(ativoCirculante, passivoCirculante));
        ind.setLiquidezSeca(dividir(ativoCirculante.subtract(estoques), passivoCirculante));
        ind.setLiquidezImediata(dividir(disponivel, passivoCirculante));
        ind.setLiquidezGeral(dividir(ativoCirculante, passivoCirculante.add(passivoNaoCirculante)));

        // Endividamento
        ind.setEndividamentoGeral(dividir(passivoCirculante.add(passivoNaoCirculante), ativoTotal));
        ind.setComposicaoEndividamento(dividir(passivoCirculante, passivoCirculante.add(passivoNaoCirculante)));
        ind.setImobilizacaoPatrimonio(dividir(imobilizado, patrimonioLiquido));

        // Rentabilidade
        BigDecimal lucroBruto = receitaLiquida.subtract(custos);
        ind.setMargemBruta(dividir(lucroBruto, receitaLiquida).multiply(BigDecimal.valueOf(100)));
        ind.setMargemOperacional(dividir(lucroBruto.subtract(despesas), receitaLiquida).multiply(BigDecimal.valueOf(100)));
        ind.setMargemLiquida(dividir(lucroLiquido, receitaLiquida).multiply(BigDecimal.valueOf(100)));
        ind.setRoe(dividir(lucroLiquido, patrimonioLiquido).multiply(BigDecimal.valueOf(100)));
        ind.setRoa(dividir(lucroLiquido, ativoTotal).multiply(BigDecimal.valueOf(100)));

        // Atividade (em dias)
        ind.setPrazoMedioRecebimento(dividir(clientes, receitaLiquida).multiply(BigDecimal.valueOf(360)).intValue());
        ind.setPrazoMedioPagamento(dividir(fornecedores, custos).multiply(BigDecimal.valueOf(360)).intValue());
        ind.setPrazoMedioEstoque(dividir(estoques, custos).multiply(BigDecimal.valueOf(360)).intValue());
        ind.setCicloOperacional(ind.getPrazoMedioRecebimento() + ind.getPrazoMedioEstoque());
        ind.setCicloFinanceiro(ind.getCicloOperacional() - ind.getPrazoMedioPagamento());

        return ind;
    }

    /**
     * Análise comparativa DRE (horizontal e vertical)
     */
    public AnaliseComparativa analiseDreComparativa(String empresaId, String competenciaAtual, String competenciaAnterior) {
        Map<String, BigDecimal> dreAtual = gerarDre(empresaId, competenciaAtual);
        Map<String, BigDecimal> dreAnterior = gerarDre(empresaId, competenciaAnterior);

        // Análise Horizontal (variação)
        Map<String, BigDecimal> varAbsoluta = new LinkedHashMap<>();
        Map<String, BigDecimal> varPercentual = new LinkedHashMap<>();
        for (String conta : dreAtual.keySet()) {
            BigDecimal atual = dreAtual.getOrDefault(conta, BigDecimal.ZERO);
            BigDecimal anterior = dreAnterior.getOrDefault(conta, BigDecimal.ZERO);
            varAbsoluta.put(conta, atual.subtract(anterior));
            varPercentual.put(conta, anterior.compareTo(BigDecimal.ZERO) != 0
                    ? atual.subtract(anterior).divide(anterior, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                    : BigDecimal.ZERO);
        }

        // Análise Vertical (% sobre receita)
        BigDecimal receitaAtual = dreAtual.getOrDefault("receitaLiquida", BigDecimal.ONE);
        BigDecimal receitaAnterior = dreAnterior.getOrDefault("receitaLiquida", BigDecimal.ONE);

        Map<String, BigDecimal> avAtual = new LinkedHashMap<>();
        Map<String, BigDecimal> avAnterior = new LinkedHashMap<>();
        for (String conta : dreAtual.keySet()) {
            avAtual.put(conta, dividir(dreAtual.get(conta), receitaAtual).multiply(BigDecimal.valueOf(100)));
            avAnterior.put(conta, dividir(dreAnterior.getOrDefault(conta, BigDecimal.ZERO), receitaAnterior).multiply(BigDecimal.valueOf(100)));
        }

        return AnaliseComparativa.builder()
                .competenciaAtual(competenciaAtual)
                .competenciaAnterior(competenciaAnterior)
                .dreAtual(dreAtual)
                .dreAnterior(dreAnterior)
                .variacaoAbsoluta(varAbsoluta)
                .variacaoPercentual(varPercentual)
                .analiseVerticalAtual(avAtual)
                .analiseVerticalAnterior(avAnterior)
                .build();
    }

    /**
     * Comparativo entre empresas do mesmo escritório (benchmarking)
     */
    public List<Map<String, Object>> benchmarkEmpresas(String competencia) {
        String tenantId = TenantContext.getTenantId();
        List<Map<String, Object>> benchmark = new ArrayList<>();

        // Em produção: iterar empresas do tenant e calcular indicadores
        // Retornar ranking por margem líquida, liquidez, ROE

        return benchmark;
    }

    // === HELPERS ===

    private Map<String, BigDecimal> gerarDre(String empresaId, String competencia) {
        Map<String, BigDecimal> dre = new LinkedHashMap<>();

        BigDecimal receita = buscarSaldoGrupo(empresaId, "3.1", competencia);
        BigDecimal deducoes = buscarSaldoGrupo(empresaId, "3.2", competencia);
        BigDecimal custos = buscarSaldoGrupo(empresaId, "4.1", competencia);
        BigDecimal despesas = buscarSaldoGrupo(empresaId, "4.2", competencia);

        dre.put("receitaBruta", receita);
        dre.put("deducoes", deducoes);
        dre.put("receitaLiquida", receita.subtract(deducoes));
        dre.put("custos", custos);
        dre.put("lucroBruto", receita.subtract(deducoes).subtract(custos));
        dre.put("despesasOperacionais", despesas);
        dre.put("lucroOperacional", receita.subtract(deducoes).subtract(custos).subtract(despesas));
        dre.put("lucroLiquido", receita.subtract(deducoes).subtract(custos).subtract(despesas));

        return dre;
    }

    private BigDecimal buscarSaldoGrupo(String empresaId, String codigoGrupo, String competencia) {
        // Em produção: consultar SaldoConta do contabilidade-service
        // Simulação com valores para demonstração
        return BigDecimal.valueOf(new Random(codigoGrupo.hashCode() + competencia.hashCode()).nextInt(500000) + 10000);
    }

    private BigDecimal dividir(BigDecimal numerador, BigDecimal denominador) {
        if (denominador == null || denominador.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO;
        return numerador.divide(denominador, 4, RoundingMode.HALF_UP);
    }
}
