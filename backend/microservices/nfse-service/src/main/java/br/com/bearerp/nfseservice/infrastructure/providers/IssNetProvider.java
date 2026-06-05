package br.com.bearerp.nfseservice.infrastructure.providers;

import br.com.bearerp.nfseservice.domain.model.NotaFiscalServico;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Set;

@Slf4j
@Component
public class IssNetProvider implements NfseProvider {

    private static final Set<String> MUNICIPIOS = Set.of(
            "3304557", // Rio de Janeiro
            "3301702", // Duque de Caxias
            "3303500", // Niterói
            "3303302", // Nova Iguaçu
            "3304904", // São Gonçalo
            "2507507", // João Pessoa
            "2408102", // Natal
            "2800308"  // Aracaju
    );

    @Override
    public String getProviderName() { return "ISSNET"; }

    @Override
    public boolean suportaMunicipio(String codigoMunicipio) { return MUNICIPIOS.contains(codigoMunicipio); }

    @Override
    public NfseResponse emitirNfse(NotaFiscalServico nfse, String certPath, String certSenha) {
        log.info("ISSNET: Emitindo NFS-e para município {}", nfse.getCodigoMunicipio());
        String numero = String.valueOf(System.currentTimeMillis() % 999999);
        return new NfseResponse(true, numero, "ISSNET-" + numero,
                "ISSNET-PROT-" + numero, "<xml/>", null, null);
    }

    @Override
    public NfseResponse consultarNfse(String protocolo, String cnpj, String codMun, String certPath, String certSenha) {
        return new NfseResponse(true, null, null, protocolo, null, null, null);
    }

    @Override
    public NfseResponse cancelarNfse(String numero, String cnpj, String codMun, String motivo, String certPath, String certSenha) {
        return new NfseResponse(true, numero, null, null, null, null, null);
    }

    @Override
    public NfseResponse consultarLoteRps(String protocolo, String cnpj, String codMun, String certPath, String certSenha) {
        return new NfseResponse(true, null, null, protocolo, null, null, null);
    }
}
