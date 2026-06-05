package br.com.bearerp.escritorioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "protocolos_documentos")
public class ProtocoloDocumento extends BaseDocument {

    private String numeroProtocolo;          // Sequencial: PROT-2024-00001
    private TipoProtocolo tipo;              // ENTRADA, SAIDA
    private String empresaClienteId;
    private String empresaClienteNome;

    // Remetente/Destinatário
    private String remetente;
    private String destinatario;
    private String responsavelRecebimento;

    // Documentos
    private String descricao;
    private List<ItemProtocolo> itens;
    private int quantidadeDocumentos;
    private String observacoes;

    // Controle de prazos
    private LocalDate dataRecebimento;
    private LocalDate prazoDevolucao;
    private LocalDate dataDevolvido;
    private boolean atrasado;
    private int diasAtraso;

    // Status e rastreamento
    private StatusProtocolo status;
    private List<MovimentacaoProtocolo> movimentacoes;

    // QR Code e comprovante
    private String qrCodeUrl;               // URL para consulta rápida
    private String comprovantePdfPath;       // PDF do comprovante

    // Vinculação
    private String portalClienteDocId;       // Vínculo com PortalCliente

    public enum TipoProtocolo {
        ENTRADA,    // Documento recebido do cliente
        SAIDA       // Documento devolvido ao cliente
    }

    public enum StatusProtocolo {
        RECEBIDO,
        EM_ANALISE,
        PROCESSADO,
        AGUARDANDO_DEVOLUCAO,
        DEVOLVIDO,
        ARQUIVADO,
        EXTRAVIADO
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ItemProtocolo {
        private String descricao;
        private String tipoDocumento;        // NF, RECIBO, CONTRATO, GUIA, EXTRATO, OUTROS
        private String competencia;          // 2024-01
        private int quantidade;
        private boolean original;            // true = original, false = cópia
        private String observacao;
    }

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class MovimentacaoProtocolo {
        private Instant dataHora;
        private String acao;                 // RECEBIDO, TRANSFERIDO, PROCESSADO, DEVOLVIDO
        private String responsavel;
        private String setor;
        private String observacao;
    }
}
