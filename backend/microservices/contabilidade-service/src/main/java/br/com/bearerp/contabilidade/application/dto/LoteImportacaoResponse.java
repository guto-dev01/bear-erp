package br.com.bearerp.contabilidade.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data @Builder
public class LoteImportacaoResponse {
    private String id;
    private String descricao;
    private String origemTipo;
    private String nomeArquivo;
    private int totalRegistros;
    private int registrosImportados;
    private int registrosComErro;
    private String status;
    private List<String> erros;
    private Instant dataProcessamento;
}
