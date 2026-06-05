package br.com.bearerp.financeiroservice.infrastructure.banking.boleto;

import br.com.bearerp.financeiroservice.infrastructure.banking.BankingConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BoletoService {

    private final BankingConfig config;

    public BoletoResponse gerarBoleto(BoletoRequest request) {
        String nossoNumero = gerarNossoNumero();
        log.info("Gerando boleto: nossoNumero={}, valor={}, vencimento={}", nossoNumero, request.getValor(), request.getVencimento());

        if (config.getBoleto().isSandbox()) {
            String codigoBarras = gerarCodigoBarras(nossoNumero, request);
            return BoletoResponse.builder()
                    .nossoNumero(nossoNumero)
                    .linhaDigitavel(formatarLinhaDigitavel(codigoBarras))
                    .codigoBarras(codigoBarras)
                    .urlBoleto("https://sandbox.bearerp.com.br/boleto/" + nossoNumero)
                    .urlPix("https://sandbox.bearerp.com.br/boleto/" + nossoNumero + "/pix")
                    .valor(request.getValor())
                    .vencimento(request.getVencimento())
                    .status("EMITIDO")
                    .build();
        }

        // Produção: chamar API do banco (Inter, Itaú, BB, Bradesco, etc.)
        throw new UnsupportedOperationException("Integração bancária de produção requer credenciais do banco");
    }

    public BoletoResponse consultarBoleto(String nossoNumero) {
        log.info("Consultando boleto: {}", nossoNumero);
        if (config.getBoleto().isSandbox()) {
            return BoletoResponse.builder().nossoNumero(nossoNumero).status("EMITIDO").build();
        }
        throw new UnsupportedOperationException("Consulta de produção não configurada");
    }

    public void cancelarBoleto(String nossoNumero) {
        log.info("Cancelando boleto: {}", nossoNumero);
    }

    public List<BoletoResponse> listarBoletos(String dataInicio, String dataFim) {
        log.info("Listando boletos de {} a {}", dataInicio, dataFim);
        return List.of();
    }

    private String gerarNossoNumero() {
        return String.format("%011d", Math.abs(UUID.randomUUID().hashCode()) % 99999999999L);
    }

    private String gerarCodigoBarras(String nossoNumero, BoletoRequest req) {
        // Simplificado - código de barras real tem 44 dígitos
        return String.format("23793.%s %s.%s %s.%s %s %s",
                nossoNumero.substring(0, 5), nossoNumero.substring(5, 10),
                "00000", "00000", "00000", "0", "1" +
                req.getVencimento().toString().replace("-", "") +
                String.format("%010d", req.getValor().movePointRight(2).longValue()));
    }

    private String formatarLinhaDigitavel(String codigoBarras) {
        return codigoBarras.replaceAll("[^0-9]", "");
    }
}
