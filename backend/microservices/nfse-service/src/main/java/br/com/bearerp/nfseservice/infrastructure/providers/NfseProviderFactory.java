package br.com.bearerp.nfseservice.infrastructure.providers;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class NfseProviderFactory {

    private final List<NfseProvider> providers;

    public NfseProvider getProvider(String codigoMunicipio) {
        return providers.stream()
                .filter(p -> p.suportaMunicipio(codigoMunicipio))
                .findFirst()
                .orElseThrow(() -> {
                    log.error("Nenhum provedor NFS-e encontrado para o município: {}", codigoMunicipio);
                    return new RuntimeException(
                            "Município " + codigoMunicipio + " não suportado. " +
                            "Provedores disponíveis: " + getProvedoresDisponiveis());
                });
    }

    public boolean isMunicipioSuportado(String codigoMunicipio) {
        return providers.stream().anyMatch(p -> p.suportaMunicipio(codigoMunicipio));
    }

    public String getProvedoresDisponiveis() {
        return providers.stream()
                .map(NfseProvider::getProviderName)
                .reduce((a, b) -> a + ", " + b)
                .orElse("Nenhum");
    }

    public List<String> getMunicipiosSuportados() {
        return providers.stream()
                .flatMap(p -> {
                    // Reflection ou método adicional para listar municípios por provider
                    return java.util.stream.Stream.of(p.getProviderName());
                })
                .toList();
    }
}
