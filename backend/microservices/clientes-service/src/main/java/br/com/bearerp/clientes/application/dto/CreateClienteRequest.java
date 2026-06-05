package br.com.bearerp.clientes.application.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter @Setter
public class CreateClienteRequest {
    @NotBlank(message = "Razão Social é obrigatória")
    private String razaoSocial;
    private String nomeFantasia;
    @NotBlank(message = "Tipo de pessoa é obrigatório")
    private String tipoPessoa;
    @NotBlank(message = "CPF/CNPJ é obrigatório")
    private String cnpjCpf;
    private String inscricaoEstadual;
    private String inscricaoMunicipal;
    private String email;
    private String telefone;
    private String celular;
    private String website;
    private String contribuinteIcms;
    private String regimeTributario;
    private String observacoes;
    private List<String> tags;
    private BigDecimal limiteCredito;

    // Endereço
    private String logradouro;
    private String numero;
    private String complemento;
    private String bairro;
    private String cidade;
    private String uf;
    private String cep;
    private String codigoIbge;

    // Contato
    private String contatoNome;
    private String contatoEmail;
    private String contatoTelefone;
    private String contatoCargo;
}
