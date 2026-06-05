package br.com.bearerp.escritorioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "honorarios")
@CompoundIndex(name = "idx_tenant_empresa_competencia", def = "{'tenantId': 1, 'empresaId': 1, 'competencia': 1}")
public class Honorario extends BaseDocument {
    private String clienteEmpresaId;
    private String clienteEmpresaNome;
    private String competencia; // YYYY-MM
    private BigDecimal valorHonorario;
    private BigDecimal valorServicosExtras;
    private BigDecimal valorDesconto;
    private BigDecimal valorTotal;
    private LocalDate dataVencimento;
    private LocalDate dataPagamento;
    private StatusHonorario status;
    private String nfseId;
    private String boletoUrl;
    private String observacao;

    public enum StatusHonorario { ABERTO, PAGO, VENCIDO, CANCELADO }
}
