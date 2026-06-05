package br.com.bearerp.tenant.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Getter
@Setter
@Builder
@Document(collection = "offices")
@CompoundIndex(name = "idx_tenant_nome", def = "{'tenantId': 1, 'nome': 1}", unique = true)
public class Office extends BaseDocument {

    private String nome;
    private String cnpj;
    private Endereco endereco;
    private String telefone;
    private String email;
    private String responsavelId;
}
