package br.com.bearerp.nfeservice.infrastructure.sefaz;

public interface SefazService {
    SefazResponse autorizarNfe(String xmlNfe, String certificadoId);
    SefazResponse cancelarNfe(String chaveAcesso, String protocolo, String justificativa, String certificadoId);
    SefazResponse consultarNfe(String chaveAcesso, String certificadoId);
    SefazResponse inutilizarNumeracao(String cnpj, int serie, int numInicial, int numFinal, String justificativa, String certificadoId);
    StatusServicoResponse consultarStatusServico();
}
