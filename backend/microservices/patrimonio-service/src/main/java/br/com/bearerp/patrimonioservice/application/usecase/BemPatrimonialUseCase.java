package br.com.bearerp.patrimonioservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.patrimonioservice.application.dto.BemPatrimonialResponse;
import br.com.bearerp.patrimonioservice.application.dto.CreateBemRequest;
import br.com.bearerp.patrimonioservice.domain.model.BemPatrimonial;
import br.com.bearerp.patrimonioservice.domain.model.MovimentacaoBem;
import br.com.bearerp.patrimonioservice.domain.repository.BemPatrimonialRepository;
import br.com.bearerp.patrimonioservice.domain.repository.MovimentacaoBemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service @RequiredArgsConstructor
public class BemPatrimonialUseCase {
    private final BemPatrimonialRepository bemRepository;
    private final MovimentacaoBemRepository movimentacaoRepository;

    public Page<BemPatrimonialResponse> listar(BemPatrimonial.StatusBem status, Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        Page<BemPatrimonial> page = status != null
                ? bemRepository.findByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, status, pageable)
                : bemRepository.findByTenantIdAndEmpresaId(tenantId, empresaId, pageable);
        return page.map(BemPatrimonialResponse::fromEntity);
    }

    public BemPatrimonialResponse buscarPorId(String id) {
        return bemRepository.findById(id).map(BemPatrimonialResponse::fromEntity)
                .orElseThrow(() -> new RuntimeException("Bem patrimonial não encontrado"));
    }

    public BemPatrimonialResponse criar(CreateBemRequest req) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        // Calcular taxa de depreciação se não informada
        BigDecimal taxa = req.getTaxaDepreciacaoAnual();
        if (taxa == null && req.getVidaUtilMeses() > 0) {
            taxa = BigDecimal.valueOf(100).divide(BigDecimal.valueOf(req.getVidaUtilMeses() / 12.0), 4, RoundingMode.HALF_UP);
        }
        if (taxa == null) {
            taxa = getTaxaPadrao(req.getGrupoContabil());
        }

        int vidaUtil = req.getVidaUtilMeses();
        if (vidaUtil <= 0) {
            vidaUtil = getVidaUtilPadrao(req.getGrupoContabil());
        }

        BigDecimal valorResidual = req.getValorResidual() != null ? req.getValorResidual() : BigDecimal.ZERO;

        BemPatrimonial bem = BemPatrimonial.builder()
                .tenantId(tenantId).empresaId(empresaId)
                .codigo(gerarCodigo()).descricao(req.getDescricao())
                .marca(req.getMarca()).modelo(req.getModelo()).numeroSerie(req.getNumeroSerie())
                .notaFiscal(req.getNotaFiscal())
                .fornecedorId(req.getFornecedorId()).fornecedorNome(req.getFornecedorNome())
                .grupoContabil(req.getGrupoContabil())
                .localId(req.getLocalId()).localDescricao(req.getLocalDescricao())
                .centroCustoId(req.getCentroCustoId()).responsavel(req.getResponsavel())
                .dataAquisicao(req.getDataAquisicao())
                .dataInicioDepreciacao(req.getDataInicioDepreciacao() != null ? req.getDataInicioDepreciacao() : req.getDataAquisicao())
                .valorAquisicao(req.getValorAquisicao())
                .valorResidual(valorResidual)
                .valorDepreciadoAcumulado(BigDecimal.ZERO)
                .valorAtual(req.getValorAquisicao())
                .vidaUtilMeses(vidaUtil).taxaDepreciacaoAnual(taxa)
                .metodoDepreciacao(req.getMetodoDepreciacao() != null ? req.getMetodoDepreciacao() : BemPatrimonial.MetodoDepreciacao.LINEAR)
                .contaContabilAtivoId(req.getContaContabilAtivoId())
                .contaContabilDepreciacaoId(req.getContaContabilDepreciacaoId())
                .contaContabilDespesaId(req.getContaContabilDespesaId())
                .status(BemPatrimonial.StatusBem.ATIVO)
                .observacao(req.getObservacao())
                .build();

        BemPatrimonial saved = bemRepository.save(bem);

        // Registrar movimentação de aquisição
        MovimentacaoBem mov = MovimentacaoBem.builder()
                .tenantId(tenantId).empresaId(empresaId)
                .bemId(saved.getId())
                .tipo(MovimentacaoBem.TipoMovimentacao.AQUISICAO)
                .data(req.getDataAquisicao())
                .descricao("Aquisição do bem: " + req.getDescricao())
                .valor(req.getValorAquisicao())
                .localDestinoId(req.getLocalId())
                .responsavelDestino(req.getResponsavel())
                .documentoReferencia(req.getNotaFiscal())
                .build();
        movimentacaoRepository.save(mov);

        return BemPatrimonialResponse.fromEntity(saved);
    }

    public BemPatrimonialResponse baixar(String id, MovimentacaoBem.TipoMovimentacao tipoBaixa, BigDecimal valorVenda, String observacao) {
        BemPatrimonial bem = bemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bem patrimonial não encontrado"));

        bem.setStatus(tipoBaixa == MovimentacaoBem.TipoMovimentacao.BAIXA_VENDA
                ? BemPatrimonial.StatusBem.VENDIDO : BemPatrimonial.StatusBem.BAIXADO);
        bem.setDataBaixa(java.time.LocalDate.now());

        MovimentacaoBem mov = MovimentacaoBem.builder()
                .tenantId(bem.getTenantId()).empresaId(bem.getEmpresaId())
                .bemId(id).tipo(tipoBaixa)
                .data(java.time.LocalDate.now())
                .descricao("Baixa: " + tipoBaixa.name())
                .valor(valorVenda != null ? valorVenda : bem.getValorAtual())
                .observacao(observacao).build();
        movimentacaoRepository.save(mov);

        return BemPatrimonialResponse.fromEntity(bemRepository.save(bem));
    }

    public BemPatrimonialResponse transferir(String id, String novoLocalId, String novoLocalDescricao, String novoResponsavel) {
        BemPatrimonial bem = bemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Bem patrimonial não encontrado"));

        MovimentacaoBem mov = MovimentacaoBem.builder()
                .tenantId(bem.getTenantId()).empresaId(bem.getEmpresaId())
                .bemId(id).tipo(MovimentacaoBem.TipoMovimentacao.TRANSFERENCIA)
                .data(java.time.LocalDate.now())
                .descricao("Transferência de local")
                .localOrigemId(bem.getLocalId()).localDestinoId(novoLocalId)
                .responsavelOrigem(bem.getResponsavel()).responsavelDestino(novoResponsavel)
                .build();
        movimentacaoRepository.save(mov);

        bem.setLocalId(novoLocalId);
        bem.setLocalDescricao(novoLocalDescricao);
        bem.setResponsavel(novoResponsavel);
        return BemPatrimonialResponse.fromEntity(bemRepository.save(bem));
    }

    // Taxas padrão RFB (IN SRF 162/1998)
    private BigDecimal getTaxaPadrao(BemPatrimonial.GrupoContabil grupo) {
        return switch (grupo) {
            case IMOVEIS -> BigDecimal.valueOf(4); // 4% a.a. (25 anos)
            case VEICULOS -> BigDecimal.valueOf(20); // 20% a.a. (5 anos)
            case MAQUINAS_EQUIPAMENTOS -> BigDecimal.valueOf(10); // 10% a.a. (10 anos)
            case MOVEIS_UTENSILIOS -> BigDecimal.valueOf(10); // 10% a.a. (10 anos)
            case EQUIPAMENTOS_INFORMATICA -> BigDecimal.valueOf(20); // 20% a.a. (5 anos)
            case INSTALACOES -> BigDecimal.valueOf(10); // 10% a.a. (10 anos)
            case MARCAS_PATENTES -> BigDecimal.valueOf(10);
            case BENFEITORIAS -> BigDecimal.valueOf(4);
            case TERRENOS -> BigDecimal.ZERO; // Terrenos não depreciam
            case OUTROS -> BigDecimal.valueOf(10);
        };
    }

    private int getVidaUtilPadrao(BemPatrimonial.GrupoContabil grupo) {
        return switch (grupo) {
            case IMOVEIS, BENFEITORIAS -> 300; // 25 anos
            case VEICULOS, EQUIPAMENTOS_INFORMATICA -> 60; // 5 anos
            case MAQUINAS_EQUIPAMENTOS, MOVEIS_UTENSILIOS, INSTALACOES, MARCAS_PATENTES, OUTROS -> 120; // 10 anos
            case TERRENOS -> 0;
        };
    }

    private String gerarCodigo() {
        return "PAT-" + System.currentTimeMillis();
    }
}
