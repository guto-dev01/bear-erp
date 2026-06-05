package br.com.bearerp.auth.application.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.util.List;

@Getter
@Builder
@AllArgsConstructor
public class LoginResponse {

    private String accessToken;
    private String refreshToken;
    private String tokenType;
    private long expiresIn;
    private UsuarioInfo usuario;

    @Getter
    @Builder
    @AllArgsConstructor
    public static class UsuarioInfo {
        private String id;
        private String nome;
        private String email;
        private String tenantId;
        private String empresaAtualId;
        private List<String> roles;
        private List<String> permissoes;
    }
}
