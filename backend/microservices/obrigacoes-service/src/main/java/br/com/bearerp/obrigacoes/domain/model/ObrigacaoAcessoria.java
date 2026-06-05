package br.com.bearerp.obrigacoes.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "obrigacoes_acessorias")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_codigo_ref", def = "{'tenantId': 1, 'empresaId': 1, 'codigo': 1, 'mesReferencia': 1, 'anoReferencia': 1}", unique = true)
})
public class ObrigacaoAcessoria extends BaseDocument {

    private String nome;
    private String codigo;
    private TipoObrigacao tipo;
    private Periodicidade periodicidade;
    private int diaVencimento;
    private int mesReferencia;
    private int anoReferencia;
    private LocalDate dataVencimento;
    private LocalDate dataEntrega;

    private StatusObrigacao status;
    private String responsavel;
    private String observacoes;
    private String arquivoGerado;
    private String protocolo;
    private String recibo;
    private String empresaRazaoSocial;

    public enum TipoObrigacao { FEDERAL, ESTADUAL, MUNICIPAL }
    public enum Periodicidade { MENSAL, TRIMESTRAL, SEMESTRAL, ANUAL, EVENTUAL }
    public enum StatusObrigacao { PENDENTE, EM_ANDAMENTO, ENTREGUE, ATRASADA, NAO_APLICAVEL }
}
