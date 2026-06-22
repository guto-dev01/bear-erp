import { Routes } from '@angular/router';
import { authGuard } from '@core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('@features/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('@features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'empresas',
        loadComponent: () => import('@features/empresas/empresas.component').then(m => m.EmpresasComponent),
      },
      {
        path: 'clientes',
        loadComponent: () => import('@features/clientes/clientes.component').then(m => m.ClientesComponent),
      },
      {
        path: 'fornecedores',
        loadComponent: () => import('@features/fornecedores/fornecedores.component').then(m => m.FornecedoresComponent),
      },
      {
        path: 'contabilidade',
        children: [
          {
            path: 'plano-contas',
            loadComponent: () => import('@features/contabilidade/plano-contas/plano-contas.component').then(m => m.PlanoContasComponent),
          },
          {
            path: 'lancamentos',
            loadComponent: () => import('@features/contabilidade/lancamentos/lancamentos.component').then(m => m.LancamentosComponent),
          },
          {
            path: 'balancete',
            loadComponent: () => import('@features/contabilidade/balancete/balancete.component').then(m => m.BalanceteComponent),
          },
          {
            path: 'dre',
            loadComponent: () => import('@features/contabilidade/dre/dre.component').then(m => m.DreComponent),
          },
          {
            path: 'balanco-patrimonial',
            loadComponent: () => import('@features/contabilidade/balanco-patrimonial/balanco-patrimonial.component').then(m => m.BalancoPatrimonialComponent),
          },
          {
            path: 'centros-custo',
            loadComponent: () => import('@features/contabilidade/centros-custo/centros-custo.component').then(m => m.CentrosCustoComponent),
          },
          {
            path: 'contabilidade-automatica',
            loadComponent: () => import('@features/contabilidade/contabilidade-automatica/contabilidade-automatica.component').then(m => m.ContabilidadeAutomaticaComponent),
          },
          {
            path: 'teste-bear',
            loadComponent: () => import('@features/contabilidade/teste-bear.component').then(m => m.TesteBearComponent),
          },
        ],
      },
      {
        path: 'fiscal',
        children: [
          {
            path: 'nfe',
            loadComponent: () => import('@features/fiscal/nfe/nfe.component').then(m => m.NfeComponent),
          },
          {
            path: 'nfse',
            loadComponent: () => import('@features/fiscal/nfse/nfse.component').then(m => m.NfseComponent),
          },
          {
            path: 'cte',
            loadComponent: () => import('@features/fiscal/cte/cte.component').then(m => m.CteComponent),
          },
          {
            path: 'apuracoes',
            loadComponent: () => import('@features/fiscal/apuracoes/apuracoes.component').then(m => m.ApuracoesComponent),
          },
          {
            path: 'guias',
            loadComponent: () => import('@features/fiscal/guias/guias.component').then(m => m.GuiasComponent),
          },
        ],
      },
      {
        path: 'financeiro',
        children: [
          {
            path: 'contas-pagar',
            loadComponent: () => import('@features/financeiro/contas-pagar/contas-pagar.component').then(m => m.ContasPagarComponent),
          },
          {
            path: 'contas-receber',
            loadComponent: () => import('@features/financeiro/contas-receber/contas-receber.component').then(m => m.ContasReceberComponent),
          },
          {
            path: 'conciliacao',
            loadComponent: () => import('@features/financeiro/conciliacao/conciliacao.component').then(m => m.ConciliacaoComponent),
          },
          {
            path: 'fluxo-caixa',
            loadComponent: () => import('@features/financeiro/fluxo-caixa/fluxo-caixa.component').then(m => m.FluxoCaixaComponent),
          },
          {
            path: 'contas-bancarias',
            loadComponent: () => import('@features/financeiro/contas-bancarias/contas-bancarias.component').then(m => m.ContasBancariasComponent),
          },
        ],
      },
      {
        path: 'folha',
        children: [
          {
            path: 'funcionarios',
            loadComponent: () => import('@features/folha/funcionarios/funcionarios.component').then(m => m.FuncionariosComponent),
          },
          {
            path: 'holerites',
            loadComponent: () => import('@features/folha/holerites/holerites.component').then(m => m.HoleritesComponent),
          },
          {
            path: 'ferias',
            loadComponent: () => import('@features/folha/ferias/ferias.component').then(m => m.FeriasComponent),
          },
          {
            path: 'rescisao',
            loadComponent: () => import('@features/folha/rescisao/rescisao.component').then(m => m.RescisaoComponent),
          },
        ],
      },
      {
        path: 'patrimonio',
        children: [
          {
            path: 'bens',
            loadComponent: () => import('@features/patrimonio/bens/bens.component').then(m => m.BensComponent),
          },
          {
            path: 'depreciacao',
            loadComponent: () => import('@features/patrimonio/depreciacao/depreciacao.component').then(m => m.DepreciacaoComponent),
          },
        ],
      },
      {
        path: 'tributario',
        children: [
          {
            path: 'simples',
            loadComponent: () => import('@features/tributario/simples/simples.component').then(m => m.SimplesComponent),
          },
          {
            path: 'lucro-presumido',
            loadComponent: () => import('@features/tributario/lucro-presumido/lucro-presumido.component').then(m => m.LucroPresumidoComponent),
          },
          {
            path: 'lucro-real',
            loadComponent: () => import('@features/tributario/lucro-real/lucro-real.component').then(m => m.LucroRealComponent),
          },
          {
            path: 'split-payment',
            loadComponent: () => import('@features/tributario/split-payment/split-payment.component').then(m => m.SplitPaymentComponent),
          },
        ],
      },
      {
        path: 'sped',
        children: [
          {
            path: 'obrigacoes',
            loadComponent: () => import('@features/sped/obrigacoes.component').then(m => m.ObrigacoesComponent),
          },
          {
            path: 'sped-fiscal',
            loadComponent: () => import('@features/sped/sped-fiscal.component').then(m => m.SpedFiscalComponent),
          },
        ],
      },
      {
        path: 'esocial',
        loadComponent: () => import('@features/esocial/esocial.component').then(m => m.EsocialComponent),
      },
      {
        path: 'escritorio',
        children: [
          {
            path: 'tarefas',
            loadComponent: () => import('@features/escritorio/tarefas/tarefas.component').then(m => m.TarefasComponent),
          },
          {
            path: 'honorarios',
            loadComponent: () => import('@features/escritorio/honorarios/honorarios.component').then(m => m.HonorariosComponent),
          },
        ],
      },
      {
        path: 'integracoes',
        loadComponent: () => import('@features/integracoes/integracoes.component').then(m => m.IntegracoesComponent),
      },
      {
        path: 'certificados',
        loadComponent: () => import('@features/certificados/certificados.component').then(m => m.CertificadosComponent),
      },
      {
        path: 'relatorios',
        loadComponent: () => import('@features/relatorios/relatorios.component').then(m => m.RelatoriosComponent),
      },
      {
        path: 'ai-contabil',
        loadComponent: () => import('@features/ai-contabil/ai-contabil.component').then(m => m.AiContabilComponent),
      },
      {
        path: 'cadastros',
        children: [
          {
            path: 'produtos',
            loadComponent: () => import('@features/cadastros/produtos/produtos.component').then(m => m.ProdutosComponent),
          },
        ],
      },
      {
        path: 'ferramentas',
        children: [
          {
            path: 'ocr',
            loadComponent: () => import('@features/ferramentas/ocr/ocr.component').then(m => m.OcrComponent),
          },
        ],
      },
      {
        path: 'sistema',
        children: [
          {
            path: 'auditoria',
            loadComponent: () => import('@features/sistema/auditoria/auditoria.component').then(m => m.AuditoriaComponent),
          },
          {
            path: 'multi-tenancy',
            loadComponent: () => import('@features/sistema/multi-tenancy/multi-tenancy.component').then(m => m.MultiTenancyComponent),
          },
        ],
      },
      {
        path: 'configuracoes',
        loadComponent: () => import('@features/configuracoes/configuracoes.component').then(m => m.ConfiguracoesComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
