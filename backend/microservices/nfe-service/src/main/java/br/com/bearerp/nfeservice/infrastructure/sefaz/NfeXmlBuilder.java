package br.com.bearerp.nfeservice.infrastructure.sefaz;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class NfeXmlBuilder {

    private final SefazConfig config;
    private static final DateTimeFormatter DT_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ssXXX")
            .withZone(ZoneId.of("America/Sao_Paulo"));

    public String buildNfeXml(Map<String, Object> nfe, Map<String, Object> empresa) {
        StringBuilder xml = new StringBuilder();
        String tpAmb = config.isProducao() ? "1" : "2";
        String cUF = getCodigoUF(config.getUf());
        String now = DT_FORMAT.format(Instant.now());

        xml.append("<NFe xmlns=\"http://www.portalfiscal.inf.br/nfe\">");
        xml.append("<infNFe versao=\"4.00\">");

        // IDE - Identificação da NF-e
        xml.append("<ide>");
        xml.append("<cUF>").append(cUF).append("</cUF>");
        xml.append("<cNF>").append(String.format("%08d", System.currentTimeMillis() % 100000000)).append("</cNF>");
        xml.append("<natOp>").append(str(nfe.get("naturezaOperacao"))).append("</natOp>");
        xml.append("<mod>55</mod>");
        xml.append("<serie>").append(str(nfe.get("serie"))).append("</serie>");
        xml.append("<nNF>").append(str(nfe.get("numero"))).append("</nNF>");
        xml.append("<dhEmi>").append(now).append("</dhEmi>");
        xml.append("<tpNF>").append("SAIDA".equals(str(nfe.get("tipo"))) ? "1" : "0").append("</tpNF>");
        xml.append("<idDest>1</idDest>");
        xml.append("<cMunFG>").append(str(empresa.get("codigoMunicipio"))).append("</cMunFG>");
        xml.append("<tpImp>1</tpImp><tpEmis>1</tpEmis>");
        xml.append("<tpAmb>").append(tpAmb).append("</tpAmb>");
        xml.append("<finNFe>1</finNFe><indFinal>1</indFinal><indPres>1</indPres>");
        xml.append("<procEmi>0</procEmi><verProc>BearERP1.0</verProc>");
        xml.append("</ide>");

        // EMIT - Emitente
        xml.append("<emit>");
        xml.append("<CNPJ>").append(str(empresa.get("cnpj")).replaceAll("[^0-9]", "")).append("</CNPJ>");
        xml.append("<xNome>").append(str(empresa.get("razaoSocial"))).append("</xNome>");
        xml.append("<enderEmit>");
        xml.append("<xLgr>").append(str(empresa.get("logradouro"))).append("</xLgr>");
        xml.append("<nro>").append(str(empresa.get("numero"))).append("</nro>");
        xml.append("<xBairro>").append(str(empresa.get("bairro"))).append("</xBairro>");
        xml.append("<cMun>").append(str(empresa.get("codigoMunicipio"))).append("</cMun>");
        xml.append("<xMun>").append(str(empresa.get("cidade"))).append("</xMun>");
        xml.append("<UF>").append(str(empresa.get("uf"))).append("</UF>");
        xml.append("<CEP>").append(str(empresa.get("cep")).replaceAll("[^0-9]", "")).append("</CEP>");
        xml.append("<cPais>1058</cPais><xPais>Brasil</xPais>");
        xml.append("</enderEmit>");
        xml.append("<IE>").append(str(empresa.get("inscricaoEstadual"))).append("</IE>");
        xml.append("<CRT>").append(getCRT(str(empresa.get("regimeTributario")))).append("</CRT>");
        xml.append("</emit>");

        // DEST - Destinatário
        Map<String, Object> dest = (Map<String, Object>) nfe.get("destinatario");
        if (dest != null) {
            xml.append("<dest>");
            String cnpjCpf = str(dest.get("cnpjCpf")).replaceAll("[^0-9]", "");
            if (cnpjCpf.length() == 14) {
                xml.append("<CNPJ>").append(cnpjCpf).append("</CNPJ>");
            } else {
                xml.append("<CPF>").append(cnpjCpf).append("</CPF>");
            }
            xml.append("<xNome>").append(str(dest.get("razaoSocial"))).append("</xNome>");
            xml.append("<indIEDest>9</indIEDest>");
            xml.append("</dest>");
        }

        // DET - Itens
        List<Map<String, Object>> itens = (List<Map<String, Object>>) nfe.get("itens");
        if (itens != null) {
            int nItem = 1;
            for (Map<String, Object> item : itens) {
                xml.append("<det nItem=\"").append(nItem++).append("\">");
                xml.append("<prod>");
                xml.append("<cProd>").append(str(item.get("codigo"))).append("</cProd>");
                xml.append("<cEAN>SEM GTIN</cEAN>");
                xml.append("<xProd>").append(str(item.get("descricao"))).append("</xProd>");
                xml.append("<NCM>").append(str(item.get("ncm"))).append("</NCM>");
                xml.append("<CFOP>").append(str(item.get("cfop"))).append("</CFOP>");
                xml.append("<uCom>").append(str(item.get("unidade"))).append("</uCom>");
                xml.append("<qCom>").append(decimal(item.get("quantidade"))).append("</qCom>");
                xml.append("<vUnCom>").append(decimal(item.get("valorUnitario"))).append("</vUnCom>");
                xml.append("<vProd>").append(decimal(item.get("valorTotal"))).append("</vProd>");
                xml.append("<cEANTrib>SEM GTIN</cEANTrib>");
                xml.append("<uTrib>").append(str(item.get("unidade"))).append("</uTrib>");
                xml.append("<qTrib>").append(decimal(item.get("quantidade"))).append("</qTrib>");
                xml.append("<vUnTrib>").append(decimal(item.get("valorUnitario"))).append("</vUnTrib>");
                xml.append("<indTot>1</indTot>");
                xml.append("</prod>");
                xml.append("<imposto>");
                xml.append("<ICMS><ICMS00><orig>0</orig><CST>00</CST>");
                xml.append("<modBC>0</modBC>");
                xml.append("<vBC>").append(decimal(item.get("valorTotal"))).append("</vBC>");
                xml.append("<pICMS>").append(decimal(item.get("aliquotaIcms"))).append("</pICMS>");
                xml.append("<vICMS>").append(decimal(item.get("valorIcms"))).append("</vICMS>");
                xml.append("</ICMS00></ICMS>");
                xml.append("<PIS><PISAliq><CST>01</CST>");
                xml.append("<vBC>").append(decimal(item.get("valorTotal"))).append("</vBC>");
                xml.append("<pPIS>1.65</pPIS>");
                xml.append("<vPIS>").append(decimal(item.get("valorPis"))).append("</vPIS>");
                xml.append("</PISAliq></PIS>");
                xml.append("<COFINS><COFINSAliq><CST>01</CST>");
                xml.append("<vBC>").append(decimal(item.get("valorTotal"))).append("</vBC>");
                xml.append("<pCOFINS>7.60</pCOFINS>");
                xml.append("<vCOFINS>").append(decimal(item.get("valorCofins"))).append("</vCOFINS>");
                xml.append("</COFINSAliq></COFINS>");
                xml.append("</imposto>");
                xml.append("</det>");
            }
        }

        // TOTAL
        xml.append("<total><ICMSTot>");
        xml.append("<vBC>").append(decimal(nfe.get("baseCalculoIcms"))).append("</vBC>");
        xml.append("<vICMS>").append(decimal(nfe.get("valorIcms"))).append("</vICMS>");
        xml.append("<vICMSDeson>0.00</vICMSDeson>");
        xml.append("<vFCPUFDest>0.00</vFCPUFDest><vICMSUFDest>0.00</vICMSUFDest><vICMSUFRemet>0.00</vICMSUFRemet>");
        xml.append("<vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet>");
        xml.append("<vProd>").append(decimal(nfe.get("valorProdutos"))).append("</vProd>");
        xml.append("<vFrete>").append(decimal(nfe.get("valorFrete"))).append("</vFrete>");
        xml.append("<vSeg>0.00</vSeg><vDesc>").append(decimal(nfe.get("valorDesconto"))).append("</vDesc>");
        xml.append("<vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vOutro>0.00</vOutro>");
        xml.append("<vNF>").append(decimal(nfe.get("valorTotalNfe"))).append("</vNF>");
        xml.append("</ICMSTot></total>");

        // TRANSP
        xml.append("<transp><modFrete>9</modFrete></transp>");

        // PAG
        xml.append("<pag><detPag><indPag>0</indPag><tPag>01</tPag>");
        xml.append("<vPag>").append(decimal(nfe.get("valorTotalNfe"))).append("</vPag></detPag></pag>");

        xml.append("</infNFe></NFe>");
        return xml.toString();
    }

    private String str(Object v) { return v != null ? v.toString() : ""; }

    private String decimal(Object v) {
        if (v == null) return "0.00";
        if (v instanceof BigDecimal bd) return bd.setScale(2).toPlainString();
        return v.toString();
    }

    private String getCRT(String regime) {
        return switch (regime != null ? regime : "") {
            case "SIMPLES_NACIONAL", "MEI" -> "1";
            case "SIMPLES_NACIONAL_EXCESSO" -> "2";
            default -> "3";
        };
    }

    private String getCodigoUF(String uf) {
        return switch (uf) {
            case "SP" -> "35"; case "RJ" -> "33"; case "MG" -> "31"; case "RS" -> "43";
            case "PR" -> "41"; case "SC" -> "42"; case "BA" -> "29"; case "PE" -> "26";
            case "CE" -> "23"; case "GO" -> "52"; case "DF" -> "53"; case "ES" -> "32";
            default -> "35";
        };
    }
}
