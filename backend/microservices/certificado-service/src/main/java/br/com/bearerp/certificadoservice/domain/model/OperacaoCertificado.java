package br.com.bearerp.certificadoservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "operacoes_certificado")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
@CompoundIndex(name = "idx_certificado_data", def = "{'certificadoId': 1, 'dataOperacao': -1}")
public class OperacaoCertificado extends BaseDocument {

    public enum TipoOperacao {
        ASSINATURA_NFE, ASSINATURA_NFSE, ASSINATURA_CTE, ASSINATURA_MDFE,
        ASSINATURA_ESOCIAL, ASSINATURA_SPED, ASSINATURA_REINF,
        CONSULTA_SEFAZ, TRANSMISSAO, VALIDACAO, OUTRO
    }

    public enum StatusOperacao { SUCESSO, FALHA }

    private String certificadoId;
    private TipoOperacao tipoOperacao;
    private StatusOperacao statusOperacao;
    private Instant dataOperacao;
    private String descricao;
    private String documentoReferencia;
    private String erroMensagem;
    private String ipOrigem;
}
