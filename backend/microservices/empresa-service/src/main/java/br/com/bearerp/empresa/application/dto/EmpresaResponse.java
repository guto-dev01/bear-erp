package br.com.bearerp.empresa.application.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class EmpresaResponse {

    private String id;
    private String tenantId;
    private String razaoSocial;
    private String nomeFantasia;
    private String cnae;
    private List<String> cnaesSecundarios;
    private String regimeTributario;
    private String porte;
    private String status;
    private String telefone;
    private String email;
    private String responsavelContabil;
    private LocalDate dataAbertura;
    private Instant createdAt;
}
