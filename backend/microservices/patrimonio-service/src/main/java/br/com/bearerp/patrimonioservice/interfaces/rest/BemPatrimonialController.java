package br.com.bearerp.patrimonioservice.interfaces.rest;

import br.com.bearerp.patrimonioservice.application.dto.BemPatrimonialResponse;
import br.com.bearerp.patrimonioservice.application.dto.CreateBemRequest;
import br.com.bearerp.patrimonioservice.application.usecase.BemPatrimonialUseCase;
import br.com.bearerp.patrimonioservice.domain.model.BemPatrimonial;
import br.com.bearerp.patrimonioservice.domain.model.MovimentacaoBem;
import jakarta.validation.Valid;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController @RequestMapping("/api/v1/patrimonio/bens") @RequiredArgsConstructor
public class BemPatrimonialController {
    private final BemPatrimonialUseCase useCase;

    @GetMapping
    public Page<BemPatrimonialResponse> listar(@RequestParam(required = false) BemPatrimonial.StatusBem status, Pageable pageable) {
        return useCase.listar(status, pageable);
    }

    @GetMapping("/{id}")
    public BemPatrimonialResponse buscarPorId(@PathVariable String id) {
        return useCase.buscarPorId(id);
    }

    @PostMapping @ResponseStatus(HttpStatus.CREATED)
    public BemPatrimonialResponse criar(@Valid @RequestBody CreateBemRequest request) {
        return useCase.criar(request);
    }

    @PostMapping("/{id}/baixar")
    public BemPatrimonialResponse baixar(@PathVariable String id, @RequestBody BaixaRequest request) {
        return useCase.baixar(id, request.getTipoBaixa(), request.getValorVenda(), request.getObservacao());
    }

    @PostMapping("/{id}/transferir")
    public BemPatrimonialResponse transferir(@PathVariable String id, @RequestBody TransferenciaRequest request) {
        return useCase.transferir(id, request.getNovoLocalId(), request.getNovoLocalDescricao(), request.getNovoResponsavel());
    }

    @Data
    public static class BaixaRequest {
        private MovimentacaoBem.TipoMovimentacao tipoBaixa;
        private BigDecimal valorVenda;
        private String observacao;
    }

    @Data
    public static class TransferenciaRequest {
        private String novoLocalId;
        private String novoLocalDescricao;
        private String novoResponsavel;
    }
}
