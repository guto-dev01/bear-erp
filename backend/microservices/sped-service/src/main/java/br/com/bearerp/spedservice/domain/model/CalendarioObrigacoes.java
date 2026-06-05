package br.com.bearerp.spedservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "calendario_obrigacoes")
@CompoundIndex(name = "idx_tenant_empresa_vencimento", def = "{'tenantId': 1, 'empresaId': 1, 'dataVencimento': 1}")
public class CalendarioObrigacoes extends BaseDocument {
    private ObrigacaoAcessoria.TipoObrigacao tipo;
    private String descricao;
    private String competencia;
    private LocalDate dataVencimento;
    private String regimeTributario; // SIMPLES, LUCRO_PRESUMIDO, LUCRO_REAL
    private boolean obrigatoria;
    private String fundamentoLegal;
    private int diaFixoVencimento; // dia do mês para vencimento
    private int mesesAposCompetencia; // meses após competência para vencimento
}
