package br.com.bearerp.auth.infrastructure.config;

import br.com.bearerp.auth.domain.model.Role;
import br.com.bearerp.auth.domain.model.Usuario;
import br.com.bearerp.auth.domain.repository.RoleRepository;
import br.com.bearerp.auth.domain.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    private static final String DEFAULT_TENANT = "default";
    private static final String ADMIN_EMAIL = "admin@bearerp.com.br";
    private static final String ADMIN_SENHA = "Bear@2024!";

    @Override
    public void run(ApplicationArguments args) {
        criarRolePadrao();
        criarUsuarioAdmin();
    }

    private void criarRolePadrao() {
        if (roleRepository.findByNomeAndTenantId("ADMIN", DEFAULT_TENANT).isEmpty()) {
            Role adminRole = Role.builder()
                    .nome("ADMIN")
                    .descricao("Administrador do sistema com acesso total")
                    .sistema(true)
                    .permissoes(List.of(
                            "EMPRESA_READ", "EMPRESA_WRITE", "EMPRESA_DELETE",
                            "CONTABILIDADE_READ", "CONTABILIDADE_WRITE",
                            "FISCAL_READ", "FISCAL_WRITE",
                            "FINANCEIRO_READ", "FINANCEIRO_WRITE",
                            "FOLHA_READ", "FOLHA_WRITE",
                            "TRIBUTARIO_READ", "TRIBUTARIO_WRITE",
                            "PATRIMONIO_READ", "PATRIMONIO_WRITE",
                            "ESOCIAL_READ", "ESOCIAL_WRITE",
                            "SPED_READ", "SPED_WRITE",
                            "CERTIFICADO_READ", "CERTIFICADO_WRITE",
                            "RELATORIOS_READ", "RELATORIOS_WRITE",
                            "USUARIOS_READ", "USUARIOS_WRITE",
                            "CONFIG_READ", "CONFIG_WRITE"
                    ))
                    .build();
            adminRole.setTenantId(DEFAULT_TENANT);
            adminRole = roleRepository.save(adminRole);
            log.info("Role ADMIN criada com ID: {}", adminRole.getId());

            Role contadorRole = Role.builder()
                    .nome("CONTADOR")
                    .descricao("Contador com acesso a módulos contábeis e fiscais")
                    .sistema(true)
                    .permissoes(List.of(
                            "EMPRESA_READ",
                            "CONTABILIDADE_READ", "CONTABILIDADE_WRITE",
                            "FISCAL_READ", "FISCAL_WRITE",
                            "TRIBUTARIO_READ", "TRIBUTARIO_WRITE",
                            "SPED_READ", "SPED_WRITE",
                            "ESOCIAL_READ", "ESOCIAL_WRITE",
                            "FOLHA_READ", "FOLHA_WRITE",
                            "RELATORIOS_READ"
                    ))
                    .build();
            contadorRole.setTenantId(DEFAULT_TENANT);
            roleRepository.save(contadorRole);
            log.info("Role CONTADOR criada");

            Role auxiliarRole = Role.builder()
                    .nome("AUXILIAR")
                    .descricao("Auxiliar contábil com acesso limitado")
                    .sistema(true)
                    .permissoes(List.of(
                            "EMPRESA_READ",
                            "CONTABILIDADE_READ", "CONTABILIDADE_WRITE",
                            "FISCAL_READ",
                            "FINANCEIRO_READ",
                            "RELATORIOS_READ"
                    ))
                    .build();
            auxiliarRole.setTenantId(DEFAULT_TENANT);
            roleRepository.save(auxiliarRole);
            log.info("Role AUXILIAR criada");
        }
    }

    private void criarUsuarioAdmin() {
        if (!usuarioRepository.existsByEmailAndTenantId(ADMIN_EMAIL, DEFAULT_TENANT)) {
            Role adminRole = roleRepository.findByNomeAndTenantId("ADMIN", DEFAULT_TENANT)
                    .orElseThrow(() -> new RuntimeException("Role ADMIN não encontrada"));

            Usuario admin = Usuario.builder()
                    .nome("Administrador Bear ERP")
                    .email(ADMIN_EMAIL)
                    .senha(passwordEncoder.encode(ADMIN_SENHA))
                    .status(Usuario.StatusUsuario.ATIVO)
                    .roleIds(List.of(adminRole.getId()))
                    .empresaIds(List.of())
                    .build();
            admin.setTenantId(DEFAULT_TENANT);

            usuarioRepository.save(admin);
            log.info("===========================================");
            log.info("  Usuario admin criado com sucesso!");
            log.info("  Email: {}", ADMIN_EMAIL);
            log.info("  Senha: {}", ADMIN_SENHA);
            log.info("===========================================");
        } else {
            log.info("Usuario admin ja existe, pulando seed.");
        }
    }
}
