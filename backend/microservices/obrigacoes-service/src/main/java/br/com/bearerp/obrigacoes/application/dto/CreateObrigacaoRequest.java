package br.com.bearerp.obrigacoes.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class CreateObrigacaoRequest {
    @NotBlank(message = "Nome é obrigatório")
    private String nome;
    @NotBlank(message = "Código é obrigatório")
    private String codigo;
    @NotBlank(message = "Tipo é obrigatório")
    private String tipo;
    private String periodicidade;
    private int diaVencimento;
    private int mesReferencia;
    private int anoReferencia;
    private String responsavel;
    private String observacoes;
}
