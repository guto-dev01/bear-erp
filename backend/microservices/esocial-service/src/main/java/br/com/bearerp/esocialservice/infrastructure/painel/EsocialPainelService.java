package br.com.bearerp.esocialservice.infrastructure.painel;

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

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * eSocial Painel Avançado — supera concorrentes:
 * - Semáforo de eventos (verde/amarelo/vermelho por empresa)
 * - Timeline por funcionário (todos eventos enviados)
 * - Reprocessamento em lote de eventos rejeitados
 * - Qualificação cadastral (CPF x NIS x nome)
 * - Alerta de férias vencendo (período concessivo)
 * - Dashboard consolidado do escritório
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EsocialPainelService {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "esocial_eventos_painel")
    public static class EventoEsocial {
        @Id
        private String id;
        private String tenantId;
        private String empresaId;
        private String cnpj;
        private String funcionarioId;
        private String funcionarioNome;
        private String cpfFuncionario;

        private String tipoEvento;           // S-1000, S-1200, S-2200, etc.
        private String descricaoEvento;
        private String competencia;          // 2024-01
        private String lote;
        private StatusEvento status;
        private String protocoloEnvio;
        private String recibo;
        private String mensagemRetorno;
        private int tentativas;

        private Instant enviadoEm;
        private Instant processadoEm;
        private Instant criadoEm;
    }

    public enum StatusEvento {
        PENDENTE, ENVIADO, PROCESSADO, REJEITADO, ERRO, REPROCESSANDO
    }

    public enum CorSemaforo {
        VERDE, AMARELO, VERMELHO
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SemaforoEmpresa {
        private String empresaId;
        private String cnpj;
        private String razaoSocial;
        private CorSemaforo cor;
        private int eventosPendentes;
        private int eventosRejeitados;
        private int eventosProcessados;
        private int totalEventos;
        private List<String> alertas;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TimelineFuncionario {
        private String funcionarioId;
        private String nome;
        private String cpf;
        private String empresaId;
        private List<EventoTimeline> eventos;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class EventoTimeline {
        private String tipoEvento;
        private String descricao;
        private String competencia;
        private StatusEvento status;
        private Instant data;
        private String recibo;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ResultadoQualificacao {
        private String cpf;
        private String nome;
        private String nis;
        private boolean cpfValido;
        private boolean nisValido;
        private boolean nomeConsistente;
        private boolean qualificado;
        private List<String> divergencias;
        private String recomendacao;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AlertaFerias {
        private String funcionarioId;
        private String nome;
        private String empresaId;
        private String cnpjEmpresa;
        private LocalDate dataAdmissao;
        private LocalDate inicioPeridoAquisitivo;
        private LocalDate fimPeriodoAquisitivo;
        private LocalDate limiteConcessivo;
        private int diasParaVencer;
        private String urgencia;             // NORMAL, ATENCAO, URGENTE, VENCIDO
    }

    // === SEMÁFORO ===

    public List<SemaforoEmpresa> semaforoEscritorio() {
        String tenantId = TenantContext.getTenantId();
        List<Map> empresas = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(tenantId).and("ativo").is(true)),
                Map.class, "empresas");

        List<SemaforoEmpresa> semaforos = new ArrayList<>();
        for (Map empresa : empresas) {
            String empresaId = (String) empresa.get("_id");
            String cnpj = (String) empresa.get("cnpj");
            String razao = (String) empresa.get("razaoSocial");

            long pendentes = mongoTemplate.count(
                    Query.query(Criteria.where("empresaId").is(empresaId).and("status").is("PENDENTE")),
                    EventoEsocial.class);
            long rejeitados = mongoTemplate.count(
                    Query.query(Criteria.where("empresaId").is(empresaId).and("status").is("REJEITADO")),
                    EventoEsocial.class);
            long processados = mongoTemplate.count(
                    Query.query(Criteria.where("empresaId").is(empresaId).and("status").is("PROCESSADO")),
                    EventoEsocial.class);
            long total = pendentes + rejeitados + processados;

            List<String> alertas = new ArrayList<>();
            CorSemaforo cor;

            if (rejeitados > 0) {
                cor = CorSemaforo.VERMELHO;
                alertas.add(rejeitados + " evento(s) rejeitado(s) — reprocessamento necessário");
            } else if (pendentes > 0) {
                cor = CorSemaforo.AMARELO;
                alertas.add(pendentes + " evento(s) pendente(s) de envio");
            } else {
                cor = CorSemaforo.VERDE;
            }

            semaforos.add(SemaforoEmpresa.builder()
                    .empresaId(empresaId)
                    .cnpj(cnpj != null ? cnpj : "")
                    .razaoSocial(razao != null ? razao : "")
                    .cor(cor)
                    .eventosPendentes((int) pendentes)
                    .eventosRejeitados((int) rejeitados)
                    .eventosProcessados((int) processados)
                    .totalEventos((int) total)
                    .alertas(alertas)
                    .build());
        }

        semaforos.sort(Comparator.comparing(s -> s.getCor().ordinal()));
        return semaforos;
    }

    // === TIMELINE ===

    public TimelineFuncionario timelineFuncionario(String funcionarioId) {
        List<EventoEsocial> eventos = mongoTemplate.find(
                Query.query(Criteria.where("funcionarioId").is(funcionarioId))
                        .with(org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "criadoEm")),
                EventoEsocial.class);

        if (eventos.isEmpty()) {
            return TimelineFuncionario.builder()
                    .funcionarioId(funcionarioId)
                    .eventos(List.of())
                    .build();
        }

        EventoEsocial primeiro = eventos.get(0);
        List<EventoTimeline> timeline = eventos.stream()
                .map(e -> EventoTimeline.builder()
                        .tipoEvento(e.getTipoEvento())
                        .descricao(e.getDescricaoEvento())
                        .competencia(e.getCompetencia())
                        .status(e.getStatus())
                        .data(e.getCriadoEm())
                        .recibo(e.getRecibo())
                        .build())
                .collect(Collectors.toList());

        return TimelineFuncionario.builder()
                .funcionarioId(funcionarioId)
                .nome(primeiro.getFuncionarioNome())
                .cpf(primeiro.getCpfFuncionario())
                .empresaId(primeiro.getEmpresaId())
                .eventos(timeline)
                .build();
    }

    // === REPROCESSAMENTO EM LOTE ===

    public Map<String, Object> reprocessarRejeitados(String empresaId) {
        List<EventoEsocial> rejeitados = mongoTemplate.find(
                Query.query(Criteria.where("empresaId").is(empresaId)
                        .and("status").is("REJEITADO")),
                EventoEsocial.class);

        int reprocessados = 0;
        for (EventoEsocial evento : rejeitados) {
            evento.setStatus(StatusEvento.REPROCESSANDO);
            evento.setTentativas(evento.getTentativas() + 1);
            mongoTemplate.save(evento);

            kafkaTemplate.send("bear.esocial.reprocessar", evento.getId(), Map.of(
                    "eventoId", evento.getId(),
                    "tipoEvento", evento.getTipoEvento(),
                    "empresaId", empresaId,
                    "tentativa", evento.getTentativas()
            ));
            reprocessados++;
        }

        log.info("Reprocessamento eSocial: {} eventos da empresa {}", reprocessados, empresaId);
        return Map.of(
                "empresaId", empresaId,
                "eventosReprocessados", reprocessados,
                "mensagem", reprocessados > 0
                        ? reprocessados + " evento(s) enviado(s) para reprocessamento"
                        : "Nenhum evento rejeitado encontrado"
        );
    }

    // === QUALIFICAÇÃO CADASTRAL ===

    public ResultadoQualificacao qualificarCadastro(String cpf, String nome, String nis) {
        List<String> divergencias = new ArrayList<>();

        boolean cpfValido = validarCpf(cpf);
        if (!cpfValido) divergencias.add("CPF inválido (dígitos verificadores não conferem)");

        boolean nisValido = nis != null && nis.replaceAll("[^0-9]", "").length() == 11;
        if (!nisValido) divergencias.add("NIS/PIS inválido — deve conter 11 dígitos");

        boolean nomeConsistente = nome != null && nome.trim().length() >= 5
                && nome.contains(" ");
        if (!nomeConsistente) divergencias.add("Nome incompleto — informar nome completo conforme documento");

        // Verificar caracteres especiais no nome
        if (nome != null && nome.matches(".*[0-9@#$%&*].*")) {
            divergencias.add("Nome contém caracteres inválidos");
            nomeConsistente = false;
        }

        boolean qualificado = cpfValido && nisValido && nomeConsistente;

        String recomendacao;
        if (qualificado) {
            recomendacao = "Cadastro qualificado — apto para envio ao eSocial.";
        } else {
            recomendacao = "Cadastro com divergências — corrigir antes de enviar eventos ao eSocial. " +
                    "Utilize a ferramenta de Qualificação Cadastral no portal do eSocial para validação oficial.";
        }

        return ResultadoQualificacao.builder()
                .cpf(cpf)
                .nome(nome)
                .nis(nis)
                .cpfValido(cpfValido)
                .nisValido(nisValido)
                .nomeConsistente(nomeConsistente)
                .qualificado(qualificado)
                .divergencias(divergencias)
                .recomendacao(recomendacao)
                .build();
    }

    // === FÉRIAS VENCENDO ===

    @Scheduled(cron = "0 0 7 * * MON-FRI")
    public void alertarFeriasVencendo() {
        List<AlertaFerias> alertas = listarFeriasVencendo();
        for (AlertaFerias alerta : alertas) {
            if ("URGENTE".equals(alerta.getUrgencia()) || "VENCIDO".equals(alerta.getUrgencia())) {
                kafkaTemplate.send("bear.esocial.alerta-ferias", alerta.getFuncionarioId(), Map.of(
                        "funcionarioId", alerta.getFuncionarioId(),
                        "nome", alerta.getNome(),
                        "empresaId", alerta.getEmpresaId(),
                        "diasParaVencer", alerta.getDiasParaVencer(),
                        "urgencia", alerta.getUrgencia(),
                        "limiteConcessivo", alerta.getLimiteConcessivo().toString(),
                        "mensagem", String.format("Férias de %s vencem em %d dias (%s)",
                                alerta.getNome(), alerta.getDiasParaVencer(), alerta.getLimiteConcessivo())
                ));
            }
        }
    }

    public List<AlertaFerias> listarFeriasVencendo() {
        LocalDate hoje = LocalDate.now();
        List<Map> funcionarios = mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("ativo").is(true)),
                Map.class, "funcionarios");

        List<AlertaFerias> alertas = new ArrayList<>();
        for (Map func : funcionarios) {
            LocalDate admissao = null;
            Object dataAdm = func.get("dataAdmissao");
            if (dataAdm instanceof String) {
                try { admissao = LocalDate.parse((String) dataAdm); } catch (Exception ignored) {}
            } else if (dataAdm instanceof LocalDate) {
                admissao = (LocalDate) dataAdm;
            }

            if (admissao == null) continue;

            // Calcular período aquisitivo atual
            int anosCompletos = (int) ChronoUnit.YEARS.between(admissao, hoje);
            LocalDate inicioAquisitivo = admissao.plusYears(anosCompletos);
            LocalDate fimAquisitivo = inicioAquisitivo.plusYears(1);
            LocalDate limiteConcessivo = fimAquisitivo.plusYears(1);

            int diasParaVencer = (int) ChronoUnit.DAYS.between(hoje, limiteConcessivo);

            String urgencia;
            if (diasParaVencer < 0) urgencia = "VENCIDO";
            else if (diasParaVencer <= 30) urgencia = "URGENTE";
            else if (diasParaVencer <= 90) urgencia = "ATENCAO";
            else continue; // Sem alerta

            alertas.add(AlertaFerias.builder()
                    .funcionarioId((String) func.get("_id"))
                    .nome((String) func.get("nome"))
                    .empresaId((String) func.get("empresaId"))
                    .cnpjEmpresa((String) func.get("cnpjEmpresa"))
                    .dataAdmissao(admissao)
                    .inicioPeridoAquisitivo(inicioAquisitivo)
                    .fimPeriodoAquisitivo(fimAquisitivo)
                    .limiteConcessivo(limiteConcessivo)
                    .diasParaVencer(diasParaVencer)
                    .urgencia(urgencia)
                    .build());
        }

        alertas.sort(Comparator.comparingInt(AlertaFerias::getDiasParaVencer));
        return alertas;
    }

    // === DASHBOARD ===

    public Map<String, Object> dashboardEscritorio() {
        String tenantId = TenantContext.getTenantId();
        Map<String, Object> dash = new LinkedHashMap<>();

        long totalEventos = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)), EventoEsocial.class);
        long pendentes = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("status").is("PENDENTE")),
                EventoEsocial.class);
        long rejeitados = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("status").is("REJEITADO")),
                EventoEsocial.class);
        long processados = mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId).and("status").is("PROCESSADO")),
                EventoEsocial.class);

        dash.put("totalEventos", totalEventos);
        dash.put("pendentes", pendentes);
        dash.put("rejeitados", rejeitados);
        dash.put("processados", processados);
        dash.put("taxaSucesso", totalEventos > 0 ? (double) processados / totalEventos * 100 : 0);

        // Semáforo resumido
        List<SemaforoEmpresa> semaforos = semaforoEscritorio();
        long verdes = semaforos.stream().filter(s -> s.getCor() == CorSemaforo.VERDE).count();
        long amarelos = semaforos.stream().filter(s -> s.getCor() == CorSemaforo.AMARELO).count();
        long vermelhos = semaforos.stream().filter(s -> s.getCor() == CorSemaforo.VERMELHO).count();

        dash.put("empresasVerde", verdes);
        dash.put("empresasAmarelo", amarelos);
        dash.put("empresasVermelho", vermelhos);

        // Férias vencendo
        List<AlertaFerias> ferias = listarFeriasVencendo();
        dash.put("feriasVencendo", ferias.size());
        dash.put("feriasUrgentes", ferias.stream()
                .filter(f -> "URGENTE".equals(f.getUrgencia()) || "VENCIDO".equals(f.getUrgencia()))
                .count());

        return dash;
    }

    private boolean validarCpf(String cpf) {
        if (cpf == null) return false;
        String limpo = cpf.replaceAll("[^0-9]", "");
        if (limpo.length() != 11) return false;
        if (limpo.chars().distinct().count() == 1) return false;

        int[] pesos1 = {10, 9, 8, 7, 6, 5, 4, 3, 2};
        int soma = 0;
        for (int i = 0; i < 9; i++) soma += (limpo.charAt(i) - '0') * pesos1[i];
        int d1 = 11 - (soma % 11);
        if (d1 > 9) d1 = 0;

        int[] pesos2 = {11, 10, 9, 8, 7, 6, 5, 4, 3, 2};
        soma = 0;
        for (int i = 0; i < 10; i++) soma += (limpo.charAt(i) - '0') * pesos2[i];
        int d2 = 11 - (soma % 11);
        if (d2 > 9) d2 = 0;

        return (limpo.charAt(9) - '0') == d1 && (limpo.charAt(10) - '0') == d2;
    }
}
