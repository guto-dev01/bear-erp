package br.com.bearerp.financeiroservice.application.dto;

import br.com.bearerp.financeiroservice.domain.model.MovimentoBancario;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder
public class MovimentoBancarioResponse {
    private String id;
    private String contaBancariaId;
    private LocalDate data;
    private MovimentoBancario.TipoMovimento tipo;
    private String descricao;
    private BigDecimal valor;
    private BigDecimal saldoApos;
    private String categoriaId;
    private String contaPagarId;
    private String contaReceberId;
    private String conciliacaoId;
    private boolean conciliado;
    private String observacao;

    public static MovimentoBancarioResponse fromEntity(MovimentoBancario e) {
        return MovimentoBancarioResponse.builder()
                .id(e.getId()).contaBancariaId(e.getContaBancariaId())
                .data(e.getData()).tipo(e.getTipo()).descricao(e.getDescricao())
                .valor(e.getValor()).saldoApos(e.getSaldoApos())
                .categoriaId(e.getCategoriaId())
                .contaPagarId(e.getContaPagarId()).contaReceberId(e.getContaReceberId())
                .conciliacaoId(e.getConciliacaoId()).conciliado(e.isConciliado())
                .observacao(e.getObservacao()).build();
    }
}
