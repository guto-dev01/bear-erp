package br.com.bearerp.obrigacoes.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.obrigacoes.domain.model.AgendaFiscal;
import br.com.bearerp.obrigacoes.domain.model.AgendaFiscal.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AgendaFiscalUseCase {

    private final MongoTemplate mongoTemplate;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    // Calendário de obrigações federais base
    private static final List<ObrigacaoTemplate> OBRIGACOES_FEDERAIS = List.of(
            new ObrigacaoTemplate("DCTF", "Declaração de Débitos e Créditos Tributários Federais", 15, Periodicidade.MENSAL, List.of("LUCRO_PRESUMIDO", "LUCRO_REAL")),
            new ObrigacaoTemplate("EFD-Contribuições", "Escrituração Fiscal Digital - PIS/COFINS", 10, Periodicidade.MENSAL, List.of("LUCRO_PRESUMIDO", "LUCRO_REAL")),
            new ObrigacaoTemplate("EFD-REINF", "Escrituração Fiscal Digital de Retenções", 15, Periodicidade.MENSAL, List.of("SIMPLES", "LUCRO_PRESUMIDO", "LUCRO_REAL")),
            new ObrigacaoTemplate("eSocial", "Sistema de Escrituração Digital das Obrigações Fiscais", 15, Periodicidade.MENSAL, List.of("SIMPLES", "LUCRO_PRESUMIDO", "LUCRO_REAL")),
            new ObrigacaoTemplate("DIRF", "Declaração de Imposto de Renda Retido na Fonte", 28, Periodicidade.ANUAL, List.of("SIMPLES", "LUCRO_PRESUMIDO", "LUCRO_REAL")),
            new ObrigacaoTemplate("ECF", "Escrituração Contábil Fiscal", 31, Periodicidade.ANUAL, List.of("LUCRO_PRESUMIDO", "LUCRO_REAL")),
            new ObrigacaoTemplate("ECD", "Escrituração Contábil Digital", 31, Periodicidade.ANUAL, List.of("LUCRO_PRESUMIDO", "LUCRO_REAL")),
            new ObrigacaoTemplate("DEFIS", "Declaração de Informações Socioeconômicas e Fiscais", 31, Periodicidade.ANUAL, List.of("SIMPLES")),
            new ObrigacaoTemplate("PGDAS-D", "Programa Gerador do DAS Declaratório", 20, Periodicidade.MENSAL, List.of("SIMPLES")),
            new ObrigacaoTemplate("DARF IRPJ", "DARF - Imposto de Renda Pessoa Jurídica", 20, Periodicidade.TRIMESTRAL, List.of("LUCRO_PRESUMIDO")),
            new ObrigacaoTemplate("DARF CSLL", "DARF - Contribuição Social sobre Lucro Líquido", 20, Periodicidade.TRIMESTRAL, List.of("LUCRO_PRESUMIDO")),
            new ObrigacaoTemplate("GPS", "Guia da Previdência Social", 20, Periodicidade.MENSAL, List.of("SIMPLES", "LUCRO_PRESUMIDO", "LUCRO_REAL")),
            new ObrigacaoTemplate("FGTS/GRF", "Guia de Recolhimento do FGTS", 7, Periodicidade.MENSAL, List.of("SIMPLES", "LUCRO_PRESUMIDO", "LUCRO_REAL"))
    );

    public List<AgendaFiscal> gerarAgendaMensal(String empresaClienteId, String regimeTributario, int ano, int mes) {
        String tenantId = TenantContext.getTenantId();
        List<AgendaFiscal> agenda = new ArrayList<>();

        for (ObrigacaoTemplate template : OBRIGACOES_FEDERAIS) {
            if (!template.regimes.contains(regimeTributario)) continue;
            if (template.periodicidade == Periodicidade.ANUAL && mes != 3) continue; // Anuais em março
            if (template.periodicidade == Periodicidade.TRIMESTRAL && mes % 3 != 0) continue;

            LocalDate vencimento = calcularVencimento(template.diaVencimento, ano, mes);
            String competencia = String.format("%04d-%02d", ano, mes);

            AgendaFiscal item = AgendaFiscal.builder()
                    .empresaClienteId(empresaClienteId)
                    .obrigacao(template.nome)
                    .descricao(template.descricao)
                    .tipoObrigacao(TipoObrigacao.DECLARACAO)
                    .esfera(EsferaObrigacao.FEDERAL)
                    .periodicidade(template.periodicidade)
                    .competencia(competencia)
                    .dataVencimento(vencimento)
                    .status(StatusAgenda.PENDENTE)
                    .prioridade(PrioridadeAgenda.MEDIA)
                    .alertaEnviado(false)
                    .alertaVencimentoEnviado(false)
                    .regimesTributariosAplicaveis(template.regimes)
                    .build();
            item.setTenantId(tenantId);
            item.setEmpresaId(TenantContext.getEmpresaId());

            agenda.add(mongoTemplate.save(item));
        }

        log.info("Gerada agenda fiscal para empresa {} - {}/{}: {} obrigações", empresaClienteId, mes, ano, agenda.size());
        return agenda;
    }

    public List<AgendaFiscal> consultarPrazosProximos(int dias) {
        LocalDate hoje = LocalDate.now();
        LocalDate limite = hoje.plusDays(dias);
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("dataVencimento").gte(hoje).lte(limite)
                        .and("status").in(StatusAgenda.PENDENTE, StatusAgenda.EM_ANDAMENTO)),
                AgendaFiscal.class);
    }

    public List<AgendaFiscal> consultarAtrasadas() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("dataVencimento").lt(LocalDate.now())
                        .and("status").in(StatusAgenda.PENDENTE, StatusAgenda.EM_ANDAMENTO)),
                AgendaFiscal.class);
    }

    public Map<String, Object> dashboardPrazos() {
        String tenantId = TenantContext.getTenantId();
        Map<String, Object> dashboard = new LinkedHashMap<>();

        dashboard.put("vencendoHoje", contarPorStatusEData(tenantId, LocalDate.now(), LocalDate.now()));
        dashboard.put("vencendo7dias", contarPorStatusEData(tenantId, LocalDate.now(), LocalDate.now().plusDays(7)));
        dashboard.put("vencendo30dias", contarPorStatusEData(tenantId, LocalDate.now(), LocalDate.now().plusDays(30)));
        dashboard.put("atrasadas", consultarAtrasadas().size());
        dashboard.put("entregues", contarEntregues(tenantId, LocalDate.now().withDayOfMonth(1), LocalDate.now()));

        return dashboard;
    }

    public AgendaFiscal marcarEntregue(String id) {
        AgendaFiscal agenda = mongoTemplate.findById(id, AgendaFiscal.class);
        if (agenda == null) throw new RuntimeException("Agenda não encontrada");
        agenda.setStatus(StatusAgenda.ENTREGUE);
        agenda.setDataEntrega(LocalDate.now());
        return mongoTemplate.save(agenda);
    }

    @Scheduled(cron = "0 0 8 * * *") // Todo dia às 8h
    public void verificarVencimentosENotificar() {
        List<AgendaFiscal> proximos = consultarPrazosProximos(3);
        for (AgendaFiscal item : proximos) {
            if (!item.isAlertaVencimentoEnviado()) {
                try {
                    kafkaTemplate.send("bear.fiscal.obrigacao-vencendo", item.getId(), Map.of(
                            "obrigacao", item.getObrigacao(),
                            "empresa", item.getEmpresaClienteNome() != null ? item.getEmpresaClienteNome() : "",
                            "vencimento", item.getDataVencimento().toString(),
                            "competencia", item.getCompetencia()
                    ));
                    item.setAlertaVencimentoEnviado(true);
                    mongoTemplate.save(item);
                } catch (Exception e) {
                    log.error("Erro ao enviar alerta: {}", e.getMessage());
                }
            }
        }

        // Marcar atrasadas
        List<AgendaFiscal> atrasadas = consultarAtrasadas();
        for (AgendaFiscal item : atrasadas) {
            item.setStatus(StatusAgenda.ATRASADA);
            item.setPrioridade(PrioridadeAgenda.URGENTE);
            mongoTemplate.save(item);
        }
    }

    private LocalDate calcularVencimento(int dia, int ano, int mes) {
        LocalDate vencimento = LocalDate.of(ano, mes, 1).plusMonths(1);
        int maxDia = Math.min(dia, vencimento.lengthOfMonth());
        vencimento = vencimento.withDayOfMonth(maxDia);
        // Ajustar para dia útil
        while (vencimento.getDayOfWeek().getValue() > 5) {
            vencimento = vencimento.plusDays(1);
        }
        return vencimento;
    }

    private long contarPorStatusEData(String tenantId, LocalDate inicio, LocalDate fim) {
        return mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("dataVencimento").gte(inicio).lte(fim)
                        .and("status").in(StatusAgenda.PENDENTE, StatusAgenda.EM_ANDAMENTO)),
                AgendaFiscal.class);
    }

    private long contarEntregues(String tenantId, LocalDate inicio, LocalDate fim) {
        return mongoTemplate.count(
                Query.query(Criteria.where("tenantId").is(tenantId)
                        .and("dataEntrega").gte(inicio).lte(fim)
                        .and("status").is(StatusAgenda.ENTREGUE)),
                AgendaFiscal.class);
    }

    private record ObrigacaoTemplate(String nome, String descricao, int diaVencimento,
                                      Periodicidade periodicidade, List<String> regimes) {}
}
