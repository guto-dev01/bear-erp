package br.com.bearerp.integracoesservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.Map;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "integracoes")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class Integracao extends BaseDocument {

    public enum TipoIntegracao {
        BANCO_OFX, BANCO_API, SEFAZ_NFE, SEFAZ_CTE, PREFEITURA_NFSE,
        ESOCIAL, REINF, ECAC, SERPRO, CORREIOS,
        CONTABILIDADE_EXTERNA, ERP_EXTERNO, PLANILHA, WEBHOOK
    }

    public enum StatusIntegracao { ATIVA, INATIVA, ERRO, CONFIGURANDO }

    private String nome;
    private String descricao;
    private TipoIntegracao tipo;
    private StatusIntegracao status;
    private Map<String, String> configuracao;
    private Instant ultimaSincronizacao;
    private String ultimoErro;
    private int totalSincronizacoes;
    private int totalErros;
    private boolean sincronizacaoAutomatica;
    private String cronExpression;
}
