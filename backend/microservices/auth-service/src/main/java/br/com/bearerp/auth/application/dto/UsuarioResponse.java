package br.com.bearerp.auth.application.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.Instant;
import java.util.List;

@Getter
@Builder
public class UsuarioResponse {

    private String id;
    private String nome;
    private String email;
    private String telefone;
    private String tenantId;
    private List<String> roleIds;
    private List<String> empresaIds;
    private String status;
    private Instant ultimoLogin;
    private Instant createdAt;
}
