package br.com.bearerp.integracoesservice.infrastructure.exception;

/** CPF/CNPJ com formato ou dígitos verificadores inválidos → HTTP 400. */
public class DocumentoInvalidoException extends RuntimeException {
    public DocumentoInvalidoException(String message) {
        super(message);
    }
}
