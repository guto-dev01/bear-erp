package br.com.bearerp.aicontabilservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "classificacoes_automaticas")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class ClassificacaoAutomatica extends BaseDocument {

    public enum StatusClassificacao { SUGERIDA, ACEITA, REJEITADA, APLICADA }

    private String descricaoOriginal;
    private String contaDebitoSugerida;
    private String contaCreditoSugerida;
    private String contaDebitoNome;
    private String contaCreditoNome;
    private double confianca;
    private StatusClassificacao status;
    private List<AlternativaClassificacao> alternativas;
    private String documentoReferencia;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class AlternativaClassificacao {
        private String contaDebito;
        private String contaCredito;
        private double confianca;
        private String justificativa;
    }
}
