package br.com.bearerp.nfseservice.infrastructure.providers;

import br.com.bearerp.nfseservice.domain.model.NotaFiscalServico;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Set;

@Slf4j
@Component
public class GinfesProvider implements NfseProvider {

    // Municípios que usam GINFES (São Paulo, Belo Horizonte, etc.)
    private static final Set<String> MUNICIPIOS = Set.of(
            "3550308", // São Paulo
            "3106200", // Belo Horizonte
            "2927408", // Salvador
            "2611606", // Recife
            "1302603", // Manaus
            "5300108", // Brasília
            "4106902", // Curitiba
            "2304400", // Fortaleza
            "1501402", // Belém
            "5208707"  // Goiânia
    );

    @Override
    public String getProviderName() {
        return "GINFES";
    }

    @Override
    public boolean suportaMunicipio(String codigoMunicipio) {
        return MUNICIPIOS.contains(codigoMunicipio);
    }

    @Override
    public NfseResponse emitirNfse(NotaFiscalServico nfse, String certPath, String certSenha) {
        log.info("GINFES: Emitindo NFS-e para município {}", nfse.getCodigoMunicipio());

        String xml = buildEnviarLoteRpsXml(nfse);

        // Em produção: enviar via SOAP para
        // https://producao.ginfes.com.br/ServiceGinfesImpl?wsdl (produção)
        // https://homologacao.ginfes.com.br/ServiceGinfesImpl?wsdl (homologação)

        // Simulação sandbox
        String numero = String.valueOf(System.currentTimeMillis() % 999999);
        String codVerificacao = "GINFES-" + numero;

        return new NfseResponse(true, numero, codVerificacao,
                "PROT-" + numero, xml, null,
                "https://ginfes.com.br/nfse/" + numero);
    }

    @Override
    public NfseResponse consultarNfse(String protocolo, String cnpj, String codMun,
                                       String certPath, String certSenha) {
        log.info("GINFES: Consultando NFS-e protocolo {}", protocolo);
        return new NfseResponse(true, null, null, protocolo,
                "<ConsultarNfseResposta/>", null, null);
    }

    @Override
    public NfseResponse cancelarNfse(String numero, String cnpj, String codMun,
                                      String motivo, String certPath, String certSenha) {
        log.info("GINFES: Cancelando NFS-e número {}", numero);
        return new NfseResponse(true, numero, null, null,
                "<CancelarNfseResposta/>", null, null);
    }

    @Override
    public NfseResponse consultarLoteRps(String protocolo, String cnpj, String codMun,
                                          String certPath, String certSenha) {
        return new NfseResponse(true, null, null, protocolo, null, null, null);
    }

    private String buildEnviarLoteRpsXml(NotaFiscalServico nfse) {
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <EnviarLoteRpsEnvio xmlns="http://www.ginfes.com.br/tipos_v03.xsd">
                  <LoteRps>
                    <NumeroLote>1</NumeroLote>
                    <Cnpj>%s</Cnpj>
                    <InscricaoMunicipal>%s</InscricaoMunicipal>
                    <QuantidadeRps>1</QuantidadeRps>
                    <ListaRps>
                      <Rps>
                        <InfRps>
                          <IdentificacaoRps>
                            <Numero>%d</Numero>
                            <Serie>%s</Serie>
                            <Tipo>1</Tipo>
                          </IdentificacaoRps>
                          <DataEmissao>%s</DataEmissao>
                          <NaturezaOperacao>1</NaturezaOperacao>
                          <OptanteSimplesNacional>1</OptanteSimplesNacional>
                          <IncentivadorCultural>2</IncentivadorCultural>
                          <Status>1</Status>
                          <Servico>
                            <Valores>
                              <ValorServicos>%.2f</ValorServicos>
                              <ValorDeducoes>%.2f</ValorDeducoes>
                              <AliquotaIss>%.4f</AliquotaIss>
                              <IssRetido>%d</IssRetido>
                            </Valores>
                            <ItemListaServico>%s</ItemListaServico>
                            <Discriminacao>%s</Discriminacao>
                            <CodigoMunicipio>%s</CodigoMunicipio>
                          </Servico>
                          <Prestador>
                            <Cnpj>%s</Cnpj>
                            <InscricaoMunicipal>%s</InscricaoMunicipal>
                          </Prestador>
                          <Tomador>
                            <IdentificacaoTomador>
                              <CpfCnpj><Cnpj>%s</Cnpj></CpfCnpj>
                            </IdentificacaoTomador>
                            <RazaoSocial>%s</RazaoSocial>
                          </Tomador>
                        </InfRps>
                      </Rps>
                    </ListaRps>
                  </LoteRps>
                </EnviarLoteRpsEnvio>
                """.formatted(
                nfse.getPrestador().getCnpj(),
                nfse.getPrestador().getInscricaoMunicipal(),
                nfse.getNumeroRps(),
                nfse.getSerieRps() != null ? nfse.getSerieRps() : "A",
                nfse.getDataEmissao(),
                nfse.getValorServico(),
                nfse.getValorDeducoes() != null ? nfse.getValorDeducoes() : java.math.BigDecimal.ZERO,
                nfse.getAliquotaIss(),
                nfse.isIssRetido() ? 1 : 2,
                nfse.getCodigoServico(),
                nfse.getDescricaoServico(),
                nfse.getCodigoMunicipio(),
                nfse.getPrestador().getCnpj(),
                nfse.getPrestador().getInscricaoMunicipal(),
                nfse.getTomador().getCpfCnpj(),
                nfse.getTomador().getRazaoSocial()
        );
    }
}
