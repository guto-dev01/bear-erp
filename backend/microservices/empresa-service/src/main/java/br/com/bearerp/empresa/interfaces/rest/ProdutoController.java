package br.com.bearerp.empresa.interfaces.rest;

import br.com.bearerp.empresa.application.dto.CreateProdutoRequest;
import br.com.bearerp.empresa.application.dto.ProdutoResponse;
import br.com.bearerp.empresa.application.usecase.ProdutoUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URI;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/cadastros/produtos")
@RequiredArgsConstructor
@Tag(name = "Produtos", description = "Cadastro de produtos e serviços")
public class ProdutoController {

    private final ProdutoUseCase produtoUseCase;

    @PostMapping
    @Operation(summary = "Cadastrar produto")
    public ResponseEntity<ProdutoResponse> criar(@Valid @RequestBody CreateProdutoRequest request) {
        ProdutoResponse response = produtoUseCase.criar(request);
        return ResponseEntity.created(URI.create("/api/v1/cadastros/produtos/" + response.getId())).body(response);
    }

    @GetMapping
    @Operation(summary = "Listar produtos")
    public ResponseEntity<Map<String, Object>> listar(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(produtoUseCase.listar(page, size));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Buscar produto por ID")
    public ResponseEntity<ProdutoResponse> buscarPorId(@PathVariable String id) {
        return ResponseEntity.ok(produtoUseCase.buscarPorId(id));
    }

    @GetMapping("/buscar")
    @Operation(summary = "Buscar produtos por termo")
    public ResponseEntity<List<ProdutoResponse>> buscar(@RequestParam String q) {
        return ResponseEntity.ok(produtoUseCase.buscar(q));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Atualizar produto")
    public ResponseEntity<ProdutoResponse> atualizar(@PathVariable String id, @Valid @RequestBody CreateProdutoRequest request) {
        return ResponseEntity.ok(produtoUseCase.atualizar(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Desativar produto")
    public ResponseEntity<Void> excluir(@PathVariable String id) {
        produtoUseCase.excluir(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/ajustar-estoque")
    @Operation(summary = "Ajustar estoque do produto")
    public ResponseEntity<ProdutoResponse> ajustarEstoque(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        BigDecimal quantidade = new BigDecimal(body.get("quantidade"));
        String motivo = body.get("motivo");
        return ResponseEntity.ok(produtoUseCase.ajustarEstoque(id, quantidade, motivo));
    }
}
