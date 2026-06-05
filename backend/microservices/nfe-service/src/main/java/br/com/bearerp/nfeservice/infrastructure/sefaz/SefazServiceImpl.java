package br.com.bearerp.nfeservice.infrastructure.sefaz;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.net.ssl.*;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class SefazServiceImpl implements SefazService {

    private final SefazConfig config;

    @Override
    public SefazResponse autorizarNfe(String xmlNfe, String certificadoId) {
        log.info("Enviando NF-e para autorização na SEFAZ [ambiente={}]", config.getAmbiente());

        String soapEnvelope = buildSoapEnvelope("nfeAutorizacaoLote", xmlNfe);

        try {
            String response = sendSoapRequest(config.getUrlAutorizacao(), soapEnvelope, certificadoId);
            return parseSefazResponse(response);
        } catch (Exception e) {
            log.error("Erro na comunicação com SEFAZ: {}", e.getMessage());
            return SefazResponse.builder()
                    .sucesso(false)
                    .codigoStatus("999")
                    .motivoStatus("Erro de comunicação com SEFAZ: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public SefazResponse cancelarNfe(String chaveAcesso, String protocolo, String justificativa, String certificadoId) {
        log.info("Cancelando NF-e {} na SEFAZ", chaveAcesso);

        String xmlEvento = buildEventoCancelamento(chaveAcesso, protocolo, justificativa);
        String soapEnvelope = buildSoapEnvelope("nfeRecepcaoEvento", xmlEvento);

        try {
            String response = sendSoapRequest(config.getUrlEvento(), soapEnvelope, certificadoId);
            return parseSefazResponse(response);
        } catch (Exception e) {
            log.error("Erro ao cancelar NF-e na SEFAZ: {}", e.getMessage());
            return SefazResponse.builder()
                    .sucesso(false)
                    .codigoStatus("999")
                    .motivoStatus("Erro ao cancelar: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public SefazResponse consultarNfe(String chaveAcesso, String certificadoId) {
        log.info("Consultando NF-e {} na SEFAZ", chaveAcesso);

        String xmlConsulta = String.format(
                "<consSitNFe xmlns=\"http://www.portalfiscal.inf.br/nfe\" versao=\"4.00\">" +
                "<tpAmb>%s</tpAmb><xServ>CONSULTAR</xServ><chNFe>%s</chNFe></consSitNFe>",
                config.isProducao() ? "1" : "2", chaveAcesso);

        String soapEnvelope = buildSoapEnvelope("nfeConsultaNF", xmlConsulta);

        try {
            String response = sendSoapRequest(config.getUrlConsulta(), soapEnvelope, certificadoId);
            return parseSefazResponse(response);
        } catch (Exception e) {
            log.error("Erro ao consultar NF-e: {}", e.getMessage());
            return SefazResponse.builder()
                    .sucesso(false)
                    .codigoStatus("999")
                    .motivoStatus("Erro na consulta: " + e.getMessage())
                    .build();
        }
    }

    @Override
    public SefazResponse inutilizarNumeracao(String cnpj, int serie, int numInicial, int numFinal, String justificativa, String certificadoId) {
        log.info("Inutilizando numeração {}-{} serie {} na SEFAZ", numInicial, numFinal, serie);

        String ano = String.valueOf(java.time.Year.now().getValue()).substring(2);
        String id = String.format("ID%s%s%s%09d%09d", config.getUf(), cnpj, ano + String.format("%03d", serie), numInicial, numFinal);

        String xmlInut = String.format(
                "<inutNFe xmlns=\"http://www.portalfiscal.inf.br/nfe\" versao=\"4.00\">" +
                "<infInut Id=\"%s\"><tpAmb>%s</tpAmb><xServ>INUTILIZAR</xServ>" +
                "<cUF>%s</cUF><ano>%s</ano><CNPJ>%s</CNPJ><mod>55</mod><serie>%d</serie>" +
                "<nNFIni>%d</nNFIni><nNFFin>%d</nNFFin><xJust>%s</xJust></infInut></inutNFe>",
                id, config.isProducao() ? "1" : "2", getCodigoUF(config.getUf()), ano, cnpj, serie, numInicial, numFinal, justificativa);

        try {
            String response = sendSoapRequest(config.getUrlAutorizacao(), buildSoapEnvelope("nfeInutilizacao", xmlInut), certificadoId);
            return parseSefazResponse(response);
        } catch (Exception e) {
            log.error("Erro ao inutilizar numeração: {}", e.getMessage());
            return SefazResponse.builder().sucesso(false).codigoStatus("999").motivoStatus(e.getMessage()).build();
        }
    }

    @Override
    public StatusServicoResponse consultarStatusServico() {
        log.info("Consultando status do serviço SEFAZ");

        String xmlStatus = String.format(
                "<consStatServ xmlns=\"http://www.portalfiscal.inf.br/nfe\" versao=\"4.00\">" +
                "<tpAmb>%s</tpAmb><cUF>%s</cUF><xServ>STATUS</xServ></consStatServ>",
                config.isProducao() ? "1" : "2", getCodigoUF(config.getUf()));

        try {
            String response = sendSoapRequest(config.getUrlStatus(), buildSoapEnvelope("nfeStatusServico", xmlStatus), null);
            boolean online = response.contains("<cStat>107</cStat>");
            return StatusServicoResponse.builder()
                    .online(online)
                    .codigoStatus(extractXmlTag(response, "cStat"))
                    .motivoStatus(extractXmlTag(response, "xMotivo"))
                    .tempoMedioResposta(extractXmlTag(response, "tMed"))
                    .previsaoRetorno(extractXmlTag(response, "dhRetorno"))
                    .build();
        } catch (Exception e) {
            return StatusServicoResponse.builder()
                    .online(false)
                    .codigoStatus("999")
                    .motivoStatus("Serviço indisponível: " + e.getMessage())
                    .build();
        }
    }

    private String sendSoapRequest(String url, String soapEnvelope, String certificadoId) throws Exception {
        SSLContext sslContext = createSSLContext(certificadoId);

        HttpURLConnection conn = (HttpURLConnection) URI.create(url).toURL().openConnection();
        if (conn instanceof HttpsURLConnection httpsConn && sslContext != null) {
            httpsConn.setSSLSocketFactory(sslContext.getSocketFactory());
        }

        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/soap+xml; charset=utf-8");
        conn.setRequestProperty("SOAPAction", "");
        conn.setConnectTimeout(config.getTimeout());
        conn.setReadTimeout(config.getTimeout());
        conn.setDoOutput(true);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(soapEnvelope.getBytes(StandardCharsets.UTF_8));
        }

        int responseCode = conn.getResponseCode();
        InputStream is = (responseCode >= 200 && responseCode < 300) ? conn.getInputStream() : conn.getErrorStream();

        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
            return sb.toString();
        }
    }

    private SSLContext createSSLContext(String certificadoId) {
        if (config.getCertificadoPath() == null || config.getCertificadoPath().isBlank()) {
            return null;
        }

        try {
            KeyStore ks = KeyStore.getInstance("PKCS12");
            try (FileInputStream fis = new FileInputStream(config.getCertificadoPath())) {
                ks.load(fis, config.getCertificadoSenha().toCharArray());
            }

            KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            kmf.init(ks, config.getCertificadoSenha().toCharArray());

            TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
            tmf.init((KeyStore) null);

            SSLContext sslContext = SSLContext.getInstance("TLSv1.2");
            sslContext.init(kmf.getKeyManagers(), tmf.getTrustManagers(), null);
            return sslContext;
        } catch (Exception e) {
            log.error("Erro ao carregar certificado digital: {}", e.getMessage());
            throw new RuntimeException("Falha ao configurar certificado digital", e);
        }
    }

    private String buildSoapEnvelope(String action, String body) {
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>" +
                "<soap12:Envelope xmlns:soap12=\"http://www.w3.org/2003/05/soap-envelope\" " +
                "xmlns:nfe=\"http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4\">" +
                "<soap12:Body><nfe:" + action + ">" +
                "<nfe:nfeDadosMsg>" + body + "</nfe:nfeDadosMsg>" +
                "</nfe:" + action + "></soap12:Body></soap12:Envelope>";
    }

    private String buildEventoCancelamento(String chaveAcesso, String protocolo, String justificativa) {
        String tpAmb = config.isProducao() ? "1" : "2";
        String cnpj = chaveAcesso.substring(6, 20);
        String sequencia = "1";
        String id = "ID110111" + chaveAcesso + sequencia.substring(sequencia.length() - 2);

        return "<envEvento xmlns=\"http://www.portalfiscal.inf.br/nfe\" versao=\"1.00\">" +
                "<idLote>1</idLote>" +
                "<evento versao=\"1.00\"><infEvento Id=\"" + id + "\">" +
                "<cOrgao>" + getCodigoUF(config.getUf()) + "</cOrgao>" +
                "<tpAmb>" + tpAmb + "</tpAmb><CNPJ>" + cnpj + "</CNPJ>" +
                "<chNFe>" + chaveAcesso + "</chNFe><dhEvento>" + Instant.now() + "</dhEvento>" +
                "<tpEvento>110111</tpEvento><nSeqEvento>" + sequencia + "</nSeqEvento>" +
                "<verEvento>1.00</verEvento>" +
                "<detEvento versao=\"1.00\"><descEvento>Cancelamento</descEvento>" +
                "<nProt>" + protocolo + "</nProt><xJust>" + justificativa + "</xJust>" +
                "</detEvento></infEvento></evento></envEvento>";
    }

    private SefazResponse parseSefazResponse(String xml) {
        String cStat = extractXmlTag(xml, "cStat");
        String xMotivo = extractXmlTag(xml, "xMotivo");
        String nProt = extractXmlTag(xml, "nProt");
        String chNFe = extractXmlTag(xml, "chNFe");

        boolean sucesso = "100".equals(cStat) || "101".equals(cStat) || "135".equals(cStat) || "102".equals(cStat);

        return SefazResponse.builder()
                .sucesso(sucesso)
                .codigoStatus(cStat)
                .motivoStatus(xMotivo)
                .protocolo(nProt)
                .chaveAcesso(chNFe)
                .xmlRetorno(xml)
                .dataRecebimento(extractXmlTag(xml, "dhRecbto"))
                .build();
    }

    private String extractXmlTag(String xml, String tag) {
        if (xml == null) return null;
        String open = "<" + tag + ">";
        String close = "</" + tag + ">";
        int start = xml.indexOf(open);
        int end = xml.indexOf(close);
        if (start >= 0 && end > start) {
            return xml.substring(start + open.length(), end);
        }
        return null;
    }

    private String getCodigoUF(String uf) {
        return switch (uf) {
            case "AC" -> "12"; case "AL" -> "27"; case "AP" -> "16"; case "AM" -> "13";
            case "BA" -> "29"; case "CE" -> "23"; case "DF" -> "53"; case "ES" -> "32";
            case "GO" -> "52"; case "MA" -> "21"; case "MT" -> "51"; case "MS" -> "50";
            case "MG" -> "31"; case "PA" -> "15"; case "PB" -> "25"; case "PR" -> "41";
            case "PE" -> "26"; case "PI" -> "22"; case "RJ" -> "33"; case "RN" -> "24";
            case "RS" -> "43"; case "RO" -> "11"; case "RR" -> "14"; case "SC" -> "42";
            case "SP" -> "35"; case "SE" -> "28"; case "TO" -> "17";
            default -> "35";
        };
    }
}
