package br.com.bearerp.contabilidade.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "lotes_importacao")
@CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}")
public class LoteImportacao extends BaseDocument {

    private String descricao;
    private OrigemImportacao origemTipo;
    private String nomeArquivo;
    private int totalRegistros;
    private int registrosImportados;
    private int registrosComErro;
    private StatusImportacao status;
    private List<String> erros;
    private Instant dataProcessamento;

    public enum OrigemImportacao { EXCEL, CSV, OFX, SISTEMA }
    public enum StatusImportacao { PROCESSANDO, CONCLUIDO, CONCLUIDO_COM_ERROS, ERRO }
}
