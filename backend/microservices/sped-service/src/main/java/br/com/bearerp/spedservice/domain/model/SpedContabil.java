package br.com.bearerp.spedservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "sped_contabil")
@CompoundIndex(name = "idx_tenant_empresa_ano", def = "{'tenantId': 1, 'empresaId': 1, 'ano': 1}", unique = true)
public class SpedContabil extends BaseDocument {
    private int ano;
    private LocalDate dataInicio;
    private LocalDate dataFim;
    private TipoEscrituracao tipoEscrituracao; // G-Livro Diário Geral, R-Resumo Diário, A-Auxiliar, B-Balancetes, Z-Razão Auxiliar
    private SpedFiscal.StatusSped status;
    private String hashArquivo;
    private String protocoloRecibo;
    private Instant dataTransmissao;
    private String nomeArquivo;
    private long tamanhoArquivo;
    private int totalRegistros;
    private String situacaoEspecial; // null, ABERTURA, CISAO, FUSAO, INCORPORACAO, ENCERRAMENTO
    private String observacao;

    public enum TipoEscrituracao { G, R, A, B, Z }
}
