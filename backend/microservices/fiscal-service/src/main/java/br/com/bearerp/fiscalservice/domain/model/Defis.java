package br.com.bearerp.fiscalservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "defis")
@CompoundIndex(name = "idx_tenant_empresa_ano", def = "{'tenantId': 1, 'empresaId': 1, 'anoCalendario': 1}", unique = true)
public class Defis extends BaseDocument {

    private int anoCalendario;
    private String cnpj;
    private String razaoSocial;
    private StatusDefis status;

    // Receitas brutas mensais
    private List<ReceitaMensal> receitasMensais;
    private BigDecimal receitaBrutaAnual;

    // Informações econômicas
    private BigDecimal totalFolhaPagamento;
    private BigDecimal totalAquisicoes;
    private BigDecimal totalDevolucoes;
    private int quantidadeEmpregados;

    // Dados do Simples
    private boolean optanteMEI;
    private String regimeApuracao; // CAIXA, COMPETENCIA

    // Exportação
    private BigDecimal receitaExportacao;
    private BigDecimal receitaRevendaMercadorias;
    private BigDecimal receitaIndustrializacao;
    private BigDecimal receitaPrestacaoServicos;

    // Ganhos de capital
    private BigDecimal ganhosCapital;
    private BigDecimal rendimentosAplicacoesFinanceiras;
    private BigDecimal demaisReceitasNaoOperacionais;

    // Controle
    private String arquivoGerado;
    private String protocolo;
    private String recibo;
    private Instant dataEntrega;
    private String observacoes;

    @Data @Builder @NoArgsConstructor @AllArgsConstructor
    public static class ReceitaMensal {
        private int mes;
        private BigDecimal receitaComercio;
        private BigDecimal receitaIndustria;
        private BigDecimal receitaServicos;
        private BigDecimal receitaLocacao;
        private BigDecimal receitaTotal;
        private boolean ultrapassouSublimite;
        private String faixaAnexo; // ANEXO_I, ANEXO_II, ANEXO_III, ANEXO_IV, ANEXO_V
    }

    public enum StatusDefis { RASCUNHO, CALCULADA, VALIDADA, ENTREGUE, RETIFICADA }
}
