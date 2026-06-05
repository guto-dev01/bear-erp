package br.com.bearerp.empresa.domain.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConfiguracaoFiscal {

    private BigDecimal aliquotaSimples;
    private String anexoSimples; // Anexo I a V
    private int serieNfe;
    @Builder.Default
    private long proximoNumeroNfe = 1;
    @Builder.Default
    private AmbienteNfe ambienteNfe = AmbienteNfe.HOMOLOGACAO;
    private String regimeEspecialTributacao;
    private boolean contribuinteIcms;
    private boolean contribuinteIpi;

    public enum AmbienteNfe {
        PRODUCAO, HOMOLOGACAO
    }
}
