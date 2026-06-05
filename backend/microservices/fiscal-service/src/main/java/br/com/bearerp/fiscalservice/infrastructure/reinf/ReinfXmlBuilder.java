package br.com.bearerp.fiscalservice.infrastructure.reinf;

import br.com.bearerp.fiscalservice.domain.model.EventoReinf;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

@Component
public class ReinfXmlBuilder {

    public String buildR1000(EventoReinf evento) {
        String idEvento = gerarIdEvento(evento);
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Reinf xmlns="http://www.reinf.esocial.gov.br/schemas/evtInfoContri/v2_01_02">
                  <evtInfoContri id="%s">
                    <ideEvento>
                      <tpAmb>2</tpAmb>
                      <procEmi>1</procEmi>
                      <verProc>BEAR_ERP_1.0</verProc>
                    </ideEvento>
                    <ideContri>
                      <tpInsc>1</tpInsc>
                      <nrInsc>%s</nrInsc>
                    </ideContri>
                    <infoContri>
                      <inclusao>
                        <idePeriodo>
                          <iniValid>%s</iniValid>
                        </idePeriodo>
                        <infoCadastro>
                          <classTrib>%s</classTrib>
                          <contato>
                            <nmCtt>Bear ERP</nmCtt>
                            <cpfCtt>00000000000</cpfCtt>
                            <foneFixo>0000000000</foneFixo>
                            <email>contato@bearerp.com.br</email>
                          </contato>
                        </infoCadastro>
                      </inclusao>
                    </infoContri>
                  </evtInfoContri>
                </Reinf>
                """.formatted(
                idEvento,
                evento.getCnpjContribuinte(),
                evento.getCompetencia(),
                evento.getClassificacaoTributaria()
        );
    }

    public String buildR2010(EventoReinf evento) {
        String idEvento = gerarIdEvento(evento);
        StringBuilder nfs = new StringBuilder();
        if (evento.getNotasFiscais() != null) {
            for (EventoReinf.NotaFiscalReinf nf : evento.getNotasFiscais()) {
                nfs.append("""
                            <nfs>
                              <serie>%s</serie>
                              <numDocto>%s</numDocto>
                              <dtEmissaoNF>%s</dtEmissaoNF>
                              <vlrBruto>%.2f</vlrBruto>
                              <vlrBaseRet>%.2f</vlrBaseRet>
                              <vlrRetencao>%.2f</vlrRetencao>
                              <vlrRetSub>0.00</vlrRetSub>
                              <vlrNRetPrinc>0.00</vlrNRetPrinc>
                              <vlrServicos15>0.00</vlrServicos15>
                              <vlrServicos20>0.00</vlrServicos20>
                              <vlrServicos25>0.00</vlrServicos25>
                              <vlrAdicional>0.00</vlrAdicional>
                              <vlrNRetAdwordc>0.00</vlrNRetAdwordc>
                            </nfs>
                        """.formatted(
                        nf.getSerie(), nf.getNumero(), nf.getDataEmissao(),
                        nf.getValorBruto(), nf.getValorBaseRetencao(), nf.getValorRetencao()
                ));
            }
        }

        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Reinf xmlns="http://www.reinf.esocial.gov.br/schemas/evtServTom/v2_01_02">
                  <evtServTom id="%s">
                    <ideEvento>
                      <indRetif>1</indRetif>
                      <perApur>%s</perApur>
                      <tpAmb>2</tpAmb>
                      <procEmi>1</procEmi>
                      <verProc>BEAR_ERP_1.0</verProc>
                    </ideEvento>
                    <ideContri>
                      <tpInsc>1</tpInsc>
                      <nrInsc>%s</nrInsc>
                    </ideContri>
                    <infoServTom>
                      <ideEstabObra>
                        <tpInscEstab>1</tpInscEstab>
                        <nrInscEstab>%s</nrInscEstab>
                        <idePrestServ>
                          <cnpjPrestador>%s</cnpjPrestador>
                          <vlrTotalBruto>%.2f</vlrTotalBruto>
                          <vlrTotalBaseRet>%.2f</vlrTotalBaseRet>
                          <vlrTotalRetPrinc>%.2f</vlrTotalRetPrinc>
                          <vlrTotalRetAdic>0.00</vlrTotalRetAdic>
                          <vlrTotalNRetPrinc>0.00</vlrTotalNRetPrinc>
                          <vlrTotalNRetAdic>0.00</vlrTotalNRetAdic>
                          %s
                        </idePrestServ>
                      </ideEstabObra>
                    </infoServTom>
                  </evtServTom>
                </Reinf>
                """.formatted(
                idEvento, evento.getCompetencia(),
                evento.getCnpjContribuinte(), evento.getCnpjContribuinte(),
                evento.getCnpjPrestador(),
                evento.getValorBrutoTotal(), evento.getValorBaseRetencao(), evento.getValorRetencao(),
                nfs.toString()
        );
    }

    public String buildR2020(EventoReinf evento) {
        // Similar ao R-2010, mas para serviços prestados
        String idEvento = gerarIdEvento(evento);
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Reinf xmlns="http://www.reinf.esocial.gov.br/schemas/evtServPrest/v2_01_02">
                  <evtServPrest id="%s">
                    <ideEvento>
                      <indRetif>1</indRetif>
                      <perApur>%s</perApur>
                      <tpAmb>2</tpAmb>
                      <procEmi>1</procEmi>
                      <verProc>BEAR_ERP_1.0</verProc>
                    </ideEvento>
                    <ideContri>
                      <tpInsc>1</tpInsc>
                      <nrInsc>%s</nrInsc>
                    </ideContri>
                    <infoServPrest>
                      <ideEstabPrest>
                        <tpInscEstabPrest>1</tpInscEstabPrest>
                        <nrInscEstabPrest>%s</nrInscEstabPrest>
                        <ideTomador>
                          <tpInscTomador>1</tpInscTomador>
                          <nrInscTomador>%s</nrInscTomador>
                          <vlrTotalBruto>%.2f</vlrTotalBruto>
                          <vlrTotalBaseRet>%.2f</vlrTotalBaseRet>
                          <vlrTotalRetPrinc>%.2f</vlrTotalRetPrinc>
                        </ideTomador>
                      </ideEstabPrest>
                    </infoServPrest>
                  </evtServPrest>
                </Reinf>
                """.formatted(
                idEvento, evento.getCompetencia(),
                evento.getCnpjContribuinte(), evento.getCnpjContribuinte(),
                evento.getCnpjPrestador(),
                evento.getValorBrutoTotal(), evento.getValorBaseRetencao(), evento.getValorRetencao()
        );
    }

    public String buildR2099(EventoReinf evento) {
        String idEvento = gerarIdEvento(evento);
        return """
                <?xml version="1.0" encoding="UTF-8"?>
                <Reinf xmlns="http://www.reinf.esocial.gov.br/schemas/evtFechaEvPer/v2_01_02">
                  <evtFechaEvPer id="%s">
                    <ideEvento>
                      <perApur>%s</perApur>
                      <tpAmb>2</tpAmb>
                      <procEmi>1</procEmi>
                      <verProc>BEAR_ERP_1.0</verProc>
                    </ideEvento>
                    <ideContri>
                      <tpInsc>1</tpInsc>
                      <nrInsc>%s</nrInsc>
                    </ideContri>
                    <ideRespInf>
                      <nmResp>Bear ERP</nmResp>
                      <cpfResp>00000000000</cpfResp>
                      <telefone>0000000000</telefone>
                      <email>contato@bearerp.com.br</email>
                    </ideRespInf>
                    <infoFech>
                      <evtServTm>S</evtServTm>
                      <evtServPr>S</evtServPr>
                      <evtAssDespRec>N</evtAssDespRec>
                      <evtAssDespRep>N</evtAssDespRep>
                      <evtComProd>N</evtComProd>
                      <evtCPRB>N</evtCPRB>
                      <evtAquis>N</evtAquis>
                    </infoFech>
                  </evtFechaEvPer>
                </Reinf>
                """.formatted(idEvento, evento.getCompetencia(), evento.getCnpjContribuinte());
    }

    private String gerarIdEvento(EventoReinf evento) {
        String tipo = evento.getTipoEvento().getCodigo().replace("-", "");
        return "ID" + evento.getCnpjContribuinte() + tipo +
               LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) +
               String.format("%05d", Math.abs(UUID.randomUUID().hashCode()) % 99999);
    }
}
