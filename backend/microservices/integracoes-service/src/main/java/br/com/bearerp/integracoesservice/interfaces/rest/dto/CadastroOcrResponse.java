package br.com.bearerp.integracoesservice.interfaces.rest.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * Resultado normalizado do OCR de um documento de cadastro.
 *
 * <p>Os campos já vêm com máscara aplicada (CPF, CNPJ, CEP, telefone, datas) prontos para
 * preencher o formulário. {@code confidence} vai de 0 a 100; abaixo de 85 o frontend deve
 * destacar os campos listados em {@code camposComBaixaConfianca} para revisão manual.</p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CadastroOcrResponse {

    // ── Pessoa Física ──
    private String nomeCompleto;
    private String cpf;
    private String rg;
    private String dataNascimento;   // dd/MM/yyyy
    private String nomeMae;
    private String nomePai;

    // ── Endereço (comprovante / sede) ──
    private String cep;
    private String logradouro;
    private String numero;
    private String bairro;
    private String cidade;
    private String estado;           // UF

    // ── Pessoa Jurídica ──
    private String cnpj;
    private String razaoSocial;
    private String nomeFantasia;
    private String dataAbertura;     // dd/MM/yyyy
    private String naturezaJuridica;
    private String cnaePrincipal;
    private String capitalSocial;

    @Builder.Default
    private List<SocioDto> socios = new ArrayList<>();

    // ── Metadados de qualidade ──
    /** Confiança agregada da extração, de 0 a 100. */
    private int confidence;

    /** Campos cuja extração foi duvidosa (não encontrados ou que falharam na validação). */
    @Builder.Default
    private List<String> camposComBaixaConfianca = new ArrayList<>();

    /** Avisos não-bloqueantes (ex.: "CNH vencida em 12/03/2024"). */
    @Builder.Default
    private List<String> avisos = new ArrayList<>();

    /** true quando o OCR falhou e o frontend deve cair para preenchimento manual. */
    @Builder.Default
    private boolean preenchimentoManual = false;

    /** Mensagem amigável quando {@code preenchimentoManual} é true. */
    private String mensagem;

    public void marcarBaixaConfianca(String campo) {
        if (campo != null && !camposComBaixaConfianca.contains(campo)) {
            camposComBaixaConfianca.add(campo);
        }
    }

    public void addAviso(String aviso) {
        if (aviso != null && !avisos.contains(aviso)) {
            avisos.add(aviso);
        }
    }
}
