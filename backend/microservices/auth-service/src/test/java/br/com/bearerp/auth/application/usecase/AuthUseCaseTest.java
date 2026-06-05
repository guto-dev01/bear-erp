package br.com.bearerp.auth.application.usecase;

import br.com.bearerp.auth.application.dto.LoginRequest;
import br.com.bearerp.auth.application.dto.LoginResponse;
import br.com.bearerp.auth.domain.model.Role;
import br.com.bearerp.auth.domain.model.Usuario;
import br.com.bearerp.auth.domain.repository.RoleRepository;
import br.com.bearerp.auth.domain.repository.UsuarioRepository;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.security.crypto.AesEncryptor;
import br.com.bearerp.security.jwt.JwtTokenProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AuthUseCase")
class AuthUseCaseTest {

    @Mock private UsuarioRepository usuarioRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider jwtTokenProvider;
    @Mock private AesEncryptor aesEncryptor;

    @InjectMocks private AuthUseCase authUseCase;

    private Usuario usuario;
    private Role roleAdmin;

    @BeforeEach
    void setUp() {
        roleAdmin = Role.builder()
                .id("role-1")
                .nome("ADMIN")
                .permissoes(List.of("FULL_ACCESS"))
                .build();
        roleAdmin.setTenantId("tenant-1");

        usuario = Usuario.builder()
                .email("admin@bearerp.com.br")
                .senha("$2a$10$encodedPassword")
                .nome("Admin")
                .roleIds(List.of("role-1"))
                .status(Usuario.StatusUsuario.ATIVO)
                .build();
        usuario.setId("user-1");
        usuario.setTenantId("tenant-1");
        usuario.setEmpresaAtualId("empresa-1");
    }

    @Nested
    @DisplayName("Login")
    class LoginTests {

        @Test
        @DisplayName("deve autenticar com credenciais válidas")
        void deveAutenticarComCredenciaisValidas() {
            LoginRequest request = LoginRequest.builder()
                    .email("admin@bearerp.com.br")
                    .senha("Bear@2024!")
                    .build();

            when(usuarioRepository.findByEmail("admin@bearerp.com.br"))
                    .thenReturn(Optional.of(usuario));
            when(passwordEncoder.matches("Bear@2024!", "$2a$10$encodedPassword"))
                    .thenReturn(true);
            when(roleRepository.findByIdInAndTenantId(anyList(), eq("tenant-1")))
                    .thenReturn(List.of(roleAdmin));
            when(jwtTokenProvider.generateAccessToken(anyString(), anyString(), anyString(), anyMap()))
                    .thenReturn("access-token-jwt");
            when(jwtTokenProvider.generateRefreshToken(anyString()))
                    .thenReturn("refresh-token-jwt");
            when(usuarioRepository.save(any(Usuario.class)))
                    .thenReturn(usuario);

            LoginResponse response = authUseCase.login(request);

            assertNotNull(response);
            assertEquals("access-token-jwt", response.getAccessToken());
            assertEquals("refresh-token-jwt", response.getRefreshToken());
            assertEquals("Bearer", response.getTokenType());
            assertEquals("admin@bearerp.com.br", response.getUsuario().getEmail());
            assertEquals(List.of("ADMIN"), response.getUsuario().getRoles());
        }

        @Test
        @DisplayName("deve rejeitar email inexistente")
        void deveRejeitarEmailInexistente() {
            LoginRequest request = LoginRequest.builder()
                    .email("naoexiste@bearerp.com.br")
                    .senha("senha123")
                    .build();

            when(usuarioRepository.findByEmail("naoexiste@bearerp.com.br"))
                    .thenReturn(Optional.empty());

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> authUseCase.login(request));
            assertEquals("AUTH_INVALID", ex.getCode());
        }

        @Test
        @DisplayName("deve rejeitar senha incorreta e incrementar tentativas")
        void deveRejeitarSenhaIncorreta() {
            LoginRequest request = LoginRequest.builder()
                    .email("admin@bearerp.com.br")
                    .senha("senhaErrada")
                    .build();

            when(usuarioRepository.findByEmail("admin@bearerp.com.br"))
                    .thenReturn(Optional.of(usuario));
            when(passwordEncoder.matches("senhaErrada", "$2a$10$encodedPassword"))
                    .thenReturn(false);
            when(usuarioRepository.save(any(Usuario.class)))
                    .thenReturn(usuario);

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> authUseCase.login(request));
            assertEquals("AUTH_INVALID", ex.getCode());
            verify(usuarioRepository).save(usuario);
        }

        @Test
        @DisplayName("deve bloquear usuário bloqueado")
        void deveBloquearUsuarioBloqueado() {
            usuario.setStatus(Usuario.StatusUsuario.BLOQUEADO);

            LoginRequest request = LoginRequest.builder()
                    .email("admin@bearerp.com.br")
                    .senha("Bear@2024!")
                    .build();

            when(usuarioRepository.findByEmail("admin@bearerp.com.br"))
                    .thenReturn(Optional.of(usuario));

            BusinessException ex = assertThrows(BusinessException.class,
                    () -> authUseCase.login(request));
            assertEquals("AUTH_BLOCKED", ex.getCode());
        }
    }

    @Nested
    @DisplayName("Logout")
    class LogoutTests {

        @Test
        @DisplayName("deve limpar refresh token no logout")
        void deveLimparRefreshToken() {
            usuario.setRefreshToken("old-refresh-token");
            when(usuarioRepository.findById("user-1"))
                    .thenReturn(Optional.of(usuario));
            when(usuarioRepository.save(any(Usuario.class)))
                    .thenReturn(usuario);

            authUseCase.logout("user-1");

            verify(usuarioRepository).save(argThat(u -> u.getRefreshToken() == null));
        }
    }
}
