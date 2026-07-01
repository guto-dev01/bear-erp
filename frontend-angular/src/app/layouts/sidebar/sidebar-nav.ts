// ═══════════════════════════════════════════════════════════════════════════
// Configuração central de navegação da sidebar (fonte única de verdade).
// Todas as rotas abaixo existem em app.routes.ts. Nada é inventado aqui.
// Ícones: Material Symbols Rounded (mesma fonte já usada no app).
// ═══════════════════════════════════════════════════════════════════════════

export interface NavLeaf {
  id: string;
  label: string;
  icon: string;
  route: string;
  /** Papéis que podem ver o item (opcional). Ausente → visível para todos. */
  roles?: string[];
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  children: NavLeaf[];
  roles?: string[];
}

export type NavNode = NavLeaf | NavGroup;

export function isGroup(node: NavNode): node is NavGroup {
  return (node as NavGroup).children !== undefined;
}

export interface NavSection {
  id: string;
  /** '' → seção sem cabeçalho. */
  title: string;
  items: NavNode[];
  /** Gate opcional da seção inteira (ex.: Administração). */
  roles?: string[];
}

/** Papéis com acesso administrativo (comparação case-insensitive). */
export const ADMIN_ROLES = ['ADMIN', 'ADMINISTRADOR', 'OWNER', 'PROPRIETARIO', 'CONTADOR'];

export const SIDEBAR_NAV: NavSection[] = [
  {
    id: 'visao-geral',
    title: 'Visão Geral',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'space_dashboard', route: '/dashboard' },
      { id: 'tarefas', label: 'Tarefas', icon: 'task_alt', route: '/escritorio/tarefas' },
    ],
  },
  {
    id: 'principal',
    title: 'Principal',
    items: [
      {
        id: 'cadastros', label: 'Cadastros', icon: 'folder_shared',
        children: [
          { id: 'clientes', label: 'Clientes', icon: 'group', route: '/clientes' },
          { id: 'empresas', label: 'Empresas', icon: 'apartment', route: '/empresas' },
          { id: 'fornecedores', label: 'Fornecedores', icon: 'local_shipping', route: '/fornecedores' },
          { id: 'produtos', label: 'Produtos', icon: 'inventory_2', route: '/cadastros/produtos' },
        ],
      },
      {
        id: 'financeiro', label: 'Financeiro', icon: 'payments',
        children: [
          { id: 'contas-pagar', label: 'Contas a Pagar', icon: 'money_off', route: '/financeiro/contas-pagar' },
          { id: 'contas-receber', label: 'Contas a Receber', icon: 'attach_money', route: '/financeiro/contas-receber' },
          { id: 'contas-bancarias', label: 'Contas Bancárias', icon: 'account_balance', route: '/financeiro/contas-bancarias' },
          { id: 'conciliacao', label: 'Conciliação', icon: 'compare_arrows', route: '/financeiro/conciliacao' },
          { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: 'show_chart', route: '/financeiro/fluxo-caixa' },
          { id: 'honorarios', label: 'Honorários', icon: 'request_quote', route: '/escritorio/honorarios' },
        ],
      },
      {
        id: 'folha', label: 'Folha de Pagamento', icon: 'badge',
        children: [
          { id: 'funcionarios', label: 'Funcionários', icon: 'person', route: '/folha/funcionarios' },
          { id: 'holerites', label: 'Holerites', icon: 'receipt', route: '/folha/holerites' },
          { id: 'ferias', label: 'Férias', icon: 'beach_access', route: '/folha/ferias' },
          { id: 'rescisao', label: 'Rescisão / 13º', icon: 'person_off', route: '/folha/rescisao' },
          { id: 'esocial', label: 'eSocial', icon: 'verified_user', route: '/esocial' },
        ],
      },
    ],
  },
  {
    id: 'contabil-fiscal',
    title: 'Contábil & Fiscal',
    items: [
      {
        id: 'contabilidade', label: 'Contabilidade', icon: 'account_balance',
        children: [
          { id: 'plano-contas', label: 'Plano de Contas', icon: 'account_tree', route: '/contabilidade/plano-contas' },
          { id: 'lancamentos', label: 'Lançamentos', icon: 'edit_note', route: '/contabilidade/lancamentos' },
          { id: 'balancete', label: 'Balancete', icon: 'balance', route: '/contabilidade/balancete' },
          { id: 'dre', label: 'DRE', icon: 'trending_up', route: '/contabilidade/dre' },
          { id: 'balanco', label: 'Balanço Patrimonial', icon: 'account_balance_wallet', route: '/contabilidade/balanco-patrimonial' },
          { id: 'centros-custo', label: 'Centros de Custo', icon: 'hub', route: '/contabilidade/centros-custo' },
          { id: 'contab-automatica', label: 'Contab. Automática', icon: 'auto_fix_high', route: '/contabilidade/contabilidade-automatica' },
          { id: 'teste-bear', label: 'Teste Bear', icon: 'science', route: '/contabilidade/teste-bear' },
        ],
      },
      {
        id: 'fiscal', label: 'Fiscal', icon: 'receipt_long',
        children: [
          { id: 'nfe', label: 'NF-e', icon: 'description', route: '/fiscal/nfe' },
          { id: 'nfse', label: 'NFS-e', icon: 'article', route: '/fiscal/nfse' },
          { id: 'cte', label: 'CT-e', icon: 'local_shipping', route: '/fiscal/cte' },
          { id: 'apuracoes', label: 'Apurações', icon: 'calculate', route: '/fiscal/apuracoes' },
          { id: 'guias', label: 'Guias', icon: 'receipt', route: '/fiscal/guias' },
        ],
      },
      {
        id: 'obrigacoes', label: 'Obrigações & Tributos', icon: 'gavel',
        children: [
          { id: 'sped-obrigacoes', label: 'Obrigações Acessórias', icon: 'checklist', route: '/sped/obrigacoes' },
          { id: 'sped-fiscal', label: 'SPED Fiscal', icon: 'folder_special', route: '/sped/sped-fiscal' },
          { id: 'simples', label: 'Simples Nacional', icon: 'store', route: '/tributario/simples' },
          { id: 'lucro-presumido', label: 'Lucro Presumido', icon: 'account_balance', route: '/tributario/lucro-presumido' },
          { id: 'lucro-real', label: 'Lucro Real', icon: 'analytics', route: '/tributario/lucro-real' },
          { id: 'split-payment', label: 'Split Payment', icon: 'call_split', route: '/tributario/split-payment' },
          { id: 'bens', label: 'Bens', icon: 'inventory', route: '/patrimonio/bens' },
          { id: 'depreciacao', label: 'Depreciação', icon: 'trending_down', route: '/patrimonio/depreciacao' },
        ],
      },
    ],
  },
  {
    id: 'ferramentas',
    title: 'Ferramentas',
    items: [
      { id: 'relatorios', label: 'Relatórios', icon: 'assessment', route: '/relatorios' },
      { id: 'ai-contabil', label: 'AI Contábil', icon: 'smart_toy', route: '/ai-contabil' },
      { id: 'ocr', label: 'OCR Documentos', icon: 'document_scanner', route: '/ferramentas/ocr' },
    ],
  },
  {
    id: 'administracao',
    title: 'Administração',
    roles: ADMIN_ROLES,
    items: [
      { id: 'escritorios', label: 'Escritórios', icon: 'business', route: '/sistema/multi-tenancy' },
      { id: 'integracoes', label: 'Integrações', icon: 'hub', route: '/integracoes' },
      { id: 'certificados', label: 'Certificados', icon: 'verified', route: '/certificados' },
      { id: 'auditoria', label: 'Auditoria', icon: 'shield', route: '/sistema/auditoria' },
      { id: 'configuracoes', label: 'Configurações', icon: 'settings', route: '/configuracoes' },
    ],
  },
];

export interface FlatCommand { label: string; icon: string; route: string; section: string; }

/** Achata a árvore em itens navegáveis (usado pela paleta de comandos ⌘K). */
export function flattenNav(sections: NavSection[]): FlatCommand[] {
  const out: FlatCommand[] = [];
  for (const section of sections) {
    for (const node of section.items) {
      if (isGroup(node)) {
        for (const child of node.children) {
          out.push({ label: child.label, icon: child.icon, route: child.route, section: `${section.title} › ${node.label}` });
        }
      } else {
        out.push({ label: node.label, icon: node.icon, route: node.route, section: section.title });
      }
    }
  }
  return out;
}
