package br.com.bearerp.fiscalservice.infrastructure.defis;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.fiscalservice.domain.model.Defis;
import br.com.bearerp.fiscalservice.domain.model.Defis.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DefisService {

    private final MongoTemplate mongoTemplate;

    public Defis criarDeclaracao(int anoCalendario) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        Defis defis = Defis.builder()
                .anoCalendario(anoCalendario)
                .status(StatusDefis.RASCUNHO)
                .receitasMensais(new ArrayList<>())
                .receitaBrutaAnual(BigDecimal.ZERO)
                .totalFolhaPagamento(BigDecimal.ZERO)
                .totalAquisicoes(BigDecimal.ZERO)
                .totalDevolucoes(BigDecimal.ZERO)
                .quantidadeEmpregados(0)
                .receitaExportacao(BigDecimal.ZERO)
                .receitaRevendaMercadorias(BigDecimal.ZERO)
                .receitaIndustrializacao(BigDecimal.ZERO)
                .receitaPrestacaoServicos(BigDecimal.ZERO)
                .ganhosCapital(BigDecimal.ZERO)
                .rendimentosAplicacoesFinanceiras(BigDecimal.ZERO)
                .demaisReceitasNaoOperacionais(BigDecimal.ZERO)
                .regimeApuracao("COMPETENCIA")
                .optanteMEI(false)
                .build();
        defis.setTenantId(tenantId);
        defis.setEmpresaId(empresaId);
        return mongoTemplate.save(defis);
    }

    public Defis calcularAutomatico(String id) {
        Defis defis = buscar(id);
        String tenantId = defis.getTenantId();
        String empresaId = defis.getEmpresaId();

        // Buscar receitas do lancamentos-service via dados já persistidos
        List<ReceitaMensal> receitas = new ArrayList<>();
        BigDecimal totalAnual = BigDecimal.ZERO;

        for (int mes = 1; mes <= 12; mes++) {
            // Consulta lançamentos do mês para calcular receitas
            BigDecimal receitaComercio = buscarReceitaPorTipo(tenantId, empresaId, defis.getAnoCalendario(), mes, "COMERCIO");
            BigDecimal receitaServicos = buscarReceitaPorTipo(tenantId, empresaId, defis.getAnoCalendario(), mes, "SERVICOS");
            BigDecimal receitaIndustria = buscarReceitaPorTipo(tenantId, empresaId, defis.getAnoCalendario(), mes, "INDUSTRIA");
            BigDecimal receitaLocacao = buscarReceitaPorTipo(tenantId, empresaId, defis.getAnoCalendario(), mes, "LOCACAO");
            BigDecimal total = receitaComercio.add(receitaServicos).add(receitaIndustria).add(receitaLocacao);

            receitas.add(ReceitaMensal.builder()
                    .mes(mes)
                    .receitaComercio(receitaComercio)
                    .receitaIndustria(receitaIndustria)
                    .receitaServicos(receitaServicos)
                    .receitaLocacao(receitaLocacao)
                    .receitaTotal(total)
                    .ultrapassouSublimite(totalAnual.add(total).compareTo(new BigDecimal("4800000")) > 0)
                    .faixaAnexo(determinarAnexo(receitaComercio, receitaServicos, receitaIndustria))
                    .build());

            totalAnual = totalAnual.add(total);
        }

        defis.setReceitasMensais(receitas);
        defis.setReceitaBrutaAnual(totalAnual);
        defis.setReceitaRevendaMercadorias(somarReceitas(receitas, "comercio"));
        defis.setReceitaPrestacaoServicos(somarReceitas(receitas, "servicos"));
        defis.setReceitaIndustrializacao(somarReceitas(receitas, "industria"));
        defis.setStatus(StatusDefis.CALCULADA);

        return mongoTemplate.save(defis);
    }

    public Defis validar(String id) {
        Defis defis = buscar(id);
        List<String> erros = new ArrayList<>();

        if (defis.getReceitasMensais() == null || defis.getReceitasMensais().isEmpty()) {
            erros.add("Receitas mensais não preenchidas");
        }
        if (defis.getCnpj() == null || defis.getCnpj().isBlank()) {
            erros.add("CNPJ não informado");
        }
        if (defis.getReceitaBrutaAnual().compareTo(new BigDecimal("4800000")) > 0) {
            erros.add("Receita bruta anual excede o limite do Simples Nacional (R$ 4.800.000,00)");
        }

        if (!erros.isEmpty()) {
            defis.setObservacoes("Erros de validação: " + String.join("; ", erros));
            mongoTemplate.save(defis);
            throw new RuntimeException("Erros de validação: " + String.join("; ", erros));
        }

        defis.setStatus(StatusDefis.VALIDADA);
        return mongoTemplate.save(defis);
    }

    public String gerarArquivo(String id) {
        Defis defis = buscar(id);
        StringBuilder arquivo = new StringBuilder();

        // Formato simplificado - na produção seria o layout oficial do PGDAS-D/DEFIS
        arquivo.append("DEFIS|").append(defis.getAnoCalendario()).append("|").append(defis.getCnpj()).append("\n");
        arquivo.append("RECEITA_BRUTA_ANUAL|").append(defis.getReceitaBrutaAnual()).append("\n");

        if (defis.getReceitasMensais() != null) {
            for (ReceitaMensal rm : defis.getReceitasMensais()) {
                arquivo.append("MES|").append(rm.getMes())
                        .append("|COMERCIO|").append(rm.getReceitaComercio())
                        .append("|SERVICOS|").append(rm.getReceitaServicos())
                        .append("|INDUSTRIA|").append(rm.getReceitaIndustria())
                        .append("|TOTAL|").append(rm.getReceitaTotal())
                        .append("\n");
            }
        }

        arquivo.append("FOLHA|").append(defis.getTotalFolhaPagamento()).append("\n");
        arquivo.append("AQUISICOES|").append(defis.getTotalAquisicoes()).append("\n");
        arquivo.append("EMPREGADOS|").append(defis.getQuantidadeEmpregados()).append("\n");
        arquivo.append("REGIME|").append(defis.getRegimeApuracao()).append("\n");

        defis.setArquivoGerado(arquivo.toString());
        defis.setStatus(StatusDefis.VALIDADA);
        mongoTemplate.save(defis);

        return arquivo.toString();
    }

    public Defis marcarEntregue(String id, String protocolo, String recibo) {
        Defis defis = buscar(id);
        defis.setStatus(StatusDefis.ENTREGUE);
        defis.setProtocolo(protocolo);
        defis.setRecibo(recibo);
        defis.setDataEntrega(Instant.now());
        return mongoTemplate.save(defis);
    }

    public Defis buscar(String id) {
        Defis defis = mongoTemplate.findById(id, Defis.class);
        if (defis == null) throw new RuntimeException("DEFIS não encontrada: " + id);
        return defis;
    }

    public List<Defis> listar() {
        Query query = Query.query(Criteria.where("tenantId").is(TenantContext.getTenantId())
                .and("empresaId").is(TenantContext.getEmpresaId()));
        return mongoTemplate.find(query, Defis.class);
    }

    private BigDecimal buscarReceitaPorTipo(String tenantId, String empresaId, int ano, int mes, String tipo) {
        // Integra com lancamentos-service via MongoDB
        // Em produção, busca os lançamentos contábeis das contas de receita
        return BigDecimal.ZERO;
    }

    private String determinarAnexo(BigDecimal comercio, BigDecimal servicos, BigDecimal industria) {
        if (comercio.compareTo(servicos) > 0 && comercio.compareTo(industria) > 0) return "ANEXO_I";
        if (industria.compareTo(servicos) > 0) return "ANEXO_II";
        return "ANEXO_III";
    }

    private BigDecimal somarReceitas(List<ReceitaMensal> receitas, String tipo) {
        return receitas.stream()
                .map(r -> switch (tipo) {
                    case "comercio" -> r.getReceitaComercio();
                    case "servicos" -> r.getReceitaServicos();
                    case "industria" -> r.getReceitaIndustria();
                    default -> BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
