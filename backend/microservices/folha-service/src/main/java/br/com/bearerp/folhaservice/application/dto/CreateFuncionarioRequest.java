package br.com.bearerp.folhaservice.application.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CreateFuncionarioRequest {
    @NotBlank private String nome;
    @NotBlank private String cpf;
    private String rg;
    @NotBlank private String pis;
    private String ctps;
    private String serieCtps;
    @NotNull private LocalDate dataNascimento;
    private String sexo;
    private String estadoCivil;
    private String cep;
    private String logradouro;
    private String numero;
    private String bairro;
    private String cidade;
    private String uf;
    private String telefone;
    private String email;
    private String banco;
    private String agencia;
    private String conta;
    private String tipoConta;
    @NotNull private LocalDate dataAdmissao;
    @NotBlank private String tipoContrato;
    @NotBlank private String cargo;
    private String departamento;
    private String centroCustoId;
    @NotNull private BigDecimal salarioBase;
    private String tipoSalario;
    private String categoria;
    private String codigoCbo;
    private int cargaHorariaSemanal;
    private int numeroDependentes;
    private int numeroDependentesIr;
}
