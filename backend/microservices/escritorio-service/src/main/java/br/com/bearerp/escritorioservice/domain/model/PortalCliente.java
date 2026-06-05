package br.com.bearerp.escritorioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "portal_documentos")
@CompoundIndex(name = "idx_tenant_empresa_tipo", def = "{'tenantId': 1, 'empresaClienteId': 1, 'tipo': 1}")
public class PortalCliente extends BaseDocument {

    // Documento enviado pelo cliente
    private String empresaClienteId;
    private String empresaClienteNome;
    private String tipo; // NOTA_FISCAL, EXTRATO, COMPROVANTE, CONTRATO, RECIBO, OUTROS
    private String nomeArquivo;
    private String descricao;
    private String competencia; // YYYY-MM
    private long tamanhoBytes;
    private String mimeType;
    private String storagePath; // caminho no storage
    private StatusDocumento status;
    private String observacaoContador;
    private Instant enviadoEm;
    private Instant processadoEm;
    private String processadoPor;

    // Comunicação
    private List<Mensagem> mensagens;

    // Checklist mensal
    private boolean checklistItem;
    private String checklistCategoria;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class Mensagem {
        private String autor;
        private String autorNome;
        private String conteudo;
        private Instant enviadaEm;
        private boolean lidaPeloContador;
        private boolean lidaPeloCliente;
    }

    public enum StatusDocumento {
        PENDENTE, EM_ANALISE, PROCESSADO, DEVOLVIDO, ARQUIVADO
    }
}
