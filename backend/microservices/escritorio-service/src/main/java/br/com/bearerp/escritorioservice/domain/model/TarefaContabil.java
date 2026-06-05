package br.com.bearerp.escritorioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "tarefas_contabeis")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_responsavel_status", def = "{'tenantId': 1, 'responsavelId': 1, 'status': 1}")
})
public class TarefaContabil extends BaseDocument {
    private String titulo;
    private String descricao;
    private TipoTarefa tipo;
    private Prioridade prioridade;
    private String clienteEmpresaId;
    private String clienteEmpresaNome;
    private String responsavelId;
    private String responsavelNome;
    private String departamento;
    private String competencia; // YYYY-MM
    private LocalDate dataVencimento;
    private LocalDate dataConclusao;
    private StatusTarefa status;
    private boolean recorrente;
    private String recorrenciaRegra; // MENSAL, TRIMESTRAL, ANUAL
    private String observacao;

    public enum TipoTarefa {
        ESCRITURACAO_FISCAL, ESCRITURACAO_CONTABIL, FOLHA_PAGAMENTO,
        APURACAO_IMPOSTOS, OBRIGACAO_ACESSORIA, FECHAMENTO_BALANCETE,
        CONCILIACAO, DECLARACAO_IR, AUDITORIA, CONSULTORIA,
        ABERTURA_EMPRESA, ALTERACAO_CONTRATUAL, BAIXA_EMPRESA,
        CERTIDAO, PARCELAMENTO, OUTROS
    }

    public enum Prioridade { BAIXA, MEDIA, ALTA, URGENTE }

    public enum StatusTarefa { PENDENTE, EM_ANDAMENTO, AGUARDANDO_CLIENTE, CONCLUIDA, CANCELADA, ATRASADA }
}
