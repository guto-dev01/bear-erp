package br.com.bearerp.contabilidade.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreatePlanoContasRequest {
    @NotBlank(message = "Código é obrigatório")
    @Size(max = 20)
    private String codigo;

    @NotBlank(message = "Descrição é obrigatória")
    @Size(min = 2, max = 200)
    private String descricao;

    @NotBlank(message = "Natureza é obrigatória")
    private String natureza;

    @NotBlank(message = "Tipo é obrigatório")
    private String tipo;

    @NotBlank(message = "Classificação é obrigatória")
    private String classificacao;

    private String contaPaiId;
    private String contaReferencial;
    private boolean aceitaLancamento;
}
