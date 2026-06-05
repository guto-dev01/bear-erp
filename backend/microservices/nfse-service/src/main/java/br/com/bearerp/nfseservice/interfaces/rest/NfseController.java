package br.com.bearerp.nfseservice.interfaces.rest;

import br.com.bearerp.nfseservice.application.dto.CreateNfseRequest;
import br.com.bearerp.nfseservice.application.dto.NfseResponse;
import br.com.bearerp.nfseservice.application.usecase.NfseUseCase;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/fiscal/nfse")
@RequiredArgsConstructor
public class NfseController {

    private final NfseUseCase nfseUseCase;

    @PostMapping
    public ResponseEntity<NfseResponse> criar(@Valid @RequestBody CreateNfseRequest request) {
        return ResponseEntity.ok(nfseUseCase.criarNfse(request));
    }

    @GetMapping
    public ResponseEntity<Page<NfseResponse>> listar(Pageable pageable) {
        return ResponseEntity.ok(nfseUseCase.listarNfses(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NfseResponse> getById(@PathVariable String id) {
        return ResponseEntity.ok(nfseUseCase.getById(id));
    }

    @PostMapping("/{id}/autorizar")
    public ResponseEntity<NfseResponse> autorizar(@PathVariable String id) {
        return ResponseEntity.ok(nfseUseCase.autorizarNfse(id));
    }

    @PostMapping("/{id}/cancelar")
    public ResponseEntity<NfseResponse> cancelar(@PathVariable String id, @RequestParam String motivo) {
        return ResponseEntity.ok(nfseUseCase.cancelarNfse(id, motivo));
    }

    @GetMapping("/competencia")
    public ResponseEntity<List<NfseResponse>> listarPorCompetencia(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return ResponseEntity.ok(nfseUseCase.listarPorCompetencia(inicio, fim));
    }

    @GetMapping("/tomador/{cpfCnpj}")
    public ResponseEntity<List<NfseResponse>> listarPorTomador(@PathVariable String cpfCnpj) {
        return ResponseEntity.ok(nfseUseCase.listarPorTomador(cpfCnpj));
    }
}
