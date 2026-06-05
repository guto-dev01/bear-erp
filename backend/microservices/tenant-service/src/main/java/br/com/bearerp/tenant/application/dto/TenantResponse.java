package br.com.bearerp.tenant.application.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;

@Getter
@Builder
public class TenantResponse {

    private String id;
    private String nome;
    private String razaoSocial;
    private String nomeFantasia;
    private String email;
    private String telefone;
    private String plano;
    private String status;
    private int maxEmpresas;
    private int maxUsuarios;
    private Instant createdAt;
}
