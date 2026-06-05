package br.com.bearerp.nfeservice.infrastructure.sefaz;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "sefaz")
public class SefazConfig {
    private String ambiente = "HOMOLOGACAO";
    private String uf = "SP";
    private int versao = 400;
    private int timeout = 30000;
    private String certificadoPath;
    private String certificadoSenha;

    private Urls urls = new Urls();

    @Data
    public static class Urls {
        private String autorizacaoHomologacao = "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx";
        private String autorizacaoProducao = "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx";
        private String consultaHomologacao = "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx";
        private String consultaProducao = "https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx";
        private String statusHomologacao = "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx";
        private String statusProducao = "https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx";
        private String eventoHomologacao = "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx";
        private String eventoProducao = "https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx";
    }

    public boolean isProducao() {
        return "PRODUCAO".equalsIgnoreCase(ambiente);
    }

    public String getUrlAutorizacao() {
        return isProducao() ? urls.autorizacaoProducao : urls.autorizacaoHomologacao;
    }

    public String getUrlConsulta() {
        return isProducao() ? urls.consultaProducao : urls.consultaHomologacao;
    }

    public String getUrlStatus() {
        return isProducao() ? urls.statusProducao : urls.statusHomologacao;
    }

    public String getUrlEvento() {
        return isProducao() ? urls.eventoProducao : urls.eventoHomologacao;
    }
}
