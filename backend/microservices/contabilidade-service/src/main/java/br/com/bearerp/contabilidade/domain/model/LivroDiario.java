package br.com.bearerp.contabilidade.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "livros_diario")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class LivroDiario extends BaseDocument {

    private Long numero;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private String termoAbertura;
    private String termoEncerramento;
    private int totalPaginas;
    private int totalLancamentos;
    private String hashVerificacao;
    private StatusLivro status;
    private Instant dataGeracao;

    public enum StatusLivro { GERADO, ASSINADO, TRANSMITIDO }
}
