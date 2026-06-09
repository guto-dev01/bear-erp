package br.com.bearerp.integracoesservice.infrastructure.exception;

/** Falha ao falar com um provedor externo (Hub, BrasilAPI) → HTTP 502. */
public class ProvedorExternoException extends RuntimeException {
    public ProvedorExternoException(String message) {
        super(message);
    }
}
