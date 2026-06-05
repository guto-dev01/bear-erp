package br.com.bearerp.empresa.application.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
public class CreateEmpresaRequest {

    @NotBlank(message = "Razão Social é obrigatória")
    @Size(min = 3, max = 300)
    private String razaoSocial;

    private String nomeFantasia;

    @NotBlank(message = "CNPJ é obrigatório")
    private String cnpj;

    private String inscricaoEstadual;
    private String inscricaoMunicipal;

    @NotBlank(message = "CNAE é obrigatório")
    private String cnae;

    private List<String> cnaesSecundarios;

    @NotBlank(message = "Regime tributário é obrigatório")
    private String regimeTributario; // MEI, SIMPLES_NACIONAL, LUCRO_PRESUMIDO, LUCRO_REAL

    private String porte; // MEI, ME, EPP, MEDIO, GRANDE

    private EnderecoDto endereco;
    private String telefone;

    @Email(message = "Email inválido")
    private String email;

    private String site;
    private String responsavelContabil;
    private LocalDate dataAbertura;

    @Getter
    @Setter
    public static class EnderecoDto {
        private String logradouro;
        private String numero;
        private String complemento;
        private String bairro;
        private String cidade;
        private String estado;
        private String cep;
        private String codigoIbge;
    }
}
