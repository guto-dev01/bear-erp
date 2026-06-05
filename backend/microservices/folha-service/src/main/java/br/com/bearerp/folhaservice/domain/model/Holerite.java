package br.com.bearerp.folhaservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "holerites")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa_periodo", def = "{'tenantId': 1, 'empresaId': 1, 'ano': 1, 'mes': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_func_periodo", def = "{'tenantId': 1, 'empresaId': 1, 'funcionarioId': 1, 'ano': 1, 'mes': 1}", unique = true)
})
public class Holerite extends BaseDocument {
    private String funcionarioId;
    private String funcionarioNome;
    private String funcionarioMatricula;
    private String funcionarioCpf;
    private String cargo;
    private String departamento;
    private int ano;
    private int mes;
    private BigDecimal salarioBase;

    // Rubricas
    private List<Rubrica> proventos;
    private List<Rubrica> descontos;

    // Totais
    private BigDecimal totalProventos;
    private BigDecimal totalDescontos;
    private BigDecimal salarioLiquido;

    // Bases de cálculo
    private BigDecimal baseInss;
    private BigDecimal baseIrrf;
    private BigDecimal baseFgts;

    // Encargos
    private BigDecimal valorInss;
    private BigDecimal valorIrrf;
    private BigDecimal valorFgts;
    private BigDecimal valorInssPatronal;

    // Deduções IRRF
    private BigDecimal deducaoDependentes;
    private BigDecimal deducaoInss;
    private BigDecimal deducaoPensao;

    private int diasTrabalhados;
    private int horasExtras50;
    private int horasExtras100;
    private int faltas;
    private int atrasos;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Rubrica {
        private String codigo;
        private String descricao;
        private String tipo; // PROVENTO, DESCONTO
        private BigDecimal referencia; // horas, dias, percentual
        private BigDecimal valor;
    }
}
