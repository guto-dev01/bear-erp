package br.com.bearerp.clientes.application.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class ClienteResponse {
    private String id;
    private String razaoSocial;
    private String nomeFantasia;
    private String tipoPessoa;
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
    private String status;
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

    // Contato
    private String contatoNome;
    private String contatoEmail;
    private String contatoTelefone;
    private String contatoCargo;

    private Instant createdAt;
}
