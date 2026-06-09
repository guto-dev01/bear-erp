package br.com.bearerp.integracoesservice.infrastructure.cpf;

import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.integracoesservice.infrastructure.config.IntegracaoProperties;
import br.com.bearerp.integracoesservice.infrastructure.exception.DocumentoInvalidoException;
import br.com.bearerp.integracoesservice.infrastructure.exception.ProvedorExternoException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ConsultaCpfServiceTest {

    private static final String CPF_VALIDO = "11144477735";

    private MockRestServiceServer server;
    private ConsultaCpfService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        RestClient client = builder.build();

        IntegracaoProperties props = new IntegracaoProperties();
        props.getHub().setCpfUrl("https://hub.test/v2/cpf/");
        props.getHub().setCpfToken("tok123");

        service = new ConsultaCpfService(client, props);
    }

    @Test
    void consulta_cpfValido_normalizaResultadoEConverteData() {
        String corpo = """
            { "status": true, "return": "OK", "result": {
                "numero_de_cpf": "111.444.777-35",
                "nome_da_pf": "FULANO DE TAL",
                "data_nascimento": "15/05/1990",
                "situacao_cadastral": "REGULAR" } }
            """;
        server.expect(requestTo(containsString("cpf=11144477735")))
                .andExpect(requestTo(containsString("token=tok123")))
                .andRespond(withSuccess(corpo, MediaType.APPLICATION_JSON));

        DadosCpf dados = service.consultar("111.444.777-35", "1990-05-15");

        assertThat(dados.getCpf()).isEqualTo(CPF_VALIDO);
        assertThat(dados.getNome()).isEqualTo("FULANO DE TAL");
        assertThat(dados.getDataNascimento()).isEqualTo("1990-05-15"); // dd/mm/aaaa → ISO
        assertThat(dados.getSituacaoCadastral()).isEqualTo("REGULAR");
        server.verify();
    }

    @Test
    void consulta_enviaDataNoFormatoBr() {
        // '/' é permitido na query (RFC 3986), então não é percent-encoded — Hub espera dd/mm/aaaa.
        server.expect(requestTo(containsString("data=15/05/1990")))
                .andRespond(withSuccess("{\"status\":true,\"result\":{\"nome_da_pf\":\"X\"}}", MediaType.APPLICATION_JSON));

        service.consultar(CPF_VALIDO, "1990-05-15");
        server.verify();
    }

    @Test
    void consulta_retornoNok_lancaNaoEncontrado() {
        server.expect(requestTo(containsString("cpf=11144477735")))
                .andRespond(withSuccess("{\"status\":false,\"return\":\"NOK\",\"message\":\"CPF não localizado\"}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> service.consultar(CPF_VALIDO, null))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining("não localizado");
    }

    @Test
    void consulta_cpfInvalido_naoChamaRede() {
        assertThatThrownBy(() -> service.consultar("12345678900", null))
                .isInstanceOf(DocumentoInvalidoException.class);
        // nenhuma expectativa registrada → verify confirma que não houve chamada
        server.verify();
    }

    @Test
    void consulta_semToken_lancaProvedorExterno() {
        IntegracaoProperties props = new IntegracaoProperties();
        props.getHub().setCpfToken("");
        ConsultaCpfService semToken = new ConsultaCpfService(RestClient.builder().build(), props);

        assertThatThrownBy(() -> semToken.consultar(CPF_VALIDO, null))
                .isInstanceOf(ProvedorExternoException.class);
    }
}
