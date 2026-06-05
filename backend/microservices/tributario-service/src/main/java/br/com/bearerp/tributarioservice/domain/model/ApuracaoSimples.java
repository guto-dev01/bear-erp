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
@Document(collection = "apuracoes_simples")
@CompoundIndex(name = "idx_tenant_empresa_competencia", def = "{'tenantId': 1, 'empresaId': 1, 'competencia': 1}")
public class ApuracaoSimples extends BaseDocument {
    private String competencia; // YYYY-MM
    private AnexoSimples anexo;
    private FaixaSimples faixa;

    private BigDecimal receitaBruta12Meses; // RBT12
    private BigDecimal receitaBrutaMes;
    private BigDecimal aliquotaNominal;
    private BigDecimal parcelaDeducao;
    private BigDecimal aliquotaEfetiva;
    private BigDecimal valorDas;

    private List<ReparticaoTributo> reparticao;
    private boolean dasGerado;
    private String dasNumero;

    public enum AnexoSimples {
        ANEXO_I,    // Comércio
        ANEXO_II,   // Indústria
        ANEXO_III,  // Serviços (ISS)
        ANEXO_IV,   // Serviços (construção, advocacia)
        ANEXO_V     // Serviços (fator R < 28%)
    }

    public enum FaixaSimples {
        FAIXA_1, FAIXA_2, FAIXA_3, FAIXA_4, FAIXA_5, FAIXA_6
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ReparticaoTributo {
        private String tributo; // IRPJ, CSLL, COFINS, PIS, CPP, ICMS, ISS, IPI
        private BigDecimal percentual;
        private BigDecimal valor;
    }
}
