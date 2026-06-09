package br.com.bearerp.common.util;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CpfCnpjValidator")
class CpfCnpjValidatorTest {

    @Nested
    @DisplayName("CPF Validation")
    class CpfTests {

        @ParameterizedTest
        @ValueSource(strings = {
            "52998224725",     // CPF válido sem formatação
            "529.982.247-25",  // CPF válido com formatação
            "11144477735",
            "12345678909"
        })
        @DisplayName("deve aceitar CPFs válidos")
        void deveAceitarCpfsValidos(String cpf) {
            assertTrue(CpfCnpjValidator.isValidCpf(cpf));
        }

        @ParameterizedTest
        @ValueSource(strings = {
            "11111111111",  // todos dígitos iguais
            "00000000000",
            "12345678901",  // dígitos verificadores inválidos
            "123456789",    // menos de 11 dígitos
            "123456789012", // mais de 11 dígitos
            ""
        })
        @DisplayName("deve rejeitar CPFs inválidos")
        void deveRejeitarCpfsInvalidos(String cpf) {
            assertFalse(CpfCnpjValidator.isValidCpf(cpf));
        }

        @Test
        @DisplayName("deve remover caracteres não numéricos")
        void deveRemoverFormatacao() {
            assertTrue(CpfCnpjValidator.isValidCpf("529.982.247-25"));
        }
    }

    @Nested
    @DisplayName("CNPJ Validation")
    class CnpjTests {

        @ParameterizedTest
        @ValueSource(strings = {
            "11222333000181",       // CNPJ válido sem formatação
            "11.222.333/0001-81",   // CNPJ válido com formatação
            "11444777000161"
        })
        @DisplayName("deve aceitar CNPJs válidos")
        void deveAceitarCnpjsValidos(String cnpj) {
            assertTrue(CpfCnpjValidator.isValidCnpj(cnpj));
        }

        @ParameterizedTest
        @ValueSource(strings = {
            "11111111111111",  // todos dígitos iguais
            "00000000000000",
            "12345678000199",  // dígitos verificadores inválidos
            "1234567890",      // menos de 14 dígitos
            "123456789012345", // mais de 14 dígitos
            ""
        })
        @DisplayName("deve rejeitar CNPJs inválidos")
        void deveRejeitarCnpjsInvalidos(String cnpj) {
            assertFalse(CpfCnpjValidator.isValidCnpj(cnpj));
        }

        @Test
        @DisplayName("deve remover caracteres não numéricos")
        void deveRemoverFormatacao() {
            assertTrue(CpfCnpjValidator.isValidCnpj("11.222.333/0001-81"));
        }
    }
}
