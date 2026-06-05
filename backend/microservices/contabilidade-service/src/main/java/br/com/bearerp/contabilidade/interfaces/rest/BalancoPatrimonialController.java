package br.com.bearerp.contabilidade.interfaces.rest;

import br.com.bearerp.contabilidade.application.dto.BalancoPatrimonialResponse;
import br.com.bearerp.contabilidade.application.usecase.BalancoPatrimonialUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1/contabilidade/balanco")
@RequiredArgsConstructor
@Tag(name = "Balanço Patrimonial", description = "Balanço Patrimonial")
public class BalancoPatrimonialController {

    private final BalancoPatrimonialUseCase balancoUseCase;

    @GetMapping
    @Operation(summary = "Gerar Balanço Patrimonial")
    public ResponseEntity<BalancoPatrimonialResponse> gerar(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataBase) {
        return ResponseEntity.ok(balancoUseCase.gerarBalanco(dataBase));
    }
}
