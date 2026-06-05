package br.com.bearerp.relatoriosservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.relatoriosservice.domain.model.RelatorioCustomizado;
import br.com.bearerp.relatoriosservice.domain.model.RelatorioCustomizado.*;
import br.com.bearerp.relatoriosservice.domain.repository.RelatorioCustomizadoRepository;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
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
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RelatorioCustomizadoUseCase {

    private final RelatorioCustomizadoRepository repository;
    private final MongoTemplate mongoTemplate;

    public RelatorioCustomizado criar(RelatorioCustomizado relatorio) {
        relatorio.setTenantId(TenantContext.getTenantId());
        relatorio.setEmpresaId(TenantContext.getEmpresaId());
        return repository.save(relatorio);
    }

    public RelatorioCustomizado atualizar(String id, RelatorioCustomizado relatorio) {
        RelatorioCustomizado existente = buscar(id);
        relatorio.setId(existente.getId());
        relatorio.setTenantId(existente.getTenantId());
        relatorio.setEmpresaId(existente.getEmpresaId());
        return repository.save(relatorio);
    }

    public List<Map<String, Object>> executarConsulta(String id) {
        RelatorioCustomizado relatorio = buscar(id);
        Query query = buildQuery(relatorio);

        List<Document> docs = mongoTemplate.find(query, Document.class, relatorio.getCollectionOrigem());
        List<String> camposVisiveis = relatorio.getCampos().stream()
                .filter(CampoRelatorio::isVisivel)
                .map(CampoRelatorio::getCampo)
                .toList();

        return docs.stream()
                .map(doc -> {
                    Map<String, Object> row = new java.util.LinkedHashMap<>();
                    for (String campo : camposVisiveis) {
                        row.put(campo, doc.get(campo));
                    }
                    return row;
                })
                .collect(Collectors.toList());
    }

    public byte[] gerarPdf(String id) {
        RelatorioCustomizado relatorio = buscar(id);
        List<Map<String, Object>> dados = executarConsulta(id);
        List<CampoRelatorio> camposVisiveis = relatorio.getCampos().stream()
                .filter(CampoRelatorio::isVisivel).toList();

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            com.lowagie.text.Document doc = new com.lowagie.text.Document(
                    "LANDSCAPE".equals(relatorio.getOrientacao()) ? PageSize.A4.rotate() : PageSize.A4,
                    36, 36, 60, 40);
            PdfWriter.getInstance(doc, baos);
            doc.open();

            Font titleFont = new Font(Font.HELVETICA, 16, Font.BOLD, new Color(79, 70, 229));
            Font headerFont = new Font(Font.HELVETICA, 9, Font.BOLD, Color.WHITE);
            Font cellFont = new Font(Font.HELVETICA, 8, Font.NORMAL);

            // Título
            Paragraph titulo = new Paragraph(relatorio.getNome(), titleFont);
            titulo.setAlignment(Element.ALIGN_CENTER);
            titulo.setSpacingAfter(10);
            doc.add(titulo);

            if (relatorio.getDescricao() != null) {
                Paragraph desc = new Paragraph(relatorio.getDescricao(),
                        new Font(Font.HELVETICA, 10, Font.ITALIC, Color.GRAY));
                desc.setAlignment(Element.ALIGN_CENTER);
                desc.setSpacingAfter(15);
                doc.add(desc);
            }

            // Tabela
            PdfPTable table = new PdfPTable(camposVisiveis.size());
            table.setWidthPercentage(100);

            // Headers
            for (CampoRelatorio campo : camposVisiveis) {
                PdfPCell cell = new PdfPCell(new Phrase(campo.getTitulo(), headerFont));
                cell.setBackgroundColor(new Color(79, 70, 229));
                cell.setPadding(6);
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                table.addCell(cell);
            }

            // Dados
            boolean zebra = false;
            for (Map<String, Object> row : dados) {
                for (CampoRelatorio campo : camposVisiveis) {
                    Object valor = row.get(campo.getCampo());
                    String texto = formatarValor(valor, campo);
                    PdfPCell cell = new PdfPCell(new Phrase(texto, cellFont));
                    if (zebra) cell.setBackgroundColor(new Color(245, 245, 250));
                    cell.setPadding(4);
                    if ("RIGHT".equals(campo.getAlinhamento())) cell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                    table.addCell(cell);
                }
                zebra = !zebra;
            }

            doc.add(table);

            // Rodapé
            Paragraph rodape = new Paragraph(
                    "Bear ERP - Gerado em " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) +
                    " | Total: " + dados.size() + " registros",
                    new Font(Font.HELVETICA, 8, Font.ITALIC, Color.GRAY));
            rodape.setAlignment(Element.ALIGN_RIGHT);
            rodape.setSpacingBefore(10);
            doc.add(rodape);

            doc.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao gerar PDF: " + e.getMessage(), e);
        }
    }

    public String gerarCsv(String id) {
        RelatorioCustomizado relatorio = buscar(id);
        List<Map<String, Object>> dados = executarConsulta(id);
        List<CampoRelatorio> campos = relatorio.getCampos().stream()
                .filter(CampoRelatorio::isVisivel).toList();

        StringBuilder csv = new StringBuilder();
        csv.append(campos.stream().map(CampoRelatorio::getTitulo).collect(Collectors.joining(";"))).append("\n");
        for (Map<String, Object> row : dados) {
            csv.append(campos.stream()
                    .map(c -> String.valueOf(row.getOrDefault(c.getCampo(), "")))
                    .collect(Collectors.joining(";"))).append("\n");
        }
        return csv.toString();
    }

    public Page<RelatorioCustomizado> listar(Pageable pageable) {
        return repository.findByTenantId(TenantContext.getTenantId(), pageable);
    }

    public RelatorioCustomizado buscar(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Relatório não encontrado: " + id));
    }

    public void excluir(String id) {
        repository.deleteById(id);
    }

    private Query buildQuery(RelatorioCustomizado relatorio) {
        Query query = new Query();
        query.addCriteria(Criteria.where("tenantId").is(TenantContext.getTenantId()));
        query.addCriteria(Criteria.where("empresaId").is(TenantContext.getEmpresaId()));

        if (relatorio.getFiltros() != null) {
            for (FiltroRelatorio filtro : relatorio.getFiltros()) {
                Criteria criteria = switch (filtro.getOperador()) {
                    case "IGUAL" -> Criteria.where(filtro.getCampo()).is(filtro.getValor());
                    case "DIFERENTE" -> Criteria.where(filtro.getCampo()).ne(filtro.getValor());
                    case "MAIOR" -> Criteria.where(filtro.getCampo()).gt(filtro.getValor());
                    case "MENOR" -> Criteria.where(filtro.getCampo()).lt(filtro.getValor());
                    case "ENTRE" -> Criteria.where(filtro.getCampo()).gte(filtro.getValor()).lte(filtro.getValorFim());
                    case "CONTEM" -> Criteria.where(filtro.getCampo()).regex(filtro.getValor(), "i");
                    case "COMECA_COM" -> Criteria.where(filtro.getCampo()).regex("^" + filtro.getValor(), "i");
                    default -> Criteria.where(filtro.getCampo()).is(filtro.getValor());
                };
                query.addCriteria(criteria);
            }
        }

        if (relatorio.getOrdenacao() != null) {
            for (OrdenacaoRelatorio ord : relatorio.getOrdenacao()) {
                query.with(Sort.by("ASC".equals(ord.getDirecao()) ? Sort.Direction.ASC : Sort.Direction.DESC, ord.getCampo()));
            }
        }

        query.limit(10000); // Limite de segurança
        return query;
    }

    private String formatarValor(Object valor, CampoRelatorio campo) {
        if (valor == null) return "";
        if ("CURRENCY".equals(campo.getTipo()) && valor instanceof Number) {
            return String.format("R$ %,.2f", ((Number) valor).doubleValue());
        }
        return String.valueOf(valor);
    }
}
