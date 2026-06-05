package br.com.bearerp.cte.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter
public class CreateCteRequest {
    private int serie;
    @NotBlank(message = "Tipo CT-e é obrigatório")
    private String tipoCte;
    @NotBlank(message = "Modal é obrigatório")
    private String modal;
    private String naturezaOperacao;

    // Remetente
    private String remetenteCnpjCpf;
    private String remetenteRazaoSocial;
    private String remetenteIe;
    private String remetenteEndereco;
    private String remetenteCidade;
    private String remetenteUf;

    // Destinatário
    private String destinatarioCnpjCpf;
    private String destinatarioRazaoSocial;
    private String destinatarioIe;
    private String destinatarioEndereco;
    private String destinatarioCidade;
    private String destinatarioUf;

    // Carga
    private BigDecimal valorCarga;
    private String produtoPredominante;
    private int qtdVolumes;
    private BigDecimal pesoTotal;

    // Valores
    private BigDecimal valorTotalServico;
    private BigDecimal icmsBase;
    private BigDecimal icmsAliquota;

    private List<ComponenteValorDto> componentesValor;

    @Getter @Setter
    public static class ComponenteValorDto {
        private String nome;
        private BigDecimal valor;
    }
}
