package br.com.bearerp.contabilidade.interfaces.rest;

import br.com.bearerp.contabilidade.application.dto.ExercicioContabilResponse;
import br.com.bearerp.contabilidade.application.usecase.ExercicioContabilUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/contabilidade/exercicios")
@RequiredArgsConstructor
@Tag(name = "Exercícios Contábeis", description = "Gestão de exercícios contábeis")
public class ExercicioContabilController {

    private final ExercicioContabilUseCase exercicioUseCase;

    @PostMapping("/{ano}")
    @Operation(summary = "Criar exercício contábil")
    public ResponseEntity<ExercicioContabilResponse> criar(@PathVariable int ano) {
        return ResponseEntity.status(HttpStatus.CREATED).body(exercicioUseCase.criarExercicio(ano));
    }

    @PostMapping("/{ano}/encerrar")
    @Operation(summary = "Encerrar exercício contábil")
    public ResponseEntity<ExercicioContabilResponse> encerrar(@PathVariable int ano) {
        return ResponseEntity.ok(exercicioUseCase.encerrarExercicio(ano));
    }

    @PostMapping("/{ano}/saldos-iniciais")
    @Operation(summary = "Gerar saldos iniciais do exercício")
    public ResponseEntity<ExercicioContabilResponse> gerarSaldosIniciais(@PathVariable int ano) {
        return ResponseEntity.ok(exercicioUseCase.gerarSaldosIniciais(ano));
    }
}
