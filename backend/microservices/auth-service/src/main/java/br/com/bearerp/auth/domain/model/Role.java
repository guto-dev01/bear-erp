package br.com.bearerp.auth.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Builder
@Document(collection = "roles")
@CompoundIndex(name = "idx_tenant_nome", def = "{'tenantId': 1, 'nome': 1}", unique = true)
public class Role extends BaseDocument {

    private String nome;
    private String descricao;

    @Builder.Default
    private List<String> permissoes = new ArrayList<>();

    @Builder.Default
    private boolean sistema = false; // Roles do sistema não podem ser alteradas
}
