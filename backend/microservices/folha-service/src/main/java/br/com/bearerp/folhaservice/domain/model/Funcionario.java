package br.com.bearerp.folhaservice.domain.model;

import br.com.bearerp.common.domain.BaseDocument;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data @SuperBuilder @NoArgsConstructor @AllArgsConstructor
@EqualsAndHashCode(callSuper = true)
@Document(collection = "funcionarios")
@CompoundIndexes({
    @CompoundIndex(name = "idx_tenant_empresa", def = "{'tenantId': 1, 'empresaId': 1}"),
    @CompoundIndex(name = "idx_tenant_empresa_cpf", def = "{'tenantId': 1, 'empresaId': 1, 'cpf': 1}", unique = true),
    @CompoundIndex(name = "idx_tenant_empresa_matricula", def = "{'tenantId': 1, 'empresaId': 1, 'matricula': 1}", unique = true)
})
public class Funcionario extends BaseDocument {
    private String matricula;
    private String nome;
    private String cpf;
    private String rg;
    private String pis;
    private String ctps;
    private String serieCtps;
    private LocalDate dataNascimento;
    private String sexo;
    private String estadoCivil;
    private String nacionalidade;
    private String naturalidade;
    private String nomeMae;

    // Endereço
    private String cep;
    private String logradouro;
    private String numero;
    private String complemento;
    private String bairro;
    private String cidade;
    private String uf;

    // Contato
    private String telefone;
    private String email;

    // Dados bancários
    private String banco;
    private String agencia;
    private String conta;
    private String tipoConta; // CORRENTE, POUPANCA, SALARIO

    // Dados contratuais
    private LocalDate dataAdmissao;
    private LocalDate dataDemissao;
    private TipoContrato tipoContrato;
    private String cargo;
    private String departamento;
    private String centroCustoId;
    private BigDecimal salarioBase;
    private String jornadaTrabalho; // 44h semanais, etc
    private int cargaHorariaSemanal;
    private TipoSalario tipoSalario;
    private CategoriaFuncionario categoria;
    private String codigoCbo;

    // FGTS
    private String optanteFgts;
    private LocalDate dataOpcaoFgts;

    // Dependentes
    private int numeroDependentes;
    private int numeroDependentesIr;

    private StatusFuncionario status;

    public enum TipoContrato { CLT, TEMPORARIO, EXPERIENCIA, ESTAGIO, JOVEM_APRENDIZ, INTERMITENTE }
    public enum TipoSalario { MENSALISTA, HORISTA, DIARISTA, COMISSIONADO, TAREFEIRO }
    public enum CategoriaFuncionario { EMPREGADO, DOMESTICO, AVULSO, TEMPORARIO, APRENDIZ, ESTAGIARIO, DIRETOR }
    public enum StatusFuncionario { ATIVO, AFASTADO, FERIAS, LICENCA, DEMITIDO }
}
