package br.com.bearerp.financeiroservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "movimentos_bancarios")
@CompoundIndex(name = "idx_tenant_empresa_conta_data", def = "{'tenantId': 1, 'empresaId': 1, 'contaBancariaId': 1, 'data': 1}")
public class MovimentoBancario extends BaseDocument {
    private String contaBancariaId;
    private LocalDate data;
    private TipoMovimento tipo;
    private String descricao;
    private BigDecimal valor;
    private BigDecimal saldoApos;
    private String categoriaId;
    private String contaPagarId;
    private String contaReceberId;
    private String conciliacaoId;
    private boolean conciliado;
    private String observacao;

    public enum TipoMovimento { CREDITO, DEBITO }
}
