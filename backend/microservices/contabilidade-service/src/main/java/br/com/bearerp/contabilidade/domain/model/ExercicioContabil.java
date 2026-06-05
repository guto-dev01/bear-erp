package br.com.bearerp.contabilidade.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "exercicios_contabeis")
@CompoundIndex(name = "idx_tenant_empresa_ano", def = "{'tenantId': 1, 'empresaId': 1, 'ano': 1}", unique = true)
public class ExercicioContabil extends BaseDocument {

    private int ano;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private StatusExercicio status;
    private Instant dataEncerramento;
    private boolean saldoInicialGerado;
    private BigDecimal lucroOuPrejuizo;
    private String contaResultado;

    public enum StatusExercicio { ABERTO, EM_ENCERRAMENTO, ENCERRADO }
}
