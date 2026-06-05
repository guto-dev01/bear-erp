package br.com.bearerp.patrimonioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "bens_patrimoniais")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_grupo", def = "{'tenantId': 1, 'empresaId': 1, 'grupoContabil': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_status", def = "{'tenantId': 1, 'empresaId': 1, 'status': 1}")
})
public class BemPatrimonial extends BaseDocument {
    private String codigo;
    private String descricao;
    private String marca;
    private String modelo;
    private String numeroSerie;
    private String notaFiscal;
    private String fornecedorId;
    private String fornecedorNome;

    private GrupoContabil grupoContabil;
    private String localId;
    private String localDescricao;
    private String centroCustoId;
    private String responsavel;

    private LocalDate dataAquisicao;
    private LocalDate dataInicioDepreciacao;
    private LocalDate dataBaixa;

    private BigDecimal valorAquisicao;
    private BigDecimal valorResidual;
    private BigDecimal valorDepreciadoAcumulado;
    private BigDecimal valorAtual;

    private int vidaUtilMeses;
    private BigDecimal taxaDepreciacaoAnual;
    private MetodoDepreciacao metodoDepreciacao;

    private String contaContabilAtivoId;
    private String contaContabilDepreciacaoId;
    private String contaContabilDespesaId;

    private StatusBem status;
    private String observacao;

    public enum GrupoContabil {
        IMOVEIS, VEICULOS, MAQUINAS_EQUIPAMENTOS, MOVEIS_UTENSILIOS,
        EQUIPAMENTOS_INFORMATICA, INSTALACOES, MARCAS_PATENTES,
        BENFEITORIAS, TERRENOS, OUTROS
    }

    public enum MetodoDepreciacao { LINEAR, SOMA_DIGITOS, HORAS_TRABALHADAS }

    public enum StatusBem { ATIVO, BAIXADO, VENDIDO, TRANSFERIDO, EM_MANUTENCAO }
}
