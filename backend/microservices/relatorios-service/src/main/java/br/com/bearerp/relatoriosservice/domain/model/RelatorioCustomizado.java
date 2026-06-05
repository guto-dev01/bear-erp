package br.com.bearerp.relatoriosservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "relatorios_customizados")
@CompoundIndex(name = "idx_tenant_nome", def = "{'tenantId': 1, 'nome': 1}")
public class RelatorioCustomizado extends BaseDocument {

    private String nome;
    private String descricao;
    private String categoria; // CONTABIL, FISCAL, FINANCEIRO, FOLHA, GERENCIAL
    private TipoRelatorio tipo;
    private boolean compartilhado;

    // Configuração do builder
    private String collectionOrigem; // MongoDB collection source
    private List<CampoRelatorio> campos;
    private List<FiltroRelatorio> filtros;
    private List<OrdenacaoRelatorio> ordenacao;
    private List<AgrupamentoRelatorio> agrupamentos;
    private List<CampoCalculado> camposCalculados;

    // Layout
    private String orientacao; // PORTRAIT, LANDSCAPE
    private String formatoPagina; // A4, LETTER
    private boolean exibirTotais;
    private boolean exibirSubtotais;
    private String cabecalhoCustomizado;
    private String rodapeCustomizado;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CampoRelatorio {
        private String campo;
        private String titulo;
        private String tipo; // STRING, NUMBER, DATE, CURRENCY, BOOLEAN
        private int largura;
        private String alinhamento; // LEFT, CENTER, RIGHT
        private String formato; // dd/MM/yyyy, #,##0.00, etc
        private boolean visivel;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class FiltroRelatorio {
        private String campo;
        private String operador; // IGUAL, DIFERENTE, MAIOR, MENOR, ENTRE, CONTEM, COMECA_COM
        private String valor;
        private String valorFim; // para ENTRE
        private String tipo; // STRING, NUMBER, DATE
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class OrdenacaoRelatorio {
        private String campo;
        private String direcao; // ASC, DESC
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AgrupamentoRelatorio {
        private String campo;
        private String funcaoAgregacao; // SUM, COUNT, AVG, MIN, MAX
        private boolean quebraPagina;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CampoCalculado {
        private String nome;
        private String expressao; // Ex: "valorBruto - valorDesconto"
        private String tipo;
        private String formato;
    }

    public enum TipoRelatorio { LISTAGEM, RESUMO, GRAFICO, DASHBOARD }
}
