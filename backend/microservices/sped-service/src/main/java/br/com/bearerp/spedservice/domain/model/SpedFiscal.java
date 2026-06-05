package br.com.bearerp.spedservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "sped_fiscal")
@CompoundIndex(name = "idx_tenant_empresa_periodo", def = "{'tenantId': 1, 'empresaId': 1, 'ano': 1, 'mes': 1}", unique = true)
public class SpedFiscal extends BaseDocument {
    private int ano;
    private int mes;
    private String perfil; // A, B, C
    private String finalidade; // 0-Original, 1-Substitutiva
    private TipoSped tipo; // EFD_ICMS_IPI
    private StatusSped status;
    private String hashArquivo;
    private String protocoloRecibo;
    private Instant dataTransmissao;
    private String nomeArquivo;
    private long tamanhoArquivo;
    private int totalRegistros;
    private String observacao;

    public enum TipoSped { EFD_ICMS_IPI, EFD_CONTRIBUICOES, ECF, ECD }
    public enum StatusSped { RASCUNHO, GERADO, VALIDADO, TRANSMITIDO, RETIFICADO, ERRO }
}
