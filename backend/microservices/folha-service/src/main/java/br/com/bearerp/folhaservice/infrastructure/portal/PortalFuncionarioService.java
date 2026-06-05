package br.com.bearerp.folhaservice.infrastructure.portal;

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
import java.time.LocalDate;
import java.util.*;

/**
 * Portal do Funcionário — acesso self-service para:
 * - Consultar holerites
 * - Consultar férias (saldo, agendamento)
 * - Informe de rendimentos
 * - Espelho de ponto
 * - Solicitações (férias, adiantamento, declarações)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PortalFuncionarioService {

    private final MongoTemplate mongoTemplate;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "portal_funcionario_acesso")
    public static class AcessoFuncionario {
        @Id
        private String id;
        private String tenantId;
        private String empresaId;
        private String funcionarioId;
        private String nome;
        private String cpf;
        private String email;
        private boolean ativo;
        private String senhaHash;
        private LocalDate ultimoAcesso;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    @Document(collection = "portal_funcionario_solicitacoes")
    public static class SolicitacaoFuncionario {
        @Id
        private String id;
        private String tenantId;
        private String funcionarioId;
        private String nomeFuncionario;
        private TipoSolicitacao tipo;
        private StatusSolicitacao status;
        private String descricao;
        private Map<String, Object> dados;
        private String respostaRh;
        private LocalDate dataSolicitacao;
        private LocalDate dataResposta;
    }

    public enum TipoSolicitacao {
        FERIAS,              // Agendamento de férias
        ADIANTAMENTO,        // Adiantamento salarial
        DECLARACAO,          // Declaração de vínculo, tempo de serviço
        INFORME_RENDIMENTOS, // Informe de rendimentos (DIRF)
        ALTERACAO_DADOS,     // Alteração cadastral
        ABONO_FALTA,         // Justificativa de falta
        HORA_EXTRA,          // Solicitação de hora extra
        BANCO_HORAS          // Consulta banco de horas
    }

    public enum StatusSolicitacao {
        PENDENTE, APROVADA, RECUSADA, EM_ANALISE, CONCLUIDA
    }

    // === HOLERITES ===

    public List<Map<String, Object>> listarHolerites(String funcionarioId) {
        // Buscar folhas de pagamento do funcionário
        List<Map<String, Object>> holerites = new ArrayList<>();

        // Em produção: consultar FolhaPagamento e Holerite models
        // Retornar lista com: competência, valor líquido, valor bruto, descontos, PDF disponível
        @SuppressWarnings({"rawtypes", "unchecked"})
        List<Map<String, Object>> result = (List) mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("funcionarioId").is(funcionarioId))
                        .with(org.springframework.data.domain.Sort.by(
                                org.springframework.data.domain.Sort.Direction.DESC, "competencia")),
                Map.class, "holerites");
        return result;
    }

    // === FÉRIAS ===

    public Map<String, Object> consultarSaldoFerias(String funcionarioId) {
        Map<String, Object> saldo = new LinkedHashMap<>();

        // Em produção: calcular com base na data de admissão e férias gozadas
        saldo.put("funcionarioId", funcionarioId);
        saldo.put("diasDisponiveis", 30);
        saldo.put("diasGozados", 0);
        saldo.put("periodoAquisitivo", LocalDate.now().minusYears(1).toString() + " a " + LocalDate.now().toString());
        saldo.put("limiteGozo", LocalDate.now().plusMonths(11).toString());
        saldo.put("abonoPecuniario", true); // Pode converter 1/3 em dinheiro
        saldo.put("fracionamento", "Até 3 períodos (mínimo 14 dias corridos no primeiro)");

        return saldo;
    }

    // === SOLICITAÇÕES ===

    public SolicitacaoFuncionario criarSolicitacao(String funcionarioId, String nomeFuncionario,
                                                     TipoSolicitacao tipo, String descricao,
                                                     Map<String, Object> dados) {
        SolicitacaoFuncionario sol = SolicitacaoFuncionario.builder()
                .tenantId(TenantContext.getTenantId())
                .funcionarioId(funcionarioId)
                .nomeFuncionario(nomeFuncionario)
                .tipo(tipo)
                .status(StatusSolicitacao.PENDENTE)
                .descricao(descricao)
                .dados(dados != null ? dados : new HashMap<>())
                .dataSolicitacao(LocalDate.now())
                .build();

        return mongoTemplate.save(sol);
    }

    public SolicitacaoFuncionario responderSolicitacao(String solicitacaoId, StatusSolicitacao status, String resposta) {
        SolicitacaoFuncionario sol = mongoTemplate.findById(solicitacaoId, SolicitacaoFuncionario.class);
        if (sol == null) throw new RuntimeException("Solicitação não encontrada");

        sol.setStatus(status);
        sol.setRespostaRh(resposta);
        sol.setDataResposta(LocalDate.now());

        return mongoTemplate.save(sol);
    }

    public List<SolicitacaoFuncionario> listarSolicitacoes(String funcionarioId) {
        return mongoTemplate.find(
                Query.query(Criteria.where("funcionarioId").is(funcionarioId)),
                SolicitacaoFuncionario.class);
    }

    public List<SolicitacaoFuncionario> listarSolicitacoesPendentes() {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("status").is(StatusSolicitacao.PENDENTE)),
                SolicitacaoFuncionario.class);
    }

    // === INFORME DE RENDIMENTOS ===

    public Map<String, Object> gerarInformeRendimentos(String funcionarioId, int anoCalendario) {
        Map<String, Object> informe = new LinkedHashMap<>();

        informe.put("anoCalendario", anoCalendario);
        informe.put("funcionarioId", funcionarioId);

        // Em produção: somar todas as folhas do ano
        Map<String, Object> rendimentos = new LinkedHashMap<>();
        rendimentos.put("totalRendimentosTributaveis", BigDecimal.ZERO);
        rendimentos.put("contribuicaoPrevidenciaria", BigDecimal.ZERO);
        rendimentos.put("impostoRetidoFonte", BigDecimal.ZERO);
        rendimentos.put("decimoTerceiro", BigDecimal.ZERO);
        rendimentos.put("irrf13Salario", BigDecimal.ZERO);
        rendimentos.put("pensaoAlimenticia", BigDecimal.ZERO);
        rendimentos.put("rendimentosIsentos", BigDecimal.ZERO);
        rendimentos.put("diarias", BigDecimal.ZERO);
        rendimentos.put("ajudaCusto", BigDecimal.ZERO);

        informe.put("rendimentos", rendimentos);
        informe.put("disponivel", true);
        informe.put("observacao", "Informe disponível para download em PDF");

        return informe;
    }

    // === ESPELHO DE PONTO ===

    public Map<String, Object> consultarEspelhoPonto(String funcionarioId, String competencia) {
        Map<String, Object> espelho = new LinkedHashMap<>();

        espelho.put("funcionarioId", funcionarioId);
        espelho.put("competencia", competencia);
        espelho.put("horasNormais", "176:00");
        espelho.put("horasExtras50", "00:00");
        espelho.put("horasExtras100", "00:00");
        espelho.put("horasNoturnas", "00:00");
        espelho.put("faltas", 0);
        espelho.put("atrasos", "00:00");
        espelho.put("bancoHoras", "+02:30");
        espelho.put("diasTrabalhados", 22);
        espelho.put("status", "APROVADO");

        return espelho;
    }

    // === DASHBOARD FUNCIONÁRIO ===

    public Map<String, Object> dashboardFuncionario(String funcionarioId) {
        Map<String, Object> dash = new LinkedHashMap<>();

        dash.put("proximoPagamento", LocalDate.now().withDayOfMonth(5).plusMonths(
                LocalDate.now().getDayOfMonth() > 5 ? 1 : 0).toString());
        dash.put("saldoFerias", consultarSaldoFerias(funcionarioId));
        dash.put("solicitacoesPendentes", mongoTemplate.count(
                Query.query(Criteria.where("funcionarioId").is(funcionarioId)
                        .and("status").is(StatusSolicitacao.PENDENTE)),
                SolicitacaoFuncionario.class));
        dash.put("holeritesMes", LocalDate.now().getYear() + "-" + String.format("%02d", LocalDate.now().getMonthValue()));

        return dash;
    }
}
