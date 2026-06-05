package br.com.bearerp.financeiroservice.infrastructure.banking.pix;

import br.com.bearerp.financeiroservice.infrastructure.banking.BankingConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PixService {

    private final BankingConfig config;

    public PixCobranca criarCobrancaImediata(BigDecimal valor, String descricao, String cpfCnpjPagador) {
        String txid = gerarTxid();
        log.info("Criando cobrança PIX imediata: txid={}, valor={}", txid, valor);

        if (config.getPix().isSandbox()) {
            return PixCobranca.builder()
                    .txid(txid)
                    .status("ATIVA")
                    .valor(valor)
                    .descricao(descricao)
                    .chave(config.getPix().getChave())
                    .cpfCnpjPagador(cpfCnpjPagador)
                    .pixCopiaECola(gerarPayloadPix(txid, valor, descricao))
                    .qrCode("data:image/png;base64,SANDBOX_QR_" + txid)
                    .criadoEm(Instant.now())
                    .build();
        }

        // Produção: chamada real à API PIX do banco
        return callPixApi("/cob/" + txid, "PUT", valor, descricao, cpfCnpjPagador);
    }

    public PixCobranca criarCobrancaDueDate(BigDecimal valor, String descricao, LocalDate vencimento, String cpfCnpjPagador) {
        String txid = gerarTxid();
        log.info("Criando cobrança PIX com vencimento: txid={}, vencimento={}", txid, vencimento);

        if (config.getPix().isSandbox()) {
            return PixCobranca.builder()
                    .txid(txid).status("ATIVA").valor(valor).descricao(descricao)
                    .chave(config.getPix().getChave()).vencimento(vencimento)
                    .cpfCnpjPagador(cpfCnpjPagador)
                    .pixCopiaECola(gerarPayloadPix(txid, valor, descricao))
                    .qrCode("data:image/png;base64,SANDBOX_QR_" + txid)
                    .criadoEm(Instant.now()).build();
        }

        return callPixApi("/cobv/" + txid, "PUT", valor, descricao, cpfCnpjPagador);
    }

    public PixCobranca consultarCobranca(String txid) {
        log.info("Consultando cobrança PIX: {}", txid);
        if (config.getPix().isSandbox()) {
            return PixCobranca.builder().txid(txid).status("ATIVA").build();
        }
        return callPixApi("/cob/" + txid, "GET", null, null, null);
    }

    public List<PixCobranca> listarPixRecebidos(Instant inicio, Instant fim) {
        log.info("Listando PIX recebidos de {} a {}", inicio, fim);
        if (config.getPix().isSandbox()) {
            return List.of();
        }
        return List.of(); // Produção: GET /pix?inicio=&fim=
    }

    private PixCobranca callPixApi(String path, String method, BigDecimal valor, String desc, String cpfCnpj) {
        // Em produção, usar RestTemplate/WebClient com certificado mTLS
        // para chamar a API PIX conforme especificação BACEN
        throw new UnsupportedOperationException("API PIX de produção requer configuração do PSP (banco)");
    }

    private String gerarTxid() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 26);
    }

    private String gerarPayloadPix(String txid, BigDecimal valor, String descricao) {
        // Payload EMV simplificado - em produção usar a lib br-code
        return String.format("00020126580014br.gov.bcb.pix0136%s5204000053039865802BR5913Bear ERP6008Sao Paulo62070503***6304",
                config.getPix().getChave() != null ? config.getPix().getChave() : "chave-pix-sandbox");
    }
}
