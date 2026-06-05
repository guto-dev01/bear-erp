package br.com.bearerp.tenant.application.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data @Builder
public class AuditLogResponse {
    private String id;
    private String usuario;
    private String acao;
    private String modulo;
    private String descricao;
    private String ip;
    private String detalhes;
    private Instant timestamp;
}
