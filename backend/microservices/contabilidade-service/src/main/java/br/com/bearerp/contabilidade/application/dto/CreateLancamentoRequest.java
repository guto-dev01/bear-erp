package br.com.bearerp.contabilidade.application.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter @Setter
public class CreateLancamentoRequest {
    @NotNull(message = "Data do lançamento é obrigatória")
    private LocalDate dataLancamento;

    private LocalDate dataCompetencia;
    private String tipo;
    private String historicoPadrao;
    private String historicoComplementar;
    private String loteId;

    @NotEmpty(message = "Lançamento deve ter ao menos uma partida")
    @Valid
    private List<PartidaRequest> partidas;

    @Getter @Setter
    public static class PartidaRequest {
        @NotBlank(message = "Conta é obrigatória")
        private String contaId;

        @NotNull(message = "Tipo da partida é obrigatório")
        private String tipo;

        @NotNull(message = "Valor é obrigatório")
        @DecimalMin(value = "0.01", message = "Valor mínimo é 0.01")
        private BigDecimal valor;

        private String historicoPartida;
        private String centroCustoId;
    }
}
