package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data @Builder
public class BalancoPatrimonialResponse {
    private LocalDate dataBase;
    private Instant dataGeracao;
    private GrupoBalanco ativo;
    private GrupoBalanco passivo;
    private GrupoBalanco patrimonioLiquido;
    private BigDecimal totalAtivo;
    private BigDecimal totalPassivoPl;

    @Data @Builder
    public static class GrupoBalanco {
        private String descricao;
        private List<ContaBalanco> contas;
        private BigDecimal total;
    }

    @Data @Builder
    public static class ContaBalanco {
        private String contaCodigo;
        private String contaDescricao;
        private int nivel;
        private BigDecimal saldo;
    }
}
