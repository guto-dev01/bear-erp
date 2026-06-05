package br.com.bearerp.tenant.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Getter
@Setter
@Builder
@Document(collection = "tenants")
public class Tenant extends BaseDocument {

    private String nome;

    @Indexed(unique = true)
    private String cnpj; // Criptografado AES-256

    private String razaoSocial;

    private String nomeFantasia;

    private String email;

    private String telefone;

    private Endereco endereco;

    @Builder.Default
    private Plano plano = Plano.TRIAL;

    @Builder.Default
    private Status status = Status.TRIAL;

    @Builder.Default
    private int maxEmpresas = 5;

    @Builder.Default
    private int maxUsuarios = 10;

    private Instant dataInicioTrial;

    private Instant dataFimTrial;

    @Builder.Default
    private Map<String, Object> configuracoesGerais = new HashMap<>();

    public enum Plano {
        TRIAL, BASICO, PROFISSIONAL, ENTERPRISE
    }

    public enum Status {
        ATIVO, INATIVO, SUSPENSO, TRIAL
    }

    public boolean isTrialExpirado() {
        return status == Status.TRIAL && dataFimTrial != null && Instant.now().isAfter(dataFimTrial);
    }
}
