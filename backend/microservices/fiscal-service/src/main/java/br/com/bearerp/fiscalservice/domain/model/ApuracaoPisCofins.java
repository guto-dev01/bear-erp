package br.com.bearerp.fiscalservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "apuracoes_pis_cofins")
@CompoundIndex(name = "idx_tenant_empresa_periodo", def = "{'tenantId': 1, 'empresaId': 1, 'ano': 1, 'mes': 1}", unique = true)
public class ApuracaoPisCofins extends BaseDocument {

    private int ano;
    private int mes;
    private RegimeApuracao regime; // CUMULATIVO, NAO_CUMULATIVO

    // PIS
    private BigDecimal pisDebitoSaidas;
    private BigDecimal pisCreditoEntradas;
    private BigDecimal pisRetidoFonte;
    private BigDecimal pisSaldoCredorAnterior;
    private BigDecimal pisRecolher;
    private BigDecimal pisSaldoCredorTransportar;

    // COFINS
    private BigDecimal cofinsDebitoSaidas;
    private BigDecimal cofinsCreditoEntradas;
    private BigDecimal cofinsRetidoFonte;
    private BigDecimal cofinsSaldoCredorAnterior;
    private BigDecimal cofinsRecolher;
    private BigDecimal cofinsSaldoCredorTransportar;

    private List<DetalheApuracao> detalhes;
    private ApuracaoIcms.StatusApuracao status;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DetalheApuracao {
        private String nfeId;
        private String cfop;
        private String cstPis;
        private String cstCofins;
        private BigDecimal baseCalculoPis;
        private BigDecimal valorPis;
        private BigDecimal baseCalculoCofins;
        private BigDecimal valorCofins;
        private String tipo;
    }

    public enum RegimeApuracao { CUMULATIVO, NAO_CUMULATIVO }
}
