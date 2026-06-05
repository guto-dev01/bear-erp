package br.com.bearerp.folhaservice.application.usecase;

import br.com.bearerp.common.domain.TenantContext;
import br.com.bearerp.common.exception.BusinessException;
import br.com.bearerp.folhaservice.application.dto.CreateFuncionarioRequest;
import br.com.bearerp.folhaservice.application.dto.FuncionarioResponse;
import br.com.bearerp.folhaservice.domain.model.Funcionario;
import br.com.bearerp.folhaservice.domain.model.Funcionario.*;
import br.com.bearerp.folhaservice.domain.repository.FuncionarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class FuncionarioUseCase {

    private final FuncionarioRepository funcionarioRepository;

    public FuncionarioResponse criarFuncionario(CreateFuncionarioRequest request) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();

        if (funcionarioRepository.existsByTenantIdAndEmpresaIdAndCpf(tenantId, empresaId, request.getCpf())) {
            throw new BusinessException("FUNCIONARIO_DUPLICADO", "CPF já cadastrado");
        }

        long count = funcionarioRepository.countByTenantIdAndEmpresaIdAndStatus(tenantId, empresaId, StatusFuncionario.ATIVO);
        String matricula = String.format("%06d", count + 1);

        Funcionario func = Funcionario.builder()
                .matricula(matricula).nome(request.getNome()).cpf(request.getCpf())
                .rg(request.getRg()).pis(request.getPis()).ctps(request.getCtps()).serieCtps(request.getSerieCtps())
                .dataNascimento(request.getDataNascimento()).sexo(request.getSexo()).estadoCivil(request.getEstadoCivil())
                .cep(request.getCep()).logradouro(request.getLogradouro()).numero(request.getNumero())
                .bairro(request.getBairro()).cidade(request.getCidade()).uf(request.getUf())
                .telefone(request.getTelefone()).email(request.getEmail())
                .banco(request.getBanco()).agencia(request.getAgencia()).conta(request.getConta()).tipoConta(request.getTipoConta())
                .dataAdmissao(request.getDataAdmissao()).tipoContrato(TipoContrato.valueOf(request.getTipoContrato()))
                .cargo(request.getCargo()).departamento(request.getDepartamento()).centroCustoId(request.getCentroCustoId())
                .salarioBase(request.getSalarioBase())
                .tipoSalario(request.getTipoSalario() != null ? TipoSalario.valueOf(request.getTipoSalario()) : TipoSalario.MENSALISTA)
                .categoria(request.getCategoria() != null ? CategoriaFuncionario.valueOf(request.getCategoria()) : CategoriaFuncionario.EMPREGADO)
                .codigoCbo(request.getCodigoCbo())
                .cargaHorariaSemanal(request.getCargaHorariaSemanal() > 0 ? request.getCargaHorariaSemanal() : 44)
                .numeroDependentes(request.getNumeroDependentes())
                .numeroDependentesIr(request.getNumeroDependentesIr())
                .optanteFgts("S")
                .status(StatusFuncionario.ATIVO)
                .build();
        func.setTenantId(tenantId);
        func.setEmpresaId(empresaId);

        func = funcionarioRepository.save(func);
        log.info("Funcionário {} cadastrado - matrícula {} (tenant: {})", request.getNome(), matricula, tenantId);
        return toResponse(func);
    }

    public Page<FuncionarioResponse> listar(Pageable pageable) {
        String tenantId = TenantContext.getTenantId();
        String empresaId = TenantContext.getEmpresaId();
        return funcionarioRepository.findByTenantIdAndEmpresaId(tenantId, empresaId, pageable).map(this::toResponse);
    }

    public FuncionarioResponse getById(String id) {
        return toResponse(findById(id));
    }

    public FuncionarioResponse updateFuncionario(String id, CreateFuncionarioRequest request) {
        Funcionario func = findById(id);
        func.setNome(request.getNome());
        func.setCargo(request.getCargo());
        func.setDepartamento(request.getDepartamento());
        func.setSalarioBase(request.getSalarioBase());
        func.setNumeroDependentes(request.getNumeroDependentes());
        func.setNumeroDependentesIr(request.getNumeroDependentesIr());
        func.setTelefone(request.getTelefone());
        func.setEmail(request.getEmail());
        func = funcionarioRepository.save(func);
        return toResponse(func);
    }

    public FuncionarioResponse demitir(String id) {
        Funcionario func = findById(id);
        func.setStatus(StatusFuncionario.DEMITIDO);
        func.setDataDemissao(java.time.LocalDate.now());
        func = funcionarioRepository.save(func);
        return toResponse(func);
    }

    private Funcionario findById(String id) {
        String tenantId = TenantContext.getTenantId();
        Funcionario func = funcionarioRepository.findById(id)
                .orElseThrow(() -> new BusinessException("FUNCIONARIO_NAO_ENCONTRADO", "Funcionário não encontrado"));
        if (!func.getTenantId().equals(tenantId)) throw new BusinessException("ACESSO_NEGADO", "Acesso negado");
        return func;
    }

    private FuncionarioResponse toResponse(Funcionario f) {
        return FuncionarioResponse.builder()
                .id(f.getId()).matricula(f.getMatricula()).nome(f.getNome())
                .cpf(f.getCpf()).pis(f.getPis())
                .dataNascimento(f.getDataNascimento()).dataAdmissao(f.getDataAdmissao())
                .dataDemissao(f.getDataDemissao())
                .tipoContrato(f.getTipoContrato().name()).cargo(f.getCargo())
                .departamento(f.getDepartamento()).salarioBase(f.getSalarioBase())
                .tipoSalario(f.getTipoSalario() != null ? f.getTipoSalario().name() : null)
                .categoria(f.getCategoria() != null ? f.getCategoria().name() : null)
                .codigoCbo(f.getCodigoCbo()).numeroDependentes(f.getNumeroDependentes())
                .status(f.getStatus().name())
                .build();
    }
}
