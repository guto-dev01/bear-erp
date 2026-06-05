package br.com.bearerp.auth.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@Document(collection = "usuarios")
@CompoundIndex(name = "idx_tenant_email", def = "{'tenantId': 1, 'email': 1}", unique = true)
public class Usuario extends BaseDocument {

    @Indexed(unique = true)
    private String email;

    private String senha;

    private String nome;

    private String cpf; // Criptografado AES-256

    private String telefone;

    private String avatar;

    @Builder.Default
    private List<String> roleIds = new ArrayList<>();

    @Builder.Default
    private List<String> empresaIds = new ArrayList<>(); // Empresas que o usuário pode acessar

    private String empresaAtualId; // Empresa selecionada no momento

    @Builder.Default
    private boolean twoFactorEnabled = false;

    private String twoFactorSecret;

    @Builder.Default
    private StatusUsuario status = StatusUsuario.ATIVO;

    private Instant ultimoLogin;

    @Builder.Default
    private int tentativasLogin = 0;

    private Instant bloqueadoAte;

    private String refreshToken;

    private Instant refreshTokenExpiration;

    public enum StatusUsuario {
        ATIVO, INATIVO, BLOQUEADO, PENDENTE_ATIVACAO
    }

    public boolean isBloqueado() {
        return status == StatusUsuario.BLOQUEADO
                || (bloqueadoAte != null && Instant.now().isBefore(bloqueadoAte));
    }

    public void incrementarTentativasLogin() {
        this.tentativasLogin++;
        if (this.tentativasLogin >= 5) {
            this.status = StatusUsuario.BLOQUEADO;
            this.bloqueadoAte = Instant.now().plusSeconds(1800); // 30 minutos
        }
    }

    public void resetarTentativasLogin() {
        this.tentativasLogin = 0;
        this.status = StatusUsuario.ATIVO;
        this.bloqueadoAte = null;
        this.ultimoLogin = Instant.now();
    }
}
