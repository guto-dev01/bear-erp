package br.com.bearerp.escritorioservice.infrastructure.cobranca;

import br.com.bearerp.common.domain.TenantContext;
import lombok.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Régua de Cobrança Automatizada para Honorários
 * - Lembrete 5 dias antes do vencimento
 * - Lembrete no dia do vencimento
 * - Cobrança 3, 7, 15, 30 dias após vencimento
 * - Score de inadimplência por cliente
 * - Reajuste automático por índice (IPCA, IGP-M)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ReguaCobrancaService {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "regua_cobranca")
    public static class CobrancaHonorario {
        @Id
        private String id;
        private String tenantId;
        private String empresaId;
        private String honorarioId;
        private String empresaClienteId;
        private String empresaClienteNome;
        private String cnpjCliente;

        private BigDecimal valorOriginal;
        private BigDecimal valorAtualizado;    // com multa/juros
        private BigDecimal multa;
        private BigDecimal juros;
        private LocalDate vencimento;
        private String competencia;
        private StatusCobranca status;
        private int diasAtraso;

        // Régua de cobrança executada
        private boolean lembreteEnviado5Dias;
        private boolean lembreteEnviadoNoDia;
        private boolean cobrancaEnviada3Dias;
        private boolean cobrancaEnviada7Dias;
        private boolean cobrancaEnviada15Dias;
        private boolean cobrancaEnviada30Dias;
        private boolean cobrancaEnviadaSuspensao;

        private List<HistoricoCobranca> historico;
        private Instant ultimaCobrancaEm;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "score_inadimplencia")
    public static class ScoreCliente {
        @Id
        private String id;
        private String tenantId;
        private String empresaClienteId;
        private String empresaClienteNome;
        private int score;                      // 0-100 (100 = ótimo pagador)
        private String classificacao;           // A, B, C, D, E
        private int pagamentosEmDia;
        private int pagamentosAtrasados;
        private int totalPagamentos;
        private double percentualAdimplencia;
        private int maiorAtrasoEmDias;
        private BigDecimal totalInadimplido;
        private LocalDate ultimoPagamento;
        private Instant atualizadoEm;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class HistoricoCobranca {
        private Instant dataHora;
        private String acao;                    // LEMBRETE, COBRANCA, SUSPENSAO, PAGAMENTO
        private String canal;                   // EMAIL, WHATSAPP, SMS, PORTAL
        private String mensagem;
        private boolean entregue;
    }

    public enum StatusCobranca {
        PENDENTE, LEMBRADO, EM_COBRANCA, PAGO, ATRASADO, SUSPENSO, INADIMPLENTE
    }

    // === EXECUÇÃO DIÁRIA DA RÉGUA ===

    @Scheduled(cron = "0 0 9 * * MON-FRI")
    public void executarReguaDiaria() {
        log.info("Executando régua de cobrança diária...");
        LocalDate hoje = LocalDate.now();

        List<CobrancaHonorario> cobrancas = mongoTemplate.find(
                Query.query(Criteria.where("status").nin(StatusCobranca.PAGO, StatusCobranca.SUSPENSO)),
                CobrancaHonorario.class);

        int lembretes = 0, cobrancasMade = 0;

        for (CobrancaHonorario c : cobrancas) {
            long dias = ChronoUnit.DAYS.between(hoje, c.getVencimento());

            // 5 dias antes do vencimento
            if (dias == 5 && !c.isLembreteEnviado5Dias()) {
                enviarNotificacao(c, "LEMBRETE", "Lembrete: honorário de " + c.getCompetencia() +
                        " vence em 5 dias (R$ " + c.getValorOriginal() + ")");
                c.setLembreteEnviado5Dias(true);
                c.setStatus(StatusCobranca.LEMBRADO);
                lembretes++;
            }

            // No dia do vencimento
            if (dias == 0 && !c.isLembreteEnviadoNoDia()) {
                enviarNotificacao(c, "LEMBRETE", "Hoje é o vencimento do honorário de " + c.getCompetencia() +
                        " (R$ " + c.getValorOriginal() + ")");
                c.setLembreteEnviadoNoDia(true);
                lembretes++;
            }

            // Após vencimento
            if (dias < 0) {
                int atraso = (int) Math.abs(dias);
                c.setDiasAtraso(atraso);
                c.setStatus(StatusCobranca.ATRASADO);

                // Calcular multa e juros
                calcularMultaJuros(c, atraso);

                if (atraso >= 3 && !c.isCobrancaEnviada3Dias()) {
                    enviarNotificacao(c, "COBRANCA", "AVISO: Honorário de " + c.getCompetencia() +
                            " está com " + atraso + " dias de atraso. Valor atualizado: R$ " + c.getValorAtualizado());
                    c.setCobrancaEnviada3Dias(true);
                    c.setStatus(StatusCobranca.EM_COBRANCA);
                    cobrancasMade++;
                }
                if (atraso >= 7 && !c.isCobrancaEnviada7Dias()) {
                    enviarNotificacao(c, "COBRANCA", "URGENTE: Honorário de " + c.getCompetencia() +
                            " está com " + atraso + " dias de atraso. Valor com multa: R$ " + c.getValorAtualizado());
                    c.setCobrancaEnviada7Dias(true);
                    cobrancasMade++;
                }
                if (atraso >= 15 && !c.isCobrancaEnviada15Dias()) {
                    enviarNotificacao(c, "COBRANCA", "ÚLTIMO AVISO: Honorário de " + c.getCompetencia() +
                            " está com " + atraso + " dias de atraso. Regularize para evitar suspensão de serviços.");
                    c.setCobrancaEnviada15Dias(true);
                    cobrancasMade++;
                }
                if (atraso >= 30 && !c.isCobrancaEnviada30Dias()) {
                    enviarNotificacao(c, "SUSPENSAO", "SUSPENSÃO DE SERVIÇOS: Honorário de " + c.getCompetencia() +
                            " está com " + atraso + " dias de atraso. Serviços contábeis suspensos até regularização.");
                    c.setCobrancaEnviada30Dias(true);
                    c.setStatus(StatusCobranca.INADIMPLENTE);
                    cobrancasMade++;
                }
            }

            mongoTemplate.save(c);
        }

        // Atualizar scores
        atualizarScores();

        log.info("Régua de cobrança: {} lembretes, {} cobranças enviadas", lembretes, cobrancasMade);
    }

    public CobrancaHonorario registrarCobranca(String honorarioId, String empresaClienteId,
                                                 String empresaClienteNome, BigDecimal valor,
                                                 LocalDate vencimento, String competencia) {
        CobrancaHonorario c = CobrancaHonorario.builder()
                .tenantId(TenantContext.getTenantId())
                .empresaId(TenantContext.getEmpresaId())
                .honorarioId(honorarioId)
                .empresaClienteId(empresaClienteId)
                .empresaClienteNome(empresaClienteNome)
                .valorOriginal(valor)
                .valorAtualizado(valor)
                .multa(BigDecimal.ZERO)
                .juros(BigDecimal.ZERO)
                .vencimento(vencimento)
                .competencia(competencia)
                .status(StatusCobranca.PENDENTE)
                .diasAtraso(0)
                .historico(new ArrayList<>())
                .build();

        return mongoTemplate.save(c);
    }

    public CobrancaHonorario registrarPagamento(String cobrancaId) {
        CobrancaHonorario c = mongoTemplate.findById(cobrancaId, CobrancaHonorario.class);
        if (c == null) throw new RuntimeException("Cobrança não encontrada");

        c.setStatus(StatusCobranca.PAGO);
        adicionarHistorico(c, "PAGAMENTO", "Pagamento recebido");

        mongoTemplate.save(c);

        // Atualizar score do cliente
        atualizarScoreCliente(c.getEmpresaClienteId());

        return c;
    }

    public ScoreCliente buscarScore(String empresaClienteId) {
        return mongoTemplate.findOne(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("empresaClienteId").is(empresaClienteId)),
                ScoreCliente.class);
    }

    public List<CobrancaHonorario> listarInadimplentes() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("status").in(StatusCobranca.ATRASADO, StatusCobranca.EM_COBRANCA, StatusCobranca.INADIMPLENTE)),
                CobrancaHonorario.class);
    }

    public Map<String, Object> dashboardFinanceiroEscritorio() {
        String tenantId = TenantContext.getTenantId();
        Map<String, Object> dash = new LinkedHashMap<>();

        // MRR (Monthly Recurring Revenue)
        List<CobrancaHonorario> recebidas = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(tenantId).and("status").is(StatusCobranca.PAGO)
                        .and("competencia").is(LocalDate.now().getYear() + "-" + String.format("%02d", LocalDate.now().getMonthValue()))),
                CobrancaHonorario.class);

        BigDecimal mrr = recebidas.stream().map(CobrancaHonorario::getValorOriginal).reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalClientes = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)), ScoreCliente.class);

        long inadimplentes = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("status").in(StatusCobranca.ATRASADO, StatusCobranca.INADIMPLENTE)),
                CobrancaHonorario.class);

        BigDecimal ticketMedio = totalClientes > 0
                ? mrr.divide(BigDecimal.valueOf(totalClientes), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        double inadimplenciaPercent = totalClientes > 0 ? (double) inadimplentes / totalClientes * 100 : 0;

        dash.put("mrr", mrr);
        dash.put("ticketMedio", ticketMedio);
        dash.put("totalClientes", totalClientes);
        dash.put("inadimplentes", inadimplentes);
        dash.put("taxaInadimplencia", String.format("%.1f%%", inadimplenciaPercent));
        dash.put("recebidosMes", recebidas.size());

        return dash;
    }

    // Reajuste automático por índice
    public List<CobrancaHonorario> reajustarHonorarios(String indice, double percentual) {
        // indice: IPCA, IGPM, INPC, PERSONALIZADO
        List<CobrancaHonorario> pendentes = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("status").is(StatusCobranca.PENDENTE)),
                CobrancaHonorario.class);

        BigDecimal fator = BigDecimal.ONE.add(BigDecimal.valueOf(percentual / 100));
        for (CobrancaHonorario c : pendentes) {
            c.setValorOriginal(c.getValorOriginal().multiply(fator).setScale(2, RoundingMode.HALF_UP));
            c.setValorAtualizado(c.getValorOriginal());
            mongoTemplate.save(c);
        }

        log.info("Reajuste de {} ({}%) aplicado a {} honorários", indice, percentual, pendentes.size());
        return pendentes;
    }

    // === PRIVADOS ===

    private void calcularMultaJuros(CobrancaHonorario c, int diasAtraso) {
        // Multa: 2% (máximo legal)
        BigDecimal multa = c.getValorOriginal().multiply(new BigDecimal("0.02"));
        // Juros: 1% ao mês (pro rata)
        BigDecimal juros = c.getValorOriginal()
                .multiply(new BigDecimal("0.01"))
                .multiply(BigDecimal.valueOf(diasAtraso))
                .divide(BigDecimal.valueOf(30), 2, RoundingMode.HALF_UP);

        c.setMulta(multa.setScale(2, RoundingMode.HALF_UP));
        c.setJuros(juros.setScale(2, RoundingMode.HALF_UP));
        c.setValorAtualizado(c.getValorOriginal().add(multa).add(juros).setScale(2, RoundingMode.HALF_UP));
    }

    private void enviarNotificacao(CobrancaHonorario c, String tipo, String mensagem) {
        adicionarHistorico(c, tipo, mensagem);
        c.setUltimaCobrancaEm(Instant.now());

        kafkaTemplate.send("bear.cobranca." + tipo.toLowerCase(), c.getId(), Map.of(
                "cobrancaId", c.getId(),
                "empresaCliente", c.getEmpresaClienteNome() != null ? c.getEmpresaClienteNome() : "",
                "valor", c.getValorAtualizado().toString(),
                "diasAtraso", c.getDiasAtraso(),
                "mensagem", mensagem
        ));
    }

    private void adicionarHistorico(CobrancaHonorario c, String acao, String mensagem) {
        if (c.getHistorico() == null) c.setHistorico(new ArrayList<>());
        c.getHistorico().add(HistoricoCobranca.builder()
                .dataHora(Instant.now())
                .acao(acao)
                .canal("EMAIL")
                .mensagem(mensagem)
                .entregue(true)
                .build());
    }

    private void atualizarScores() {
        // Agrupar cobranças por cliente e calcular score
        List<CobrancaHonorario> todas = mongoTemplate.find(
                Query.query(Criteria.where("status").in(StatusCobranca.PAGO, StatusCobranca.ATRASADO, StatusCobranca.INADIMPLENTE)),
                CobrancaHonorario.class);

        Map<String, List<CobrancaHonorario>> porCliente = new LinkedHashMap<>();
        for (CobrancaHonorario c : todas) {
            porCliente.computeIfAbsent(c.getEmpresaClienteId(), k -> new ArrayList<>()).add(c);
        }

        for (Map.Entry<String, List<CobrancaHonorario>> entry : porCliente.entrySet()) {
            atualizarScoreCliente(entry.getKey());
        }
    }

    private void atualizarScoreCliente(String empresaClienteId) {
        List<CobrancaHonorario> cobrancas = mongoTemplate.find(
                Query.query(Criteria.where("empresaClienteId").is(empresaClienteId)),
                CobrancaHonorario.class);

        if (cobrancas.isEmpty()) return;

        int emDia = (int) cobrancas.stream().filter(c -> c.getStatus() == StatusCobranca.PAGO && c.getDiasAtraso() <= 0).count();
        int atrasados = (int) cobrancas.stream().filter(c -> c.getDiasAtraso() > 0).count();
        int total = cobrancas.size();
        int maiorAtraso = cobrancas.stream().mapToInt(CobrancaHonorario::getDiasAtraso).max().orElse(0);

        BigDecimal totalInadimplido = cobrancas.stream()
                .filter(c -> c.getStatus() != StatusCobranca.PAGO)
                .map(CobrancaHonorario::getValorOriginal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        double adimplencia = total > 0 ? (double) emDia / total * 100 : 100;
        int score = (int) Math.max(0, Math.min(100, adimplencia - (maiorAtraso * 0.5)));

        String classificacao;
        if (score >= 90) classificacao = "A";
        else if (score >= 70) classificacao = "B";
        else if (score >= 50) classificacao = "C";
        else if (score >= 30) classificacao = "D";
        else classificacao = "E";

        ScoreCliente scoreObj = mongoTemplate.findOne(
                Query.query(Criteria.where("empresaClienteId").is(empresaClienteId)),
                ScoreCliente.class);

        if (scoreObj == null) {
            scoreObj = new ScoreCliente();
            scoreObj.setEmpresaClienteId(empresaClienteId);
            scoreObj.setTenantId(cobrancas.get(0).getTenantId());
        }

        scoreObj.setEmpresaClienteNome(cobrancas.get(0).getEmpresaClienteNome());
        scoreObj.setScore(score);
        scoreObj.setClassificacao(classificacao);
        scoreObj.setPagamentosEmDia(emDia);
        scoreObj.setPagamentosAtrasados(atrasados);
        scoreObj.setTotalPagamentos(total);
        scoreObj.setPercentualAdimplencia(adimplencia);
        scoreObj.setMaiorAtrasoEmDias(maiorAtraso);
        scoreObj.setTotalInadimplido(totalInadimplido);
        scoreObj.setAtualizadoEm(Instant.now());

        mongoTemplate.save(scoreObj);
    }
}
