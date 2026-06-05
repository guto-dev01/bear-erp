package br.com.bearerp.certificadoservice.interfaces.rest;

import br.com.bearerp.certificadoservice.infrastructure.alerta.CertificadoAlertaService;
import br.com.bearerp.certificadoservice.infrastructure.alerta.CertificadoAlertaService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/certificados/alertas")
@RequiredArgsConstructor
public class CertificadoAlertaController {

    private final CertificadoAlertaService certificadoAlertaService;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> dashboard() {
        return ResponseEntity.ok(certificadoAlertaService.dashboard());
    }

    @PostMapping("/testar/{certificadoId}")
    public ResponseEntity<TesteCertificado> testar(@PathVariable String certificadoId) {
        return ResponseEntity.ok(certificadoAlertaService.testarCertificado(certificadoId));
    }

    @PostMapping("/verificar-vencimentos")
    public ResponseEntity<Void> verificarVencimentos() {
        certificadoAlertaService.alertarCertificadosVencendo();
        return ResponseEntity.ok().build();
    }
}
