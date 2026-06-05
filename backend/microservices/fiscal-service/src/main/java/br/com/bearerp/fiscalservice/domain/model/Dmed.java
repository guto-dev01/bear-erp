package br.com.bearerp.fiscalservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "dmed")
@CompoundIndex(name = "idx_tenant_empresa_ano", def = "{'tenantId': 1, 'empresaId': 1, 'anoCalendario': 1}", unique = true)
public class Dmed extends BaseDocument {

    private int anoCalendario;
    private String cnpjDeclarante;
    private String razaoSocialDeclarante;
    private String tipoDeclarante; // SERVICOS_SAUDE, OPERADORA_PLANO_SAUDE
    private StatusDmed status;

    // Atendimentos/Pagamentos
    private List<BeneficiarioSaude> beneficiarios;
    private BigDecimal valorTotalDeclarado;
    private int totalBeneficiarios;

    // Controle
    private String arquivoGerado;
    private String protocolo;
    private String recibo;
    private Instant dataEntrega;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class BeneficiarioSaude {
        private String cpfBeneficiario;
        private String nomeBeneficiario;
        private List<PagamentoSaude> pagamentos;
        private BigDecimal valorTotal;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PagamentoSaude {
        private int mes;
        private BigDecimal valor;
        private String cpfResponsavelPagamento;
        private String nomeResponsavelPagamento;
        private String tipoServico; // CONSULTA, EXAME, INTERNACAO, PROCEDIMENTO
    }

    public enum StatusDmed { RASCUNHO, CALCULADA, VALIDADA, ENTREGUE }
}
