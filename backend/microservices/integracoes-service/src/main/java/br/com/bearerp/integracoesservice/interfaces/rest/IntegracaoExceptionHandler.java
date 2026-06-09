package br.com.bearerp.integracoesservice.interfaces.rest;

import br.com.bearerp.common.dto.ApiError;
import br.com.bearerp.integracoesservice.infrastructure.exception.DocumentoInvalidoException;
import br.com.bearerp.integracoesservice.infrastructure.exception.ProvedorExternoException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;

/**
 * Mapeia as exceções das integrações para os códigos HTTP corretos.
 *
 * Complementa o {@code GlobalExceptionHandler} do common-lib (que cobre
 * ResourceNotFoundException→404, BusinessException→422, Exception→500). Como o
 * Spring escolhe o handler pela especificidade do tipo da exceção, estes
 * handlers específicos têm prioridade sobre o catch-all genérico.
 */
@RestControllerAdvice
public class IntegracaoExceptionHandler {

    @ExceptionHandler(DocumentoInvalidoException.class)
    public ResponseEntity<ApiError> handleDocumentoInvalido(DocumentoInvalidoException ex) {
        var error = new ApiError("DOCUMENTO_INVALIDO", ex.getMessage(), HttpStatus.BAD_REQUEST.value(), Instant.now());
        return ResponseEntity.badRequest().body(error);
    }

    @ExceptionHandler(ProvedorExternoException.class)
    public ResponseEntity<ApiError> handleProvedorExterno(ProvedorExternoException ex) {
        var error = new ApiError("PROVEDOR_EXTERNO", ex.getMessage(), HttpStatus.BAD_GATEWAY.value(), Instant.now());
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error);
    }
}
