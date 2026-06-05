package br.com.bearerp.integracoesservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.integracoesservice.domain.model.ImportacaoMigracao;
import br.com.bearerp.integracoesservice.domain.model.ImportacaoMigracao.*;
import br.com.bearerp.integracoesservice.domain.repository.ImportacaoMigracaoRepository;
import br.com.bearerp.integracoesservice.infrastructure.migration.MigrationParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ImportacaoMigracaoUseCase {

    private final ImportacaoMigracaoRepository repository;
    private final List<MigrationParser> parsers;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public ImportacaoMigracao iniciarImportacao(String sistemaOrigem, TipoImportacao tipo,
                                                 MultipartFile arquivo, Map<String, String> mapeamento) {
        ImportacaoMigracao importacao = ImportacaoMigracao.builder()
                .sistemaOrigem(sistemaOrigem.toUpperCase())
                .tipo(tipo)
                .status(StatusImportacao.PENDENTE)
                .nomeArquivo(arquivo.getOriginalFilename())
                .formatoArquivo(detectarFormato(arquivo.getOriginalFilename()))
                .tamanhoBytes(arquivo.getSize())
                .mapeamentoCampos(mapeamento != null ? mapeamento : new HashMap<>())
                .mapeamentoContas(new HashMap<>())
                .logs(new ArrayList<>())
                .totalRegistros(0)
                .registrosImportados(0)
                .registrosComErro(0)
                .registrosIgnorados(0)
                .percentualConcluido(0)
                .sobrescreverExistentes(false)
                .validarAntesDeImportar(true)
                .build();
        importacao.setTenantId(TenantContext.getTenantId());
        importacao.setEmpresaId(TenantContext.getEmpresaId());

        importacao = repository.save(importacao);
        return importacao;
    }

    @Async
    public void processarImportacao(String importacaoId, InputStream arquivo) {
        ImportacaoMigracao importacao = repository.findById(importacaoId)
                .orElseThrow(() -> new RuntimeException("Importação não encontrada"));

        importacao.setStatus(StatusImportacao.VALIDANDO);
        importacao.setIniciadoEm(Instant.now());
        repository.save(importacao);

        try {
            MigrationParser parser = getParser(importacao.getSistemaOrigem());
            List<Map<String, Object>> dados = parsearDados(parser, importacao.getTipo(), arquivo);

            importacao.setTotalRegistros(dados.size());
            importacao.setStatus(StatusImportacao.IMPORTANDO);
            repository.save(importacao);

            int importados = 0;
            int erros = 0;
            List<LogImportacao> logs = new ArrayList<>();

            for (int i = 0; i < dados.size(); i++) {
                try {
                    Map<String, Object> registro = dados.get(i);
                    aplicarMapeamento(registro, importacao.getMapeamentoCampos());
                    enviarParaServico(importacao.getTipo(), registro, importacao.getTenantId(), importacao.getEmpresaId());
                    importados++;
                } catch (Exception e) {
                    erros++;
                    logs.add(LogImportacao.builder()
                            .linha(i + 1)
                            .mensagem(e.getMessage())
                            .nivel(NivelLog.ERRO)
                            .build());
                }

                if (i % 100 == 0) {
                    importacao.setRegistrosImportados(importados);
                    importacao.setRegistrosComErro(erros);
                    importacao.setPercentualConcluido((double) (i + 1) / dados.size() * 100);
                    repository.save(importacao);
                }
            }

            importacao.setRegistrosImportados(importados);
            importacao.setRegistrosComErro(erros);
            importacao.setLogs(logs);
            importacao.setPercentualConcluido(100);
            importacao.setStatus(erros > 0 ? StatusImportacao.CONCLUIDA_COM_ERROS : StatusImportacao.CONCLUIDA);
            importacao.setFinalizadoEm(Instant.now());
            repository.save(importacao);

            kafkaTemplate.send("bear.migracao.concluida", importacaoId, Map.of(
                    "importacaoId", importacaoId,
                    "tipo", importacao.getTipo().name(),
                    "importados", importados,
                    "erros", erros
            ));

            log.info("Importação {} concluída: {}/{} registros", importacaoId, importados, dados.size());

        } catch (Exception e) {
            importacao.setStatus(StatusImportacao.FALHA);
            importacao.setFinalizadoEm(Instant.now());
            importacao.getLogs().add(LogImportacao.builder()
                    .mensagem("Erro fatal: " + e.getMessage())
                    .nivel(NivelLog.ERRO)
                    .build());
            repository.save(importacao);
            log.error("Falha na importação {}: {}", importacaoId, e.getMessage(), e);
        }
    }

    public ImportacaoMigracao consultarProgresso(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Importação não encontrada"));
    }

    public Page<ImportacaoMigracao> listar(Pageable pageable) {
        return repository.findByTenantId(TenantContext.getTenantId(), pageable);
    }

    public void cancelar(String id) {
        ImportacaoMigracao importacao = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Importação não encontrada"));
        importacao.setStatus(StatusImportacao.CANCELADA);
        repository.save(importacao);
    }

    public Map<String, Object> preVisualizarArquivo(String sistemaOrigem, String tipo, InputStream arquivo) {
        MigrationParser parser = getParser(sistemaOrigem);
        List<Map<String, Object>> dados = parsearDados(parser, TipoImportacao.valueOf(tipo), arquivo);
        Map<String, Object> preview = new LinkedHashMap<>();
        preview.put("totalRegistros", dados.size());
        preview.put("amostra", dados.subList(0, Math.min(10, dados.size())));
        if (!dados.isEmpty()) {
            preview.put("campos", dados.get(0).keySet());
        }
        return preview;
    }

    private MigrationParser getParser(String sistemaOrigem) {
        return parsers.stream()
                .filter(p -> p.getSistemaOrigem().equalsIgnoreCase(sistemaOrigem))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Parser não encontrado para sistema: " + sistemaOrigem));
    }

    private List<Map<String, Object>> parsearDados(MigrationParser parser, TipoImportacao tipo, InputStream arquivo) {
        return switch (tipo) {
            case PLANO_CONTAS -> parser.parsePlanoContas(arquivo);
            case LANCAMENTOS_CONTABEIS -> parser.parseLancamentos(arquivo);
            case SALDOS_CONTABEIS -> parser.parseSaldos(arquivo);
            case CLIENTES -> parser.parseClientes(arquivo);
            case FORNECEDORES -> parser.parseFornecedores(arquivo);
            case CADASTRO_EMPRESAS -> parser.parseEmpresas(arquivo);
            default -> parser.parsePlanoContas(arquivo);
        };
    }

    private void aplicarMapeamento(Map<String, Object> registro, Map<String, String> mapeamento) {
        if (mapeamento == null || mapeamento.isEmpty()) return;
        Map<String, Object> mapeados = new LinkedHashMap<>();
        registro.forEach((key, value) -> {
            String novoKey = mapeamento.getOrDefault(key, key);
            mapeados.put(novoKey, value);
        });
        registro.clear();
        registro.putAll(mapeados);
    }

    private void enviarParaServico(TipoImportacao tipo, Map<String, Object> registro,
                                    String tenantId, String empresaId) {
        registro.put("tenantId", tenantId);
        registro.put("empresaId", empresaId);

        String topico = switch (tipo) {
            case PLANO_CONTAS -> "bear.migracao.plano-contas";
            case LANCAMENTOS_CONTABEIS -> "bear.migracao.lancamentos";
            case SALDOS_CONTABEIS -> "bear.migracao.saldos";
            case CLIENTES -> "bear.migracao.clientes";
            case FORNECEDORES -> "bear.migracao.fornecedores";
            case CADASTRO_EMPRESAS -> "bear.migracao.empresas";
            default -> "bear.migracao.generico";
        };

        kafkaTemplate.send(topico, registro);
    }

    private String detectarFormato(String nomeArquivo) {
        if (nomeArquivo == null) return "DESCONHECIDO";
        String lower = nomeArquivo.toLowerCase();
        if (lower.endsWith(".csv")) return "CSV";
        if (lower.endsWith(".xml")) return "XML";
        if (lower.endsWith(".txt")) return "TXT";
        if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) return "XLSX";
        return "DESCONHECIDO";
    }
}
