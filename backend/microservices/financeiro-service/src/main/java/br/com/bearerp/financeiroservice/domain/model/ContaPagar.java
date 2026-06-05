package br.com.bearerp.financeiroservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "contas_pagar")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_status", def = "{'tenantId': 1, 'empresaId': 1, 'status': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_vencimento", def = "{'tenantId': 1, 'empresaId': 1, 'dataVencimento': 1}")
})
public class ContaPagar extends BaseDocument {
    private String numero;
    private String descricao;
    private String fornecedorId;
    private String fornecedorNome;
    private String fornecedorCnpjCpf;
    private String categoriaId;
    private String categoria;
    private String centroCustoId;
    private String contaContabilId;

    private LocalDate dataEmissao;
    private LocalDate dataVencimento;
    private LocalDate dataPagamento;
    private LocalDate dataCompetencia;

    private BigDecimal valorOriginal;
    private BigDecimal valorDesconto;
    private BigDecimal valorJuros;
    private BigDecimal valorMulta;
    private BigDecimal valorPago;

    private String formaPagamento; // BOLETO, PIX, TED, DEBITO
    private String codigoBarras;
    private String nfeId;
    private String observacao;

    private int parcela;
    private int totalParcelas;
    private String parcelamentoId;

    private StatusConta status;
    private boolean recorrente;

    private List<Baixa> baixas;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Baixa {
        private LocalDate data;
        private BigDecimal valor;
        private String formaPagamento;
        private String contaBancariaId;
        private String observacao;
    }

    public enum StatusConta { ABERTA, PARCIAL, PAGA, VENCIDA, CANCELADA }
}
