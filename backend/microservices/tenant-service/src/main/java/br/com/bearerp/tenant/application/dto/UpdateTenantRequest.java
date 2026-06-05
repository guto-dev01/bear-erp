package br.com.bearerp.tenant.application.dto;

import jakarta.validation.constraints.Email;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateTenantRequest {

    private String nome;
    private String razaoSocial;
    private String nomeFantasia;

    @Email(message = "Email inválido")
    private String email;

    private String telefone;
    private CreateTenantRequest.EnderecoDto endereco;
}
