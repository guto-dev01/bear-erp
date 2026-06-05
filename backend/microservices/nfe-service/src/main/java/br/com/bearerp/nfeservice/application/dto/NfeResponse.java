package br.com.bearerp.nfeservice.application.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@Data @Builder
public class NfeResponse {
    private String id;
    private Long numero;
    private Integer serie;
    private String chaveAcesso;
    private String protocolo;
    private String tipo;
    private String finalidade;
    private LocalDateTime dataEmissao;
    private String naturezaOperacao;
    private String cfop;
    private DestinatarioResp destinatario;
    private List<ItemResp> itens;
    private TotaisResp totais;
    private String status;
    private String ambiente;
    private boolean contabilizado;
    private Instant createdAt;

    @Data @Builder
    public static class DestinatarioResp {
        private String cnpjCpf;
        private String razaoSocial;
        private String uf;
    }

    @Data @Builder
    public static class ItemResp {
        private int item;
        private String codigo;
        private String descricao;
        private String ncm;
        private String cfop;
        private BigDecimal quantidade;
        private BigDecimal valorUnitario;
        private BigDecimal valorTotal;
        private BigDecimal icmsValor;
        private BigDecimal ipiValor;
        private BigDecimal pisValor;
        private BigDecimal cofinsValor;
    }

    @Data @Builder
    public static class TotaisResp {
        private BigDecimal valorProdutos;
        private BigDecimal valorIcms;
        private BigDecimal valorIpi;
        private BigDecimal valorPis;
        private BigDecimal valorCofins;
        private BigDecimal valorDesconto;
        private BigDecimal valorFrete;
        private BigDecimal valorTotalNfe;
    }
}
