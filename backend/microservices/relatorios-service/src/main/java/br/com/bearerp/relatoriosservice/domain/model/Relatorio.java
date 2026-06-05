package br.com.bearerp.relatoriosservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "relatorios")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class Relatorio extends BaseDocument {

    public enum TipoRelatorio {
        BALANCETE, DRE, BALANCO_PATRIMONIAL, FLUXO_CAIXA,
        LIVRO_DIARIO, LIVRO_RAZAO, LIVRO_CAIXA,
        FOLHA_PAGAMENTO, RESUMO_FOLHA,
        APURACAO_IMPOSTOS, GUIAS_RECOLHIMENTO,
        FATURAMENTO, CONTAS_PAGAR, CONTAS_RECEBER,
        PATRIMONIO_ATIVO, DEPRECIACAO,
        DASHBOARD_GERENCIAL, INDICADORES_FINANCEIROS,
        PERSONALIZADO
    }

    public enum FormatoRelatorio { PDF, EXCEL, CSV }
    public enum StatusRelatorio { SOLICITADO, PROCESSANDO, CONCLUIDO, ERRO }

    private String titulo;
    private TipoRelatorio tipo;
    private FormatoRelatorio formato;
    private StatusRelatorio status;
    private String periodoInicio;
    private String periodoFim;
    private Map<String, Object> parametros;
    private Map<String, Object> resultado;
    private String erroMensagem;
    private Instant dataGeracao;
    private long tempoProcessamentoMs;
    private String geradoPor;
}
