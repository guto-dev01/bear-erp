package br.com.bearerp.fiscalservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "guias_fiscais")
@CompoundIndex(name = "idx_tenant_empresa_tipo", def = "{'tenantId': 1, 'empresaId': 1, 'tipoGuia': 1, 'competencia': 1}")
public class GuiaFiscal extends BaseDocument {

    private TipoGuia tipoGuia;
    private String competencia; // YYYY-MM
    private LocalDate dataVencimento;
    private LocalDate dataPagamento;
    private BigDecimal valorPrincipal;
    private BigDecimal juros;
    private BigDecimal multa;
    private BigDecimal valorTotal;
    private String codigoBarras;
    private String codigoReceita;
    private String numeroDocumento;
    private StatusGuia status;
    private String periodoApuracao;
    private String observacao;

    public enum TipoGuia {
        DARF, // IRPJ, CSLL, PIS, COFINS, IRRF, CSRF
        DAS, // Simples Nacional
        GPS, // INSS
        GNRE, // ICMS Interestadual
        GIA, // ICMS Estadual
        FGTS, // FGTS
        DAE, // Diferencial de Alíquota
        ISS  // ISS Municipal
    }

    public enum StatusGuia { GERADA, PAGA, VENCIDA, CANCELADA, PARCELADA }
}
