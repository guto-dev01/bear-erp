package br.com.bearerp.patrimonioservice.application.dto;

import br.com.bearerp.patrimonioservice.domain.model.Depreciacao;
import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @Builder
public class DepreciacaoResponse {
    private String id;
    private String bemId;
    private String competencia;
    private LocalDate dataCalculo;
    private BigDecimal valorDepreciacao;
    private BigDecimal depreciacaoAcumulada;
    private BigDecimal valorResidualAtual;
    private BigDecimal taxaAplicada;
    private int mesVidaUtil;
    private boolean contabilizado;

    public static DepreciacaoResponse fromEntity(Depreciacao e) {
        return DepreciacaoResponse.builder()
                .id(e.getId()).bemId(e.getBemId()).competencia(e.getCompetencia())
                .dataCalculo(e.getDataCalculo()).valorDepreciacao(e.getValorDepreciacao())
                .depreciacaoAcumulada(e.getDepreciacaoAcumulada())
                .valorResidualAtual(e.getValorResidualAtual())
                .taxaAplicada(e.getTaxaAplicada()).mesVidaUtil(e.getMesVidaUtil())
                .contabilizado(e.isContabilizado()).build();
    }
}
