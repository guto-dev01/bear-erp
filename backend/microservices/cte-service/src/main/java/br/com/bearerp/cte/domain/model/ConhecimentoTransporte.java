package br.com.bearerp.cte.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "cte")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_chave", def = "{'tenantId': 1, 'empresaId': 1, 'chave': 1}", unique = true),
    @CompoundIndex(name = "idx_tenant_empresa_numero_serie", def = "{'tenantId': 1, 'empresaId': 1, 'numero': 1, 'serie': 1}", unique = true)
})
public class ConhecimentoTransporte extends BaseDocument {

    private Long numero;
    private int serie;
    private String chave;
    private String naturezaOperacao;
    private TipoCte tipoCte;
    private ModalCte modal;

    private DadosPessoa emitente;
    private DadosPessoa remetente;
    private DadosPessoa destinatario;

    private InformacoesCarga informacoesCarga;
    private List<ComponenteValor> componentesValor;

    private BigDecimal valorTotalServico;
    private BigDecimal valorReceber;
    private BigDecimal valorTotalCarga;

    private ImpostosCte impostos;

    private LocalDateTime dataEmissao;
    private LocalDateTime dataPrestacao;

    private StatusCte status;
    private String protocolo;
    private String motivoCancelamento;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DadosPessoa {
        private String cnpjCpf;
        private String razaoSocial;
        private String inscricaoEstadual;
        private String endereco;
        private String cidade;
        private String uf;
        private String cep;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class InformacoesCarga {
        private BigDecimal valorCarga;
        private String produtoPredominante;
        private int qtdVolumes;
        private BigDecimal pesoTotal;
        private String unidadePeso;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ComponenteValor {
        private String nome;
        private BigDecimal valor;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ImpostosCte {
        private BigDecimal icmsBase;
        private BigDecimal icmsAliquota;
        private BigDecimal icmsValor;
        private BigDecimal pisValor;
        private BigDecimal cofinsValor;
    }

    public enum TipoCte { NORMAL, COMPLEMENTAR, ANULACAO, SUBSTITUTO }
    public enum ModalCte { RODOVIARIO, AEREO, AQUAVIARIO, FERROVIARIO, DUTOVIARIO }
    public enum StatusCte { DIGITACAO, AUTORIZADO, CANCELADO, INUTILIZADO, DENEGADO }
}
