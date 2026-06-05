package br.com.bearerp.integracoesservice.infrastructure.migration;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

public interface MigrationParser {
    String getSistemaOrigem();
    List<Map<String, Object>> parsePlanoContas(InputStream file);
    List<Map<String, Object>> parseLancamentos(InputStream file);
    List<Map<String, Object>> parseSaldos(InputStream file);
    List<Map<String, Object>> parseClientes(InputStream file);
    List<Map<String, Object>> parseFornecedores(InputStream file);
    List<Map<String, Object>> parseEmpresas(InputStream file);
}
