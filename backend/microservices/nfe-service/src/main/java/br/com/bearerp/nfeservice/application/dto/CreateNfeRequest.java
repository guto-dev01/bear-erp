package br.com.bearerp.nfeservice.application.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Getter @Setter
public class CreateNfeRequest {
    @NotBlank private String tipo;
    private String finalidade;
    private Integer serie;
    private LocalDateTime dataEmissao;
    @NotBlank private String naturezaOperacao;
    @NotBlank private String cfop;
    @Valid private PessoaDto destinatario;
    @NotEmpty @Valid private List<ItemNfeDto> itens;
    private List<PagamentoDto> pagamentos;
    private TransporteDto transporte;
    private String informacoesComplementares;

    @Getter @Setter
    public static class PessoaDto {
        private String pessoaId;
        @NotBlank private String cnpjCpf;
        private String inscricaoEstadual;
        @NotBlank private String razaoSocial;
        private String nomeFantasia;
        private String logradouro;
        private String numero;
        private String complemento;
        private String bairro;
        private String cidade;
        private String codigoIbge;
        private String uf;
        private String cep;
    }

    @Getter @Setter
    public static class ItemNfeDto {
        @NotBlank private String codigo;
        @NotBlank private String descricao;
        private String ncm;
        private String cest;
        @NotBlank private String cfop;
        private String unidade;
        @NotNull @DecimalMin("0.01") private BigDecimal quantidade;
        @NotNull @DecimalMin("0.01") private BigDecimal valorUnitario;
        private BigDecimal desconto;
        // CSTs dos impostos
        private String icmsCst;
        private String icmsOrigem;
        private BigDecimal icmsAliquota;
        private String ipiCst;
        private BigDecimal ipiAliquota;
        private String pisCst;
        private BigDecimal pisAliquota;
        private String cofinsCst;
        private BigDecimal cofinsAliquota;
    }

    @Getter @Setter
    public static class PagamentoDto {
        private String formaPagamento;
        private BigDecimal valor;
    }

    @Getter @Setter
    public static class TransporteDto {
        private String modalidadeFrete;
        private String transportadoraCnpj;
        private String transportadoraRazaoSocial;
    }
}
