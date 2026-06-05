package br.com.bearerp.tributarioservice.infrastructure.simulador;

import br.com.bearerp.common.domain.TenantContext;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

/**
 * Simulador de Regime Tributário
 * Compara Simples Nacional x Lucro Presumido x Lucro Real
 * e indica qual regime paga menos imposto para a empresa.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SimuladorRegimeService {

    private final MongoTemplate mongoTemplate;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "simulacoes_regime")
    public static class SimulacaoRegime {
        @Id
        private String id;
        private String tenantId;
        private String empresaId;
        private String cnpjEmpresa;
        private Instant simuladoEm;

        // Dados de entrada
        private BigDecimal faturamentoBrutoAnual;
        private BigDecimal faturamentoMensal;
        private BigDecimal folhaPagamentoMensal;
        private BigDecimal despesasOperacionaisMensal;
        private BigDecimal custoMercadoriaMensal;
        private BigDecimal receitaServicos;
        private BigDecimal receitaComercio;
        private BigDecimal receitaIndustria;
        private String cnaeAtividadePrincipal;
        private String anexoSimplesAtual;          // ANEXO_I a ANEXO_V
        private boolean temEmpregados;
        private int quantidadeEmpregados;
        private boolean exportaServicos;

        // Resultados por regime
        private ResultadoRegime resultadoSimples;
        private ResultadoRegime resultadoPresumido;
        private ResultadoRegime resultadoReal;

        // Recomendação
        private String regimeRecomendado;
        private BigDecimal economiaMensal;
        private BigDecimal economiaAnual;
        private String justificativa;
        private List<String> observacoes;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ResultadoRegime {
        private String regime;
        private boolean elegivel;
        private String motivoInelegibilidade;

        // Impostos calculados (mensal)
        private BigDecimal irpj;
        private BigDecimal csll;
        private BigDecimal pis;
        private BigDecimal cofins;
        private BigDecimal iss;
        private BigDecimal icms;
        private BigDecimal cpp;               // Contribuição Patronal Previdenciária
        private BigDecimal das;               // DAS (Simples Nacional)

        private BigDecimal totalImpostosMensal;
        private BigDecimal totalImpostosAnual;
        private BigDecimal aliquotaEfetiva;   // percentual sobre faturamento
        private BigDecimal lucroLiquidoEstimado;

        private Map<String, BigDecimal> detalhamento;
    }

    public SimulacaoRegime simular(Map<String, Object> dados) {
        SimulacaoRegime sim = SimulacaoRegime.builder()
                .tenantId(TenantContext.getTenantId())
                .empresaId(TenantContext.getEmpresaId())
                .simuladoEm(Instant.now())
                .faturamentoBrutoAnual(toBigDecimal(dados, "faturamentoBrutoAnual"))
                .faturamentoMensal(toBigDecimal(dados, "faturamentoMensal"))
                .folhaPagamentoMensal(toBigDecimal(dados, "folhaPagamentoMensal"))
                .despesasOperacionaisMensal(toBigDecimal(dados, "despesasOperacionaisMensal"))
                .custoMercadoriaMensal(toBigDecimal(dados, "custoMercadoriaMensal"))
                .receitaServicos(toBigDecimal(dados, "receitaServicos"))
                .receitaComercio(toBigDecimal(dados, "receitaComercio"))
                .receitaIndustria(toBigDecimal(dados, "receitaIndustria"))
                .cnaeAtividadePrincipal((String) dados.getOrDefault("cnae", ""))
                .anexoSimplesAtual((String) dados.getOrDefault("anexoSimples", "ANEXO_III"))
                .quantidadeEmpregados(toInt(dados, "quantidadeEmpregados"))
                .observacoes(new ArrayList<>())
                .build();

        // Calcular faturamento anual se informado mensal
        if (sim.getFaturamentoBrutoAnual() == null || sim.getFaturamentoBrutoAnual().compareTo(BigDecimal.ZERO) == 0) {
            sim.setFaturamentoBrutoAnual(sim.getFaturamentoMensal().multiply(BigDecimal.valueOf(12)));
        }
        if (sim.getFaturamentoMensal() == null || sim.getFaturamentoMensal().compareTo(BigDecimal.ZERO) == 0) {
            sim.setFaturamentoMensal(sim.getFaturamentoBrutoAnual().divide(BigDecimal.valueOf(12), 2, RoundingMode.HALF_UP));
        }

        // Simular cada regime
        sim.setResultadoSimples(calcularSimples(sim));
        sim.setResultadoPresumido(calcularLucroPresumido(sim));
        sim.setResultadoReal(calcularLucroReal(sim));

        // Determinar recomendação
        determinarRecomendacao(sim);

        sim = mongoTemplate.save(sim);
        log.info("Simulação tributária: CNPJ {} - Recomendado: {} - Economia: R$ {}/mês",
                sim.getCnpjEmpresa(), sim.getRegimeRecomendado(), sim.getEconomiaMensal());

        return sim;
    }

    private ResultadoRegime calcularSimples(SimulacaoRegime sim) {
        ResultadoRegime r = ResultadoRegime.builder()
                .regime("SIMPLES_NACIONAL")
                .detalhamento(new LinkedHashMap<>())
                .build();

        // Verificar elegibilidade
        if (sim.getFaturamentoBrutoAnual().compareTo(new BigDecimal("4800000")) > 0) {
            r.setElegivel(false);
            r.setMotivoInelegibilidade("Faturamento anual superior a R$ 4.800.000,00");
            return r;
        }
        r.setElegivel(true);

        // Tabelas do Simples Nacional (faixas simplificadas)
        BigDecimal rbt12 = sim.getFaturamentoBrutoAnual();
        BigDecimal aliquota;
        BigDecimal deducao;

        String anexo = sim.getAnexoSimplesAtual();

        // Fator R (folha/faturamento) para Anexo V → Anexo III
        BigDecimal fatorR = BigDecimal.ZERO;
        if (sim.getFolhaPagamentoMensal() != null && sim.getFaturamentoMensal().compareTo(BigDecimal.ZERO) > 0) {
            fatorR = sim.getFolhaPagamentoMensal().multiply(BigDecimal.valueOf(12))
                    .divide(rbt12, 4, RoundingMode.HALF_UP);
            r.getDetalhamento().put("fatorR", fatorR);

            if ("ANEXO_V".equals(anexo) && fatorR.compareTo(new BigDecimal("0.28")) >= 0) {
                anexo = "ANEXO_III";
                sim.getObservacoes().add("Fator R >= 28%: empresa migra do Anexo V para Anexo III (mais vantajoso)");
            }
        }

        // Alíquotas por faixa (simplificado - usando faixa mais provável)
        if (rbt12.compareTo(new BigDecimal("180000")) <= 0) {
            aliquota = getAliquotaAnexo(anexo, 1);
            deducao = BigDecimal.ZERO;
        } else if (rbt12.compareTo(new BigDecimal("360000")) <= 0) {
            aliquota = getAliquotaAnexo(anexo, 2);
            deducao = getDeducaoAnexo(anexo, 2);
        } else if (rbt12.compareTo(new BigDecimal("720000")) <= 0) {
            aliquota = getAliquotaAnexo(anexo, 3);
            deducao = getDeducaoAnexo(anexo, 3);
        } else if (rbt12.compareTo(new BigDecimal("1800000")) <= 0) {
            aliquota = getAliquotaAnexo(anexo, 4);
            deducao = getDeducaoAnexo(anexo, 4);
        } else if (rbt12.compareTo(new BigDecimal("3600000")) <= 0) {
            aliquota = getAliquotaAnexo(anexo, 5);
            deducao = getDeducaoAnexo(anexo, 5);
        } else {
            aliquota = getAliquotaAnexo(anexo, 6);
            deducao = getDeducaoAnexo(anexo, 6);
        }

        // Alíquota efetiva = (RBT12 x Aliq - Deducao) / RBT12
        BigDecimal aliqEfetiva = rbt12.multiply(aliquota).subtract(deducao)
                .divide(rbt12, 6, RoundingMode.HALF_UP);

        BigDecimal dasMensal = sim.getFaturamentoMensal().multiply(aliqEfetiva).setScale(2, RoundingMode.HALF_UP);

        r.setDas(dasMensal);
        r.setTotalImpostosMensal(dasMensal);
        r.setTotalImpostosAnual(dasMensal.multiply(BigDecimal.valueOf(12)));
        r.setAliquotaEfetiva(aliqEfetiva.multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP));

        r.getDetalhamento().put("anexo", new BigDecimal(anexo.replace("ANEXO_", "")));
        r.getDetalhamento().put("aliquotaNominal", aliquota.multiply(BigDecimal.valueOf(100)));
        r.getDetalhamento().put("deducao", deducao);

        return r;
    }

    private ResultadoRegime calcularLucroPresumido(SimulacaoRegime sim) {
        ResultadoRegime r = ResultadoRegime.builder()
                .regime("LUCRO_PRESUMIDO")
                .elegivel(true)
                .detalhamento(new LinkedHashMap<>())
                .build();

        if (sim.getFaturamentoBrutoAnual().compareTo(new BigDecimal("78000000")) > 0) {
            r.setElegivel(false);
            r.setMotivoInelegibilidade("Faturamento anual superior a R$ 78.000.000,00");
            return r;
        }

        BigDecimal fat = sim.getFaturamentoMensal();

        // Presunção de lucro
        BigDecimal presuncaoServicos = new BigDecimal("0.32");   // 32% para serviços
        BigDecimal presuncaoComercio = new BigDecimal("0.08");   // 8% para comércio
        BigDecimal presuncaoIndustria = new BigDecimal("0.08");  // 8% para indústria

        BigDecimal baseServicos = (sim.getReceitaServicos() != null ? sim.getReceitaServicos() : BigDecimal.ZERO).multiply(presuncaoServicos);
        BigDecimal baseComercio = (sim.getReceitaComercio() != null ? sim.getReceitaComercio() : BigDecimal.ZERO).multiply(presuncaoComercio);
        BigDecimal baseIndustria = (sim.getReceitaIndustria() != null ? sim.getReceitaIndustria() : BigDecimal.ZERO).multiply(presuncaoIndustria);

        // Se não informou detalhamento, usar 32% (serviços) como padrão
        BigDecimal baseIRPJ = baseServicos.add(baseComercio).add(baseIndustria);
        if (baseIRPJ.compareTo(BigDecimal.ZERO) == 0) {
            baseIRPJ = fat.multiply(presuncaoServicos);
        }

        // IRPJ: 15% + adicional 10% sobre excedente R$20.000/mês
        BigDecimal irpj = baseIRPJ.multiply(new BigDecimal("0.15"));
        if (baseIRPJ.compareTo(new BigDecimal("20000")) > 0) {
            irpj = irpj.add(baseIRPJ.subtract(new BigDecimal("20000")).multiply(new BigDecimal("0.10")));
        }

        // CSLL: 9% sobre base presumida (12% para serviços, 12% para comércio)
        BigDecimal baseCSLL = fat.multiply(new BigDecimal("0.12"));
        BigDecimal csll = baseCSLL.multiply(new BigDecimal("0.09"));

        // PIS: 0,65% sobre faturamento
        BigDecimal pis = fat.multiply(new BigDecimal("0.0065"));

        // COFINS: 3% sobre faturamento
        BigDecimal cofins = fat.multiply(new BigDecimal("0.03"));

        // ISS (serviços): 2% a 5% — usando 3% como média
        BigDecimal iss = BigDecimal.ZERO;
        if (sim.getReceitaServicos() != null && sim.getReceitaServicos().compareTo(BigDecimal.ZERO) > 0) {
            iss = sim.getReceitaServicos().multiply(new BigDecimal("0.03"));
        }

        // CPP: 20% sobre folha
        BigDecimal cpp = BigDecimal.ZERO;
        if (sim.getFolhaPagamentoMensal() != null) {
            cpp = sim.getFolhaPagamentoMensal().multiply(new BigDecimal("0.20"));
        }

        BigDecimal total = irpj.add(csll).add(pis).add(cofins).add(iss).add(cpp).setScale(2, RoundingMode.HALF_UP);

        r.setIrpj(irpj.setScale(2, RoundingMode.HALF_UP));
        r.setCsll(csll.setScale(2, RoundingMode.HALF_UP));
        r.setPis(pis.setScale(2, RoundingMode.HALF_UP));
        r.setCofins(cofins.setScale(2, RoundingMode.HALF_UP));
        r.setIss(iss.setScale(2, RoundingMode.HALF_UP));
        r.setCpp(cpp.setScale(2, RoundingMode.HALF_UP));
        r.setTotalImpostosMensal(total);
        r.setTotalImpostosAnual(total.multiply(BigDecimal.valueOf(12)));
        r.setAliquotaEfetiva(total.divide(fat, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP));

        return r;
    }

    private ResultadoRegime calcularLucroReal(SimulacaoRegime sim) {
        ResultadoRegime r = ResultadoRegime.builder()
                .regime("LUCRO_REAL")
                .elegivel(true)
                .detalhamento(new LinkedHashMap<>())
                .build();

        BigDecimal fat = sim.getFaturamentoMensal();
        BigDecimal despesas = sim.getDespesasOperacionaisMensal() != null ? sim.getDespesasOperacionaisMensal() : BigDecimal.ZERO;
        BigDecimal custos = sim.getCustoMercadoriaMensal() != null ? sim.getCustoMercadoriaMensal() : BigDecimal.ZERO;
        BigDecimal folha = sim.getFolhaPagamentoMensal() != null ? sim.getFolhaPagamentoMensal() : BigDecimal.ZERO;

        // Lucro real = Faturamento - Custos - Despesas - Folha
        BigDecimal lucroReal = fat.subtract(custos).subtract(despesas).subtract(folha);
        if (lucroReal.compareTo(BigDecimal.ZERO) < 0) lucroReal = BigDecimal.ZERO;

        // IRPJ: 15% + adicional 10% sobre excedente R$20.000
        BigDecimal irpj = lucroReal.multiply(new BigDecimal("0.15"));
        if (lucroReal.compareTo(new BigDecimal("20000")) > 0) {
            irpj = irpj.add(lucroReal.subtract(new BigDecimal("20000")).multiply(new BigDecimal("0.10")));
        }

        // CSLL: 9%
        BigDecimal csll = lucroReal.multiply(new BigDecimal("0.09"));

        // PIS: 1,65% (não cumulativo) com créditos
        BigDecimal pisDebito = fat.multiply(new BigDecimal("0.0165"));
        BigDecimal pisCredito = custos.add(despesas).multiply(new BigDecimal("0.0165"));
        BigDecimal pis = pisDebito.subtract(pisCredito).max(BigDecimal.ZERO);

        // COFINS: 7,6% (não cumulativo) com créditos
        BigDecimal cofinsDebito = fat.multiply(new BigDecimal("0.076"));
        BigDecimal cofinsCredito = custos.add(despesas).multiply(new BigDecimal("0.076"));
        BigDecimal cofins = cofinsDebito.subtract(cofinsCredito).max(BigDecimal.ZERO);

        // ISS
        BigDecimal iss = BigDecimal.ZERO;
        if (sim.getReceitaServicos() != null && sim.getReceitaServicos().compareTo(BigDecimal.ZERO) > 0) {
            iss = sim.getReceitaServicos().multiply(new BigDecimal("0.03"));
        }

        // CPP: 20% sobre folha
        BigDecimal cpp = folha.multiply(new BigDecimal("0.20"));

        BigDecimal total = irpj.add(csll).add(pis).add(cofins).add(iss).add(cpp).setScale(2, RoundingMode.HALF_UP);

        r.setIrpj(irpj.setScale(2, RoundingMode.HALF_UP));
        r.setCsll(csll.setScale(2, RoundingMode.HALF_UP));
        r.setPis(pis.setScale(2, RoundingMode.HALF_UP));
        r.setCofins(cofins.setScale(2, RoundingMode.HALF_UP));
        r.setIss(iss.setScale(2, RoundingMode.HALF_UP));
        r.setCpp(cpp.setScale(2, RoundingMode.HALF_UP));
        r.setTotalImpostosMensal(total);
        r.setTotalImpostosAnual(total.multiply(BigDecimal.valueOf(12)));
        r.setAliquotaEfetiva(fat.compareTo(BigDecimal.ZERO) > 0
                ? total.divide(fat, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100)).setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO);
        r.setLucroLiquidoEstimado(lucroReal.subtract(irpj).subtract(csll));

        r.getDetalhamento().put("lucroRealApurado", lucroReal);
        r.getDetalhamento().put("pisCreditos", pisCredito);
        r.getDetalhamento().put("cofinsCreditos", cofinsCredito);

        return r;
    }

    private void determinarRecomendacao(SimulacaoRegime sim) {
        List<ResultadoRegime> elegiveis = new ArrayList<>();
        if (sim.getResultadoSimples().isElegivel()) elegiveis.add(sim.getResultadoSimples());
        if (sim.getResultadoPresumido().isElegivel()) elegiveis.add(sim.getResultadoPresumido());
        if (sim.getResultadoReal().isElegivel()) elegiveis.add(sim.getResultadoReal());

        if (elegiveis.isEmpty()) {
            sim.setRegimeRecomendado("NENHUM_ELEGIVEL");
            sim.setJustificativa("Empresa não é elegível a nenhum regime com os dados informados");
            return;
        }

        ResultadoRegime melhor = elegiveis.stream()
                .min(Comparator.comparing(ResultadoRegime::getTotalImpostosMensal))
                .orElse(elegiveis.get(0));

        ResultadoRegime pior = elegiveis.stream()
                .max(Comparator.comparing(ResultadoRegime::getTotalImpostosMensal))
                .orElse(elegiveis.get(0));

        sim.setRegimeRecomendado(melhor.getRegime());
        sim.setEconomiaMensal(pior.getTotalImpostosMensal().subtract(melhor.getTotalImpostosMensal()));
        sim.setEconomiaAnual(sim.getEconomiaMensal().multiply(BigDecimal.valueOf(12)));

        StringBuilder justificativa = new StringBuilder();
        justificativa.append(String.format("O %s é o mais vantajoso com alíquota efetiva de %s%%. ",
                melhor.getRegime().replace("_", " "), melhor.getAliquotaEfetiva()));
        justificativa.append(String.format("Economia de R$ %s/mês (R$ %s/ano) em relação ao %s.",
                sim.getEconomiaMensal(), sim.getEconomiaAnual(), pior.getRegime().replace("_", " ")));
        sim.setJustificativa(justificativa.toString());

        // Observações adicionais
        if (sim.getResultadoSimples().isElegivel()) {
            BigDecimal limiteSublimite = new BigDecimal("3600000");
            if (sim.getFaturamentoBrutoAnual().compareTo(limiteSublimite) > 0) {
                sim.getObservacoes().add("ATENÇÃO: Faturamento acima do sublimite estadual (R$ 3.600.000). ICMS e ISS serão cobrados por fora do DAS.");
            }
        }

        if (sim.getResultadoReal().isElegivel() && sim.getResultadoReal().getLucroLiquidoEstimado() != null
                && sim.getResultadoReal().getLucroLiquidoEstimado().compareTo(BigDecimal.ZERO) <= 0) {
            sim.getObservacoes().add("Empresa com prejuízo no Lucro Real — pode compensar em exercícios futuros (limitado a 30% do lucro).");
        }
    }

    public List<SimulacaoRegime> listarSimulacoes() {
        return mongoTemplate.find(
                org.springframework.data.mongodb.core.query.Query.query(
                        org.springframework.data.mongodb.core.query.Criteria.where("tenantId").is(TenantContext.getTenantId())),
                SimulacaoRegime.class);
    }

    // === TABELAS DO SIMPLES NACIONAL ===

    private BigDecimal getAliquotaAnexo(String anexo, int faixa) {
        return switch (anexo) {
            case "ANEXO_I" -> switch (faixa) { // Comércio
                case 1 -> new BigDecimal("0.04");
                case 2 -> new BigDecimal("0.073");
                case 3 -> new BigDecimal("0.095");
                case 4 -> new BigDecimal("0.107");
                case 5 -> new BigDecimal("0.143");
                case 6 -> new BigDecimal("0.19");
                default -> new BigDecimal("0.10");
            };
            case "ANEXO_II" -> switch (faixa) { // Indústria
                case 1 -> new BigDecimal("0.045");
                case 2 -> new BigDecimal("0.078");
                case 3 -> new BigDecimal("0.10");
                case 4 -> new BigDecimal("0.112");
                case 5 -> new BigDecimal("0.147");
                case 6 -> new BigDecimal("0.30");
                default -> new BigDecimal("0.11");
            };
            case "ANEXO_III" -> switch (faixa) { // Serviços (fator R >= 28%)
                case 1 -> new BigDecimal("0.06");
                case 2 -> new BigDecimal("0.112");
                case 3 -> new BigDecimal("0.135");
                case 4 -> new BigDecimal("0.16");
                case 5 -> new BigDecimal("0.21");
                case 6 -> new BigDecimal("0.33");
                default -> new BigDecimal("0.135");
            };
            case "ANEXO_IV" -> switch (faixa) { // Serviços (construção, advocacia)
                case 1 -> new BigDecimal("0.045");
                case 2 -> new BigDecimal("0.09");
                case 3 -> new BigDecimal("0.105");
                case 4 -> new BigDecimal("0.14");
                case 5 -> new BigDecimal("0.22");
                case 6 -> new BigDecimal("0.33");
                default -> new BigDecimal("0.12");
            };
            case "ANEXO_V" -> switch (faixa) { // Serviços (fator R < 28%)
                case 1 -> new BigDecimal("0.155");
                case 2 -> new BigDecimal("0.18");
                case 3 -> new BigDecimal("0.195");
                case 4 -> new BigDecimal("0.205");
                case 5 -> new BigDecimal("0.23");
                case 6 -> new BigDecimal("0.305");
                default -> new BigDecimal("0.20");
            };
            default -> new BigDecimal("0.10");
        };
    }

    private BigDecimal getDeducaoAnexo(String anexo, int faixa) {
        return switch (anexo) {
            case "ANEXO_I" -> switch (faixa) {
                case 2 -> new BigDecimal("5940");
                case 3 -> new BigDecimal("13860");
                case 4 -> new BigDecimal("22500");
                case 5 -> new BigDecimal("87300");
                case 6 -> new BigDecimal("378000");
                default -> BigDecimal.ZERO;
            };
            case "ANEXO_III" -> switch (faixa) {
                case 2 -> new BigDecimal("9360");
                case 3 -> new BigDecimal("17640");
                case 4 -> new BigDecimal("35640");
                case 5 -> new BigDecimal("125640");
                case 6 -> new BigDecimal("648000");
                default -> BigDecimal.ZERO;
            };
            default -> BigDecimal.ZERO;
        };
    }

    private BigDecimal toBigDecimal(Map<String, Object> map, String key) {
        if (map == null || !map.containsKey(key) || map.get(key) == null) return BigDecimal.ZERO;
        return new BigDecimal(map.get(key).toString());
    }

    private int toInt(Map<String, Object> map, String key) {
        if (map == null || !map.containsKey(key) || map.get(key) == null) return 0;
        return Integer.parseInt(map.get(key).toString());
    }
}
