package br.com.bearerp.folhaservice.application.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class FuncionarioResponse {
    private String id;
    private String matricula;
    private String nome;
    private String cpf;
    private String pis;
    private LocalDate dataNascimento;
    private LocalDate dataAdmissao;
    private LocalDate dataDemissao;
    private String tipoContrato;
    private String cargo;
    private String departamento;
    private BigDecimal salarioBase;
    private String tipoSalario;
    private String categoria;
    private String codigoCbo;
    private int numeroDependentes;
    private String status;
}
