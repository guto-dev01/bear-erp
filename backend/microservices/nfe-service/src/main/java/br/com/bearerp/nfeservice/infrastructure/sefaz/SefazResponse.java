package br.com.bearerp.nfeservice.infrastructure.sefaz;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SefazResponse {
    private boolean sucesso;
    private String codigoStatus;    // cStat
    private String motivoStatus;    // xMotivo
    private String protocolo;       // nProt
    private String dataRecebimento; // dhRecbto
    private String xmlRetorno;
    private String chaveAcesso;
    private String digestValue;

    public boolean isAutorizada() {
        return "100".equals(codigoStatus);
    }

    public boolean isCancelada() {
        return "101".equals(codigoStatus) || "135".equals(codigoStatus);
    }

    public boolean isDenegada() {
        return "110".equals(codigoStatus) || "301".equals(codigoStatus) || "302".equals(codigoStatus);
    }
}
