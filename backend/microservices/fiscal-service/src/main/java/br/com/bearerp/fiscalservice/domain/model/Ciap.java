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
@Document(collection = "ciap")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class Ciap extends BaseDocument {

    private String bemId;
    private String descricao;
    private String nfeAquisicaoId;
    private String chaveAcesso;
    private LocalDate dataAquisicao;
    private BigDecimal valorAquisicao;
    private BigDecimal icmsAquisicao;
    private int parcelasTotal; // 48 parcelas
    private int parcelasApropriadas;
    private BigDecimal valorParcelaMensal;
    private BigDecimal totalApropriado;
    private BigDecimal saldoApropriar;
    private StatusCiap status;

    public enum StatusCiap { EM_APROPRIACAO, CONCLUIDO, BAIXADO }
}
