package br.com.bearerp.nfseservice.infrastructure.providers;

import br.com.bearerp.nfseservice.domain.model.NotaFiscalServico;

public interface NfseProvider {

    String getProviderName();

    boolean suportaMunicipio(String codigoMunicipio);

    NfseResponse emitirNfse(NotaFiscalServico nfse, String certificadoPath, String certificadoSenha);

    NfseResponse consultarNfse(String protocolo, String cnpjPrestador, String codigoMunicipio,
                                String certificadoPath, String certificadoSenha);

    NfseResponse cancelarNfse(String numero, String cnpjPrestador, String codigoMunicipio,
                               String motivo, String certificadoPath, String certificadoSenha);

    NfseResponse consultarLoteRps(String protocolo, String cnpjPrestador, String codigoMunicipio,
                                   String certificadoPath, String certificadoSenha);

    record NfseResponse(
            boolean sucesso,
            String numero,
            String codigoVerificacao,
            String protocolo,
            String xmlRetorno,
            String mensagemErro,
            String linkImpressao
    ) {}
}
