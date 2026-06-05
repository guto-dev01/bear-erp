package br.com.bearerp.patrimonioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "movimentacoes_bens")
@CompoundIndex(name = "idx_tenant_empresa_bem", def = "{'tenantId': 1, 'empresaId': 1, 'bemId': 1}")
public class MovimentacaoBem extends BaseDocument {
    private String bemId;
    private TipoMovimentacao tipo;
    private LocalDate data;
    private String descricao;
    private BigDecimal valor;
    private String localOrigemId;
    private String localDestinoId;
    private String responsavelOrigem;
    private String responsavelDestino;
    private String documentoReferencia;
    private String observacao;

    public enum TipoMovimentacao {
        AQUISICAO, TRANSFERENCIA, MANUTENCAO, REAVALIACAO,
        BAIXA_VENDA, BAIXA_PERDA, BAIXA_DOACAO, BAIXA_OBSOLESCENCIA
    }
}
