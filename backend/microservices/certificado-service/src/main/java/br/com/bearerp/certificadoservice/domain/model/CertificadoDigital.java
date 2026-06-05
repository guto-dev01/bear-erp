package br.com.bearerp.certificadoservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.Instant;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "certificados_digitais")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class CertificadoDigital extends BaseDocument {

    public enum TipoCertificado { A1, A3 }
    public enum StatusCertificado { ATIVO, EXPIRADO, REVOGADO, PROXIMO_VENCIMENTO }

    private String nome;
    private TipoCertificado tipo;
    private String cnpjCpf;
    private String razaoSocial;
    private String serialNumber;
    private String emissor;
    private LocalDate dataEmissao;
    private LocalDate dataValidade;
    private StatusCertificado status;

    // Arquivo do certificado (A1 - armazenado criptografado)
    private byte[] arquivoPfx;
    private String senhaCriptografada;

    // A3 - dados do token/smartcard
    private String slotToken;
    private String providerName;

    // Controle de uso
    private Instant ultimoUso;
    private String ultimoUsoOperacao;
    private int totalUsos;

    // Alertas
    private boolean alertaEnviado30Dias;
    private boolean alertaEnviado15Dias;
    private boolean alertaEnviado7Dias;

    private String observacao;
}
