package br.com.bearerp.nfseservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "notas_fiscais_servico")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_numero", def = "{'tenantId': 1, 'empresaId': 1, 'numero': 1}", unique = true),
    @CompoundIndex(name = "idx_tenant_empresa_status", def = "{'tenantId': 1, 'empresaId': 1, 'status': 1}")
})
public class NotaFiscalServico extends BaseDocument {

    private Long numero;
    private String codigoVerificacao;

    // Prestador
    private DadosPrestador prestador;

    // Tomador
    private DadosTomador tomador;

    // Serviço
    private String codigoServico; // LC 116/2003
    private String descricaoServico;
    private String codigoCnae;
    private String codigoTributacaoMunicipio;
    private BigDecimal valorServico;
    private BigDecimal valorDeducoes;
    private BigDecimal baseCalculo;
    private BigDecimal aliquotaIss;
    private BigDecimal valorIss;
    private BigDecimal valorIssRetido;
    private boolean issRetido;

    // Outros impostos
    private BigDecimal valorPis;
    private BigDecimal valorCofins;
    private BigDecimal valorInss;
    private BigDecimal valorIr;
    private BigDecimal valorCsll;
    private BigDecimal outrasRetencoes;
    private BigDecimal valorLiquidoNfse;
    private BigDecimal descontoIncondicionado;
    private BigDecimal descontoCondicionado;

    // Datas
    private LocalDateTime dataEmissao;
    private LocalDate competencia;

    // Município
    private String codigoMunicipio;
    private String municipio;
    private String uf;
    private String codigoMunicipioIncidencia;

    // Status/Protocolo
    private StatusNfse status;
    private String protocoloAutorizacao;
    private Instant dataAutorizacao;
    private String motivoCancelamento;
    private Instant dataCancelamento;

    // RPS
    private Long numeroRps;
    private String serieRps;
    private String tipoRps;

    private String observacao;
    private String xmlAutorizado;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DadosPrestador {
        private String cnpj;
        private String inscricaoMunicipal;
        private String razaoSocial;
        private String nomeFantasia;
        private String endereco;
        private String numero;
        private String complemento;
        private String bairro;
        private String cidade;
        private String uf;
        private String cep;
        private String telefone;
        private String email;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DadosTomador {
        private String cpfCnpj;
        private String inscricaoMunicipal;
        private String razaoSocial;
        private String endereco;
        private String numero;
        private String complemento;
        private String bairro;
        private String cidade;
        private String uf;
        private String cep;
        private String telefone;
        private String email;
    }

    public enum StatusNfse {
        RASCUNHO, AUTORIZADA, CANCELADA, SUBSTITUIDA, REJEITADA
    }
}
