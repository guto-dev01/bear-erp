package br.com.bearerp.tenant.interfaces.rest;

import br.com.bearerp.tenant.infrastructure.onboarding.OnboardingService;
import br.com.bearerp.tenant.infrastructure.onboarding.OnboardingService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/onboarding")
@RequiredArgsConstructor
public class OnboardingController {

    private final OnboardingService onboardingService;

    @PostMapping("/iniciar/{usuarioId}")
    public ResponseEntity<OnboardingProgresso> iniciar(@PathVariable String usuarioId) {
        return ResponseEntity.ok(onboardingService.iniciarOnboarding(usuarioId));
    }

    @GetMapping("/progresso/{usuarioId}")
    public ResponseEntity<OnboardingProgresso> progresso(@PathVariable String usuarioId) {
        return ResponseEntity.ok(onboardingService.buscarProgresso(usuarioId));
    }

    @PostMapping("/completar-etapa/{usuarioId}/{etapa}")
    public ResponseEntity<OnboardingProgresso> completarEtapa(
            @PathVariable String usuarioId, @PathVariable int etapa) {
        return ResponseEntity.ok(onboardingService.completarEtapa(usuarioId, etapa));
    }

    @GetMapping("/tours")
    public ResponseEntity<List<TourGuiado>> tours() {
        return ResponseEntity.ok(onboardingService.listarTours());
    }

    @PostMapping("/tours/{tourId}/visualizado/{usuarioId}")
    public ResponseEntity<Void> tourVisualizado(
            @PathVariable String tourId, @PathVariable String usuarioId) {
        onboardingService.registrarTourVisualizado(usuarioId, tourId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/ajuda")
    public ResponseEntity<List<ArtigoAjuda>> artigos(@RequestParam(required = false) String busca) {
        return ResponseEntity.ok(onboardingService.buscarArtigos(busca));
    }
}
