package br.com.bearerp.nfseservice.infrastructure.providers;

import br.com.bearerp.nfseservice.domain.model.NotaFiscalServico;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Set;

@Slf4j
@Component
public class BethaProvider implements NfseProvider {

    // Municípios do Sul/SC que usam Betha
    private static final Set<String> MUNICIPIOS = Set.of(
            "4205407", // Florianópolis
            "4209102", // Joinville
            "4202404", // Blumenau
            "4204202", // Criciúma
            "4208203", // Itajaí
            "4205902", // Gaspar
            "4201307", // Balneário Camboriú
            "4204808"  // Chapecó
    );

    @Override
    public String getProviderName() {
        return "BETHA";
    }

    @Override
    public boolean suportaMunicipio(String codigoMunicipio) {
        return MUNICIPIOS.contains(codigoMunicipio);
    }

    @Override
    public NfseResponse emitirNfse(NotaFiscalServico nfse, String certPath, String certSenha) {
        log.info("BETHA: Emitindo NFS-e para município {}", nfse.getCodigoMunicipio());
        // URL: https://e-gov.betha.com.br/e-nota-contribuinte-ws/nfseWS?wsdl
        String numero = String.valueOf(System.currentTimeMillis() % 999999);
        return new NfseResponse(true, numero, "BETHA-" + numero,
                "BETHA-PROT-" + numero, "<xml/>", null, null);
    }

    @Override
    public NfseResponse consultarNfse(String protocolo, String cnpj, String codMun,
                                       String certPath, String certSenha) {
        return new NfseResponse(true, null, null, protocolo, null, null, null);
    }

    @Override
    public NfseResponse cancelarNfse(String numero, String cnpj, String codMun,
                                      String motivo, String certPath, String certSenha) {
        return new NfseResponse(true, numero, null, null, null, null, null);
    }

    @Override
    public NfseResponse consultarLoteRps(String protocolo, String cnpj, String codMun,
                                          String certPath, String certSenha) {
        return new NfseResponse(true, null, null, protocolo, null, null, null);
    }
}
