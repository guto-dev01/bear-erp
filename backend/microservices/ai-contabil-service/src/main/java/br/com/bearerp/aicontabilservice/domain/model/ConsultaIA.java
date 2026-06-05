package br.com.bearerp.aicontabilservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "consultas_ia")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class ConsultaIA extends BaseDocument {

    public enum TipoConsulta {
        CLASSIFICACAO_CONTABIL, ANALISE_FISCAL, SUGESTAO_LANCAMENTO,
        CONCILIACAO_AUTOMATICA, ANALISE_TRIBUTARIA, PREVISAO_FLUXO_CAIXA,
        DETECCAO_ANOMALIAS, CONSULTORIA_GERAL
    }

    public enum StatusConsulta { PENDENTE, PROCESSANDO, CONCLUIDA, ERRO }

    private TipoConsulta tipo;
    private StatusConsulta status;
    private String pergunta;
    private String contexto;
    private String resposta;
    private List<Sugestao> sugestoes;
    private double confianca;
    private Instant dataConsulta;
    private Instant dataResposta;
    private long tempoProcessamentoMs;
    private String consultadoPor;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class Sugestao {
        private String descricao;
        private String acao;
        private double confianca;
        private String fundamentacao;
    }
}
