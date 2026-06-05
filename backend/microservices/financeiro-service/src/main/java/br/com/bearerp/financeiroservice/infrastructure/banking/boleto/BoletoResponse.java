package br.com.bearerp.financeiroservice.infrastructure.banking.boleto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class BoletoResponse {
    private String nossoNumero;
    private String linhaDigitavel;
    private String codigoBarras;
    private String urlBoleto;
    private String urlPix;
    private BigDecimal valor;
    private LocalDate vencimento;
    private String status; // EMITIDO, PAGO, VENCIDO, CANCELADO
}
