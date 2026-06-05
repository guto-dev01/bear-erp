package br.com.bearerp.nfeservice.infrastructure.report;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
public class DanfePdfService {

    private static final Font TITLE = new Font(Font.HELVETICA, 18, Font.BOLD, new Color(31, 41, 55));
    private static final Font SECTION = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(79, 70, 229));
    private static final Font LABEL = new Font(Font.HELVETICA, 6, Font.NORMAL, new Color(107, 114, 128));
    private static final Font VALUE = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(31, 41, 55));
    private static final Font VALUE_BOLD = new Font(Font.HELVETICA, 9, Font.BOLD, new Color(31, 41, 55));
    private static final Font HEADER = new Font(Font.HELVETICA, 7, Font.BOLD, Color.WHITE);
    private static final Font CELL = new Font(Font.HELVETICA, 7, Font.NORMAL, new Color(31, 41, 55));
    private static final Font CHAVE = new Font(Font.COURIER, 8, Font.NORMAL, new Color(31, 41, 55));
    private static final Color INDIGO = new Color(79, 70, 229);
    private static final Color BORDER = new Color(209, 213, 219);
    private static final NumberFormat BRL = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));

    public byte[] generateDanfePdf(Map<String, Object> nfe) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 20, 20, 20, 20);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            // Header - NF-e identification
            PdfPTable header = new PdfPTable(new float[]{3f, 1f, 2f});
            header.setWidthPercentage(100);

            // Emitter info
            PdfPCell emitCell = new PdfPCell();
            emitCell.setBorderWidth(1);
            emitCell.setBorderColor(BORDER);
            emitCell.setPadding(8);
            emitCell.addElement(new Phrase(str(nfe.get("emitenteRazaoSocial")), VALUE_BOLD));
            emitCell.addElement(new Phrase("CNPJ: " + str(nfe.get("emitenteCnpj")), VALUE));
            emitCell.addElement(new Phrase(str(nfe.get("emitenteEndereco")), CELL));
            header.addCell(emitCell);

            // DANFE title
            PdfPCell danfeCell = new PdfPCell();
            danfeCell.setBorderWidth(1);
            danfeCell.setBorderColor(BORDER);
            danfeCell.setPadding(8);
            danfeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            danfeCell.addElement(new Phrase("DANFE", TITLE));
            danfeCell.addElement(new Phrase("Documento Auxiliar da\nNota Fiscal Eletrônica", LABEL));
            String tipoOp = "SAIDA".equals(str(nfe.get("tipo"))) ? "1 - SAÍDA" : "0 - ENTRADA";
            danfeCell.addElement(new Phrase(tipoOp, VALUE));
            header.addCell(danfeCell);

            // NF-e number and series
            PdfPCell numCell = new PdfPCell();
            numCell.setBorderWidth(1);
            numCell.setBorderColor(BORDER);
            numCell.setPadding(8);
            numCell.addElement(new Phrase("NF-e", LABEL));
            numCell.addElement(new Phrase("Nº " + str(nfe.get("numero")), new Font(Font.HELVETICA, 14, Font.BOLD)));
            numCell.addElement(new Phrase("Série: " + str(nfe.get("serie")), VALUE));
            numCell.addElement(new Phrase("Folha 1/1", CELL));
            header.addCell(numCell);
            doc.add(header);

            // Access key
            PdfPTable chaveTable = new PdfPTable(1);
            chaveTable.setWidthPercentage(100);
            PdfPCell chaveCell = new PdfPCell();
            chaveCell.setBorderWidth(1);
            chaveCell.setBorderColor(BORDER);
            chaveCell.setPadding(6);
            chaveCell.addElement(new Phrase("CHAVE DE ACESSO", LABEL));
            chaveCell.addElement(new Phrase(str(nfe.get("chaveAcesso")), CHAVE));
            chaveTable.addCell(chaveCell);
            doc.add(chaveTable);

            // Protocol
            PdfPTable protTable = new PdfPTable(1);
            protTable.setWidthPercentage(100);
            PdfPCell protCell = new PdfPCell();
            protCell.setBorderWidth(1);
            protCell.setBorderColor(BORDER);
            protCell.setPadding(4);
            protCell.addElement(new Phrase("PROTOCOLO DE AUTORIZAÇÃO: " + str(nfe.get("protocolo")) +
                    " - " + str(nfe.get("dataAutorizacao")), VALUE));
            protTable.addCell(protCell);
            doc.add(protTable);

            // Recipient section
            doc.add(new Paragraph("DESTINATÁRIO/REMETENTE", SECTION));
            PdfPTable dest = new PdfPTable(new float[]{4f, 2f, 1f});
            dest.setWidthPercentage(100);
            addFieldCell(dest, "RAZÃO SOCIAL", str(nfe.get("destinatarioRazaoSocial")));
            addFieldCell(dest, "CNPJ/CPF", str(nfe.get("destinatarioCnpjCpf")));
            addFieldCell(dest, "IE", str(nfe.get("destinatarioIe")));
            addFieldCell(dest, "ENDEREÇO", str(nfe.get("destinatarioEndereco")));
            addFieldCell(dest, "MUNICÍPIO", str(nfe.get("destinatarioCidade")));
            addFieldCell(dest, "UF", str(nfe.get("destinatarioUf")));
            doc.add(dest);

            // Items section
            doc.add(Chunk.NEWLINE);
            doc.add(new Paragraph("DADOS DOS PRODUTOS/SERVIÇOS", SECTION));

            PdfPTable items = new PdfPTable(new float[]{0.5f, 1f, 3f, 0.5f, 1f, 1.2f, 1f, 1f, 1f, 1f});
            items.setWidthPercentage(100);
            String[] cols = {"#", "Código", "Descrição", "NCM", "Un", "Qtd", "Vl.Unit", "Vl.Total", "ICMS", "IPI"};
            for (String c : cols) {
                PdfPCell hc = new PdfPCell(new Phrase(c, HEADER));
                hc.setBackgroundColor(INDIGO);
                hc.setPadding(4);
                hc.setBorderWidth(0);
                items.addCell(hc);
            }

            List<Map<String, Object>> itens = (List<Map<String, Object>>) nfe.get("itens");
            if (itens != null) {
                int num = 1;
                for (Map<String, Object> item : itens) {
                    Color bg = (num % 2 == 0) ? new Color(243, 244, 246) : Color.WHITE;
                    addItemCell(items, String.valueOf(num++), bg);
                    addItemCell(items, str(item.get("codigo")), bg);
                    addItemCell(items, str(item.get("descricao")), bg);
                    addItemCell(items, str(item.get("ncm")), bg);
                    addItemCell(items, str(item.get("unidade")), bg);
                    addItemCell(items, str(item.get("quantidade")), bg);
                    addItemCell(items, currency(item.get("valorUnitario")), bg);
                    addItemCell(items, currency(item.get("valorTotal")), bg);
                    addItemCell(items, currency(item.get("valorIcms")), bg);
                    addItemCell(items, currency(item.get("valorIpi")), bg);
                }
            }
            doc.add(items);

            // Totals
            doc.add(Chunk.NEWLINE);
            doc.add(new Paragraph("CÁLCULO DO IMPOSTO", SECTION));
            PdfPTable totais = new PdfPTable(5);
            totais.setWidthPercentage(100);
            addFieldCell(totais, "BASE CÁLCULO ICMS", currency(nfe.get("baseCalculoIcms")));
            addFieldCell(totais, "VALOR ICMS", currency(nfe.get("valorIcms")));
            addFieldCell(totais, "VALOR IPI", currency(nfe.get("valorIpi")));
            addFieldCell(totais, "VALOR PIS", currency(nfe.get("valorPis")));
            addFieldCell(totais, "VALOR COFINS", currency(nfe.get("valorCofins")));
            addFieldCell(totais, "VALOR FRETE", currency(nfe.get("valorFrete")));
            addFieldCell(totais, "VALOR SEGURO", currency(nfe.get("valorSeguro")));
            addFieldCell(totais, "DESCONTO", currency(nfe.get("valorDesconto")));
            addFieldCell(totais, "OUTRAS DESPESAS", currency(nfe.get("outrasDespesas")));
            addFieldCell(totais, "VALOR TOTAL NF-e", currency(nfe.get("valorTotalNfe")));
            doc.add(totais);

            // Additional info
            doc.add(Chunk.NEWLINE);
            doc.add(new Paragraph("INFORMAÇÕES COMPLEMENTARES", SECTION));
            doc.add(new Paragraph(str(nfe.get("informacoesComplementares")), CELL));

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar DANFE PDF", e);
            throw new RuntimeException("Erro ao gerar PDF do DANFE", e);
        }
    }

    private void addFieldCell(PdfPTable table, String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderWidth(0.5f);
        cell.setBorderColor(BORDER);
        cell.setPadding(3);
        cell.addElement(new Phrase(label, LABEL));
        cell.addElement(new Phrase(value, VALUE));
        table.addCell(cell);
    }

    private void addItemCell(PdfPTable table, String text, Color bg) {
        PdfPCell cell = new PdfPCell(new Phrase(text, CELL));
        cell.setBackgroundColor(bg);
        cell.setPadding(3);
        cell.setBorderWidth(0.5f);
        cell.setBorderColor(BORDER);
        table.addCell(cell);
    }

    private String currency(Object v) {
        if (v == null) return "0,00";
        if (v instanceof BigDecimal) return BRL.format(v).replace("R$", "").trim();
        if (v instanceof Number) return BRL.format(((Number) v).doubleValue()).replace("R$", "").trim();
        return v.toString();
    }

    private String str(Object v) { return v != null ? v.toString() : ""; }
}
