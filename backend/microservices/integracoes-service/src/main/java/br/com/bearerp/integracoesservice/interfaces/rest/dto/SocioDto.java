package br.com.bearerp.integracoesservice.interfaces.rest.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Sócio extraído de um contrato social (Pessoa Jurídica).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class SocioDto {
    private String nome;
    private String cpf;
    /** Percentual de participação no capital social, quando identificável (ex.: "50%"). */
    private String participacao;
}
