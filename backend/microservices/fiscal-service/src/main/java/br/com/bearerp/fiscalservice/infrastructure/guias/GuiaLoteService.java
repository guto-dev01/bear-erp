package br.com.bearerp.fiscalservice.infrastructure.guias;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.fiscalservice.domain.model.GuiaFiscal;
import br.com.bearerp.fiscalservice.domain.model.GuiaFiscal.*;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GuiaLoteService {

    private final MongoTemplate mongoTemplate;

    public List<GuiaFiscal> gerarGuiasEmLote(TipoGuia tipo, String competencia, List<String> empresaIds) {
        List<GuiaFiscal> guias = new ArrayList<>();
        String tenantId = TenantContext.getTenantId();

        for (String empresaId : empresaIds) {
            try {
                GuiaFiscal guia = gerarGuia(tipo, competencia, tenantId, empresaId);
                guias.add(guia);
                log.info("Guia {} gerada para empresa {} - competência {}", tipo, empresaId, competencia);
            } catch (Exception e) {
                log.error("Erro ao gerar guia {} para empresa {}: {}", tipo, empresaId, e.getMessage());
            }
        }
        return guias;
    }

    public byte[] gerarPdfLote(List<String> guiaIds) {
        List<GuiaFiscal> guias = guiaIds.stream()
                .map(id -> mongoTemplate.findById(id, GuiaFiscal.class))
                .filter(g -> g != null)
                .toList();

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font titleFont = new Font(Font.HELVETICA, 14, Font.BOLD, new Color(79, 70, 229));
            Font headerFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
            Font cellFont = new Font(Font.HELVETICA, 8);
            Font boldFont = new Font(Font.HELVETICA, 10, Font.BOLD);
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

            for (int i = 0; i < guias.size(); i++) {
                GuiaFiscal guia = guias.get(i);
                if (i > 0) doc.newPage();

                // Título da guia
                Paragraph titulo = new Paragraph(guia.getTipo().name() + " - " + guia.getRazaoSocialEmpresa(), titleFont);
                titulo.setSpacingAfter(10);
                doc.add(titulo);

                // Info da guia
                doc.add(new Paragraph("CNPJ: " + guia.getCnpjEmpresa(), boldFont));
                doc.add(new Paragraph("Competência: " + guia.getCompetencia(), cellFont));
                doc.add(new Paragraph("Vencimento: " + guia.getDataVencimento().format(fmt), cellFont));
                doc.add(new Paragraph(" "));

                // Tabela de valores
                PdfPTable table = new PdfPTable(2);
                table.setWidthPercentage(60);
                table.setHorizontalAlignment(Element.ALIGN_LEFT);

                addRow(table, "Valor Principal", formatCurrency(guia.getValorPrincipal()), headerFont, cellFont);
                addRow(table, "Multa", formatCurrency(guia.getValorMulta()), headerFont, cellFont);
                addRow(table, "Juros", formatCurrency(guia.getValorJuros()), headerFont, cellFont);
                addRow(table, "VALOR TOTAL", formatCurrency(guia.getValorTotal()), headerFont, boldFont);

                doc.add(table);
                doc.add(new Paragraph(" "));

                if (guia.getCodigoReceita() != null) {
                    doc.add(new Paragraph("Código Receita: " + guia.getCodigoReceita(), cellFont));
                }
                if (guia.getCodigoBarras() != null) {
                    doc.add(new Paragraph("Código de Barras: " + guia.getCodigoBarras(), cellFont));
                }
                if (guia.getLinhaDigitavel() != null) {
                    doc.add(new Paragraph("Linha Digitável: " + guia.getLinhaDigitavel(), boldFont));
                }
            }

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar PDF em lote: " + e.getMessage(), e);
        }
    }

    public List<GuiaFiscal> listarPorCompetencia(String competencia) {
        return mongoTemplate.find(
                Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                        .and("competencia").is(competencia)),
                GuiaFiscal.class);
    }

    private GuiaFiscal gerarGuia(TipoGuia tipo, String competencia, String tenantId, String empresaId) {
        BigDecimal valorPrincipal = calcularValorGuia(tipo, competencia, tenantId, empresaId);

        GuiaFiscal guia = GuiaFiscal.builder()
                .tipo(tipo)
                .competencia(competencia)
                .valorPrincipal(valorPrincipal)
                .valorMulta(BigDecimal.ZERO)
                .valorJuros(BigDecimal.ZERO)
                .valorTotal(valorPrincipal)
                .dataVencimento(calcularVencimento(tipo, competencia))
                .status(StatusGuia.GERADA)
                .codigoReceita(getCodigoReceita(tipo))
                .codigoBarras(gerarCodigoBarras(tipo, valorPrincipal))
                .linhaDigitavel(gerarLinhaDigitavel(tipo, valorPrincipal))
                .build();
        guia.setTenantId(tenantId);
        guia.setEmpresaId(empresaId);

        return mongoTemplate.save(guia);
    }

    private BigDecimal calcularValorGuia(TipoGuia tipo, String competencia, String tenantId, String empresaId) {
        // Em produção, calcular baseado nos lançamentos contábeis/fiscais
        return BigDecimal.ZERO;
    }

    private LocalDate calcularVencimento(TipoGuia tipo, String competencia) {
        String[] parts = competencia.split("-");
        int ano = Integer.parseInt(parts[0]);
        int mes = Integer.parseInt(parts[1]);
        return switch (tipo) {
            case DARF -> LocalDate.of(ano, mes, 1).plusMonths(1).withDayOfMonth(20);
            case GPS -> LocalDate.of(ano, mes, 1).plusMonths(1).withDayOfMonth(20);
            case DAS -> LocalDate.of(ano, mes, 1).plusMonths(1).withDayOfMonth(20);
            default -> LocalDate.of(ano, mes, 1).plusMonths(1).withDayOfMonth(20);
        };
    }

    private String getCodigoReceita(TipoGuia tipo) {
        return switch (tipo) {
            case DARF -> "1708";
            case GPS -> "2100";
            case DAS -> "DAS";
            default -> "";
        };
    }

    private String gerarCodigoBarras(TipoGuia tipo, BigDecimal valor) {
        return "85890000" + String.format("%011d", valor.movePointRight(2).longValue()) + "00000000000000000000000000";
    }

    private String gerarLinhaDigitavel(TipoGuia tipo, BigDecimal valor) {
        String cb = gerarCodigoBarras(tipo, valor);
        return cb.substring(0, 11) + " " + cb.substring(11, 22) + " " + cb.substring(22, 33) + " " + cb.substring(33);
    }

    private void addRow(PdfPTable table, String label, String valor, Font labelFont, Font valorFont) {
        PdfPCell labelCell = new PdfPCell(new Phrase(label, labelFont));
        labelCell.setBackgroundColor(new Color(79, 70, 229));
        labelCell.setPadding(5);
        table.addCell(labelCell);
        PdfPCell valorCell = new PdfPCell(new Phrase(valor, valorFont));
        valorCell.setPadding(5);
        valorCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
        table.addCell(valorCell);
    }

    private String formatCurrency(BigDecimal valor) {
        if (valor == null) return "R$ 0,00";
        return String.format("R$ %,.2f", valor);
    }
}
