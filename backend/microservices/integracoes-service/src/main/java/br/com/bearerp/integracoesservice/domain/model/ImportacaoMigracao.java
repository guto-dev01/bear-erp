package br.com.bearerp.integracoesservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "importacoes_migracao")
@CompoundIndex(name = "idx_tenant_status", def = "{'tenantId': 1, 'status': 1}")
public class ImportacaoMigracao extends BaseDocument {

    private String sistemaOrigem; // DOMINIO, FORTES, ALTERDATA, CONTMATIC, GENERICO
    private TipoImportacao tipo;
    private StatusImportacao status;
    private String nomeArquivo;
    private String formatoArquivo; // CSV, XML, TXT, SPED, XLSX
    private long tamanhoBytes;

    // Progresso
    private int totalRegistros;
    private int registrosImportados;
    private int registrosComErro;
    private int registrosIgnorados;
    private double percentualConcluido;

    // Mapeamento
    private Map<String, String> mapeamentoCampos;
    private Map<String, String> mapeamentoContas; // conta_origem -> conta_destino

    // Log
    private List<LogImportacao> logs;
    private Instant iniciadoEm;
    private Instant finalizadoEm;

    // Configuração
    private boolean sobrescreverExistentes;
    private boolean validarAntesDeImportar;
    private String competenciaInicio; // YYYY-MM
    private String competenciaFim;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class LogImportacao {
        private int linha;
        private String campo;
        private String valorOriginal;
        private String mensagem;
        private NivelLog nivel;
    }

    public enum TipoImportacao {
        PLANO_CONTAS, SALDOS_CONTABEIS, LANCAMENTOS_CONTABEIS,
        CADASTRO_EMPRESAS, CLIENTES, FORNECEDORES, PRODUTOS,
        FUNCIONARIOS, HISTORICO_COMPLETO
    }

    public enum StatusImportacao {
        PENDENTE, VALIDANDO, MAPEANDO, IMPORTANDO, CONCLUIDA, CONCLUIDA_COM_ERROS, FALHA, CANCELADA
    }

    public enum NivelLog { INFO, AVISO, ERRO }
}
