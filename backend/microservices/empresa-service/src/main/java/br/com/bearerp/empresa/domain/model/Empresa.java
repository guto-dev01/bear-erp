package br.com.bearerp.empresa.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@Document(collection = "empresas")
@CompoundIndex(name = "idx_tenant_cnpj", def = "{'tenantId': 1, 'cnpj': 1}", unique = true)
public class Empresa extends BaseDocument {

    private String razaoSocial;
    private String nomeFantasia;
    private String cnpj; // Criptografado AES-256
    private String inscricaoEstadual;
    private String inscricaoMunicipal;
    private String cnae;

    @Builder.Default
    private List<String> cnaesSecundarios = new ArrayList<>();

    @Builder.Default
    private RegimeTributario regimeTributario = RegimeTributario.SIMPLES_NACIONAL;

    @Builder.Default
    private Porte porte = Porte.ME;

    private Endereco endereco;
    private String telefone;
    private String email;
    private String site;
    private String responsavelContabil;
    private String certificadoDigitalId;

    @Builder.Default
    private Status status = Status.ATIVA;

    private LocalDate dataAbertura;
    private LocalDate dataEncerramento;

    @Builder.Default
    private ConfiguracaoFiscal configFiscal = new ConfiguracaoFiscal();

    public enum RegimeTributario {
        MEI, SIMPLES_NACIONAL, LUCRO_PRESUMIDO, LUCRO_REAL
    }

    public enum Porte {
        MEI, ME, EPP, MEDIO, GRANDE
    }

    public enum Status {
        ATIVA, INATIVA, SUSPENSA
    }
}
