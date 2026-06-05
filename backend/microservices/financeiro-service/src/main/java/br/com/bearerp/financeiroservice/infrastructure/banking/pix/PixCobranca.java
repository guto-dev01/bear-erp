package br.com.bearerp.financeiroservice.infrastructure.banking.pix;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
public class PixCobranca {
    private String txid;
    private String status; // ATIVA, CONCLUIDA, REMOVIDA_PELO_USUARIO_RECEBEDOR, REMOVIDA_PELO_PSP
    private BigDecimal valor;
    private String descricao;
    private String qrCode;        // Base64 PNG
    private String pixCopiaECola; // Payload EMV
    private String chave;
    private LocalDate vencimento;
    private String cpfCnpjPagador;
    private String nomePagador;
    private Instant criadoEm;
}
