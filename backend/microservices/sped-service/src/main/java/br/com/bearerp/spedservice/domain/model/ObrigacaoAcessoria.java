package br.com.bearerp.spedservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "obrigacoes_acessorias")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_tipo_competencia", def = "{'tenantId': 1, 'empresaId': 1, 'tipo': 1, 'competencia': 1}")
})
public class ObrigacaoAcessoria extends BaseDocument {
    private TipoObrigacao tipo;
    private String competencia; // YYYY-MM or YYYY
    private LocalDate prazoEntrega;
    private StatusObrigacao status;
    private Instant dataEntrega;
    private String protocoloRecibo;
    private String hashArquivo;
    private String nomeArquivo;
    private String observacao;
    private boolean retificacao;

    public enum TipoObrigacao {
        // Federais
        DCTF, DCTF_WEB, EFD_REINF, DIRF, ECF, ECD, PERDCOMP,
        // Estaduais
        GIA, SINTEGRA, DESTDA, DIEF,
        // Municipais
        DES, GISS,
        // Outros
        SPED_FISCAL, SPED_CONTRIBUICOES, SPED_CONTABIL,
        ESOCIAL, RAIS, CAGED
    }

    public enum StatusObrigacao {
        PENDENTE, EM_GERACAO, GERADA, VALIDADA, TRANSMITIDA, RETIFICADA, DISPENSADA, ATRASADA
    }
}
