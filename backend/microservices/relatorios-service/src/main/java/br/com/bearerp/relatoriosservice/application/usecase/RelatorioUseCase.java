package br.com.bearerp.relatoriosservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.relatoriosservice.domain.model.Relatorio;
import br.com.bearerp.relatoriosservice.domain.model.Relatorio.*;
import br.com.bearerp.relatoriosservice.domain.repository.RelatorioRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Service @RequiredArgsConstructor
public class RelatorioUseCase {
    private final RelatorioRepository repository;

    public Relatorio solicitar(String titulo, TipoRelatorio tipo, FormatoRelatorio formato,
                               String periodoInicio, String periodoFim, Map<String, Object> parametros) {
        Relatorio rel = Relatorio.builder()
                .tenantId(TenantContext.getTenantId()).empresaId(TenantContext.getEmpresaId())
                .titulo(titulo).tipo(tipo).formato(formato).status(StatusRelatorio.SOLICITADO)
                .periodoInicio(periodoInicio).periodoFim(periodoFim)
                .parametros(parametros != null ? parametros : new HashMap<>())
                .build();
        rel = repository.save(rel);
        return processar(rel);
    }

    public Page<Relatorio> listar(Pageable pageable) {
        return repository.findByTenantIdAndEmpresaId(
                TenantContext.getTenantId(), TenantContext.getEmpresaId(), pageable);
    }

    public Relatorio buscarPorId(String id) {
        return repository.findById(id).orElseThrow(() -> new RuntimeException("Relatório não encontrado"));
    }

    public Map<String, Object> gerarDashboard(String periodo) {
        Map<String, Object> dashboard = new HashMap<>();

        // Indicadores gerenciais simulados (em produção, buscaria dos demais microserviços)
        dashboard.put("receitaBruta", 450000.00);
        dashboard.put("despesasTotais", 320000.00);
        dashboard.put("lucroLiquido", 130000.00);
        dashboard.put("margemLucro", 28.89);
        dashboard.put("contasPagarVencidas", 12);
        dashboard.put("contasReceberVencidas", 8);
        dashboard.put("totalFuncionarios", 45);
        dashboard.put("folhaPagamento", 180000.00);
        dashboard.put("impostosMes", 67500.00);
        dashboard.put("saldoBancario", 285000.00);
        dashboard.put("periodo", periodo);

        // Evolução mensal (últimos 6 meses)
        dashboard.put("evolucaoReceita", new double[]{380000, 395000, 410000, 425000, 440000, 450000});
        dashboard.put("evolucaoDespesa", new double[]{290000, 300000, 305000, 310000, 315000, 320000});
        dashboard.put("meses", new String[]{"Out", "Nov", "Dez", "Jan", "Fev", "Mar"});

        return dashboard;
    }

    private Relatorio processar(Relatorio rel) {
        long inicio = System.currentTimeMillis();
        try {
            rel.setStatus(StatusRelatorio.PROCESSANDO);
            repository.save(rel);

            Map<String, Object> resultado = new HashMap<>();
            resultado.put("geradoEm", Instant.now().toString());
            resultado.put("tipo", rel.getTipo().name());
            resultado.put("periodo", rel.getPeriodoInicio() + " a " + rel.getPeriodoFim());
            resultado.put("formato", rel.getFormato().name());
            resultado.put("mensagem", "Relatório gerado com sucesso");

            rel.setResultado(resultado);
            rel.setStatus(StatusRelatorio.CONCLUIDO);
            rel.setDataGeracao(Instant.now());
        } catch (Exception e) {
            rel.setStatus(StatusRelatorio.ERRO);
            rel.setErroMensagem(e.getMessage());
        }
        rel.setTempoProcessamentoMs(System.currentTimeMillis() - inicio);
        return repository.save(rel);
    }
}
