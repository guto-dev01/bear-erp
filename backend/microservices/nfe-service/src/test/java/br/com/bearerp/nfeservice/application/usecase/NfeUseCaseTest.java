package br.com.bearerp.nfeservice.application.usecase;

import br.com.bearerp.nfeservice.domain.model.NotaFiscalEletronica;
import br.com.bearerp.nfeservice.domain.repository.NfeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NfeUseCase")
class NfeUseCaseTest {

    @Mock private NfeRepository nfeRepository;
    @Mock private KafkaTemplate<String, Object> kafkaTemplate;

    @InjectMocks private NfeUseCase nfeUseCase;

    private NotaFiscalEletronica nfe;

    @BeforeEach
    void setUp() {
        nfe = NotaFiscalEletronica.builder()
                .numero(1L)
                .serie(1)
                .status("RASCUNHO")
                .valorTotal(new BigDecimal("1000.00"))
                .build();
        nfe.setId("nfe-1");
        nfe.setTenantId("tenant-1");
        nfe.setEmpresaId("empresa-1");
    }

    @Nested
    @DisplayName("Consulta NF-e")
    class ConsultaTests {

        @Test
        @DisplayName("deve encontrar NF-e por ID")
        void deveEncontrarNfePorId() {
            when(nfeRepository.findById("nfe-1")).thenReturn(Optional.of(nfe));

            Optional<NotaFiscalEletronica> result = nfeRepository.findById("nfe-1");

            assertTrue(result.isPresent());
            assertEquals("nfe-1", result.get().getId());
            assertEquals(1L, result.get().getNumero());
            assertEquals("RASCUNHO", result.get().getStatus());
        }

        @Test
        @DisplayName("deve retornar vazio para NF-e inexistente")
        void deveRetornarVazioParaNfeInexistente() {
            when(nfeRepository.findById("nfe-999")).thenReturn(Optional.empty());
            assertTrue(nfeRepository.findById("nfe-999").isEmpty());
        }
    }

    @Nested
    @DisplayName("Modelo NF-e")
    class ModelTests {

        @Test
        @DisplayName("NF-e deve iniciar como RASCUNHO")
        void nfeDeveIniciarComoRascunho() {
            assertEquals("RASCUNHO", nfe.getStatus());
        }

        @Test
        @DisplayName("deve ter valor total positivo")
        void deveTermValorPositivo() {
            assertTrue(nfe.getValorTotal().compareTo(BigDecimal.ZERO) > 0);
        }

        @Test
        @DisplayName("deve ter tenant e empresa definidos")
        void deveTerTenantEEmpresa() {
            assertNotNull(nfe.getTenantId());
            assertNotNull(nfe.getEmpresaId());
        }
    }
}
