package br.com.bearerp.fiscalservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "escrituracoes_fiscais")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_tipo_data", def = "{'tenantId': 1, 'empresaId': 1, 'tipoEscrituracao': 1, 'dataEmissao': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_nfe", def = "{'tenantId': 1, 'empresaId': 1, 'nfeId': 1}")
})
public class EscrituracaoFiscal extends BaseDocument {

    private TipoEscrituracao tipoEscrituracao; // ENTRADA, SAIDA
    private String nfeId;
    private String chaveAcesso;
    private Long numeroNfe;
    private Integer serie;
    private String modeloDocumento;

    // Participante
    private String participanteCnpjCpf;
    private String participanteRazaoSocial;
    private String participanteUf;
    private String participanteIe;

    // Datas
    private LocalDateTime dataEmissao;
    private LocalDate dataEntradaSaida;

    // Valores
    private String cfop;
    private String naturezaOperacao;
    private BigDecimal valorContabil;
    private BigDecimal baseCalculoIcms;
    private BigDecimal aliquotaIcms;
    private BigDecimal valorIcms;
    private BigDecimal valorIcmsSt;
    private BigDecimal valorIpi;
    private BigDecimal valorPis;
    private BigDecimal valorCofins;
    private BigDecimal outrasDespesas;

    // Observações
    private String observacao;
    private String codigoSituacao; // 00-Regular, 01-Extemporâneo, etc

    private int ano;
    private int mes;

    public enum TipoEscrituracao { ENTRADA, SAIDA }
}
