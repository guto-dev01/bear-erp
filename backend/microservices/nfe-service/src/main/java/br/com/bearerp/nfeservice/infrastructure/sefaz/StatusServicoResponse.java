package br.com.bearerp.nfeservice.infrastructure.sefaz;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StatusServicoResponse {
    private boolean online;
    private String codigoStatus;
    private String motivoStatus;
    private String tempoMedioResposta;
    private String previsaoRetorno;
    private String observacao;
}
