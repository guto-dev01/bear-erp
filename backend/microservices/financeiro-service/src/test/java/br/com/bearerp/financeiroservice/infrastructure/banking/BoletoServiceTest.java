package br.com.bearerp.financeiroservice.infrastructure.banking;

import br.com.bearerp.financeiroservice.infrastructure.banking.boleto.BoletoRequest;
import br.com.bearerp.financeiroservice.infrastructure.banking.boleto.BoletoResponse;
import br.com.bearerp.financeiroservice.infrastructure.banking.boleto.BoletoService;
import br.com.bearerp.financeiroservice.infrastructure.banking.BankingConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("BoletoService")
class BoletoServiceTest {

    @Mock private BankingConfig config;

    @InjectMocks private BoletoService boletoService;

    private BankingConfig.Boleto boletoConfig = new BankingConfig.Boleto();

    @BeforeEach
    void setUp() {
        boletoConfig = new BankingConfig.Boleto();
        boletoConfig.setSandbox(true);
    }

    @Test
    @DisplayName("deve gerar boleto em modo sandbox")
    void deveGerarBoletoSandbox() {
        when(config.getBoleto()).thenReturn(boletoConfig);

        BoletoRequest request = BoletoRequest.builder()
                .valor(new BigDecimal("1500.00"))
                .vencimento(LocalDate.of(2024, 12, 31))
                .pagadorNome("Cliente Teste")
                .pagadorCpfCnpj("52998224725")
                .descricao("Parcela 1/12")
                .build();

        BoletoResponse response = boletoService.gerarBoleto(request);

        assertNotNull(response);
        assertNotNull(response.getNossoNumero());
        assertEquals("EMITIDO", response.getStatus());
        assertEquals(new BigDecimal("1500.00"), response.getValor());
        assertEquals(LocalDate.of(2024, 12, 31), response.getVencimento());
        assertNotNull(response.getCodigoBarras());
        assertNotNull(response.getLinhaDigitavel());
        assertTrue(response.getUrlBoleto().contains("sandbox"));
    }

    @Test
    @DisplayName("deve consultar boleto em sandbox")
    void deveConsultarBoletoSandbox() {
        when(config.getBoleto()).thenReturn(boletoConfig);

        BoletoResponse response = boletoService.consultarBoleto("00012345678");

        assertNotNull(response);
        assertEquals("00012345678", response.getNossoNumero());
        assertEquals("EMITIDO", response.getStatus());
    }

    @Test
    @DisplayName("deve lançar exceção em modo produção sem credenciais")
    void deveLancarExcecaoProducao() {
        boletoConfig.setSandbox(false);
        when(config.getBoleto()).thenReturn(boletoConfig);

        BoletoRequest request = BoletoRequest.builder()
                .valor(new BigDecimal("100.00"))
                .vencimento(LocalDate.of(2024, 12, 31))
                .build();

        assertThrows(UnsupportedOperationException.class,
                () -> boletoService.gerarBoleto(request));
    }
}
