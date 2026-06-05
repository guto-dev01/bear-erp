package br.com.bearerp.integracoesservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "ecac_consultas")
public class ConsultaEcac extends BaseDocument {

    private String cnpjEmpresa;
    private String razaoSocial;
    private TipoConsultaEcac tipo;
    private StatusConsultaEcac status;

    // Certificado digital usado
    private String certificadoId;
    private String certificadoTitular;

    // Resultado da consulta
    private Instant consultadoEm;
    private Instant proximaConsulta;
    private String periodoReferencia; // ex: "2024-01" ou "2024"

    // Situação Fiscal
    private SituacaoFiscal situacaoFiscal;

    // Débitos/Pendências
    private List<DebitoFiscal> debitos;
    private BigDecimal totalDebitos;
    private int quantidadeDebitos;

    // Declarações entregues/pendentes
    private List<DeclaracaoPendente> declaracoesPendentes;
    private List<DeclaracaoEntregue> declaracoesEntregues;

    // Parcelamentos
    private List<Parcelamento> parcelamentos;

    // Malha Fiscal
    private List<PendenciaMalha> pendenciasMalha;

    // Certidões
    private CertidaoNegativa certidaoFederal;
    private CertidaoNegativa certidaoPrevidenciaria;
    private CertidaoNegativa certidaoFgts;

    // Caixa Postal e-CAC
    private List<MensagemEcac> mensagens;
    private int mensagensNaoLidas;

    // Dados brutos
    private Map<String, Object> dadosBrutos;
    private String observacoes;

    // === ENUMS ===

    public enum TipoConsultaEcac {
        SITUACAO_FISCAL,
        DEBITOS_PENDENCIAS,
        DECLARACOES,
        PARCELAMENTOS,
        MALHA_FISCAL,
        CERTIDOES,
        CAIXA_POSTAL,
        COMPLETA // Todas as consultas
    }

    public enum StatusConsultaEcac {
        AGENDADA,
        AUTENTICANDO,
        CONSULTANDO,
        CONCLUIDA,
        ERRO_AUTENTICACAO,
        ERRO_CERTIFICADO,
        ERRO_CONEXAO,
        ERRO_TIMEOUT
    }

    // === INNER CLASSES ===

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class SituacaoFiscal {
        private String situacao; // REGULAR, IRREGULAR, INAPTA, SUSPENSA, BAIXADA
        private String motivoIrregularidade;
        private LocalDate dataConsulta;
        private boolean possuiDebitos;
        private boolean possuiPendencias;
        private boolean possuiMalhaFiscal;
        private String regimeTributario; // SIMPLES_NACIONAL, LUCRO_PRESUMIDO, LUCRO_REAL
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DebitoFiscal {
        private String codigoReceita;
        private String descricao;
        private String periodoApuracao;
        private BigDecimal valorOriginal;
        private BigDecimal valorAtualizado;
        private BigDecimal juros;
        private BigDecimal multa;
        private LocalDate vencimento;
        private String situacao; // ABERTO, PARCELADO, EM_COBRANCA, INSCRITO_DIVIDA_ATIVA
        private String numeroProcesso;
        private boolean inscritoDividaAtiva;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DeclaracaoPendente {
        private String tipoDeclaracao; // DCTF, ECF, ECD, EFD-Contribuições, etc.
        private String periodoReferencia;
        private LocalDate prazoEntrega;
        private boolean atrasada;
        private int diasAtraso;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class DeclaracaoEntregue {
        private String tipoDeclaracao;
        private String periodoReferencia;
        private LocalDate dataEntrega;
        private String numeroRecibo;
        private String situacao; // ACEITA, EM_PROCESSAMENTO, RETIFICADA
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Parcelamento {
        private String numeroParcelamento;
        private String tipoParcelamento; // SIMPLES_NACIONAL, PERT, REFIS, ORDINARIO
        private BigDecimal valorConsolidado;
        private BigDecimal valorParcela;
        private int totalParcelas;
        private int parcelasPagas;
        private int parcelasRestantes;
        private String situacao; // ATIVO, RESCINDIDO, QUITADO
        private LocalDate proximoVencimento;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class PendenciaMalha {
        private String exercicio;
        private String tipoDeclaracao;
        private String motivoRetencao;
        private String codigoMotivo;
        private String orientacao;
        private boolean possuiIntimacao;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class CertidaoNegativa {
        private String tipo; // CND, CPEND, POSITIVA
        private String descricaoTipo; // Negativa, Positiva com Efeito de Negativa, Positiva
        private String codigoCertidao;
        private LocalDate dataEmissao;
        private LocalDate dataValidade;
        private boolean valida;
        private String motivoPositiva;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MensagemEcac {
        private String assunto;
        private String remetente;
        private Instant dataEnvio;
        private boolean lida;
        private String conteudoResumo;
        private String tipoMensagem; // INTIMACAO, NOTIFICACAO, INFORMATIVO, COMUNICADO
        private boolean urgente;
    }
}
