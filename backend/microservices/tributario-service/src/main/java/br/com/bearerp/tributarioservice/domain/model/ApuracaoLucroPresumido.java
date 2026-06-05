package br.com.bearerp.tributarioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "apuracoes_lucro_presumido")
@CompoundIndex(name = "idx_tenant_empresa_trimestre", def = "{'tenantId': 1, 'empresaId': 1, 'trimestre': 1}")
public class ApuracaoLucroPresumido extends BaseDocument {
    private String trimestre; // ex: 2024-T1, 2024-T2
    private TipoAtividade tipoAtividade;

    // Receita Bruta
    private BigDecimal receitaBrutaTrimestre;
    private BigDecimal demaisReceitas;

    // Presunção IRPJ
    private BigDecimal percentualPresuncaoIrpj;
    private BigDecimal baseCalculoIrpj;
    private BigDecimal irpjNormal; // 15%
    private BigDecimal irpjAdicional; // 10% sobre excedente de R$60k/trimestre
    private BigDecimal irpjTotal;

    // Presunção CSLL
    private BigDecimal percentualPresuncaoCsll;
    private BigDecimal baseCalculoCsll;
    private BigDecimal csll; // 9%

    // PIS/COFINS cumulativo
    private BigDecimal pisCumulativo; // 0,65%
    private BigDecimal cofinsCumulativo; // 3%

    private BigDecimal totalTributos;

    public enum TipoAtividade {
        COMERCIO_INDUSTRIA,      // Presunção IRPJ 8%, CSLL 12%
        SERVICOS_GERAL,          // Presunção IRPJ 32%, CSLL 32%
        TRANSPORTE_CARGAS,       // Presunção IRPJ 8%, CSLL 12%
        TRANSPORTE_PASSAGEIROS,  // Presunção IRPJ 16%, CSLL 12%
        SERVICOS_HOSPITALARES,   // Presunção IRPJ 8%, CSLL 12%
        REVENDA_COMBUSTIVEIS     // Presunção IRPJ 1,6%, CSLL 12%
    }
}
