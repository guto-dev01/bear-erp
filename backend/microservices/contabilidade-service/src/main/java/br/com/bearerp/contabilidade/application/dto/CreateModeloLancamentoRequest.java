package br.com.bearerp.contabilidade.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.List;

@Getter @Setter
public class CreateModeloLancamentoRequest {
    @NotBlank(message = "Nome é obrigatório")
    private String nome;
    private String descricao;
    private String tipo;
    private String periodicidade;
    private List<PartidaModeloRequest> partidas;

    @Getter @Setter
    public static class PartidaModeloRequest {
        private String contaId;
        private String tipo;
        private BigDecimal percentual;
        private BigDecimal valorFixo;
        private String historico;
    }
}
