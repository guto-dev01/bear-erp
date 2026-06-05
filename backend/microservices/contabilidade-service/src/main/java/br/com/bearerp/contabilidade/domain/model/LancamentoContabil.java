package br.com.bearerp.contabilidade.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "lancamentos_contabeis")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_data", def = "{'tenantId': 1, 'empresaId': 1, 'dataLancamento': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_competencia", def = "{'tenantId': 1, 'empresaId': 1, 'dataCompetencia': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_status", def = "{'tenantId': 1, 'empresaId': 1, 'status': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_lote", def = "{'tenantId': 1, 'empresaId': 1, 'loteId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_conta", def = "{'tenantId': 1, 'empresaId': 1, 'partidas.contaId': 1}")
})
public class LancamentoContabil extends BaseDocument {

    private Long numero;
    private LocalDate dataLancamento;
    private LocalDate dataCompetencia;
    private TipoLancamento tipo;
    private OrigemTipo origemTipo;
    private String origemId;
    private String historicoPadrao;
    private String historicoComplementar;
    private List<Partida> partidas;
    private BigDecimal valorTotal;
    private StatusLancamento status;
    private String estornoDeId;
    private String loteId;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Partida {
        private String contaId;
        private String contaCodigo;
        private String contaDescricao;
        private TipoPartida tipo;
        private BigDecimal valor;
        private String historicoPartida;
        private String centroCustoId;
        private String centroCustoNome;
    }

    public enum TipoLancamento { NORMAL, ABERTURA, ENCERRAMENTO, AJUSTE, AUTOMATICO }
    public enum OrigemTipo { MANUAL, IMPORTACAO, FISCAL, FOLHA, FINANCEIRO, AUTOMATICO }
    public enum TipoPartida { DEBITO, CREDITO }
    public enum StatusLancamento { RASCUNHO, CONFIRMADO, ESTORNADO }
}
