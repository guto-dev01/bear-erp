package br.com.bearerp.empresa.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.empresa.application.dto.CreateProdutoRequest;
import br.com.bearerp.empresa.application.dto.ProdutoResponse;
import br.com.bearerp.empresa.domain.model.Produto;
import br.com.bearerp.empresa.domain.model.Produto.*;
import br.com.bearerp.empresa.domain.repository.ProdutoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProdutoUseCase {

    private final ProdutoRepository repository;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public ProdutoResponse criar(CreateProdutoRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        if (repository.existsByTenantIdAndEmpresaIdAndCodigo(tenantId, empresaId, request.getCodigo())) {
            throw new BusinessException("Já existe um produto com o código " + request.getCodigo());
        }

        Produto produto = Produto.builder()
                .codigo(request.getCodigo())
                .descricao(request.getDescricao())
                .tipo(TipoProduto.valueOf(request.getTipo()))
                .unidade(request.getUnidade())
                .ncm(request.getNcm())
                .cest(request.getCest())
                .cfopPadrao(request.getCfopPadrao())
                .precoVenda(request.getPrecoVenda() != null ? request.getPrecoVenda() : BigDecimal.ZERO)
                .custoMedio(request.getCustoMedio() != null ? request.getCustoMedio() : BigDecimal.ZERO)
                .estoqueAtual(request.getEstoqueAtual() != null ? request.getEstoqueAtual() : BigDecimal.ZERO)
                .estoqueMinimo(request.getEstoqueMinimo() != null ? request.getEstoqueMinimo() : BigDecimal.ZERO)
                .categoria(request.getCategoria())
                .marca(request.getMarca())
                .codigoBarras(request.getCodigoBarras())
                .pesoLiquido(request.getPesoLiquido())
                .pesoBruto(request.getPesoBruto())
                .origemMercadoria(request.getOrigemMercadoria())
                .status(StatusProduto.ATIVO)
                .build();
        produto.setTenantId(tenantId);
        produto.setEmpresaId(empresaId);

        produto = repository.save(produto);
        log.info("Produto criado: {} - {}", produto.getCodigo(), produto.getDescricao());

        kafkaTemplate.send("produto-events", Map.of(
                "event", "PRODUTO_CRIADO", "tenantId", tenantId,
                "produtoId", produto.getId(), "codigo", produto.getCodigo()));

        return toResponse(produto);
    }

    public ProdutoResponse atualizar(String id, CreateProdutoRequest request) {
        String tenantId = TenantContext.getTenantId();
        Produto produto = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produto não encontrado: " + id));

        if (!produto.getTenantId().equals(tenantId)) {
            throw new ResourceNotFoundException("Produto não encontrado: " + id);
        }

        produto.setDescricao(request.getDescricao());
        produto.setTipo(TipoProduto.valueOf(request.getTipo()));
        produto.setUnidade(request.getUnidade());
        produto.setNcm(request.getNcm());
        produto.setCest(request.getCest());
        produto.setCfopPadrao(request.getCfopPadrao());
        produto.setPrecoVenda(request.getPrecoVenda());
        produto.setCustoMedio(request.getCustoMedio());
        produto.setEstoqueMinimo(request.getEstoqueMinimo());
        produto.setCategoria(request.getCategoria());
        produto.setMarca(request.getMarca());
        produto.setCodigoBarras(request.getCodigoBarras());
        produto.setPesoLiquido(request.getPesoLiquido());
        produto.setPesoBruto(request.getPesoBruto());
        produto.setOrigemMercadoria(request.getOrigemMercadoria());

        produto = repository.save(produto);
        return toResponse(produto);
    }

    public Map<String, Object> listar(int page, int size) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        Page<Produto> resultado = repository.findByTenantIdAndEmpresaId(
                tenantId, empresaId, PageRequest.of(page, size, Sort.by("descricao")));

        List<ProdutoResponse> content = resultado.getContent().stream()
                .map(this::toResponse).toList();

        return Map.of("content", content, "totalElements", resultado.getTotalElements(),
                "totalPages", resultado.getTotalPages(), "page", page);
    }

    public ProdutoResponse buscarPorId(String id) {
        String tenantId = TenantContext.getTenantId();
        Produto produto = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produto não encontrado: " + id));
        if (!produto.getTenantId().equals(tenantId)) {
            throw new ResourceNotFoundException("Produto não encontrado: " + id);
        }
        return toResponse(produto);
    }

    public List<ProdutoResponse> buscar(String termo) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return repository.buscar(tenantId, empresaId, termo).stream()
                .map(this::toResponse).toList();
    }

    public void excluir(String id) {
        String tenantId = TenantContext.getTenantId();
        Produto produto = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produto não encontrado: " + id));
        if (!produto.getTenantId().equals(tenantId)) {
            throw new ResourceNotFoundException("Produto não encontrado: " + id);
        }
        produto.setStatus(StatusProduto.INATIVO);
        produto.setAtivo(false);
        repository.save(produto);
        log.info("Produto desativado: {}", id);
    }

    public ProdutoResponse ajustarEstoque(String id, BigDecimal quantidade, String motivo) {
        String tenantId = TenantContext.getTenantId();
        Produto produto = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Produto não encontrado: " + id));
        if (!produto.getTenantId().equals(tenantId)) {
            throw new ResourceNotFoundException("Produto não encontrado: " + id);
        }

        BigDecimal estoqueAnterior = produto.getEstoqueAtual() != null ? produto.getEstoqueAtual() : BigDecimal.ZERO;
        produto.setEstoqueAtual(estoqueAnterior.add(quantidade));
        produto = repository.save(produto);

        log.info("Estoque ajustado produto {}: {} -> {} ({})", id, estoqueAnterior, produto.getEstoqueAtual(), motivo);

        kafkaTemplate.send("produto-events", Map.of(
                "event", "ESTOQUE_AJUSTADO", "tenantId", tenantId,
                "produtoId", id, "quantidade", quantidade.toString(), "motivo", motivo));

        return toResponse(produto);
    }

    private ProdutoResponse toResponse(Produto p) {
        return ProdutoResponse.builder()
                .id(p.getId()).codigo(p.getCodigo()).descricao(p.getDescricao())
                .tipo(p.getTipo() != null ? p.getTipo().name() : null)
                .unidade(p.getUnidade()).ncm(p.getNcm()).cest(p.getCest())
                .cfopPadrao(p.getCfopPadrao())
                .precoVenda(p.getPrecoVenda()).custoMedio(p.getCustoMedio())
                .estoqueAtual(p.getEstoqueAtual()).estoqueMinimo(p.getEstoqueMinimo())
                .categoria(p.getCategoria()).marca(p.getMarca())
                .codigoBarras(p.getCodigoBarras())
                .pesoLiquido(p.getPesoLiquido()).pesoBruto(p.getPesoBruto())
                .origemMercadoria(p.getOrigemMercadoria())
                .status(p.getStatus() != null ? p.getStatus().name() : null)
                .ativo(p.isAtivo())
                .build();
    }
}
