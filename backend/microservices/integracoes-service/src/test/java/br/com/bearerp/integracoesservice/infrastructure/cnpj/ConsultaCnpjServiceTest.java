package br.com.bearerp.integracoesservice.infrastructure.cnpj;

import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.integracoesservice.infrastructure.config.IntegracaoProperties;
import br.com.bearerp.integracoesservice.infrastructure.cnpj.ConsultaCnpjService.DadosCnpj;
import br.com.bearerp.integracoesservice.infrastructure.exception.DocumentoInvalidoException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ConsultaCnpjServiceTest {

    private static final String CNPJ_VALIDO = "11222333000181";

    private MockRestServiceServer server;
    private ConsultaCnpjService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        RestClient client = builder.build();

        IntegracaoProperties props = new IntegracaoProperties();
        props.getCnpj().setUrl("https://cnpj.test/api/cnpj/v1");

        service = new ConsultaCnpjService(client, props);
    }

    @Test
    void consulta_cnpjValido_mapeiaCamposDaBrasilApi() {
        String corpo = """
            {
              "cnpj": "11222333000181",
              "razao_social": "EMPRESA EXEMPLO LTDA",
              "nome_fantasia": "EXEMPLO",
              "descricao_situacao_cadastral": "ATIVA",
              "data_inicio_atividade": "2015-06-10",
              "descricao_tipo_de_logradouro": "RUA",
              "logradouro": "DAS FLORES",
              "numero": "100",
              "municipio": "SAO PAULO",
              "uf": "SP",
              "cep": "01001000",
              "ddd_telefone_1": "1130000000",
              "cnae_fiscal": "4711302",
              "cnae_fiscal_descricao": "Comercio varejista",
              "opcao_pelo_simples": true,
              "qsa": [ { "nome_socio": "JOAO DA SILVA", "qualificacao_socio": "Socio-Administrador" } ]
            }
            """;
        server.expect(requestTo("https://cnpj.test/api/cnpj/v1/11222333000181"))
                .andRespond(withSuccess(corpo, MediaType.APPLICATION_JSON));

        DadosCnpj dados = service.consultarCnpj("11.222.333/0001-81");

        assertThat(dados.getCnpj()).isEqualTo(CNPJ_VALIDO);
        assertThat(dados.getRazaoSocial()).isEqualTo("EMPRESA EXEMPLO LTDA");
        assertThat(dados.getNomeFantasia()).isEqualTo("EXEMPLO");
        assertThat(dados.getSituacao()).isEqualTo("ATIVA");
        assertThat(dados.isAtiva()).isTrue();
        assertThat(dados.getDataAbertura()).isEqualTo(LocalDate.of(2015, 6, 10));
        assertThat(dados.getLogradouro()).isEqualTo("RUA DAS FLORES");
        assertThat(dados.getCep()).isEqualTo("01001000");
        assertThat(dados.isOptanteSimplesNacional()).isTrue();
        assertThat(dados.getSocios()).hasSize(1);
        assertThat(dados.getSocios().get(0).getNome()).isEqualTo("JOAO DA SILVA");
        server.verify();
    }

    @Test
    void consulta_cnpjInvalido_naoChamaRede() {
        assertThatThrownBy(() -> service.consultarCnpj("123"))
                .isInstanceOf(DocumentoInvalidoException.class);
        server.verify();
    }

    @Test
    void consulta_brasilApi404_lancaNaoEncontrado() {
        server.expect(requestTo("https://cnpj.test/api/cnpj/v1/11222333000181"))
                .andRespond(withStatus(HttpStatus.NOT_FOUND));

        assertThatThrownBy(() -> service.consultarCnpj(CNPJ_VALIDO))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
