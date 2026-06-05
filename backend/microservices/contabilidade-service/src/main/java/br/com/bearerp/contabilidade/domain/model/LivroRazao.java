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
@Document(collection = "livros_razao")
@CompoundIndex(name = "idx_tenant_empresa_conta", def = "{'tenantId': 1, 'empresaId': 1, 'contaId': 1}")
public class LivroRazao extends BaseDocument {

    private String contaId;
    private String contaCodigo;
    private String contaDescricao;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private BigDecimal saldoInicial;
    private BigDecimal saldoFinal;
    private int totalMovimentos;
    private String hashVerificacao;
    private LivroDiario.StatusLivro status;
    private Instant dataGeracao;
}
