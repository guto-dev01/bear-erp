package br.com.bearerp.tributarioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "apuracoes_lucro_real")
@CompoundIndex(name = "idx_tenant_empresa_periodo", def = "{'tenantId': 1, 'empresaId': 1, 'periodo': 1}")
public class ApuracaoLucroReal extends BaseDocument {
    private String periodo; // YYYY-MM ou YYYY-TX
    private TipoPeriodo tipoPeriodo; // MENSAL, TRIMESTRAL

    // LALUR - Parte A
    private BigDecimal lucroContabil;
    private BigDecimal adicoes;
    private BigDecimal exclusoes;
    private BigDecimal compensacoes; // max 30% do lucro ajustado
    private BigDecimal lucroReal;

    // Detalhes adições/exclusões
    private List<AjusteLalur> ajustes;

    // IRPJ
    private BigDecimal baseCalculoIrpj;
    private BigDecimal irpjNormal; // 15%
    private BigDecimal irpjAdicional; // 10% sobre excedente (R$20k/mês ou R$60k/trim)
    private BigDecimal irpjTotal;

    // CSLL
    private BigDecimal baseCalculoCsll;
    private BigDecimal csll; // 9%

    // PIS/COFINS não-cumulativo
    private BigDecimal pisNaoCumulativo; // 1,65%
    private BigDecimal cofinsNaoCumulativo; // 7,6%
    private BigDecimal creditosPisCofins;
    private BigDecimal pisAPagar;
    private BigDecimal cofinsAPagar;

    // Prejuízo fiscal (LALUR Parte B)
    private BigDecimal saldoPrejuizoFiscalAnterior;
    private BigDecimal saldoPrejuizoFiscalAtual;
    private BigDecimal saldoBaseNegativaCsllAnterior;
    private BigDecimal saldoBaseNegativaCsllAtual;

    private BigDecimal totalTributos;

    public enum TipoPeriodo { MENSAL, TRIMESTRAL }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class AjusteLalur {
        private String descricao;
        private TipoAjuste tipo;
        private BigDecimal valor;
        private String fundamentoLegal;

        public enum TipoAjuste { ADICAO, EXCLUSAO, COMPENSACAO }
    }
}
