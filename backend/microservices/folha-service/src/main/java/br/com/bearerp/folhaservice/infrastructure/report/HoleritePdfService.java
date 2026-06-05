package br.com.bearerp.folhaservice.infrastructure.report;

import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
public class HoleritePdfService {

    private static final Font TITLE = new Font(Font.HELVETICA, 14, Font.BOLD, new Color(31, 41, 55));
    private static final Font LABEL = new Font(Font.HELVETICA, 8, Font.BOLD, new Color(107, 114, 128));
    private static final Font VALUE = new Font(Font.HELVETICA, 9, Font.NORMAL, new Color(31, 41, 55));
    private static final Font HEADER = new Font(Font.HELVETICA, 8, Font.BOLD, Color.WHITE);
    private static final Font CELL = new Font(Font.HELVETICA, 8, Font.NORMAL, new Color(31, 41, 55));
    private static final Font TOTAL_FONT = new Font(Font.HELVETICA, 10, Font.BOLD, new Color(79, 70, 229));
    private static final Font FOOTER = new Font(Font.HELVETICA, 7, Font.ITALIC, new Color(156, 163, 175));
    private static final Color INDIGO = new Color(79, 70, 229);
    private static final Color ROW_ALT = new Color(243, 244, 246);
    private static final NumberFormat BRL = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));

    public byte[] generateHoleritePdf(Map<String, Object> holerite) {
        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 40, 40, 40, 30);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            // Header
            Paragraph title = new Paragraph("RECIBO DE PAGAMENTO DE SALÁRIO", TITLE);
            title.setAlignment(Element.ALIGN_CENTER);
            doc.add(title);

            Paragraph comp = new Paragraph("Competência: " + str(holerite.get("competencia")), VALUE);
            comp.setAlignment(Element.ALIGN_CENTER);
            doc.add(comp);
            doc.add(Chunk.NEWLINE);

            // Employee info
            PdfPTable info = new PdfPTable(4);
            info.setWidthPercentage(100);
            addInfoCell(info, "Funcionário", str(holerite.get("nomeFuncionario")));
            addInfoCell(info, "CPF", str(holerite.get("cpf")));
            addInfoCell(info, "Cargo", str(holerite.get("cargo")));
            addInfoCell(info, "Departamento", str(holerite.get("departamento")));
            addInfoCell(info, "Data Admissão", str(holerite.get("dataAdmissao")));
            addInfoCell(info, "Salário Base", currency(holerite.get("salarioBase")));
            addInfoCell(info, "Matrícula", str(holerite.get("matricula")));
            addInfoCell(info, "Banco/Agência/Conta", str(holerite.get("dadosBancarios")));
            doc.add(info);
            doc.add(Chunk.NEWLINE);

            // Earnings and deductions table
            PdfPTable table = new PdfPTable(new float[]{4f, 1.5f, 2f, 2f});
            table.setWidthPercentage(100);

            PdfPCell h1 = headerCell("Descrição");
            PdfPCell h2 = headerCell("Referência");
            PdfPCell h3 = headerCell("Proventos");
            PdfPCell h4 = headerCell("Descontos");
            table.addCell(h1); table.addCell(h2); table.addCell(h3); table.addCell(h4);

            List<Map<String, Object>> itens = (List<Map<String, Object>>) holerite.get("itens");
            if (itens != null) {
                int row = 0;
                for (Map<String, Object> item : itens) {
                    Color bg = (row++ % 2 == 0) ? Color.WHITE : ROW_ALT;
                    boolean isProvento = "PROVENTO".equals(str(item.get("tipo")));
                    addDataCell(table, str(item.get("descricao")), bg, Element.ALIGN_LEFT);
                    addDataCell(table, str(item.get("referencia")), bg, Element.ALIGN_CENTER);
                    addDataCell(table, isProvento ? currency(item.get("valor")) : "", bg, Element.ALIGN_RIGHT);
                    addDataCell(table, !isProvento ? currency(item.get("valor")) : "", bg, Element.ALIGN_RIGHT);
                }
            }

            // Totals row
            PdfPCell totalLabel = new PdfPCell(new Phrase("TOTAIS", TOTAL_FONT));
            totalLabel.setColspan(2);
            totalLabel.setPadding(8);
            totalLabel.setBackgroundColor(new Color(238, 242, 255));
            totalLabel.setBorderWidth(0);
            table.addCell(totalLabel);

            PdfPCell totalProv = new PdfPCell(new Phrase(currency(holerite.get("totalProventos")), TOTAL_FONT));
            totalProv.setPadding(8);
            totalProv.setBackgroundColor(new Color(238, 242, 255));
            totalProv.setBorderWidth(0);
            totalProv.setHorizontalAlignment(Element.ALIGN_RIGHT);
            table.addCell(totalProv);

            PdfPCell totalDesc = new PdfPCell(new Phrase(currency(holerite.get("totalDescontos")), TOTAL_FONT));
            totalDesc.setPadding(8);
            totalDesc.setBackgroundColor(new Color(238, 242, 255));
            totalDesc.setBorderWidth(0);
            totalDesc.setHorizontalAlignment(Element.ALIGN_RIGHT);
            table.addCell(totalDesc);

            doc.add(table);
            doc.add(Chunk.NEWLINE);

            // Net salary
            Paragraph liquido = new Paragraph("SALÁRIO LÍQUIDO: " + currency(holerite.get("salarioLiquido")),
                    new Font(Font.HELVETICA, 14, Font.BOLD, INDIGO));
            liquido.setAlignment(Element.ALIGN_RIGHT);
            doc.add(liquido);
            doc.add(Chunk.NEWLINE);

            // FGTS info
            PdfPTable fgts = new PdfPTable(2);
            fgts.setWidthPercentage(50);
            fgts.setHorizontalAlignment(Element.ALIGN_LEFT);
            addInfoCell(fgts, "Base FGTS", currency(holerite.get("baseFgts")));
            addInfoCell(fgts, "FGTS do Mês", currency(holerite.get("fgtsMes")));
            doc.add(fgts);

            doc.add(Chunk.NEWLINE);
            doc.add(new Paragraph("Bear ERP - Gerado em " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")), FOOTER));

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            log.error("Erro ao gerar holerite PDF", e);
            throw new RuntimeException("Erro ao gerar PDF do holerite", e);
        }
    }

    private PdfPCell headerCell(String text) {
        PdfPCell cell = new PdfPCell(new Phrase(text, HEADER));
        cell.setBackgroundColor(INDIGO);
        cell.setPadding(6);
        cell.setBorderWidth(0);
        return cell;
    }

    private void addDataCell(PdfPTable table, String text, Color bg, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, CELL));
        cell.setBackgroundColor(bg);
        cell.setPadding(5);
        cell.setBorderWidth(0.5f);
        cell.setBorderColor(new Color(229, 231, 235));
        cell.setHorizontalAlignment(align);
        table.addCell(cell);
    }

    private void addInfoCell(PdfPTable table, String label, String value) {
        PdfPCell cell = new PdfPCell();
        cell.setBorderWidth(0.5f);
        cell.setBorderColor(new Color(229, 231, 235));
        cell.setPadding(4);
        cell.addElement(new Phrase(label, LABEL));
        cell.addElement(new Phrase(value, VALUE));
        table.addCell(cell);
    }

    private String currency(Object v) {
        if (v == null) return "R$ 0,00";
        if (v instanceof BigDecimal) return BRL.format(v);
        if (v instanceof Number) return BRL.format(((Number) v).doubleValue());
        return v.toString();
    }

    private String str(Object v) { return v != null ? v.toString() : ""; }
}
