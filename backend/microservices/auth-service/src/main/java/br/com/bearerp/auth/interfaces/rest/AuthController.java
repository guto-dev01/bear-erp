package br.com.bearerp.auth.interfaces.rest;

import br.com.bearerp.auth.application.dto.*;
import br.com.bearerp.auth.application.usecase.AuthUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Autenticação", description = "Endpoints de autenticação e gestão de usuários")
public class AuthController {

    private final AuthUseCase authUseCase;

    @PostMapping("/login")
    @Operation(summary = "Realizar login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authUseCase.login(request));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Renovar access token")
    public ResponseEntity<LoginResponse> refreshToken(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(authUseCase.refreshToken(request));
    }

    @PostMapping("/logout")
    @Operation(summary = "Realizar logout")
    public ResponseEntity<Void> logout(@RequestHeader("X-User-Id") String userId) {
        authUseCase.logout(userId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/register")
    @Operation(summary = "Registrar primeiro usuário admin (setup inicial)")
    public ResponseEntity<UsuarioResponse> register(@Valid @RequestBody CreateUsuarioRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authUseCase.createUsuario(request));
    }

    @PostMapping("/usuarios")
    @Operation(summary = "Criar novo usuário")
    public ResponseEntity<UsuarioResponse> createUsuario(@Valid @RequestBody CreateUsuarioRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authUseCase.createUsuario(request));
    }

    @GetMapping("/usuarios/{id}")
    @Operation(summary = "Buscar usuário por ID")
    public ResponseEntity<UsuarioResponse> getUsuario(@PathVariable String id) {
        return ResponseEntity.ok(authUseCase.getUsuario(id));
    }

    @GetMapping("/usuarios")
    @Operation(summary = "Listar usuários do tenant")
    public ResponseEntity<Page<UsuarioResponse>> listUsuarios(Pageable pageable) {
        return ResponseEntity.ok(authUseCase.listUsuarios(pageable));
    }
}
