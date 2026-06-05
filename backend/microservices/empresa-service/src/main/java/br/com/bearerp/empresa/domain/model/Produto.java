package br.com.bearerp.empresa.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "produtos")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_codigo", def = "{'tenantId': 1, 'empresaId': 1, 'codigo': 1}", unique = true),
    @CompoundIndex(name = "idx_tenant_ncm", def = "{'tenantId': 1, 'ncm': 1}"),
    @CompoundIndex(name = "idx_tenant_tipo", def = "{'tenantId': 1, 'tipo': 1}")
})
public class Produto extends BaseDocument {

    private String codigo;
    private String descricao;
    private TipoProduto tipo;
    private String unidade;
    private String ncm;
    private String cest;
    private String cfopPadrao;
    private BigDecimal precoVenda;
    private BigDecimal custoMedio;
    private BigDecimal estoqueAtual;
    private BigDecimal estoqueMinimo;
    private String categoria;
    private String marca;
    private String codigoBarras;
    private BigDecimal pesoLiquido;
    private BigDecimal pesoBruto;
    private String origemMercadoria;
    private StatusProduto status;

    public enum TipoProduto { PRODUTO, SERVICO, MATERIA_PRIMA, EMBALAGEM }
    public enum StatusProduto { ATIVO, INATIVO, DESCONTINUADO }
}
