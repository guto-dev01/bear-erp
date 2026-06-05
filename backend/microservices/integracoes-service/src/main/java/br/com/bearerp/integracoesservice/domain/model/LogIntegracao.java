package br.com.bearerp.integracoesservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "logs_integracao")
@CompoundIndex(name = "idx_integracao_data", def = "{'integracaoId': 1, 'dataExecucao': -1}")
public class LogIntegracao extends BaseDocument {

    public enum StatusLog { SUCESSO, FALHA, PARCIAL }
    public enum DirecaoLog { IMPORTACAO, EXPORTACAO, SINCRONIZACAO }

    private String integracaoId;
    private StatusLog status;
    private DirecaoLog direcao;
    private Instant dataExecucao;
    private int registrosProcessados;
    private int registrosComErro;
    private long tempoExecucaoMs;
    private String mensagem;
    private String detalhesErro;
}
