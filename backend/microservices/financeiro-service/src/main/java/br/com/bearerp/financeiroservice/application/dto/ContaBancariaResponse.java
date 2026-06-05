package br.com.bearerp.financeiroservice.application.dto;

import br.com.bearerp.financeiroservice.domain.model.ContaBancaria;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data @Builder
public class ContaBancariaResponse {
    private String id;
    private String banco;
    private String codigoBanco;
    private String agencia;
    private String conta;
    private String digito;
    private String tipoConta;
    private String descricao;
    private BigDecimal saldoAtual;
    private BigDecimal saldoDisponivel;
    private String contaContabilId;
    private boolean ativa;
    private boolean principal;

    public static ContaBancariaResponse fromEntity(ContaBancaria e) {
        return ContaBancariaResponse.builder()
                .id(e.getId()).banco(e.getBanco()).codigoBanco(e.getCodigoBanco())
                .agencia(e.getAgencia()).conta(e.getConta()).digito(e.getDigito())
                .tipoConta(e.getTipoConta()).descricao(e.getDescricao())
                .saldoAtual(e.getSaldoAtual()).saldoDisponivel(e.getSaldoDisponivel())
                .contaContabilId(e.getContaContabilId())
                .ativa(e.isAtiva()).principal(e.isPrincipal()).build();
    }
}
