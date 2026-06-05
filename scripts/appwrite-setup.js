const { Client, Databases, ID, Permission, Role, Query } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('69b52c570036d92459ce')
  .setKey('standard_e04260ebac4f36c6d310aa4cf59c95a7a36fb75ff4960912cf2e0a492e82dde2e7d515b7da5cd401ede97665d987ab95ca0780ccff2b2b71a5b00ba48e1adc570ea5327d1977d173d800a8e51828f5fe584c2f9abe011760ae066fb9b27d0b809cfba0f047fbbadc14957ea1b1b1b9f7e0d2b1864df1ad6218e3544a0a871ee6');

const db = new Databases(client);
const DB_ID = '69b52c820006ab36b33a';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ============================================================
// DEFINIÇÃO DE COLLECTIONS
// ============================================================

const collections = [
  {
    id: 'roles',
    name: 'Roles',
    attrs: [
      { key: 'nome', type: 'string', size: 50, required: true },
      { key: 'descricao', type: 'string', size: 255, required: false },
      { key: 'sistema', type: 'boolean', required: false },
      { key: 'permissoes', type: 'string', size: 100, required: false, array: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'ativo', type: 'boolean', required: false },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'usuarios',
    name: 'Usuarios',
    attrs: [
      { key: 'nome', type: 'string', size: 150, required: true },
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'senha', type: 'string', size: 255, required: true },
      { key: 'cpf', type: 'string', size: 255, required: false },
      { key: 'telefone', type: 'string', size: 20, required: false },
      { key: 'avatar', type: 'string', size: 500, required: false },
      { key: 'roleIds', type: 'string', size: 50, required: false, array: true },
      { key: 'empresaIds', type: 'string', size: 50, required: false, array: true },
      { key: 'empresaAtualId', type: 'string', size: 50, required: false },
      { key: 'status', type: 'string', size: 30, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'twoFactorEnabled', type: 'boolean', required: false },
      { key: 'tentativasLogin', type: 'integer', required: false },
      { key: 'ultimoLogin', type: 'string', size: 30, required: false },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'empresas',
    name: 'Empresas',
    attrs: [
      { key: 'razaoSocial', type: 'string', size: 255, required: true },
      { key: 'nomeFantasia', type: 'string', size: 255, required: false },
      { key: 'cnpj', type: 'string', size: 20, required: true },
      { key: 'inscricaoEstadual', type: 'string', size: 20, required: false },
      { key: 'inscricaoMunicipal', type: 'string', size: 20, required: false },
      { key: 'regimeTributario', type: 'string', size: 30, required: true },
      { key: 'cnaePrincipal', type: 'string', size: 10, required: false },
      { key: 'cnaeSecundarios', type: 'string', size: 10, required: false, array: true },
      { key: 'endereco', type: 'string', size: 500, required: false },
      { key: 'cidade', type: 'string', size: 100, required: false },
      { key: 'uf', type: 'string', size: 2, required: false },
      { key: 'cep', type: 'string', size: 10, required: false },
      { key: 'telefone', type: 'string', size: 20, required: false },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'responsavel', type: 'string', size: 150, required: false },
      { key: 'certificadoDigitalId', type: 'string', size: 50, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'plano_contas',
    name: 'Plano de Contas',
    attrs: [
      { key: 'codigo', type: 'string', size: 20, required: true },
      { key: 'nome', type: 'string', size: 255, required: true },
      { key: 'tipo', type: 'string', size: 20, required: true },
      { key: 'natureza', type: 'string', size: 20, required: true },
      { key: 'classificacao', type: 'string', size: 50, required: true },
      { key: 'contaPaiId', type: 'string', size: 50, required: false },
      { key: 'nivel', type: 'integer', required: true },
      { key: 'aceitaLancamento', type: 'boolean', required: false },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'ativo', type: 'boolean', required: false },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'lancamentos',
    name: 'Lancamentos Contabeis',
    attrs: [
      { key: 'numero', type: 'integer', required: true },
      { key: 'data', type: 'string', size: 10, required: true },
      { key: 'tipo', type: 'string', size: 20, required: true },
      { key: 'historico', type: 'string', size: 500, required: true },
      { key: 'valor', type: 'float', required: true },
      { key: 'contaDebitoId', type: 'string', size: 50, required: true },
      { key: 'contaCreditoId', type: 'string', size: 50, required: true },
      { key: 'contaDebitoCodigo', type: 'string', size: 20, required: false },
      { key: 'contaCreditoCodigo', type: 'string', size: 20, required: false },
      { key: 'documentoRef', type: 'string', size: 100, required: false },
      { key: 'competencia', type: 'string', size: 7, required: true },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'clientes',
    name: 'Clientes',
    attrs: [
      { key: 'nome', type: 'string', size: 255, required: true },
      { key: 'cpfCnpj', type: 'string', size: 20, required: true },
      { key: 'tipo', type: 'string', size: 10, required: true },
      { key: 'inscricaoEstadual', type: 'string', size: 20, required: false },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'telefone', type: 'string', size: 20, required: false },
      { key: 'endereco', type: 'string', size: 500, required: false },
      { key: 'cidade', type: 'string', size: 100, required: false },
      { key: 'uf', type: 'string', size: 2, required: false },
      { key: 'cep', type: 'string', size: 10, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'fornecedores',
    name: 'Fornecedores',
    attrs: [
      { key: 'nome', type: 'string', size: 255, required: true },
      { key: 'cpfCnpj', type: 'string', size: 20, required: true },
      { key: 'tipo', type: 'string', size: 10, required: true },
      { key: 'inscricaoEstadual', type: 'string', size: 20, required: false },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'telefone', type: 'string', size: 20, required: false },
      { key: 'endereco', type: 'string', size: 500, required: false },
      { key: 'cidade', type: 'string', size: 100, required: false },
      { key: 'uf', type: 'string', size: 2, required: false },
      { key: 'cep', type: 'string', size: 10, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'contas_pagar',
    name: 'Contas a Pagar',
    attrs: [
      { key: 'descricao', type: 'string', size: 255, required: true },
      { key: 'fornecedorId', type: 'string', size: 50, required: false },
      { key: 'fornecedorNome', type: 'string', size: 255, required: false },
      { key: 'valor', type: 'float', required: true },
      { key: 'valorPago', type: 'float', required: false },
      { key: 'dataEmissao', type: 'string', size: 10, required: true },
      { key: 'dataVencimento', type: 'string', size: 10, required: true },
      { key: 'dataPagamento', type: 'string', size: 10, required: false },
      { key: 'formaPagamento', type: 'string', size: 20, required: false },
      { key: 'categoria', type: 'string', size: 50, required: false },
      { key: 'documentoRef', type: 'string', size: 100, required: false },
      { key: 'parcela', type: 'string', size: 10, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'contas_receber',
    name: 'Contas a Receber',
    attrs: [
      { key: 'descricao', type: 'string', size: 255, required: true },
      { key: 'clienteId', type: 'string', size: 50, required: false },
      { key: 'clienteNome', type: 'string', size: 255, required: false },
      { key: 'valor', type: 'float', required: true },
      { key: 'valorRecebido', type: 'float', required: false },
      { key: 'dataEmissao', type: 'string', size: 10, required: true },
      { key: 'dataVencimento', type: 'string', size: 10, required: true },
      { key: 'dataRecebimento', type: 'string', size: 10, required: false },
      { key: 'formaPagamento', type: 'string', size: 20, required: false },
      { key: 'categoria', type: 'string', size: 50, required: false },
      { key: 'documentoRef', type: 'string', size: 100, required: false },
      { key: 'parcela', type: 'string', size: 10, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'funcionarios',
    name: 'Funcionarios',
    attrs: [
      { key: 'nome', type: 'string', size: 255, required: true },
      { key: 'cpf', type: 'string', size: 14, required: true },
      { key: 'pis', type: 'string', size: 15, required: false },
      { key: 'rg', type: 'string', size: 20, required: false },
      { key: 'ctps', type: 'string', size: 20, required: false },
      { key: 'dataNascimento', type: 'string', size: 10, required: false },
      { key: 'estadoCivil', type: 'string', size: 20, required: false },
      { key: 'endereco', type: 'string', size: 500, required: false },
      { key: 'cidade', type: 'string', size: 100, required: false },
      { key: 'uf', type: 'string', size: 2, required: false },
      { key: 'cep', type: 'string', size: 10, required: false },
      { key: 'telefone', type: 'string', size: 20, required: false },
      { key: 'email', type: 'string', size: 255, required: false },
      { key: 'dataAdmissao', type: 'string', size: 10, required: true },
      { key: 'dataDemissao', type: 'string', size: 10, required: false },
      { key: 'cargo', type: 'string', size: 100, required: false },
      { key: 'departamento', type: 'string', size: 100, required: false },
      { key: 'salario', type: 'float', required: true },
      { key: 'tipoContrato', type: 'string', size: 20, required: true },
      { key: 'cbo', type: 'string', size: 10, required: false },
      { key: 'dependentes', type: 'integer', required: false },
      { key: 'banco', type: 'string', size: 50, required: false },
      { key: 'agencia', type: 'string', size: 10, required: false },
      { key: 'conta', type: 'string', size: 20, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'notas_fiscais',
    name: 'Notas Fiscais',
    attrs: [
      { key: 'tipo', type: 'string', size: 10, required: true },
      { key: 'numero', type: 'integer', required: false },
      { key: 'serie', type: 'string', size: 5, required: false },
      { key: 'chaveAcesso', type: 'string', size: 50, required: false },
      { key: 'dataEmissao', type: 'string', size: 10, required: true },
      { key: 'destinatarioNome', type: 'string', size: 255, required: false },
      { key: 'destinatarioCpfCnpj', type: 'string', size: 20, required: false },
      { key: 'valorTotal', type: 'float', required: true },
      { key: 'valorICMS', type: 'float', required: false },
      { key: 'valorIPI', type: 'float', required: false },
      { key: 'valorPIS', type: 'float', required: false },
      { key: 'valorCOFINS', type: 'float', required: false },
      { key: 'valorISS', type: 'float', required: false },
      { key: 'naturezaOperacao', type: 'string', size: 100, required: false },
      { key: 'cfop', type: 'string', size: 5, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'certificados',
    name: 'Certificados Digitais',
    attrs: [
      { key: 'tipo', type: 'string', size: 5, required: true },
      { key: 'nome', type: 'string', size: 255, required: true },
      { key: 'cnpjCpf', type: 'string', size: 20, required: true },
      { key: 'emissor', type: 'string', size: 100, required: false },
      { key: 'serialNumber', type: 'string', size: 100, required: false },
      { key: 'dataValidade', type: 'string', size: 10, required: true },
      { key: 'status', type: 'string', size: 30, required: true },
      { key: 'totalOperacoes', type: 'integer', required: false },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'obrigacoes',
    name: 'Obrigacoes Acessorias',
    attrs: [
      { key: 'tipo', type: 'string', size: 30, required: true },
      { key: 'competencia', type: 'string', size: 7, required: true },
      { key: 'dataVencimento', type: 'string', size: 10, required: true },
      { key: 'dataEntrega', type: 'string', size: 10, required: false },
      { key: 'protocolo', type: 'string', size: 50, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'tabela_inss',
    name: 'Tabela INSS',
    attrs: [
      { key: 'vigencia', type: 'string', size: 7, required: true },
      { key: 'faixa', type: 'integer', required: true },
      { key: 'salarioMinimo', type: 'float', required: true },
      { key: 'salarioMaximo', type: 'float', required: true },
      { key: 'aliquota', type: 'float', required: true },
      { key: 'deducao', type: 'float', required: false },
      { key: 'tenantId', type: 'string', size: 50, required: true },
    ],
  },
  {
    id: 'tabela_irrf',
    name: 'Tabela IRRF',
    attrs: [
      { key: 'vigencia', type: 'string', size: 7, required: true },
      { key: 'faixa', type: 'integer', required: true },
      { key: 'baseMinima', type: 'float', required: true },
      { key: 'baseMaxima', type: 'float', required: true },
      { key: 'aliquota', type: 'float', required: true },
      { key: 'deducao', type: 'float', required: true },
      { key: 'deducaoPorDependente', type: 'float', required: false },
      { key: 'tenantId', type: 'string', size: 50, required: true },
    ],
  },
  {
    id: 'tabela_simples',
    name: 'Tabela Simples Nacional',
    attrs: [
      { key: 'anexo', type: 'string', size: 10, required: true },
      { key: 'faixa', type: 'integer', required: true },
      { key: 'receitaBrutaMin', type: 'float', required: true },
      { key: 'receitaBrutaMax', type: 'float', required: true },
      { key: 'aliquota', type: 'float', required: true },
      { key: 'parcelaDeducao', type: 'float', required: true },
      { key: 'vigencia', type: 'string', size: 7, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
    ],
  },
  {
    id: 'honorarios',
    name: 'Honorarios',
    attrs: [
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'empresaNome', type: 'string', size: 255, required: false },
      { key: 'valor', type: 'float', required: true },
      { key: 'competencia', type: 'string', size: 7, required: true },
      { key: 'dataVencimento', type: 'string', size: 10, required: true },
      { key: 'dataPagamento', type: 'string', size: 10, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'tarefas',
    name: 'Tarefas',
    attrs: [
      { key: 'titulo', type: 'string', size: 255, required: true },
      { key: 'descricao', type: 'string', size: 1000, required: false },
      { key: 'tipo', type: 'string', size: 30, required: false },
      { key: 'prioridade', type: 'string', size: 10, required: false },
      { key: 'responsavelId', type: 'string', size: 50, required: false },
      { key: 'responsavelNome', type: 'string', size: 150, required: false },
      { key: 'empresaId', type: 'string', size: 50, required: false },
      { key: 'empresaNome', type: 'string', size: 255, required: false },
      { key: 'dataVencimento', type: 'string', size: 10, required: false },
      { key: 'dataConclusao', type: 'string', size: 10, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  // ============================================================
  // NOVAS COLLECTIONS — Módulos adicionais
  // ============================================================
  {
    id: 'centros_custo',
    name: 'Centros de Custo',
    attrs: [
      { key: 'codigo', type: 'string', size: 20, required: true },
      { key: 'descricao', type: 'string', size: 255, required: true },
      { key: 'centroPaiId', type: 'string', size: 50, required: false },
      { key: 'nivel', type: 'integer', required: false },
      { key: 'tipo', type: 'string', size: 20, required: true },
      { key: 'responsavel', type: 'string', size: 150, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'regras_contabilizacao',
    name: 'Regras de Contabilização Automática',
    attrs: [
      { key: 'nome', type: 'string', size: 150, required: true },
      { key: 'descricao', type: 'string', size: 500, required: false },
      { key: 'tipoEvento', type: 'string', size: 30, required: true },
      { key: 'contaDebito', type: 'string', size: 20, required: true },
      { key: 'contaCredito', type: 'string', size: 20, required: true },
      { key: 'condicao', type: 'string', size: 255, required: false },
      { key: 'historicoPadrao', type: 'string', size: 500, required: false },
      { key: 'ativa', type: 'boolean', required: false },
      { key: 'prioridade', type: 'integer', required: false },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'cte',
    name: 'Conhecimento de Transporte Eletrônico',
    attrs: [
      { key: 'numero', type: 'integer', required: false },
      { key: 'serie', type: 'integer', required: false },
      { key: 'chave', type: 'string', size: 50, required: false },
      { key: 'tipoCte', type: 'string', size: 20, required: true },
      { key: 'modal', type: 'string', size: 20, required: true },
      { key: 'naturezaOperacao', type: 'string', size: 100, required: false },
      { key: 'remetenteNome', type: 'string', size: 255, required: false },
      { key: 'remetenteCnpjCpf', type: 'string', size: 20, required: false },
      { key: 'destinatarioNome', type: 'string', size: 255, required: false },
      { key: 'destinatarioCnpjCpf', type: 'string', size: 20, required: false },
      { key: 'valorTotalServico', type: 'float', required: false },
      { key: 'valorCarga', type: 'float', required: false },
      { key: 'produtoPredominante', type: 'string', size: 150, required: false },
      { key: 'icmsBase', type: 'float', required: false },
      { key: 'icmsAliquota', type: 'float', required: false },
      { key: 'icmsValor', type: 'float', required: false },
      { key: 'dataEmissao', type: 'string', size: 30, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'protocolo', type: 'string', size: 50, required: false },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'ferias',
    name: 'Férias',
    attrs: [
      { key: 'funcionarioId', type: 'string', size: 50, required: true },
      { key: 'funcionarioNome', type: 'string', size: 255, required: false },
      { key: 'periodoAquisitivoInicio', type: 'string', size: 10, required: false },
      { key: 'periodoAquisitivoFim', type: 'string', size: 10, required: false },
      { key: 'dataInicio', type: 'string', size: 10, required: true },
      { key: 'dataFim', type: 'string', size: 10, required: false },
      { key: 'diasGozo', type: 'integer', required: true },
      { key: 'diasAbono', type: 'integer', required: false },
      { key: 'abonoSolicitado', type: 'boolean', required: false },
      { key: 'valorFerias', type: 'float', required: false },
      { key: 'valorTerco', type: 'float', required: false },
      { key: 'valorAbono', type: 'float', required: false },
      { key: 'totalBruto', type: 'float', required: false },
      { key: 'descontoInss', type: 'float', required: false },
      { key: 'descontoIrrf', type: 'float', required: false },
      { key: 'valorLiquido', type: 'float', required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'rescisoes',
    name: 'Rescisões Contratuais',
    attrs: [
      { key: 'funcionarioId', type: 'string', size: 50, required: true },
      { key: 'funcionarioNome', type: 'string', size: 255, required: false },
      { key: 'dataDesligamento', type: 'string', size: 10, required: true },
      { key: 'dataAvisoPrevio', type: 'string', size: 10, required: false },
      { key: 'tipo', type: 'string', size: 30, required: true },
      { key: 'saldoSalario', type: 'float', required: false },
      { key: 'avisoPreviolIndenizado', type: 'float', required: false },
      { key: 'decimoTerceiroProporcional', type: 'float', required: false },
      { key: 'feriasVencidas', type: 'float', required: false },
      { key: 'feriasProporcionais', type: 'float', required: false },
      { key: 'tercoFerias', type: 'float', required: false },
      { key: 'multaFgts', type: 'float', required: false },
      { key: 'saqueFgts', type: 'float', required: false },
      { key: 'descontoInss', type: 'float', required: false },
      { key: 'descontoIrrf', type: 'float', required: false },
      { key: 'totalProventos', type: 'float', required: false },
      { key: 'totalDescontos', type: 'float', required: false },
      { key: 'valorLiquido', type: 'float', required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'split_payment',
    name: 'Split Payment IBS/CBS',
    attrs: [
      { key: 'operacaoId', type: 'string', size: 50, required: false },
      { key: 'descricao', type: 'string', size: 255, required: false },
      { key: 'valorTotal', type: 'float', required: true },
      { key: 'aliquotaIbs', type: 'float', required: false },
      { key: 'aliquotaCbs', type: 'float', required: false },
      { key: 'valorIbs', type: 'float', required: false },
      { key: 'valorCbs', type: 'float', required: false },
      { key: 'valorLiquido', type: 'float', required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'audit_logs',
    name: 'Logs de Auditoria',
    attrs: [
      { key: 'usuario', type: 'string', size: 150, required: true },
      { key: 'acao', type: 'string', size: 30, required: true },
      { key: 'modulo', type: 'string', size: 50, required: true },
      { key: 'descricao', type: 'string', size: 500, required: true },
      { key: 'ip', type: 'string', size: 50, required: false },
      { key: 'detalhes', type: 'string', size: 2000, required: false },
      { key: 'timestamp', type: 'string', size: 30, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'produtos',
    name: 'Produtos e Serviços',
    attrs: [
      { key: 'codigo', type: 'string', size: 30, required: true },
      { key: 'descricao', type: 'string', size: 255, required: true },
      { key: 'tipo', type: 'string', size: 20, required: true },
      { key: 'unidade', type: 'string', size: 10, required: false },
      { key: 'ncm', type: 'string', size: 10, required: false },
      { key: 'cest', type: 'string', size: 10, required: false },
      { key: 'cfop', type: 'string', size: 5, required: false },
      { key: 'preco', type: 'float', required: false },
      { key: 'custoMedio', type: 'float', required: false },
      { key: 'estoqueAtual', type: 'float', required: false },
      { key: 'estoqueMinimo', type: 'float', required: false },
      { key: 'categoria', type: 'string', size: 100, required: false },
      { key: 'marca', type: 'string', size: 100, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'contas_bancarias',
    name: 'Contas Bancárias',
    attrs: [
      { key: 'banco', type: 'string', size: 100, required: true },
      { key: 'codigoBanco', type: 'string', size: 5, required: false },
      { key: 'agencia', type: 'string', size: 10, required: true },
      { key: 'conta', type: 'string', size: 20, required: true },
      { key: 'tipoConta', type: 'string', size: 30, required: true },
      { key: 'descricao', type: 'string', size: 255, required: false },
      { key: 'saldoAtual', type: 'float', required: false },
      { key: 'saldoConciliado', type: 'float', required: false },
      { key: 'dataUltimaConciliacao', type: 'string', size: 10, required: false },
      { key: 'pix', type: 'string', size: 100, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'bens_patrimoniais',
    name: 'Bens Patrimoniais',
    attrs: [
      { key: 'codigo', type: 'string', size: 20, required: true },
      { key: 'descricao', type: 'string', size: 255, required: true },
      { key: 'grupo', type: 'string', size: 50, required: false },
      { key: 'dataAquisicao', type: 'string', size: 10, required: true },
      { key: 'valorAquisicao', type: 'float', required: true },
      { key: 'valorResidual', type: 'float', required: false },
      { key: 'vidaUtil', type: 'integer', required: false },
      { key: 'taxaDepreciacao', type: 'float', required: false },
      { key: 'depreciacaoAcumulada', type: 'float', required: false },
      { key: 'valorAtual', type: 'float', required: false },
      { key: 'localizacao', type: 'string', size: 150, required: false },
      { key: 'notaFiscal', type: 'string', size: 50, required: false },
      { key: 'fornecedor', type: 'string', size: 255, required: false },
      { key: 'contaContabil', type: 'string', size: 20, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'holerites',
    name: 'Holerites',
    attrs: [
      { key: 'funcionarioId', type: 'string', size: 50, required: true },
      { key: 'funcionarioNome', type: 'string', size: 255, required: false },
      { key: 'competencia', type: 'string', size: 7, required: true },
      { key: 'salarioBase', type: 'float', required: true },
      { key: 'totalProventos', type: 'float', required: false },
      { key: 'totalDescontos', type: 'float', required: false },
      { key: 'valorLiquido', type: 'float', required: false },
      { key: 'inss', type: 'float', required: false },
      { key: 'irrf', type: 'float', required: false },
      { key: 'fgts', type: 'float', required: false },
      { key: 'horasExtras', type: 'float', required: false },
      { key: 'adicionalNoturno', type: 'float', required: false },
      { key: 'valeTransporte', type: 'float', required: false },
      { key: 'valeRefeicao', type: 'float', required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'tenants',
    name: 'Escritórios (Tenants)',
    attrs: [
      { key: 'nomeEscritorio', type: 'string', size: 255, required: true },
      { key: 'cnpj', type: 'string', size: 20, required: true },
      { key: 'email', type: 'string', size: 255, required: true },
      { key: 'telefone', type: 'string', size: 20, required: false },
      { key: 'responsavel', type: 'string', size: 150, required: true },
      { key: 'plano', type: 'string', size: 30, required: true },
      { key: 'limiteClientes', type: 'integer', required: false },
      { key: 'limiteUsuarios', type: 'integer', required: false },
      { key: 'totalClientes', type: 'integer', required: false },
      { key: 'totalUsuarios', type: 'integer', required: false },
      { key: 'endereco', type: 'string', size: 500, required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'apuracoes_fiscais',
    name: 'Apurações Fiscais',
    attrs: [
      { key: 'tipo', type: 'string', size: 30, required: true },
      { key: 'competencia', type: 'string', size: 7, required: true },
      { key: 'baseCalculo', type: 'float', required: false },
      { key: 'debitos', type: 'float', required: false },
      { key: 'creditos', type: 'float', required: false },
      { key: 'valorApurado', type: 'float', required: false },
      { key: 'valorRecolher', type: 'float', required: false },
      { key: 'saldoCredor', type: 'float', required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
  {
    id: 'conciliacoes',
    name: 'Conciliações Bancárias',
    attrs: [
      { key: 'contaBancariaId', type: 'string', size: 50, required: true },
      { key: 'bancoNome', type: 'string', size: 100, required: false },
      { key: 'dataInicio', type: 'string', size: 10, required: true },
      { key: 'dataFim', type: 'string', size: 10, required: true },
      { key: 'saldoExtrato', type: 'float', required: false },
      { key: 'saldoContabil', type: 'float', required: false },
      { key: 'diferenca', type: 'float', required: false },
      { key: 'itensConferidos', type: 'integer', required: false },
      { key: 'itensPendentes', type: 'integer', required: false },
      { key: 'status', type: 'string', size: 20, required: true },
      { key: 'empresaId', type: 'string', size: 50, required: true },
      { key: 'tenantId', type: 'string', size: 50, required: true },
      { key: 'createdAt', type: 'string', size: 30, required: false },
    ],
  },
];

// ============================================================
// CRIAR COLLECTIONS E ATRIBUTOS
// ============================================================

async function createCollections() {
  for (const col of collections) {
    try {
      await db.createCollection(DB_ID, col.id, col.name, [
        Permission.read(Role.any()),
        Permission.create(Role.any()),
        Permission.update(Role.any()),
        Permission.delete(Role.any()),
      ]);
      console.log(`✓ Collection: ${col.name}`);
    } catch (e) {
      if (e.message?.includes('already exists')) {
        console.log(`~ Collection já existe: ${col.name}`);
      } else {
        console.error(`✗ Erro collection ${col.name}:`, e.message);
        continue;
      }
    }

    for (const attr of col.attrs) {
      try {
        const isArray = attr.array || false;
        const isReq = attr.required && !isArray;
        if (attr.type === 'string') {
          await db.createStringAttribute(DB_ID, col.id, attr.key, attr.size, isReq, (isReq || isArray) ? undefined : '', isArray);
        } else if (attr.type === 'integer') {
          await db.createIntegerAttribute(DB_ID, col.id, attr.key, isReq, undefined, undefined, isReq ? undefined : 0, isArray);
        } else if (attr.type === 'float') {
          await db.createFloatAttribute(DB_ID, col.id, attr.key, isReq, undefined, undefined, isReq ? undefined : 0, isArray);
        } else if (attr.type === 'boolean') {
          await db.createBooleanAttribute(DB_ID, col.id, attr.key, isReq, isReq ? undefined : false, isArray);
        }
        await sleep(300);
      } catch (e) {
        if (!e.message?.includes('already exists')) {
          console.error(`  ✗ Attr ${col.id}.${attr.key}:`, e.message?.substring(0, 80));
        }
      }
    }
    console.log(`  → ${col.attrs.length} atributos configurados`);
    await sleep(1000);
  }
}

// ============================================================
// POPULAR DADOS
// ============================================================

async function populateData() {
  const now = new Date().toISOString();
  const TENANT = 'default';

  // --- ROLES ---
  console.log('\n📦 Populando Roles...');
  const adminRole = await db.createDocument(DB_ID, 'roles', ID.unique(), {
    nome: 'ADMIN', descricao: 'Administrador do sistema com acesso total', sistema: true,
    permissoes: ['EMPRESA_READ','EMPRESA_WRITE','EMPRESA_DELETE','CONTABILIDADE_READ','CONTABILIDADE_WRITE','FISCAL_READ','FISCAL_WRITE','FINANCEIRO_READ','FINANCEIRO_WRITE','FOLHA_READ','FOLHA_WRITE','TRIBUTARIO_READ','TRIBUTARIO_WRITE','PATRIMONIO_READ','PATRIMONIO_WRITE','ESOCIAL_READ','ESOCIAL_WRITE','SPED_READ','SPED_WRITE','CERTIFICADO_READ','CERTIFICADO_WRITE','RELATORIOS_READ','RELATORIOS_WRITE','USUARIOS_READ','USUARIOS_WRITE','CONFIG_READ','CONFIG_WRITE'],
    tenantId: TENANT, ativo: true, createdAt: now,
  });
  console.log('  ✓ Role ADMIN:', adminRole.$id);

  const contadorRole = await db.createDocument(DB_ID, 'roles', ID.unique(), {
    nome: 'CONTADOR', descricao: 'Contador com acesso a módulos contábeis e fiscais', sistema: true,
    permissoes: ['EMPRESA_READ','CONTABILIDADE_READ','CONTABILIDADE_WRITE','FISCAL_READ','FISCAL_WRITE','TRIBUTARIO_READ','TRIBUTARIO_WRITE','SPED_READ','SPED_WRITE','ESOCIAL_READ','ESOCIAL_WRITE','FOLHA_READ','FOLHA_WRITE','RELATORIOS_READ'],
    tenantId: TENANT, ativo: true, createdAt: now,
  });
  console.log('  ✓ Role CONTADOR:', contadorRole.$id);

  await db.createDocument(DB_ID, 'roles', ID.unique(), {
    nome: 'AUXILIAR', descricao: 'Auxiliar contábil com acesso limitado', sistema: true,
    permissoes: ['EMPRESA_READ','CONTABILIDADE_READ','CONTABILIDADE_WRITE','FISCAL_READ','FINANCEIRO_READ','RELATORIOS_READ'],
    tenantId: TENANT, ativo: true, createdAt: now,
  });
  console.log('  ✓ Role AUXILIAR');

  // --- USUARIO ADMIN ---
  console.log('\n👤 Populando Usuário Admin...');
  await db.createDocument(DB_ID, 'usuarios', ID.unique(), {
    nome: 'Administrador Bear ERP', email: 'admin@bearerp.com.br',
    senha: '$2a$12$LJ3m4ys9PqKP7MfDLH.CQOQ7IhMCOWfMJLKR9OGaUx3VqL5Rq6Km', // Bear@2024!
    status: 'ATIVO', tenantId: TENANT, roleIds: [adminRole.$id],
    empresaIds: [], twoFactorEnabled: false, tentativasLogin: 0, createdAt: now,
  });
  console.log('  ✓ admin@bearerp.com.br / Bear@2024!');

  // --- EMPRESAS EXEMPLO ---
  console.log('\n🏢 Populando Empresas...');
  const empresas = [
    { razaoSocial: 'Tech Solutions Ltda', nomeFantasia: 'TechSol', cnpj: '12.345.678/0001-90', regimeTributario: 'SIMPLES_NACIONAL', cnaePrincipal: '6201-5/01', cidade: 'São Paulo', uf: 'SP', cep: '01001-000', email: 'contato@techsol.com.br', responsavel: 'Carlos Silva', status: 'ATIVA' },
    { razaoSocial: 'Comércio ABC S.A.', nomeFantasia: 'ABC Store', cnpj: '98.765.432/0001-10', regimeTributario: 'LUCRO_PRESUMIDO', cnaePrincipal: '4711-3/01', cidade: 'Rio de Janeiro', uf: 'RJ', cep: '20040-020', email: 'financeiro@abcstore.com.br', responsavel: 'Ana Souza', status: 'ATIVA' },
    { razaoSocial: 'Indústria Metal Norte Ltda', nomeFantasia: 'MetalNorte', cnpj: '45.678.901/0001-23', regimeTributario: 'LUCRO_REAL', cnaePrincipal: '2511-0/00', cidade: 'Manaus', uf: 'AM', cep: '69020-010', email: 'fiscal@metalnorte.com.br', responsavel: 'Roberto Lima', status: 'ATIVA' },
    { razaoSocial: 'Restaurante Sabor & Cia ME', nomeFantasia: 'Sabor & Cia', cnpj: '11.222.333/0001-44', regimeTributario: 'SIMPLES_NACIONAL', cnaePrincipal: '5611-2/01', cidade: 'Belo Horizonte', uf: 'MG', cep: '30130-000', email: 'adm@saborecia.com.br', responsavel: 'Maria Oliveira', status: 'ATIVA' },
    { razaoSocial: 'Construtora Edificar Ltda', nomeFantasia: 'Edificar', cnpj: '55.666.777/0001-88', regimeTributario: 'LUCRO_PRESUMIDO', cnaePrincipal: '4120-4/00', cidade: 'Curitiba', uf: 'PR', cep: '80010-000', email: 'contabil@edificar.com.br', responsavel: 'Pedro Santos', status: 'ATIVA' },
  ];

  const empresaIds = [];
  for (const emp of empresas) {
    const doc = await db.createDocument(DB_ID, 'empresas', ID.unique(), { ...emp, tenantId: TENANT, createdAt: now });
    empresaIds.push(doc.$id);
    console.log(`  ✓ ${emp.nomeFantasia} (${emp.regimeTributario})`);
  }

  // --- PLANO DE CONTAS (CFC/CPC referencial) ---
  console.log('\n📊 Populando Plano de Contas...');
  const planoContas = [
    { codigo: '1', nome: 'ATIVO', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 1, aceitaLancamento: false },
    { codigo: '1.1', nome: 'ATIVO CIRCULANTE', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 2, aceitaLancamento: false },
    { codigo: '1.1.01', nome: 'CAIXA E EQUIVALENTES', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 3, aceitaLancamento: false },
    { codigo: '1.1.01.01', nome: 'Caixa Geral', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.1.01.02', nome: 'Banco Conta Movimento', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.1.01.03', nome: 'Aplicações Financeiras', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.1.02', nome: 'CONTAS A RECEBER', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 3, aceitaLancamento: false },
    { codigo: '1.1.02.01', nome: 'Clientes', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.1.02.02', nome: 'Duplicatas a Receber', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.1.03', nome: 'ESTOQUES', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 3, aceitaLancamento: false },
    { codigo: '1.1.03.01', nome: 'Mercadorias para Revenda', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.1.03.02', nome: 'Matéria-Prima', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.1.04', nome: 'IMPOSTOS A RECUPERAR', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 3, aceitaLancamento: false },
    { codigo: '1.1.04.01', nome: 'ICMS a Recuperar', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.1.04.02', nome: 'PIS a Recuperar', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.1.04.03', nome: 'COFINS a Recuperar', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.1.04.04', nome: 'IPI a Recuperar', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.2', nome: 'ATIVO NÃO CIRCULANTE', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 2, aceitaLancamento: false },
    { codigo: '1.2.01', nome: 'IMOBILIZADO', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 3, aceitaLancamento: false },
    { codigo: '1.2.01.01', nome: 'Máquinas e Equipamentos', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.2.01.02', nome: 'Móveis e Utensílios', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.2.01.03', nome: 'Veículos', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.2.01.04', nome: 'Imóveis', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.2.01.99', nome: '(-) Depreciação Acumulada', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '1.2.02', nome: 'INTANGÍVEL', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 3, aceitaLancamento: false },
    { codigo: '1.2.02.01', nome: 'Softwares', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'ATIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2', nome: 'PASSIVO', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 1, aceitaLancamento: false },
    { codigo: '2.1', nome: 'PASSIVO CIRCULANTE', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 2, aceitaLancamento: false },
    { codigo: '2.1.01', nome: 'FORNECEDORES', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 3, aceitaLancamento: false },
    { codigo: '2.1.01.01', nome: 'Fornecedores Nacionais', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.02', nome: 'OBRIGAÇÕES TRABALHISTAS', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 3, aceitaLancamento: false },
    { codigo: '2.1.02.01', nome: 'Salários a Pagar', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.02.02', nome: 'INSS a Recolher', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.02.03', nome: 'FGTS a Recolher', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.02.04', nome: 'IRRF a Recolher', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.02.05', nome: 'Férias a Pagar', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.02.06', nome: '13º Salário a Pagar', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.03', nome: 'OBRIGAÇÕES TRIBUTÁRIAS', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 3, aceitaLancamento: false },
    { codigo: '2.1.03.01', nome: 'ICMS a Recolher', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.03.02', nome: 'PIS a Recolher', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.03.03', nome: 'COFINS a Recolher', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.03.04', nome: 'ISS a Recolher', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.03.05', nome: 'IRPJ a Recolher', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.03.06', nome: 'CSLL a Recolher', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '2.1.03.07', nome: 'Simples Nacional a Recolher', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PASSIVO', nivel: 4, aceitaLancamento: true },
    { codigo: '3', nome: 'PATRIMÔNIO LÍQUIDO', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'PATRIMONIO_LIQUIDO', nivel: 1, aceitaLancamento: false },
    { codigo: '3.1', nome: 'CAPITAL SOCIAL', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'PATRIMONIO_LIQUIDO', nivel: 2, aceitaLancamento: false },
    { codigo: '3.1.01', nome: 'Capital Social Integralizado', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PATRIMONIO_LIQUIDO', nivel: 3, aceitaLancamento: true },
    { codigo: '3.2', nome: 'RESERVAS', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'PATRIMONIO_LIQUIDO', nivel: 2, aceitaLancamento: false },
    { codigo: '3.2.01', nome: 'Reserva Legal', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PATRIMONIO_LIQUIDO', nivel: 3, aceitaLancamento: true },
    { codigo: '3.3', nome: 'LUCROS/PREJUÍZOS ACUMULADOS', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'PATRIMONIO_LIQUIDO', nivel: 2, aceitaLancamento: false },
    { codigo: '3.3.01', nome: 'Lucros Acumulados', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'PATRIMONIO_LIQUIDO', nivel: 3, aceitaLancamento: true },
    { codigo: '3.3.02', nome: 'Prejuízos Acumulados', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'PATRIMONIO_LIQUIDO', nivel: 3, aceitaLancamento: true },
    { codigo: '4', nome: 'RECEITAS', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'RECEITA', nivel: 1, aceitaLancamento: false },
    { codigo: '4.1', nome: 'RECEITA OPERACIONAL', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'RECEITA', nivel: 2, aceitaLancamento: false },
    { codigo: '4.1.01', nome: 'RECEITA BRUTA', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'RECEITA', nivel: 3, aceitaLancamento: false },
    { codigo: '4.1.01.01', nome: 'Receita de Vendas', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'RECEITA', nivel: 4, aceitaLancamento: true },
    { codigo: '4.1.01.02', nome: 'Receita de Serviços', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'RECEITA', nivel: 4, aceitaLancamento: true },
    { codigo: '4.1.02', nome: 'DEDUÇÕES DA RECEITA', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'RECEITA', nivel: 3, aceitaLancamento: false },
    { codigo: '4.1.02.01', nome: '(-) Devoluções', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'RECEITA', nivel: 4, aceitaLancamento: true },
    { codigo: '4.1.02.02', nome: '(-) Impostos sobre Vendas', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'RECEITA', nivel: 4, aceitaLancamento: true },
    { codigo: '4.2', nome: 'RECEITAS FINANCEIRAS', tipo: 'SINTETICA', natureza: 'CREDORA', classificacao: 'RECEITA', nivel: 2, aceitaLancamento: false },
    { codigo: '4.2.01', nome: 'Juros Recebidos', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'RECEITA', nivel: 3, aceitaLancamento: true },
    { codigo: '4.2.02', nome: 'Rendimentos de Aplicações', tipo: 'ANALITICA', natureza: 'CREDORA', classificacao: 'RECEITA', nivel: 3, aceitaLancamento: true },
    { codigo: '5', nome: 'CUSTOS E DESPESAS', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 1, aceitaLancamento: false },
    { codigo: '5.1', nome: 'CUSTOS', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'CUSTO', nivel: 2, aceitaLancamento: false },
    { codigo: '5.1.01', nome: 'CMV / CPV / CSP', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'CUSTO', nivel: 3, aceitaLancamento: false },
    { codigo: '5.1.01.01', nome: 'Custo das Mercadorias Vendidas', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'CUSTO', nivel: 4, aceitaLancamento: true },
    { codigo: '5.1.01.02', nome: 'Custo dos Serviços Prestados', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'CUSTO', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2', nome: 'DESPESAS OPERACIONAIS', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 2, aceitaLancamento: false },
    { codigo: '5.2.01', nome: 'DESPESAS ADMINISTRATIVAS', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 3, aceitaLancamento: false },
    { codigo: '5.2.01.01', nome: 'Salários e Ordenados', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.01.02', nome: 'Encargos Sociais (INSS/FGTS)', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.01.03', nome: 'Aluguel', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.01.04', nome: 'Energia Elétrica', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.01.05', nome: 'Água e Saneamento', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.01.06', nome: 'Telefone e Internet', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.01.07', nome: 'Material de Escritório', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.01.08', nome: 'Honorários Contábeis', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.01.09', nome: 'Depreciação', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.01.10', nome: 'Seguros', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.02', nome: 'DESPESAS COMERCIAIS', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 3, aceitaLancamento: false },
    { codigo: '5.2.02.01', nome: 'Comissões sobre Vendas', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.02.02', nome: 'Propaganda e Publicidade', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.2.02.03', nome: 'Fretes sobre Vendas', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 4, aceitaLancamento: true },
    { codigo: '5.3', nome: 'DESPESAS FINANCEIRAS', tipo: 'SINTETICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 2, aceitaLancamento: false },
    { codigo: '5.3.01', nome: 'Juros Pagos', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 3, aceitaLancamento: true },
    { codigo: '5.3.02', nome: 'Tarifas Bancárias', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 3, aceitaLancamento: true },
    { codigo: '5.3.03', nome: 'IOF', tipo: 'ANALITICA', natureza: 'DEVEDORA', classificacao: 'DESPESA', nivel: 3, aceitaLancamento: true },
  ];

  for (const conta of planoContas) {
    await db.createDocument(DB_ID, 'plano_contas', ID.unique(), {
      ...conta, empresaId: empresaIds[0], tenantId: TENANT, ativo: true, createdAt: now,
    });
  }
  console.log(`  ✓ ${planoContas.length} contas criadas (Plano CFC/CPC)`);

  // --- TABELA INSS 2024 ---
  console.log('\n💰 Populando Tabela INSS 2024...');
  const tabelaINSS = [
    { vigencia: '2024-01', faixa: 1, salarioMinimo: 0, salarioMaximo: 1412.00, aliquota: 7.5, deducao: 0 },
    { vigencia: '2024-01', faixa: 2, salarioMinimo: 1412.01, salarioMaximo: 2666.68, aliquota: 9.0, deducao: 21.18 },
    { vigencia: '2024-01', faixa: 3, salarioMinimo: 2666.69, salarioMaximo: 4000.03, aliquota: 12.0, deducao: 101.18 },
    { vigencia: '2024-01', faixa: 4, salarioMinimo: 4000.04, salarioMaximo: 7786.02, aliquota: 14.0, deducao: 181.18 },
  ];
  for (const f of tabelaINSS) {
    await db.createDocument(DB_ID, 'tabela_inss', ID.unique(), { ...f, tenantId: TENANT });
  }
  console.log('  ✓ 4 faixas INSS');

  // --- TABELA IRRF 2024 ---
  console.log('\n💰 Populando Tabela IRRF 2024...');
  const tabelaIRRF = [
    { vigencia: '2024-01', faixa: 1, baseMinima: 0, baseMaxima: 2259.20, aliquota: 0, deducao: 0, deducaoPorDependente: 189.59 },
    { vigencia: '2024-01', faixa: 2, baseMinima: 2259.21, baseMaxima: 2826.65, aliquota: 7.5, deducao: 169.44, deducaoPorDependente: 189.59 },
    { vigencia: '2024-01', faixa: 3, baseMinima: 2826.66, baseMaxima: 3751.05, aliquota: 15.0, deducao: 381.44, deducaoPorDependente: 189.59 },
    { vigencia: '2024-01', faixa: 4, baseMinima: 3751.06, baseMaxima: 4664.68, aliquota: 22.5, deducao: 662.77, deducaoPorDependente: 189.59 },
    { vigencia: '2024-01', faixa: 5, baseMinima: 4664.69, baseMaxima: 999999.99, aliquota: 27.5, deducao: 896.00, deducaoPorDependente: 189.59 },
  ];
  for (const f of tabelaIRRF) {
    await db.createDocument(DB_ID, 'tabela_irrf', ID.unique(), { ...f, tenantId: TENANT });
  }
  console.log('  ✓ 5 faixas IRRF');

  // --- TABELA SIMPLES NACIONAL ---
  console.log('\n💰 Populando Tabela Simples Nacional...');
  const tabelaSimples = [
    // Anexo I - Comércio
    { anexo: 'I', faixa: 1, receitaBrutaMin: 0, receitaBrutaMax: 180000, aliquota: 4.0, parcelaDeducao: 0 },
    { anexo: 'I', faixa: 2, receitaBrutaMin: 180000.01, receitaBrutaMax: 360000, aliquota: 7.3, parcelaDeducao: 5940 },
    { anexo: 'I', faixa: 3, receitaBrutaMin: 360000.01, receitaBrutaMax: 720000, aliquota: 9.5, parcelaDeducao: 13860 },
    { anexo: 'I', faixa: 4, receitaBrutaMin: 720000.01, receitaBrutaMax: 1800000, aliquota: 10.7, parcelaDeducao: 22500 },
    { anexo: 'I', faixa: 5, receitaBrutaMin: 1800000.01, receitaBrutaMax: 3600000, aliquota: 14.3, parcelaDeducao: 87300 },
    { anexo: 'I', faixa: 6, receitaBrutaMin: 3600000.01, receitaBrutaMax: 4800000, aliquota: 19.0, parcelaDeducao: 378000 },
    // Anexo II - Indústria
    { anexo: 'II', faixa: 1, receitaBrutaMin: 0, receitaBrutaMax: 180000, aliquota: 4.5, parcelaDeducao: 0 },
    { anexo: 'II', faixa: 2, receitaBrutaMin: 180000.01, receitaBrutaMax: 360000, aliquota: 7.8, parcelaDeducao: 5940 },
    { anexo: 'II', faixa: 3, receitaBrutaMin: 360000.01, receitaBrutaMax: 720000, aliquota: 10.0, parcelaDeducao: 13860 },
    { anexo: 'II', faixa: 4, receitaBrutaMin: 720000.01, receitaBrutaMax: 1800000, aliquota: 11.2, parcelaDeducao: 22500 },
    { anexo: 'II', faixa: 5, receitaBrutaMin: 1800000.01, receitaBrutaMax: 3600000, aliquota: 14.7, parcelaDeducao: 85500 },
    { anexo: 'II', faixa: 6, receitaBrutaMin: 3600000.01, receitaBrutaMax: 4800000, aliquota: 30.0, parcelaDeducao: 720000 },
    // Anexo III - Serviços
    { anexo: 'III', faixa: 1, receitaBrutaMin: 0, receitaBrutaMax: 180000, aliquota: 6.0, parcelaDeducao: 0 },
    { anexo: 'III', faixa: 2, receitaBrutaMin: 180000.01, receitaBrutaMax: 360000, aliquota: 11.2, parcelaDeducao: 9360 },
    { anexo: 'III', faixa: 3, receitaBrutaMin: 360000.01, receitaBrutaMax: 720000, aliquota: 13.5, parcelaDeducao: 17640 },
    { anexo: 'III', faixa: 4, receitaBrutaMin: 720000.01, receitaBrutaMax: 1800000, aliquota: 16.0, parcelaDeducao: 35640 },
    { anexo: 'III', faixa: 5, receitaBrutaMin: 1800000.01, receitaBrutaMax: 3600000, aliquota: 21.0, parcelaDeducao: 125640 },
    { anexo: 'III', faixa: 6, receitaBrutaMin: 3600000.01, receitaBrutaMax: 4800000, aliquota: 33.0, parcelaDeducao: 648000 },
    // Anexo IV - Serviços (construção, advocacia, etc)
    { anexo: 'IV', faixa: 1, receitaBrutaMin: 0, receitaBrutaMax: 180000, aliquota: 4.5, parcelaDeducao: 0 },
    { anexo: 'IV', faixa: 2, receitaBrutaMin: 180000.01, receitaBrutaMax: 360000, aliquota: 9.0, parcelaDeducao: 8100 },
    { anexo: 'IV', faixa: 3, receitaBrutaMin: 360000.01, receitaBrutaMax: 720000, aliquota: 10.2, parcelaDeducao: 12420 },
    { anexo: 'IV', faixa: 4, receitaBrutaMin: 720000.01, receitaBrutaMax: 1800000, aliquota: 14.0, parcelaDeducao: 39780 },
    { anexo: 'IV', faixa: 5, receitaBrutaMin: 1800000.01, receitaBrutaMax: 3600000, aliquota: 22.0, parcelaDeducao: 183780 },
    { anexo: 'IV', faixa: 6, receitaBrutaMin: 3600000.01, receitaBrutaMax: 4800000, aliquota: 33.0, parcelaDeducao: 828000 },
    // Anexo V - Serviços profissionais
    { anexo: 'V', faixa: 1, receitaBrutaMin: 0, receitaBrutaMax: 180000, aliquota: 15.5, parcelaDeducao: 0 },
    { anexo: 'V', faixa: 2, receitaBrutaMin: 180000.01, receitaBrutaMax: 360000, aliquota: 18.0, parcelaDeducao: 4500 },
    { anexo: 'V', faixa: 3, receitaBrutaMin: 360000.01, receitaBrutaMax: 720000, aliquota: 19.5, parcelaDeducao: 9900 },
    { anexo: 'V', faixa: 4, receitaBrutaMin: 720000.01, receitaBrutaMax: 1800000, aliquota: 20.5, parcelaDeducao: 17100 },
    { anexo: 'V', faixa: 5, receitaBrutaMin: 1800000.01, receitaBrutaMax: 3600000, aliquota: 23.0, parcelaDeducao: 62100 },
    { anexo: 'V', faixa: 6, receitaBrutaMin: 3600000.01, receitaBrutaMax: 4800000, aliquota: 30.5, parcelaDeducao: 540000 },
  ];
  for (const f of tabelaSimples) {
    await db.createDocument(DB_ID, 'tabela_simples', ID.unique(), { ...f, vigencia: '2024-01', tenantId: TENANT });
  }
  console.log(`  ✓ ${tabelaSimples.length} faixas Simples Nacional (5 anexos)`);

  // --- FUNCIONARIOS EXEMPLO ---
  console.log('\n👷 Populando Funcionários...');
  const funcionarios = [
    { nome: 'João Carlos Pereira', cpf: '123.456.789-00', dataAdmissao: '2022-03-15', cargo: 'Analista de TI', departamento: 'Tecnologia', salario: 5500.00, tipoContrato: 'CLT', cbo: '2124-05', dependentes: 2, status: 'ATIVO' },
    { nome: 'Maria Fernanda Costa', cpf: '987.654.321-00', dataAdmissao: '2021-08-01', cargo: 'Gerente Comercial', departamento: 'Comercial', salario: 8200.00, tipoContrato: 'CLT', cbo: '1421-05', dependentes: 1, status: 'ATIVO' },
    { nome: 'Pedro Henrique Lima', cpf: '456.789.123-00', dataAdmissao: '2023-01-10', cargo: 'Auxiliar Administrativo', departamento: 'Administrativo', salario: 2100.00, tipoContrato: 'CLT', cbo: '4110-10', dependentes: 0, status: 'ATIVO' },
    { nome: 'Ana Beatriz Souza', cpf: '321.654.987-00', dataAdmissao: '2020-06-20', cargo: 'Coordenadora Financeira', departamento: 'Financeiro', salario: 6800.00, tipoContrato: 'CLT', cbo: '2522-10', dependentes: 3, status: 'ATIVO' },
  ];
  for (const func of funcionarios) {
    await db.createDocument(DB_ID, 'funcionarios', ID.unique(), { ...func, empresaId: empresaIds[0], tenantId: TENANT, createdAt: now });
  }
  console.log(`  ✓ ${funcionarios.length} funcionários`);

  // --- CLIENTES EXEMPLO ---
  console.log('\n🤝 Populando Clientes...');
  const clientesData = [
    { nome: 'Distribuidora Central Ltda', cpfCnpj: '33.444.555/0001-66', tipo: 'PJ', email: 'compras@distcentral.com.br', cidade: 'São Paulo', uf: 'SP', status: 'ATIVO' },
    { nome: 'Farmácia Saúde Total', cpfCnpj: '77.888.999/0001-11', tipo: 'PJ', email: 'contato@saudetotal.com.br', cidade: 'Campinas', uf: 'SP', status: 'ATIVO' },
    { nome: 'José Antônio Ribeiro', cpfCnpj: '111.222.333-44', tipo: 'PF', email: 'jose.ribeiro@email.com', cidade: 'Santos', uf: 'SP', status: 'ATIVO' },
  ];
  for (const cli of clientesData) {
    await db.createDocument(DB_ID, 'clientes', ID.unique(), { ...cli, empresaId: empresaIds[0], tenantId: TENANT, createdAt: now });
  }
  console.log(`  ✓ ${clientesData.length} clientes`);

  // --- FORNECEDORES EXEMPLO ---
  console.log('\n🚚 Populando Fornecedores...');
  const fornecedoresData = [
    { nome: 'Papelaria Office Max', cpfCnpj: '44.555.666/0001-77', tipo: 'PJ', email: 'vendas@officemax.com.br', cidade: 'São Paulo', uf: 'SP', status: 'ATIVO' },
    { nome: 'Aluguel Imóvel Comercial Ltda', cpfCnpj: '88.999.000/0001-22', tipo: 'PJ', email: 'financeiro@imovelcom.com.br', cidade: 'São Paulo', uf: 'SP', status: 'ATIVO' },
    { nome: 'Eletricidade Paulista S.A.', cpfCnpj: '11.222.333/0001-55', tipo: 'PJ', email: 'fatura@eletricidade.com.br', cidade: 'São Paulo', uf: 'SP', status: 'ATIVO' },
  ];
  for (const forn of fornecedoresData) {
    await db.createDocument(DB_ID, 'fornecedores', ID.unique(), { ...forn, empresaId: empresaIds[0], tenantId: TENANT, createdAt: now });
  }
  console.log(`  ✓ ${fornecedoresData.length} fornecedores`);

  console.log('\n✅ POPULAÇÃO COMPLETA!');
  console.log(`  📊 ${planoContas.length} contas no Plano de Contas`);
  console.log(`  💰 ${tabelaINSS.length} faixas INSS + ${tabelaIRRF.length} faixas IRRF + ${tabelaSimples.length} faixas Simples`);
  console.log(`  🏢 ${empresas.length} empresas`);
  console.log(`  👷 ${funcionarios.length} funcionários`);
  console.log(`  🤝 ${clientesData.length} clientes + ${fornecedoresData.length} fornecedores`);
  console.log(`  👤 1 usuário admin (admin@bearerp.com.br / Bear@2024!)`);
  console.log(`  🔑 3 roles (ADMIN, CONTADOR, AUXILIAR)`);
}

// ============================================================
// EXECUTAR
// ============================================================

async function main() {
  console.log('🐻 Bear ERP — Setup Appwrite Database\n');
  console.log('='.repeat(50));

  console.log('\n📁 FASE 1: Criando Collections e Atributos...\n');
  await createCollections();

  // Esperar atributos serem processados pelo Appwrite
  console.log('\n⏳ Aguardando atributos serem processados (30s)...');
  await sleep(30000);

  console.log('\n📦 FASE 2: Populando Dados...\n');
  await populateData();

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Setup completo! Database Bear ERP populado.');
}

main().catch(e => {
  console.error('❌ Erro fatal:', e.message);
  process.exit(1);
});
