package br.com.bearerp.obrigacoes.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "agenda_fiscal")
@CompoundIndex(name = "idx_tenant_data", def = "{'tenantId': 1, 'dataVencimento': 1}")
public class AgendaFiscal extends BaseDocument {

    private String empresaClienteId;
    private String empresaClienteNome;
    private String cnpjEmpresa;

    private String obrigacao;
    private String descricao;
    private TipoObrigacao tipoObrigacao;
    private EsferaObrigacao esfera;
    private Periodicidade periodicidade;

    private String competencia; // YYYY-MM
    private LocalDate dataVencimento;
    private LocalDate dataEntrega;
    private StatusAgenda status;

    private String responsavel;
    private PrioridadeAgenda prioridade;
    private boolean alertaEnviado;
    private boolean alertaVencimentoEnviado;

    private List<String> regimesTributariosAplicaveis; // SIMPLES, LUCRO_PRESUMIDO, LUCRO_REAL
    private List<String> atividadesAplicaveis; // COMERCIO, SERVICOS, INDUSTRIA

    public enum TipoObrigacao {
        DECLARACAO, GUIA_PAGAMENTO, ESCRITURACAO, CERTIDAO
    }

    public enum EsferaObrigacao { FEDERAL, ESTADUAL, MUNICIPAL }

    public enum Periodicidade { MENSAL, TRIMESTRAL, SEMESTRAL, ANUAL, EVENTUAL }

    public enum StatusAgenda { PENDENTE, EM_ANDAMENTO, ENTREGUE, ATRASADA, NAO_APLICAVEL }

    public enum PrioridadeAgenda { BAIXA, MEDIA, ALTA, URGENTE }
}
