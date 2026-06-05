package br.com.bearerp.contabilidade.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "modelos_lancamento")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class ModeloLancamento extends BaseDocument {

    private String nome;
    private String descricao;
    private TipoModelo tipo;
    private List<PartidaModelo> partidas;
    private Periodicidade periodicidade;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PartidaModelo {
        private String contaId;
        private String contaCodigo;
        private LancamentoContabil.TipoPartida tipo;
        private BigDecimal percentual;
        private BigDecimal valorFixo;
        private String historico;
    }

    public enum TipoModelo { PROVISAO, DEPRECIACAO, RATEIO, ENCERRAMENTO, PERSONALIZADO }
    public enum Periodicidade { MENSAL, TRIMESTRAL, ANUAL, AVULSO }
}
