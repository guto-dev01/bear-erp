package br.com.bearerp.financeiroservice.application.dto;

import br.com.bearerp.financeiroservice.domain.model.ContaPagar;
import br.com.bearerp.financeiroservice.domain.model.ContaReceber;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class ContaReceberResponse {
    private String id;
    private String numero;
    private String descricao;
    private String clienteId;
    private String clienteNome;
    private String clienteCnpjCpf;
    private String categoriaId;
    private String categoria;
    private String centroCustoId;
    private LocalDate dataEmissao;
    private LocalDate dataVencimento;
    private LocalDate dataRecebimento;
    private LocalDate dataCompetencia;
    private BigDecimal valorOriginal;
    private BigDecimal valorDesconto;
    private BigDecimal valorJuros;
    private BigDecimal valorMulta;
    private BigDecimal valorRecebido;
    private String formaRecebimento;
    private String observacao;
    private int parcela;
    private int totalParcelas;
    private String parcelamentoId;
    private ContaPagar.StatusConta status;
    private boolean recorrente;
    private List<ContaPagarResponse.BaixaDto> baixas;
    private Instant createdAt;
    private Instant updatedAt;

    public static ContaReceberResponse fromEntity(ContaReceber e) {
        var builder = ContaReceberResponse.builder()
                .id(e.getId()).numero(e.getNumero()).descricao(e.getDescricao())
                .clienteId(e.getClienteId()).clienteNome(e.getClienteNome()).clienteCnpjCpf(e.getClienteCnpjCpf())
                .categoriaId(e.getCategoriaId()).categoria(e.getCategoria()).centroCustoId(e.getCentroCustoId())
                .dataEmissao(e.getDataEmissao()).dataVencimento(e.getDataVencimento())
                .dataRecebimento(e.getDataRecebimento()).dataCompetencia(e.getDataCompetencia())
                .valorOriginal(e.getValorOriginal()).valorDesconto(e.getValorDesconto())
                .valorJuros(e.getValorJuros()).valorMulta(e.getValorMulta()).valorRecebido(e.getValorRecebido())
                .formaRecebimento(e.getFormaRecebimento()).observacao(e.getObservacao())
                .parcela(e.getParcela()).totalParcelas(e.getTotalParcelas()).parcelamentoId(e.getParcelamentoId())
                .status(e.getStatus()).recorrente(e.isRecorrente())
                .createdAt(e.getCreatedAt()).updatedAt(e.getUpdatedAt());
        if (e.getBaixas() != null) {
            builder.baixas(e.getBaixas().stream().map(b -> ContaPagarResponse.BaixaDto.builder()
                    .data(b.getData()).valor(b.getValor()).formaPagamento(b.getFormaPagamento())
                    .contaBancariaId(b.getContaBancariaId()).observacao(b.getObservacao()).build()).toList());
        }
        return builder.build();
    }
}
