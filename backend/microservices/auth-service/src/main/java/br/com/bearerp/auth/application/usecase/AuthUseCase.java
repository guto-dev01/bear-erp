package br.com.bearerp.auth.application.usecase;

import br.com.bearerp.auth.application.dto.*;
import br.com.bearerp.auth.domain.event.UserCreatedEvent;
import br.com.bearerp.auth.domain.model.Role;
import br.com.bearerp.auth.domain.model.Usuario;
import br.com.bearerp.auth.domain.repository.RoleRepository;
import br.com.bearerp.auth.domain.repository.UsuarioRepository;
import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.security.crypto.AesEncryptor;
import br.com.bearerp.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthUseCase {

    private final UsuarioRepository usuarioRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final AesEncryptor aesEncryptor;

    @Autowired(required = false)
    private KafkaTemplate<String, Object> kafkaTemplate;

    public LoginResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException("AUTH_INVALID", "Email ou senha inválidos"));

        if (usuario.isBloqueado()) {
            throw new BusinessException("AUTH_BLOCKED", "Usuário bloqueado. Tente novamente em 30 minutos");
        }

        if (!passwordEncoder.matches(request.getSenha(), usuario.getSenha())) {
            usuario.incrementarTentativasLogin();
            usuarioRepository.save(usuario);
            throw new BusinessException("AUTH_INVALID", "Email ou senha inválidos");
        }

        usuario.resetarTentativasLogin();

        List<Role> roles = roleRepository.findByIdInAndTenantId(usuario.getRoleIds(), usuario.getTenantId());
        List<String> permissoes = roles.stream()
                .flatMap(r -> r.getPermissoes().stream())
                .distinct()
                .toList();

        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", roles.stream().map(Role::getNome).toList());
        claims.put("permissoes", permissoes);
        claims.put("nome", usuario.getNome());

        String accessToken = jwtTokenProvider.generateAccessToken(
                usuario.getId(), usuario.getTenantId(), usuario.getEmpresaAtualId(), claims);
        String refreshToken = jwtTokenProvider.generateRefreshToken(usuario.getId());

        usuario.setRefreshToken(refreshToken);
        usuario.setRefreshTokenExpiration(Instant.now().plusSeconds(604800));
        usuarioRepository.save(usuario);

        if (kafkaTemplate != null) {
            try {
                kafkaTemplate.send("bear.auth.user-logged-in", usuario.getId());
            } catch (Exception e) {
                log.warn("Falha ao enviar evento de login ao Kafka: {}", e.getMessage());
            }
        }

        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(900)
                .usuario(LoginResponse.UsuarioInfo.builder()
                        .id(usuario.getId())
                        .nome(usuario.getNome())
                        .email(usuario.getEmail())
                        .tenantId(usuario.getTenantId())
                        .empresaAtualId(usuario.getEmpresaAtualId())
                        .roles(roles.stream().map(Role::getNome).toList())
                        .permissoes(permissoes)
                        .build())
                .build();
    }

    public LoginResponse refreshToken(RefreshTokenRequest request) {
        if (!jwtTokenProvider.validateToken(request.getRefreshToken())) {
            throw new BusinessException("AUTH_INVALID_TOKEN", "Refresh token inválido");
        }

        Usuario usuario = usuarioRepository.findByRefreshToken(request.getRefreshToken())
                .orElseThrow(() -> new BusinessException("AUTH_INVALID_TOKEN", "Refresh token não encontrado"));

        if (usuario.getRefreshTokenExpiration().isBefore(Instant.now())) {
            throw new BusinessException("AUTH_TOKEN_EXPIRED", "Refresh token expirado");
        }

        List<Role> roles = roleRepository.findByIdInAndTenantId(usuario.getRoleIds(), usuario.getTenantId());
        List<String> permissoes = roles.stream()
                .flatMap(r -> r.getPermissoes().stream())
                .distinct()
                .toList();

        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", roles.stream().map(Role::getNome).toList());
        claims.put("permissoes", permissoes);
        claims.put("nome", usuario.getNome());

        String newAccessToken = jwtTokenProvider.generateAccessToken(
                usuario.getId(), usuario.getTenantId(), usuario.getEmpresaAtualId(), claims);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(usuario.getId());

        usuario.setRefreshToken(newRefreshToken);
        usuario.setRefreshTokenExpiration(Instant.now().plusSeconds(604800));
        usuarioRepository.save(usuario);

        return LoginResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRefreshToken)
                .tokenType("Bearer")
                .expiresIn(900)
                .usuario(LoginResponse.UsuarioInfo.builder()
                        .id(usuario.getId())
                        .nome(usuario.getNome())
                        .email(usuario.getEmail())
                        .tenantId(usuario.getTenantId())
                        .empresaAtualId(usuario.getEmpresaAtualId())
                        .roles(roles.stream().map(Role::getNome).toList())
                        .permissoes(permissoes)
                        .build())
                .build();
    }

    public UsuarioResponse createUsuario(CreateUsuarioRequest request) {
        String tenantId = TenantContext.getTenantId();
        if (tenantId == null && request.getTenantId() != null) {
            tenantId = request.getTenantId();
        }

        if (usuarioRepository.existsByEmailAndTenantId(request.getEmail(), tenantId)) {
            throw new BusinessException("USER_EXISTS", "Email já cadastrado neste tenant");
        }

        Usuario usuario = Usuario.builder()
                .email(request.getEmail())
                .senha(passwordEncoder.encode(request.getSenha()))
                .nome(request.getNome())
                .cpf(request.getCpf() != null ? aesEncryptor.encrypt(request.getCpf()) : null)
                .telefone(request.getTelefone())
                .roleIds(request.getRoleIds() != null ? request.getRoleIds() : List.of())
                .empresaIds(request.getEmpresaIds() != null ? request.getEmpresaIds() : List.of())
                .status(Usuario.StatusUsuario.ATIVO)
                .build();
        usuario.setTenantId(tenantId);

        usuario = usuarioRepository.save(usuario);

        if (kafkaTemplate != null) {
            try {
                var event = new UserCreatedEvent(tenantId, null, usuario.getId(), usuario.getEmail(), usuario.getNome());
                kafkaTemplate.send("bear.auth.user-created", usuario.getId(), event);
            } catch (Exception e) {
                log.warn("Falha ao enviar evento de criação de usuário ao Kafka: {}", e.getMessage());
            }
        }

        log.info("Usuário criado: {} no tenant: {}", usuario.getEmail(), tenantId);

        return toResponse(usuario);
    }

    public UsuarioResponse getUsuario(String id) {
        Usuario usuario = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuário", id));
        return toResponse(usuario);
    }

    public Page<UsuarioResponse> listUsuarios(Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        return usuarioRepository.findByTenantId(tenantId, pageable).map(this::toResponse);
    }

    public void logout(String userId) {
        usuarioRepository.findById(userId).ifPresent(usuario -> {
            usuario.setRefreshToken(null);
            usuario.setRefreshTokenExpiration(null);
            usuarioRepository.save(usuario);
        });
    }

    private UsuarioResponse toResponse(Usuario usuario) {
        return UsuarioResponse.builder()
                .id(usuario.getId())
                .nome(usuario.getNome())
                .email(usuario.getEmail())
                .telefone(usuario.getTelefone())
                .tenantId(usuario.getTenantId())
                .roleIds(usuario.getRoleIds())
                .empresaIds(usuario.getEmpresaIds())
                .status(usuario.getStatus().name())
                .ultimoLogin(usuario.getUltimoLogin())
                .createdAt(usuario.getCreatedAt())
                .build();
    }
}
