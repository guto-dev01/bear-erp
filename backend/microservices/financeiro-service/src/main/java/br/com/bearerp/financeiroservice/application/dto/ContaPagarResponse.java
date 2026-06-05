package br.com.bearerp.financeiroservice.application.dto;

import br.com.bearerp.financeiroservice.domain.model.ContaPagar;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class ContaPagarResponse {
    private String id;
    private String numero;
    private String descricao;
    private String fornecedorId;
    private String fornecedorNome;
    private String fornecedorCnpjCpf;
    private String categoriaId;
    private String categoria;
    private String centroCustoId;
    private LocalDate dataEmissao;
    private LocalDate dataVencimento;
    private LocalDate dataPagamento;
    private LocalDate dataCompetencia;
    private BigDecimal valorOriginal;
    private BigDecimal valorDesconto;
    private BigDecimal valorJuros;
    private BigDecimal valorMulta;
    private BigDecimal valorPago;
    private String formaPagamento;
    private String codigoBarras;
    private String observacao;
    private int parcela;
    private int totalParcelas;
    private String parcelamentoId;
    private ContaPagar.StatusConta status;
    private boolean recorrente;
    private List<BaixaDto> baixas;
    private Instant createdAt;
    private Instant updatedAt;

    @Data @Builder
    public static class BaixaDto {
        private LocalDate data;
        private BigDecimal valor;
        private String formaPagamento;
        private String contaBancariaId;
        private String observacao;
    }

    public static ContaPagarResponse fromEntity(ContaPagar e) {
        var builder = ContaPagarResponse.builder()
                .id(e.getId()).numero(e.getNumero()).descricao(e.getDescricao())
                .fornecedorId(e.getFornecedorId()).fornecedorNome(e.getFornecedorNome()).fornecedorCnpjCpf(e.getFornecedorCnpjCpf())
                .categoriaId(e.getCategoriaId()).categoria(e.getCategoria()).centroCustoId(e.getCentroCustoId())
                .dataEmissao(e.getDataEmissao()).dataVencimento(e.getDataVencimento())
                .dataPagamento(e.getDataPagamento()).dataCompetencia(e.getDataCompetencia())
                .valorOriginal(e.getValorOriginal()).valorDesconto(e.getValorDesconto())
                .valorJuros(e.getValorJuros()).valorMulta(e.getValorMulta()).valorPago(e.getValorPago())
                .formaPagamento(e.getFormaPagamento()).codigoBarras(e.getCodigoBarras()).observacao(e.getObservacao())
                .parcela(e.getParcela()).totalParcelas(e.getTotalParcelas()).parcelamentoId(e.getParcelamentoId())
                .status(e.getStatus()).recorrente(e.isRecorrente())
                .createdAt(e.getCreatedAt()).updatedAt(e.getUpdatedAt());
        if (e.getBaixas() != null) {
            builder.baixas(e.getBaixas().stream().map(b -> BaixaDto.builder()
                    .data(b.getData()).valor(b.getValor()).formaPagamento(b.getFormaPagamento())
                    .contaBancariaId(b.getContaBancariaId()).observacao(b.getObservacao()).build()).toList());
        }
        return builder.build();
    }
}
