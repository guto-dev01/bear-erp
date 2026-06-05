package br.com.bearerp.fornecedores.application.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class FornecedorResponse {
    private String id;
    private String razaoSocial;
    private String nomeFantasia;
    private String tipoPessoa;
    private String cnpjCpf;
    private String inscricaoEstadual;
    private String email;
    private String telefone;
    private String celular;
    private String website;
    private String observacoes;
    private String status;
    private List<String> categorias;
    private int prazoEntrega;
    private String condicaoPagamento;
    private BigDecimal avaliacaoMedia;

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

    // Dados bancários
    private String banco;
    private String agencia;
    private String conta;
    private String tipoConta;
    private String pix;

    private Instant createdAt;
}
