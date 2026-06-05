package br.com.bearerp.escritorioservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "checklist_mensal")
public class ChecklistMensal extends BaseDocument {

    private String empresaClienteId;
    private String empresaClienteNome;
    private String competencia; // YYYY-MM
    private List<ItemChecklist> itens;
    private int totalItens;
    private int itensCompletos;
    private double percentualConcluido;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ItemChecklist {
        private String descricao;
        private String categoria; // DOCUMENTOS, IMPOSTOS, FOLHA, FISCAL
        private boolean obrigatorio;
        private boolean concluido;
        private String documentoId; // referência ao documento enviado
        private String observacao;
    }
}
