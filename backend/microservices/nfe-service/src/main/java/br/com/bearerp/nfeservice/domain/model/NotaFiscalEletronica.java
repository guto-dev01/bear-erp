package br.com.bearerp.nfeservice.domain.model;

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
@Document(collection = "notas_fiscais_eletronicas")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_numero", def = "{'tenantId': 1, 'empresaId': 1, 'numero': 1, 'serie': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_chave", def = "{'tenantId': 1, 'empresaId': 1, 'chaveAcesso': 1}", unique = true, sparse = true),
    @CompoundIndex(name = "idx_tenant_empresa_status", def = "{'tenantId': 1, 'empresaId': 1, 'status': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_data", def = "{'tenantId': 1, 'empresaId': 1, 'dataEmissao': 1}")
})
public class NotaFiscalEletronica extends BaseDocument {

    // Identificação
    private Long numero;
    private Integer serie;
    private String chaveAcesso;
    private String protocolo;
    private TipoNfe tipo; // ENTRADA, SAIDA
    private FinalidadeNfe finalidade; // NORMAL, COMPLEMENTAR, AJUSTE, DEVOLUCAO
    private ModeloNfe modelo; // NFE_55, NFCE_65

    // Datas
    private LocalDateTime dataEmissao;
    private LocalDateTime dataSaidaEntrada;
    private LocalDate dataCompetencia;

    // Emitente
    private DadosPessoa emitente;

    // Destinatário
    private DadosPessoa destinatario;

    // Itens
    private List<ItemNfe> itens;

    // Totais
    private TotaisNfe totais;

    // Transporte
    private Transporte transporte;

    // Pagamento
    private List<Pagamento> pagamentos;

    // Informações adicionais
    private String informacoesComplementares;
    private String informacoesFisco;
    private String naturezaOperacao;

    // CFOP principal
    private String cfop;

    // Status e controle
    private StatusNfe status;
    private String xmlEnvio;
    private String xmlRetorno;
    private String xmlCancelamento;
    private String motivoCancelamento;
    private Instant dataCancelamento;
    private AmbienteNfe ambiente; // PRODUCAO, HOMOLOGACAO

    // Manifestação destinatário
    private ManifestacaoDestinatario manifestacao;

    // Integração contábil
    private String lancamentoContabilId;
    private boolean contabilizado;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DadosPessoa {
        private String pessoaId;
        private String cnpjCpf;
        private String inscricaoEstadual;
        private String razaoSocial;
        private String nomeFantasia;
        private String logradouro;
        private String numero;
        private String complemento;
        private String bairro;
        private String cidade;
        private String codigoIbge;
        private String uf;
        private String cep;
        private String telefone;
        private String email;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ItemNfe {
        private int item;
        private String produtoId;
        private String codigo;
        private String descricao;
        private String ncm;
        private String cest;
        private String cfop;
        private String unidade;
        private BigDecimal quantidade;
        private BigDecimal valorUnitario;
        private BigDecimal valorTotal;
        private BigDecimal desconto;
        private BigDecimal frete;
        private BigDecimal seguro;
        private BigDecimal outrasDespesas;

        // Impostos do item
        private ImpostosItem impostos;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ImpostosItem {
        // ICMS
        private String icmsCst;
        private String icmsOrigem;
        private BigDecimal icmsBaseCalculo;
        private BigDecimal icmsAliquota;
        private BigDecimal icmsValor;
        private BigDecimal icmsBaseCalculoSt;
        private BigDecimal icmsAliquotaSt;
        private BigDecimal icmsValorSt;
        private BigDecimal icmsDesonerado;

        // IPI
        private String ipiCst;
        private BigDecimal ipiBaseCalculo;
        private BigDecimal ipiAliquota;
        private BigDecimal ipiValor;

        // PIS
        private String pisCst;
        private BigDecimal pisBaseCalculo;
        private BigDecimal pisAliquota;
        private BigDecimal pisValor;

        // COFINS
        private String cofinsCst;
        private BigDecimal cofinsBaseCalculo;
        private BigDecimal cofinsAliquota;
        private BigDecimal cofinsValor;

        // II
        private BigDecimal iiBaseCalculo;
        private BigDecimal iiDespesasAduaneiras;
        private BigDecimal iiValor;
        private BigDecimal iiIof;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class TotaisNfe {
        private BigDecimal baseCalculoIcms;
        private BigDecimal valorIcms;
        private BigDecimal valorIcmsDesonerado;
        private BigDecimal baseCalculoIcmsSt;
        private BigDecimal valorIcmsSt;
        private BigDecimal valorProdutos;
        private BigDecimal valorFrete;
        private BigDecimal valorSeguro;
        private BigDecimal valorDesconto;
        private BigDecimal valorIpi;
        private BigDecimal valorPis;
        private BigDecimal valorCofins;
        private BigDecimal outrasDespesas;
        private BigDecimal valorTotalNfe;
        private BigDecimal valorAproximadoTributos;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Transporte {
        private String modalidadeFrete; // CIF, FOB, etc
        private String transportadoraCnpj;
        private String transportadoraRazaoSocial;
        private String placa;
        private String uf;
        private Integer quantidadeVolumes;
        private String especie;
        private BigDecimal pesoLiquido;
        private BigDecimal pesoBruto;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Pagamento {
        private String formaPagamento; // 01-Dinheiro, 02-Cheque, 03-Cartão Crédito, etc
        private BigDecimal valor;
        private String cnpjCredenciadora;
        private String bandeira;
        private String autorizacao;
    }

    public enum TipoNfe { ENTRADA, SAIDA }
    public enum FinalidadeNfe { NORMAL, COMPLEMENTAR, AJUSTE, DEVOLUCAO }
    public enum ModeloNfe { NFE_55, NFCE_65 }
    public enum StatusNfe { RASCUNHO, VALIDADA, AUTORIZADA, CANCELADA, DENEGADA, REJEITADA, INUTILIZADA }
    public enum AmbienteNfe { PRODUCAO, HOMOLOGACAO }
    public enum ManifestacaoDestinatario { CIENCIA, CONFIRMACAO, DESCONHECIMENTO, NAO_REALIZADA }
}
