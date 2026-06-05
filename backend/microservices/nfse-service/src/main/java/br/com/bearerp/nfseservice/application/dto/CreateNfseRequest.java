package br.com.bearerp.nfseservice.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CreateNfseRequest {

    // Tomador
    @NotNull private TomadorDto tomador;

    // Serviço
    @NotBlank private String codigoServico;
    @NotBlank private String descricaoServico;
    private String codigoCnae;
    private String codigoTributacaoMunicipio;
    @NotNull private BigDecimal valorServico;
    private BigDecimal valorDeducoes;
    @NotNull private BigDecimal aliquotaIss;
    private boolean issRetido;

    // Retenções
    private BigDecimal valorPis;
    private BigDecimal valorCofins;
    private BigDecimal valorInss;
    private BigDecimal valorIr;
    private BigDecimal valorCsll;
    private BigDecimal outrasRetencoes;
    private BigDecimal descontoIncondicionado;
    private BigDecimal descontoCondicionado;

    @NotNull private LocalDate competencia;
    private String codigoMunicipioIncidencia;
    private String observacao;

    // RPS
    private Long numeroRps;
    private String serieRps;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TomadorDto {
        @NotBlank private String cpfCnpj;
        private String inscricaoMunicipal;
        @NotBlank private String razaoSocial;
        private String endereco;
        private String numero;
        private String complemento;
        private String bairro;
        private String cidade;
        private String uf;
        private String cep;
        private String telefone;
        private String email;
    }
}
