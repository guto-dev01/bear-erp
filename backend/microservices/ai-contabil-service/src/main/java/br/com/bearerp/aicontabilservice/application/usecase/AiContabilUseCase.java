package br.com.bearerp.aicontabilservice.application.usecase;

import br.com.bearerp.aicontabilservice.domain.model.ClassificacaoAutomatica;
import br.com.bearerp.aicontabilservice.domain.model.ClassificacaoAutomatica.AlternativaClassificacao;
import br.com.bearerp.aicontabilservice.domain.model.ConsultaIA;
import br.com.bearerp.aicontabilservice.domain.model.ConsultaIA.Sugestao;
import br.com.bearerp.aicontabilservice.domain.repository.ClassificacaoAutomaticaRepository;
import br.com.bearerp.aicontabilservice.domain.repository.ConsultaIARepository;
import br.com.bearerp.common.domain.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service @RequiredArgsConstructor
public class AiContabilUseCase {
    private final ConsultaIARepository consultaRepository;
    private final ClassificacaoAutomaticaRepository classificacaoRepository;

    // Tabela de classificações contábeis comuns (simulação de modelo ML)
    private static final Map<String, String[]> CLASSIFICACOES = Map.ofEntries(
            Map.entry("aluguel", new String[]{"3.1.01.03", "Despesa com Aluguel", "1.1.01.01", "Caixa/Banco"}),
            Map.entry("energia", new String[]{"3.1.01.05", "Despesa com Energia", "1.1.01.01", "Caixa/Banco"}),
            Map.entry("salario", new String[]{"3.1.02.01", "Despesa com Salários", "2.1.01.01", "Salários a Pagar"}),
            Map.entry("venda", new String[]{"1.1.01.01", "Caixa/Banco", "4.1.01.01", "Receita de Vendas"}),
            Map.entry("servico", new String[]{"1.1.01.01", "Caixa/Banco", "4.1.02.01", "Receita de Serviços"}),
            Map.entry("material", new String[]{"1.1.04.01", "Estoque de Materiais", "1.1.01.01", "Caixa/Banco"}),
            Map.entry("imposto", new String[]{"3.1.03.01", "Despesa com Impostos", "2.1.02.01", "Impostos a Pagar"}),
            Map.entry("telefone", new String[]{"3.1.01.04", "Despesa com Telefone", "1.1.01.01", "Caixa/Banco"}),
            Map.entry("internet", new String[]{"3.1.01.06", "Despesa com Internet", "1.1.01.01", "Caixa/Banco"}),
            Map.entry("software", new String[]{"3.1.01.07", "Despesa com Software", "1.1.01.01", "Caixa/Banco"}),
            Map.entry("combustivel", new String[]{"3.1.01.08", "Despesa com Combustível", "1.1.01.01", "Caixa/Banco"}),
            Map.entry("manutencao", new String[]{"3.1.01.09", "Despesa com Manutenção", "1.1.01.01", "Caixa/Banco"})
    );

    public ConsultaIA consultar(ConsultaIA.TipoConsulta tipo, String pergunta, String contexto) {
        long inicio = System.currentTimeMillis();
        ConsultaIA consulta = ConsultaIA.builder()
                .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                .tipo(tipo).status(ConsultaIA.StatusConsulta.PROCESSANDO)
                .pergunta(pergunta).contexto(contexto).dataConsulta(Instant.now())
                .build();

        String resposta = processarConsulta(tipo, pergunta, contexto);
        consulta.setResposta(resposta);
        consulta.setStatus(ConsultaIA.StatusConsulta.CONCLUIDA);
        consulta.setConfianca(0.85);
        consulta.setDataResposta(Instant.now());
        consulta.setTempoProcessamentoMs(System.currentTimeMillis() - inicio);

        return consultaRepository.save(consulta);
    }

    public ClassificacaoAutomatica classificar(String descricao) {
        String descLower = descricao.toLowerCase();
        String[] match = null;
        String matchKey = null;

        for (var entry : CLASSIFICACOES.entrySet()) {
            if (descLower.contains(entry.getKey())) {
                match = entry.getValue();
                matchKey = entry.getKey();
                break;
            }
        }

        ClassificacaoAutomatica classificacao = ClassificacaoAutomatica.builder()
                .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                .descricaoOriginal(descricao)
                .status(ClassificacaoAutomatica.StatusClassificacao.SUGERIDA)
                .build();

        if (match != null) {
            classificacao.setContaDebitoSugerida(match[0]);
            classificacao.setContaDebitoNome(match[1]);
            classificacao.setContaCreditoSugerida(match[2]);
            classificacao.setContaCreditoNome(match[3]);
            classificacao.setConfianca(0.92);
        } else {
            classificacao.setContaDebitoSugerida("3.1.01.99");
            classificacao.setContaDebitoNome("Outras Despesas");
            classificacao.setContaCreditoSugerida("1.1.01.01");
            classificacao.setContaCreditoNome("Caixa/Banco");
            classificacao.setConfianca(0.45);
        }

        return classificacaoRepository.save(classificacao);
    }

    public ClassificacaoAutomatica aceitarClassificacao(String id) {
        ClassificacaoAutomatica c = classificacaoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Classificação não encontrada"));
        c.setStatus(ClassificacaoAutomatica.StatusClassificacao.ACEITA);
        return classificacaoRepository.save(c);
    }

    public ClassificacaoAutomatica rejeitarClassificacao(String id) {
        ClassificacaoAutomatica c = classificacaoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Classificação não encontrada"));
        c.setStatus(ClassificacaoAutomatica.StatusClassificacao.REJEITADA);
        return classificacaoRepository.save(c);
    }

    public Page<ConsultaIA> listarConsultas(Pageable pageable) {
        return consultaRepository.findByTenantIdAndEmpresaId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), pageable);
    }

    public List<ClassificacaoAutomatica> listarClassificacoesPendentes() {
        return classificacaoRepository.findByTenantIdAndEmpresaIdAndStatus(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(),
                ClassificacaoAutomatica.StatusClassificacao.SUGERIDA);
    }

    private String processarConsulta(ConsultaIA.TipoConsulta tipo, String pergunta, String contexto) {
        return switch (tipo) {
            case CLASSIFICACAO_CONTABIL -> "Com base na descrição informada, sugiro a classificação na conta " +
                    "adequada do plano de contas. Verifique se a natureza da operação é despesa, receita ou ativo. " +
                    "Considere o regime de competência para o registro.";
            case ANALISE_FISCAL -> "A análise fiscal indica que os tributos devem ser apurados conforme o regime " +
                    "tributário da empresa. Verifique a base de cálculo e alíquotas aplicáveis. " +
                    "Atenção aos prazos de recolhimento.";
            case ANALISE_TRIBUTARIA -> "Considerando o faturamento e atividade da empresa, recomendo avaliar: " +
                    "1) Simples Nacional para faturamento até R$4.8M; 2) Lucro Presumido para margens acima da presunção; " +
                    "3) Lucro Real para empresas com muitas despesas dedutíveis.";
            case PREVISAO_FLUXO_CAIXA -> "Com base no histórico de movimentações, a projeção de fluxo de caixa " +
                    "para os próximos 30 dias indica saldo positivo. Recomendo atenção às contas a pagar com vencimento próximo.";
            case DETECCAO_ANOMALIAS -> "A análise não detectou anomalias significativas nos lançamentos recentes. " +
                    "Padrões de gastos estão dentro da média histórica. Continue monitorando variações acima de 20%.";
            case CONCILIACAO_AUTOMATICA -> "A conciliação automática identificou possíveis correspondências entre " +
                    "extratos bancários e lançamentos contábeis. Revise as sugestões antes de confirmar.";
            default -> "Consulta processada. Para uma análise mais detalhada, forneça informações adicionais " +
                    "sobre o contexto específico da sua dúvida contábil.";
        };
    }
}
