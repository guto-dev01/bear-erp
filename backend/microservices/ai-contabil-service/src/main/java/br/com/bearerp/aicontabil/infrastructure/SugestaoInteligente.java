package br.com.bearerp.aicontabil.infrastructure;

import br.com.bearerp.common.domain.TenantContext;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * IA aprimorada: sugestão de contrapartida, classificação NCM,
 * aprendizado com correções do contador, sugestão de plano de contas.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SugestaoInteligente {

    private final MongoTemplate mongoTemplate;

    // Histórico de classificações para aprendizado
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "ia_classificacoes_historico")
    public static class HistoricoClassificacao {
        @Id
        private String id;
        private String tenantId;
        private String descricaoOriginal;       // Texto do lançamento/nota
        private String cnpjFornecedor;
        private String cfop;
        private String ncm;
        private String contaDebitoSugerida;
        private String contaCreditoSugerida;
        private String contaDebitoFinal;        // Após correção do contador
        private String contaCreditoFinal;
        private boolean corrigido;              // Contador corrigiu a sugestão?
        private double confianca;
        private Instant criadoEm;
    }

    // Sugestão de contrapartida baseada em histórico
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SugestaoContrapartida {
        private String contaDebito;
        private String contaCredito;
        private double confianca;
        private String baseSugestao;            // "historico", "cnpj", "cfop", "descricao"
        private int ocorrenciasHistorico;
        private List<AlternativaSugestao> alternativas;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AlternativaSugestao {
        private String contaDebito;
        private String contaCredito;
        private double confianca;
        private int ocorrencias;
    }

    // Sugestão de NCM
    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SugestaoNCM {
        private String ncm;
        private String descricaoNcm;
        private double confianca;
        private String aliquotaIpi;
        private List<String> alternativas;
    }

    // === SUGESTÃO DE CONTRAPARTIDA ===

    public SugestaoContrapartida sugerirContrapartida(String descricao, String cnpjFornecedor, String cfop, BigDecimal valor) {
        String tenantId = TenantContext.getTenantId();

        // 1. Buscar por CNPJ do fornecedor (mais confiável)
        if (cnpjFornecedor != null && !cnpjFornecedor.isEmpty()) {
            List<HistoricoClassificacao> porCnpj = mongoTemplate.find(
                    Query.query(Criteria.where("tenantId").is(tenantId)
                            .and("cnpjFornecedor").is(cnpjFornecedor))
                            .limit(50),
                    HistoricoClassificacao.class);

            if (!porCnpj.isEmpty()) {
                SugestaoContrapartida sugestao = analisarHistorico(porCnpj, "cnpj");
                if (sugestao.getConfianca() >= 0.7) return sugestao;
            }
        }

        // 2. Buscar por CFOP
        if (cfop != null && !cfop.isEmpty()) {
            List<HistoricoClassificacao> porCfop = mongoTemplate.find(
                    Query.query(Criteria.where("tenantId").is(tenantId)
                            .and("cfop").is(cfop))
                            .limit(50),
                    HistoricoClassificacao.class);

            if (!porCfop.isEmpty()) {
                SugestaoContrapartida sugestao = analisarHistorico(porCfop, "cfop");
                if (sugestao.getConfianca() >= 0.6) return sugestao;
            }
        }

        // 3. Buscar por palavras-chave na descrição
        if (descricao != null && !descricao.isEmpty()) {
            String[] palavras = descricao.toUpperCase().split("\\s+");
            SugestaoContrapartida melhor = sugerirPorDescricao(tenantId, descricao, palavras);
            if (melhor != null) return melhor;
        }

        // 4. Regras padrão por CFOP
        return sugerirPorRegrasPadrao(cfop, descricao);
    }

    // === APRENDIZADO COM CORREÇÕES ===

    public void registrarClassificacao(String descricao, String cnpjFornecedor, String cfop,
                                        String contaDebito, String contaCredito,
                                        String contaDebitoOriginal, String contaCreditoOriginal) {
        HistoricoClassificacao hist = HistoricoClassificacao.builder()
                .tenantId(TenantContext.getTenantId())
                .descricaoOriginal(descricao)
                .cnpjFornecedor(cnpjFornecedor)
                .cfop(cfop)
                .contaDebitoSugerida(contaDebitoOriginal)
                .contaCreditoSugerida(contaCreditoOriginal)
                .contaDebitoFinal(contaDebito)
                .contaCreditoFinal(contaCredito)
                .corrigido(!contaDebito.equals(contaDebitoOriginal) || !contaCredito.equals(contaCreditoOriginal))
                .confianca(contaDebito.equals(contaDebitoOriginal) && contaCredito.equals(contaCreditoOriginal) ? 1.0 : 0.5)
                .criadoEm(Instant.now())
                .build();

        mongoTemplate.save(hist);

        if (hist.isCorrigido()) {
            log.info("IA aprendeu correção: '{}' -> D:{} C:{} (era D:{} C:{})",
                    descricao, contaDebito, contaCredito, contaDebitoOriginal, contaCreditoOriginal);
        }
    }

    // === SUGESTÃO DE NCM ===

    public SugestaoNCM sugerirNcm(String descricaoProduto) {
        String desc = descricaoProduto.toUpperCase();

        // Base de NCMs mais comuns com palavras-chave
        Map<String, String[]> ncmMap = new LinkedHashMap<>();
        ncmMap.put("8471.30.19", new String[]{"NOTEBOOK", "LAPTOP", "COMPUTADOR PORTATIL"});
        ncmMap.put("8471.50.10", new String[]{"COMPUTADOR", "DESKTOP", "PC", "CPU"});
        ncmMap.put("8443.32.99", new String[]{"IMPRESSORA", "MULTIFUNCIONAL"});
        ncmMap.put("8528.52.20", new String[]{"MONITOR", "TELA", "DISPLAY"});
        ncmMap.put("8517.12.99", new String[]{"CELULAR", "SMARTPHONE", "TELEFONE"});
        ncmMap.put("8415.10.11", new String[]{"AR CONDICIONADO", "SPLIT", "CLIMATIZADOR"});
        ncmMap.put("9401.30.90", new String[]{"CADEIRA", "POLTRONA", "ASSENTO GIRATÓRIO"});
        ncmMap.put("9403.30.00", new String[]{"MESA", "ESCRIVANINHA", "BANCADA"});
        ncmMap.put("4820.10.00", new String[]{"PAPEL", "CADERNO", "BLOCO"});
        ncmMap.put("4901.99.00", new String[]{"LIVRO", "PUBLICACAO", "MANUAL"});
        ncmMap.put("2710.19.21", new String[]{"DIESEL", "OLEO DIESEL", "COMBUSTIVEL"});
        ncmMap.put("2710.12.59", new String[]{"GASOLINA", "ALCOOL", "ETANOL"});
        ncmMap.put("7308.90.10", new String[]{"ESTRUTURA METALICA", "FERRO", "ACO"});
        ncmMap.put("6810.11.00", new String[]{"BLOCO CONCRETO", "TIJOLO", "CIMENTO"});
        ncmMap.put("0201.10.00", new String[]{"CARNE BOVINA", "BOI", "BIFE"});
        ncmMap.put("0207.14.00", new String[]{"FRANGO", "CARNE DE FRANGO", "AVE"});
        ncmMap.put("1006.30.21", new String[]{"ARROZ", "ARROZ BRANCO"});
        ncmMap.put("0713.33.99", new String[]{"FEIJAO", "FEIJÃO"});

        String melhorNcm = null;
        double melhorScore = 0;
        List<String> alternativas = new ArrayList<>();

        for (Map.Entry<String, String[]> entry : ncmMap.entrySet()) {
            for (String palavra : entry.getValue()) {
                if (desc.contains(palavra)) {
                    double score = (double) palavra.length() / desc.length();
                    if (score > melhorScore) {
                        if (melhorNcm != null) alternativas.add(melhorNcm);
                        melhorNcm = entry.getKey();
                        melhorScore = Math.min(score * 2, 0.95);
                    } else {
                        alternativas.add(entry.getKey());
                    }
                }
            }
        }

        if (melhorNcm == null) {
            return SugestaoNCM.builder()
                    .ncm("0000.00.00")
                    .descricaoNcm("NCM não identificado — classificação manual necessária")
                    .confianca(0)
                    .alternativas(List.of())
                    .build();
        }

        return SugestaoNCM.builder()
                .ncm(melhorNcm)
                .descricaoNcm(descricaoProduto)
                .confianca(melhorScore)
                .alternativas(alternativas.stream().distinct().limit(5).collect(Collectors.toList()))
                .build();
    }

    // === SUGESTÃO DE PLANO DE CONTAS REFERENCIAL ===

    public Map<String, Object> sugerirPlanoContas(String regime) {
        Map<String, Object> plano = new LinkedHashMap<>();

        // Templates por regime
        List<Map<String, String>> contas = new ArrayList<>();

        // Contas comuns a todos os regimes
        contas.add(Map.of("codigo", "1", "descricao", "ATIVO", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "1.1", "descricao", "ATIVO CIRCULANTE", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "1.1.01", "descricao", "CAIXA E EQUIVALENTES", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "1.1.01.001", "descricao", "Caixa Geral", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "1.1.01.002", "descricao", "Bancos Conta Movimento", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "1.1.01.003", "descricao", "Aplicações Financeiras", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "1.1.02", "descricao", "CLIENTES", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "1.1.02.001", "descricao", "Duplicatas a Receber", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "1.1.03", "descricao", "ESTOQUES", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "1.1.03.001", "descricao", "Mercadorias para Revenda", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "1.1.04", "descricao", "IMPOSTOS A RECUPERAR", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "1.1.04.001", "descricao", "ICMS a Recuperar", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "1.1.04.002", "descricao", "PIS a Recuperar", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "1.1.04.003", "descricao", "COFINS a Recuperar", "natureza", "DEVEDORA", "tipo", "ANALITICA"));

        contas.add(Map.of("codigo", "1.2", "descricao", "ATIVO NÃO CIRCULANTE", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "1.2.01", "descricao", "IMOBILIZADO", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "1.2.01.001", "descricao", "Máquinas e Equipamentos", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "1.2.01.002", "descricao", "Móveis e Utensílios", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "1.2.01.003", "descricao", "Veículos", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "1.2.01.099", "descricao", "(-) Depreciação Acumulada", "natureza", "CREDORA", "tipo", "ANALITICA"));

        contas.add(Map.of("codigo", "2", "descricao", "PASSIVO", "natureza", "CREDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "2.1", "descricao", "PASSIVO CIRCULANTE", "natureza", "CREDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "2.1.01", "descricao", "FORNECEDORES", "natureza", "CREDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "2.1.01.001", "descricao", "Fornecedores Nacionais", "natureza", "CREDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "2.1.02", "descricao", "OBRIGAÇÕES TRABALHISTAS", "natureza", "CREDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "2.1.02.001", "descricao", "Salários a Pagar", "natureza", "CREDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "2.1.02.002", "descricao", "FGTS a Recolher", "natureza", "CREDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "2.1.02.003", "descricao", "INSS a Recolher", "natureza", "CREDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "2.1.03", "descricao", "OBRIGAÇÕES FISCAIS", "natureza", "CREDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "2.1.03.001", "descricao", "ICMS a Recolher", "natureza", "CREDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "2.1.03.002", "descricao", "PIS a Recolher", "natureza", "CREDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "2.1.03.003", "descricao", "COFINS a Recolher", "natureza", "CREDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "2.1.03.004", "descricao", "IRPJ a Recolher", "natureza", "CREDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "2.1.03.005", "descricao", "CSLL a Recolher", "natureza", "CREDORA", "tipo", "ANALITICA"));

        contas.add(Map.of("codigo", "2.3", "descricao", "PATRIMÔNIO LÍQUIDO", "natureza", "CREDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "2.3.01", "descricao", "Capital Social", "natureza", "CREDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "2.3.02", "descricao", "Lucros Acumulados", "natureza", "CREDORA", "tipo", "ANALITICA"));

        contas.add(Map.of("codigo", "3", "descricao", "RECEITAS", "natureza", "CREDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "3.1", "descricao", "RECEITA BRUTA", "natureza", "CREDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "3.1.01.001", "descricao", "Venda de Mercadorias", "natureza", "CREDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "3.1.01.002", "descricao", "Prestação de Serviços", "natureza", "CREDORA", "tipo", "ANALITICA"));

        contas.add(Map.of("codigo", "4", "descricao", "CUSTOS E DESPESAS", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "4.1", "descricao", "CUSTOS", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "4.1.01.001", "descricao", "Custo das Mercadorias Vendidas", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "4.2", "descricao", "DESPESAS OPERACIONAIS", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "4.2.01.001", "descricao", "Aluguel", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "4.2.01.002", "descricao", "Energia Elétrica", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "4.2.01.003", "descricao", "Telefone e Internet", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "4.2.01.004", "descricao", "Material de Escritório", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "4.2.02", "descricao", "DESPESAS COM PESSOAL", "natureza", "DEVEDORA", "tipo", "SINTETICA"));
        contas.add(Map.of("codigo", "4.2.02.001", "descricao", "Salários e Ordenados", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "4.2.02.002", "descricao", "Encargos Sociais (INSS)", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        contas.add(Map.of("codigo", "4.2.02.003", "descricao", "FGTS", "natureza", "DEVEDORA", "tipo", "ANALITICA"));

        // Contas específicas por regime
        if ("LUCRO_REAL".equals(regime)) {
            contas.add(Map.of("codigo", "2.1.03.010", "descricao", "IRPJ Estimativa a Recolher", "natureza", "CREDORA", "tipo", "ANALITICA"));
            contas.add(Map.of("codigo", "2.1.03.011", "descricao", "CSLL Estimativa a Recolher", "natureza", "CREDORA", "tipo", "ANALITICA"));
            contas.add(Map.of("codigo", "1.1.04.010", "descricao", "IRPJ a Compensar", "natureza", "DEVEDORA", "tipo", "ANALITICA"));
        }

        if ("SIMPLES_NACIONAL".equals(regime)) {
            contas.add(Map.of("codigo", "2.1.03.020", "descricao", "DAS a Recolher", "natureza", "CREDORA", "tipo", "ANALITICA"));
        }

        plano.put("regime", regime);
        plano.put("totalContas", contas.size());
        plano.put("contas", contas);
        plano.put("observacao", "Plano de contas referencial baseado no layout SPED da RFB, adaptado para " + regime);

        return plano;
    }

    // === HELPERS ===

    private SugestaoContrapartida analisarHistorico(List<HistoricoClassificacao> historico, String base) {
        // Usar as contas FINAIS (após correção) para aprender
        Map<String, Integer> contagem = new LinkedHashMap<>();
        for (HistoricoClassificacao h : historico) {
            String chave = h.getContaDebitoFinal() + "|" + h.getContaCreditoFinal();
            contagem.merge(chave, 1, Integer::sum);
        }

        List<Map.Entry<String, Integer>> sorted = contagem.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue().reversed())
                .collect(Collectors.toList());

        if (sorted.isEmpty()) return SugestaoContrapartida.builder().confianca(0).build();

        String[] melhor = sorted.get(0).getKey().split("\\|");
        double confianca = (double) sorted.get(0).getValue() / historico.size();

        List<AlternativaSugestao> alternativas = sorted.stream().skip(1).limit(3)
                .map(e -> {
                    String[] parts = e.getKey().split("\\|");
                    return AlternativaSugestao.builder()
                            .contaDebito(parts[0])
                            .contaCredito(parts.length > 1 ? parts[1] : "")
                            .confianca((double) e.getValue() / historico.size())
                            .ocorrencias(e.getValue())
                            .build();
                }).collect(Collectors.toList());

        return SugestaoContrapartida.builder()
                .contaDebito(melhor[0])
                .contaCredito(melhor.length > 1 ? melhor[1] : "")
                .confianca(confianca)
                .baseSugestao(base)
                .ocorrenciasHistorico(sorted.get(0).getValue())
                .alternativas(alternativas)
                .build();
    }

    private SugestaoContrapartida sugerirPorDescricao(String tenantId, String descricao, String[] palavras) {
        for (String palavra : palavras) {
            if (palavra.length() < 4) continue;
            List<HistoricoClassificacao> matches = mongoTemplate.find(
                    Query.query(Criteria.where("tenantId").is(tenantId)
                            .and("descricaoOriginal").regex(palavra, "i"))
                            .limit(30),
                    HistoricoClassificacao.class);

            if (matches.size() >= 3) {
                SugestaoContrapartida s = analisarHistorico(matches, "descricao");
                if (s.getConfianca() >= 0.5) return s;
            }
        }
        return null;
    }

    private SugestaoContrapartida sugerirPorRegrasPadrao(String cfop, String descricao) {
        // Regras padrão por CFOP
        String debito = "1.1.03.001"; // Estoque (padrão compra)
        String credito = "2.1.01.001"; // Fornecedores

        if (cfop != null) {
            if (cfop.startsWith("1") || cfop.startsWith("2")) { // Entradas
                debito = "1.1.03.001"; credito = "2.1.01.001";
            } else if (cfop.startsWith("5") || cfop.startsWith("6")) { // Saídas
                debito = "1.1.02.001"; credito = "3.1.01.001";
            }
        }

        if (descricao != null) {
            String upper = descricao.toUpperCase();
            if (upper.contains("ALUGUEL")) { debito = "4.2.01.001"; credito = "1.1.01.002"; }
            else if (upper.contains("ENERGIA") || upper.contains("LUZ")) { debito = "4.2.01.002"; credito = "1.1.01.002"; }
            else if (upper.contains("TELEFONE") || upper.contains("INTERNET")) { debito = "4.2.01.003"; credito = "1.1.01.002"; }
            else if (upper.contains("SALARIO") || upper.contains("FOLHA")) { debito = "4.2.02.001"; credito = "2.1.02.001"; }
        }

        return SugestaoContrapartida.builder()
                .contaDebito(debito)
                .contaCredito(credito)
                .confianca(0.4)
                .baseSugestao("regras_padrao")
                .ocorrenciasHistorico(0)
                .alternativas(List.of())
                .build();
    }
}
