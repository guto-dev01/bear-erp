package br.com.bearerp.fiscalservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "eventos_reinf")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_tipo_competencia", def = "{'tenantId': 1, 'empresaId': 1, 'tipoEvento': 1, 'competencia': 1}")
})
public class EventoReinf extends BaseDocument {

    private TipoEventoReinf tipoEvento;
    private String competencia; // YYYY-MM
    private StatusEventoReinf status;

    // R-1000 - Informações do Contribuinte
    private String cnpjContribuinte;
    private String razaoSocial;
    private String classificacaoTributaria;
    private Instant inicioValidade;
    private Instant fimValidade;

    // R-2010 - Retenções de Serviços Tomados
    // R-2020 - Retenções de Serviços Prestados
    private String cnpjPrestador;
    private String razaoSocialPrestador;
    private List<NotaFiscalReinf> notasFiscais;
    private BigDecimal valorBrutoTotal;
    private BigDecimal valorBaseRetencao;
    private BigDecimal valorRetencao;

    // Controle
    private String xmlEnvio;
    private String xmlRetorno;
    private String protocolo;
    private String recibo;
    private String codigoRetorno;
    private String descricaoRetorno;
    private Instant dataEnvio;
    private Instant dataRetorno;
    private int tentativasEnvio;
    private String idEvento; // ID único do evento na RFB

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class NotaFiscalReinf {
        private String serie;
        private String numero;
        private LocalDate dataEmissao;
        private BigDecimal valorBruto;
        private BigDecimal valorBaseRetencao;
        private BigDecimal valorRetencao;
        private BigDecimal valorRetencaoPrincipal; // INSS 11%
        private BigDecimal valorRetencaoAdicional;
        private String tipoServico; // Tabela 06 da REINF
        private String codigoServico;
    }

    public enum TipoEventoReinf {
        R1000("R-1000", "Informações do Contribuinte"),
        R2010("R-2010", "Retenção Contribuição Previdenciária - Serviços Tomados"),
        R2020("R-2020", "Retenção Contribuição Previdenciária - Serviços Prestados"),
        R2099("R-2099", "Fechamento dos Eventos Periódicos"),
        R4010("R-4010", "Pagamentos/créditos a beneficiário pessoa física"),
        R4020("R-4020", "Pagamentos/créditos a beneficiário pessoa jurídica"),
        R4099("R-4099", "Fechamento/reabertura dos eventos da série R-4000"),
        R9000("R-9000", "Exclusão de eventos");

        private final String codigo;
        private final String descricao;
        TipoEventoReinf(String codigo, String descricao) {
            this.codigo = codigo;
            this.descricao = descricao;
        }
        public String getCodigo() { return codigo; }
        public String getDescricao() { return descricao; }
    }

    public enum StatusEventoReinf {
        RASCUNHO, VALIDADO, ENVIADO, ACEITO, REJEITADO, RETIFICADO, EXCLUIDO
    }
}
