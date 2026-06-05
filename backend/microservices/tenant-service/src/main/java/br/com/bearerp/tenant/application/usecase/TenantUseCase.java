package br.com.bearerp.tenant.application.usecase;

import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.common.exception.ResourceNotFoundException;
import br.com.bearerp.common.util.CpfCnpjValidator;
import br.com.bearerp.security.crypto.AesEncryptor;
import br.com.bearerp.tenant.application.dto.CreateTenantRequest;
import br.com.bearerp.tenant.application.dto.TenantResponse;
import br.com.bearerp.tenant.application.dto.UpdateTenantRequest;
import br.com.bearerp.tenant.domain.event.TenantCreatedEvent;
import br.com.bearerp.tenant.domain.model.Endereco;
import br.com.bearerp.tenant.domain.model.Office;
import br.com.bearerp.tenant.domain.model.Tenant;
import br.com.bearerp.tenant.domain.repository.OfficeRepository;
import br.com.bearerp.tenant.domain.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantUseCase {

    private final TenantRepository tenantRepository;
    private final OfficeRepository officeRepository;
    private final AesEncryptor aesEncryptor;
    private final KafkaTemplate<String, Object> kafkaTemplate;

    public TenantResponse createTenant(CreateTenantRequest request) {
        if (!CpfCnpjValidator.isValidCnpj(request.getCnpj())) {
            throw new BusinessException("INVALID_CNPJ", "CNPJ inválido");
        }

        String encryptedCnpj = aesEncryptor.encrypt(request.getCnpj().replaceAll("[^0-9]", ""));

        if (tenantRepository.existsByCnpj(encryptedCnpj)) {
            throw new BusinessException("TENANT_EXISTS", "Já existe um tenant com este CNPJ");
        }

        Tenant tenant = Tenant.builder()
                .nome(request.getNome())
                .cnpj(encryptedCnpj)
                .razaoSocial(request.getRazaoSocial())
                .nomeFantasia(request.getNomeFantasia())
                .email(request.getEmail())
                .telefone(request.getTelefone())
                .plano(Tenant.Plano.TRIAL)
                .status(Tenant.Status.TRIAL)
                .maxEmpresas(5)
                .maxUsuarios(10)
                .dataInicioTrial(Instant.now())
                .dataFimTrial(Instant.now().plus(30, ChronoUnit.DAYS))
                .build();

        if (request.getEndereco() != null) {
            tenant.setEndereco(Endereco.builder()
                    .logradouro(request.getEndereco().getLogradouro())
                    .numero(request.getEndereco().getNumero())
                    .complemento(request.getEndereco().getComplemento())
                    .bairro(request.getEndereco().getBairro())
                    .cidade(request.getEndereco().getCidade())
                    .estado(request.getEndereco().getEstado())
                    .cep(request.getEndereco().getCep())
                    .codigoIbge(request.getEndereco().getCodigoIbge())
                    .build());
        }

        tenant.setTenantId(tenant.getId());
        tenant = tenantRepository.save(tenant);
        tenant.setTenantId(tenant.getId());
        tenant = tenantRepository.save(tenant);

        // Criar office padrão (matriz)
        Office matriz = Office.builder()
                .nome("Matriz")
                .cnpj(encryptedCnpj)
                .endereco(tenant.getEndereco())
                .telefone(tenant.getTelefone())
                .email(tenant.getEmail())
                .build();
        matriz.setTenantId(tenant.getId());
        officeRepository.save(matriz);

        var event = new TenantCreatedEvent(tenant.getId(), null, tenant.getNome(), request.getCnpj(), tenant.getPlano().name());
        kafkaTemplate.send("bear.tenant.created", tenant.getId(), event);

        log.info("Tenant criado: {} ({})", tenant.getNome(), tenant.getId());
        return toResponse(tenant);
    }

    public TenantResponse getTenant(String id) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant", id));
        return toResponse(tenant);
    }

    public TenantResponse updateTenant(String id, UpdateTenantRequest request) {
        Tenant tenant = tenantRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Tenant", id));

        if (request.getNome() != null) tenant.setNome(request.getNome());
        if (request.getRazaoSocial() != null) tenant.setRazaoSocial(request.getRazaoSocial());
        if (request.getNomeFantasia() != null) tenant.setNomeFantasia(request.getNomeFantasia());
        if (request.getEmail() != null) tenant.setEmail(request.getEmail());
        if (request.getTelefone() != null) tenant.setTelefone(request.getTelefone());

        tenant = tenantRepository.save(tenant);
        return toResponse(tenant);
    }

    public Page<TenantResponse> listTenants(Pageable pageable) {
        return tenantRepository.findAll(pageable).map(this::toResponse);
    }

    public List<Office> listOffices(String tenantId) {
        return officeRepository.findByTenantId(tenantId);
    }

    private TenantResponse toResponse(Tenant tenant) {
        return TenantResponse.builder()
                .id(tenant.getId())
                .nome(tenant.getNome())
                .razaoSocial(tenant.getRazaoSocial())
                .nomeFantasia(tenant.getNomeFantasia())
                .email(tenant.getEmail())
                .telefone(tenant.getTelefone())
                .plano(tenant.getPlano().name())
                .status(tenant.getStatus().name())
                .maxEmpresas(tenant.getMaxEmpresas())
                .maxUsuarios(tenant.getMaxUsuarios())
                .createdAt(tenant.getCreatedAt())
                .build();
    }
}
