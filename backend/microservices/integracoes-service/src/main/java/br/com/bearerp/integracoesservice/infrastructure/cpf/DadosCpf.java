package br.com.bearerp.integracoesservice.infrastructure.cpf;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Dados normalizados de pessoa física retornados pela consulta de CPF.
 * Formato estável consumido pelo frontend, independente do schema do provedor.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class DadosCpf {
    private String cpf;
    private String nome;
    private String dataNascimento;     // ISO (aaaa-mm-dd) para casar com input[type=date]
    private String situacaoCadastral;
    private String dataInscricao;
    private String nomeMae;
    private String genero;
}
