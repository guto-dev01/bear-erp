package br.com.bearerp.folhaservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "rescisoes")
@CompoundIndex(name = "idx_tenant_empresa_func", def = "{'tenantId': 1, 'empresaId': 1, 'funcionarioId': 1}")
public class Rescisao extends BaseDocument {
    private String funcionarioId;
    private String funcionarioNome;
    private LocalDate dataDesligamento;
    private LocalDate dataAvisoPrevio;
    private TipoRescisao tipo;

    // Verbas rescisórias
    private BigDecimal saldoSalario;
    private BigDecimal avisoPreviolIndenizado;
    private BigDecimal decimoTerceiroProporcional;
    private BigDecimal feriasVencidas;
    private BigDecimal feriasProporcionais;
    private BigDecimal tercoFerias;
    private BigDecimal multaFgts; // 40% ou 20%
    private BigDecimal saqueFgts;

    // Descontos
    private BigDecimal descontoAvisoPrevio;
    private BigDecimal descontoInss;
    private BigDecimal descontoIrrf;
    private BigDecimal outrosDescontos;

    private BigDecimal totalProventos;
    private BigDecimal totalDescontos;
    private BigDecimal valorLiquido;

    private StatusRescisao status;

    public enum TipoRescisao {
        SEM_JUSTA_CAUSA, JUSTA_CAUSA, PEDIDO_DEMISSAO,
        ACORDO_MUTUO, TERMINO_CONTRATO, APOSENTADORIA, FALECIMENTO
    }
    public enum StatusRescisao { CALCULADA, HOMOLOGADA, PAGA }
}
