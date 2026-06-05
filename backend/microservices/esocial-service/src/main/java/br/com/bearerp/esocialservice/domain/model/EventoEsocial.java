package br.com.bearerp.esocialservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "eventos_esocial")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_tipo_status", def = "{'tenantId': 1, 'empresaId': 1, 'tipoEvento': 1, 'status': 1}")
})
public class EventoEsocial extends BaseDocument {
    private TipoEvento tipoEvento;
    private GrupoEvento grupo;
    private String funcionarioId;
    private String funcionarioCpf;
    private String funcionarioNome;
    private String competencia; // YYYY-MM
    private String xmlEnvio;
    private String xmlRetorno;
    private String protocoloEnvio;
    private String reciboEntrega;
    private StatusEvento status;
    private LocalDateTime dataEnvio;
    private LocalDateTime dataRetorno;
    private String erroDescricao;
    private String observacao;

    public enum TipoEvento {
        // Tabelas
        S1000_EMPREGADOR, S1005_ESTABELECIMENTOS, S1010_RUBRICAS,
        S1020_LOTACOES, S1070_PROCESSOS,
        // Não periódicos
        S2190_REGISTRO_PRELIMINAR, S2200_ADMISSAO, S2205_ALTERACAO_DADOS,
        S2206_ALTERACAO_CONTRATO, S2210_CAT, S2220_ASO,
        S2230_AFASTAMENTO, S2299_DESLIGAMENTO, S2300_TSVE_INICIO,
        S2399_TSVE_TERMINO, S2400_CDP,
        // Periódicos
        S1200_REMUNERACAO, S1202_REMUNERACAO_RPPS, S1207_BENEFICIOS,
        S1210_PAGAMENTOS, S1260_COMERCIALIZACAO, S1270_CONTRATACAO_AVULSOS,
        S1280_INFO_COMPLEMENTARES, S1298_REABERTURA, S1299_FECHAMENTO
    }

    public enum GrupoEvento { TABELAS, NAO_PERIODICOS, PERIODICOS }

    public enum StatusEvento {
        RASCUNHO, VALIDADO, ENVIADO, PROCESSADO, ACEITO, REJEITADO, CANCELADO
    }
}
