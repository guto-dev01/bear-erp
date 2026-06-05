package br.com.bearerp.financeiroservice.infrastructure.banking.boleto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class BoletoRequest {
    private BigDecimal valor;
    private LocalDate vencimento;
    private String pagadorNome;
    private String pagadorCpfCnpj;
    private String pagadorEndereco;
    private String pagadorCidade;
    private String pagadorUf;
    private String pagadorCep;
    private String beneficiarioNome;
    private String beneficiarioCpfCnpj;
    private String descricao;
    private BigDecimal multaPercentual;
    private BigDecimal jurosPercentualMes;
    private int diasProtesto;
}
