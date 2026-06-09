import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface ConsultaIaDoc {
  $id: string;
  pergunta: string;
  resposta: string;
  data: string;
  usuario?: string;
  tenantId: string;
  createdAt?: string;
  $createdAt: string;
}

interface ClassificacaoDoc {
  $id: string;
  descricao: string;
  contaSugerida: string;
  confianca: number;
  status: string;
  empresaId: string;
  tenantId: string;
  createdAt?: string;
  $createdAt: string;
}

// Modelo de exibição da resposta de consulta (apenas para o template).
interface RespostaIa {
  resposta: string;
  confianca: number;
  tempoProcessamentoMs: number;
}

// Modelo de exibição de uma classificação (mescla campos persistidos + derivados).
interface ClassificacaoView {
  id: string;
  descricaoOriginal: string;
  contaDebitoSugerida: string;
  contaDebitoNome: string;
  contaCreditoSugerida: string;
  contaCreditoNome: string;
  confianca: number;
}

// Regra de heurística local: palavras-chave -> par débito/crédito + nomes.
interface RegraHeuristica {
  termos: string[];
  contaDebito: string;
  contaDebitoNome: string;
  contaCredito: string;
  contaCreditoNome: string;
}

@Component({
  selector: 'bear-ai-contabil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatSnackBarModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-header__title">AI Contábil</h1>
          <p class="page-header__subtitle">Inteligência artificial para suporte contábil e fiscal</p>
        </div>
        <div class="page-header__actions">
          <span class="badge badge--success">
            <span class="badge__dot"></span>
            IA Ativa
          </span>
        </div>
      </div>

      <!-- Capability Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #eef2ff;">
            <span class="material-symbols-rounded" style="color: #4f46e5;">smart_toy</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Consultas Respondidas</p>
            <p class="text-2xl font-bold" style="color: var(--text-primary);">—</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #ecfdf5;">
            <span class="material-symbols-rounded" style="color: #059669;">auto_fix_high</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Classificações Automáticas</p>
            <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ pendentes().length }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #fffbeb;">
            <span class="material-symbols-rounded" style="color: #d97706;">pending_actions</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Pendentes de Revisão</p>
            <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ pendentes().length }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <mat-tab-group>
        <!-- Consulta IA -->
        <mat-tab label="Consulta Inteligente">
          <div class="pt-6 flex flex-col gap-6">
            <!-- Form Card -->
            <div class="bear-card p-6">
              <div class="flex items-center gap-3 mb-5">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: #eef2ff;">
                  <span class="material-symbols-rounded" style="color: #4f46e5;">smart_toy</span>
                </div>
                <div>
                  <h3 class="text-heading text-base">Fazer uma Consulta</h3>
                  <p class="text-xs" style="color: var(--text-secondary);">Descreva sua dúvida contábil ou fiscal</p>
                </div>
              </div>
              <form [formGroup]="consultaForm" (ngSubmit)="consultar()" class="flex flex-col gap-4">
                <mat-form-field appearance="outline">
                  <mat-label>Tipo de Consulta</mat-label>
                  <mat-select formControlName="tipo">
                    <mat-option value="CLASSIFICACAO_CONTABIL">Classificação Contábil</mat-option>
                    <mat-option value="ANALISE_FISCAL">Análise Fiscal</mat-option>
                    <mat-option value="ANALISE_TRIBUTARIA">Análise Tributária</mat-option>
                    <mat-option value="PREVISAO_FLUXO_CAIXA">Previsão Fluxo de Caixa</mat-option>
                    <mat-option value="DETECCAO_ANOMALIAS">Detecção de Anomalias</mat-option>
                    <mat-option value="CONCILIACAO_AUTOMATICA">Conciliação Automática</mat-option>
                    <mat-option value="CONSULTORIA_GERAL">Consultoria Geral</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Sua pergunta</mat-label>
                  <textarea matInput formControlName="pergunta" rows="3"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Contexto adicional (opcional)</mat-label>
                  <textarea matInput formControlName="contexto" rows="2"></textarea>
                </mat-form-field>
                <div>
                  <button class="bear-btn bear-btn--primary" type="submit"
                          [disabled]="consultaForm.invalid || processando()"
                          style="padding: 0.625rem 1.25rem;">
                    @if (processando()) {
                      <div class="login__spinner" style="width:16px;height:16px;border:2px solid var(--surface-3);border-top-color:white;margin-right:8px;display:inline-block;vertical-align:middle;"></div>
                      Processando...
                    } @else {
                      <span class="material-symbols-rounded text-base mr-1.5">smart_toy</span>
                      Consultar IA
                    }
                  </button>
                </div>
              </form>
            </div>

            <!-- IA Response -->
            @if (respostaIA()) {
              <div class="bear-card p-6" style="border-left: 4px solid var(--brand-primary);">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: #eef2ff;">
                    <span class="material-symbols-rounded" style="color: #4f46e5;">smart_toy</span>
                  </div>
                  <h3 class="text-heading text-base">Resposta da IA</h3>
                </div>
                <p class="text-sm leading-relaxed whitespace-pre-wrap mb-4" style="color: var(--text-primary);">{{ respostaIA()!.resposta }}</p>
                <div class="flex items-center gap-4 pt-4 border-t" style="border-color: var(--border-subtle);">
                  <div class="flex items-center gap-2">
                    <span class="text-label text-xs">Confiança:</span>
                    <span class="badge" [ngClass]="{
                      'badge--success': respostaIA()!.confianca >= 0.8,
                      'badge--warning': respostaIA()!.confianca >= 0.5 && respostaIA()!.confianca < 0.8,
                      'badge--error': respostaIA()!.confianca < 0.5
                    }">{{ (respostaIA()!.confianca * 100) | number:'1.0-0' }}%</span>
                  </div>
                  <span class="text-xs" style="color: var(--text-secondary);">
                    <span class="material-symbols-rounded text-xs mr-0.5">timer</span>
                    {{ respostaIA()!.tempoProcessamentoMs }}ms
                  </span>
                </div>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Classificação Automática -->
        <mat-tab label="Classificação Automática">
          <div class="pt-6 flex flex-col gap-6">
            <!-- Classify Form -->
            <div class="bear-card p-6">
              <div class="flex items-center gap-3 mb-5">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: #ecfdf5;">
                  <span class="material-symbols-rounded" style="color: #059669;">auto_fix_high</span>
                </div>
                <div>
                  <h3 class="text-heading text-base">Classificar Lançamento</h3>
                  <p class="text-xs" style="color: var(--text-secondary);">A IA sugere o débito e crédito automaticamente</p>
                </div>
              </div>
              <form [formGroup]="classificacaoForm" (ngSubmit)="classificar()" class="flex gap-4 items-end">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Descrição do lançamento</mat-label>
                  <input matInput formControlName="descricao" placeholder="Ex: Pagamento de aluguel escritório">
                </mat-form-field>
                <button class="bear-btn bear-btn--primary" type="submit"
                        [disabled]="classificacaoForm.invalid"
                        style="padding: 0.625rem 1.25rem; margin-bottom: 22px;">
                  <span class="material-symbols-rounded text-base mr-1.5">auto_fix_high</span>
                  Classificar
                </button>
              </form>
            </div>

            <!-- Classification Result -->
            @if (classificacao()) {
              <div class="bear-card p-6" style="border-left: 4px solid #059669;">
                <div class="flex items-center gap-3 mb-5">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: #ecfdf5;">
                    <span class="material-symbols-rounded" style="color: #059669;">check_circle</span>
                  </div>
                  <h3 class="text-heading text-base">Sugestão de Classificação</h3>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
                  <div class="p-4 rounded-xl" style="background: var(--surface-1);">
                    <p class="text-label text-xs mb-2">Conta Débito</p>
                    <p class="text-lg font-bold" style="color: var(--text-primary);">{{ classificacao()!.contaDebitoSugerida }}</p>
                    <p class="text-sm" style="color: var(--text-secondary);">{{ classificacao()!.contaDebitoNome }}</p>
                  </div>
                  <div class="p-4 rounded-xl" style="background: var(--surface-1);">
                    <p class="text-label text-xs mb-2">Conta Crédito</p>
                    <p class="text-lg font-bold" style="color: var(--text-primary);">{{ classificacao()!.contaCreditoSugerida }}</p>
                    <p class="text-sm" style="color: var(--text-secondary);">{{ classificacao()!.contaCreditoNome }}</p>
                  </div>
                </div>
                <div class="flex items-center justify-between pt-4 border-t" style="border-color: var(--border-subtle);">
                  <div class="flex items-center gap-2">
                    <span class="text-label text-xs">Confiança:</span>
                    <span class="badge" [ngClass]="{
                      'badge--success': classificacao()!.confianca >= 0.8,
                      'badge--warning': classificacao()!.confianca >= 0.5,
                      'badge--error': classificacao()!.confianca < 0.5
                    }">{{ (classificacao()!.confianca * 100) | number:'1.0-0' }}%</span>
                  </div>
                  <div class="flex gap-3">
                    <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                            (click)="aceitarClassificacao(classificacao()!.id)">
                      <span class="material-symbols-rounded text-base mr-1.5">check</span>
                      Aceitar
                    </button>
                    <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem; color: #dc2626; border-color: #dc2626;"
                            (click)="rejeitarClassificacao(classificacao()!.id)">
                      <span class="material-symbols-rounded text-base mr-1.5">close</span>
                      Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            }

            <!-- Pending Classifications -->
            @if (pendentes().length > 0) {
              <div class="bear-card">
                <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
                  <h3 class="text-heading text-base">Classificações Pendentes</h3>
                  <span class="badge badge--warning">{{ pendentes().length }} pendente(s)</span>
                </div>
                <div class="overflow-x-auto">
                  <table mat-table [dataSource]="pendentes()" class="w-full">
                    <ng-container matColumnDef="descricao">
                      <th mat-header-cell *matHeaderCellDef class="text-label">Descrição</th>
                      <td mat-cell *matCellDef="let c">{{ c.descricaoOriginal }}</td>
                    </ng-container>
                    <ng-container matColumnDef="debito">
                      <th mat-header-cell *matHeaderCellDef class="text-label">Débito</th>
                      <td mat-cell *matCellDef="let c" class="font-medium">{{ c.contaDebitoSugerida }} - {{ c.contaDebitoNome }}</td>
                    </ng-container>
                    <ng-container matColumnDef="credito">
                      <th mat-header-cell *matHeaderCellDef class="text-label">Crédito</th>
                      <td mat-cell *matCellDef="let c" class="font-medium">{{ c.contaCreditoSugerida }} - {{ c.contaCreditoNome }}</td>
                    </ng-container>
                    <ng-container matColumnDef="confianca">
                      <th mat-header-cell *matHeaderCellDef class="text-label">Confiança</th>
                      <td mat-cell *matCellDef="let c">
                        <span class="badge" [ngClass]="{
                          'badge--success': c.confianca >= 0.8,
                          'badge--warning': c.confianca >= 0.5 && c.confianca < 0.8,
                          'badge--error': c.confianca < 0.5
                        }">{{ (c.confianca * 100) | number:'1.0-0' }}%</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="acoes">
                      <th mat-header-cell *matHeaderCellDef class="text-label">Ações</th>
                      <td mat-cell *matCellDef="let c">
                        <div class="flex gap-1">
                          <button class="bear-btn bear-btn--ghost p-2" title="Aceitar" (click)="aceitarClassificacao(c.id)">
                            <span class="material-symbols-rounded text-base" style="color: #059669;">check_circle</span>
                          </button>
                          <button class="bear-btn bear-btn--ghost p-2" title="Rejeitar" (click)="rejeitarClassificacao(c.id)">
                            <span class="material-symbols-rounded text-base" style="color: #dc2626;">cancel</span>
                          </button>
                        </div>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="pendentesColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: pendentesColumns;"></tr>
                  </table>
                </div>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
})
export class AiContabilComponent implements OnInit {
  respostaIA = signal<RespostaIa | null>(null);
  classificacao = signal<ClassificacaoView | null>(null);
  pendentes = signal<ClassificacaoView[]>([]);
  processando = signal(false);
  pendentesColumns = ['descricao', 'debito', 'credito', 'confianca', 'acoes'];
  consultaForm!: FormGroup;
  classificacaoForm!: FormGroup;

  // Base de regras da heurística local (sem LLM).
  private readonly regras: RegraHeuristica[] = [
    { termos: ['aluguel', 'locacao', 'locação'], contaDebito: '4.1.1.01', contaDebitoNome: 'Despesas com Aluguel', contaCredito: '1.1.1.01', contaCreditoNome: 'Caixa/Bancos' },
    { termos: ['salario', 'salário', 'folha', 'pagamento de funcionario', 'funcionário'], contaDebito: '4.1.2.01', contaDebitoNome: 'Despesas com Pessoal', contaCredito: '2.1.1.02', contaCreditoNome: 'Salários a Pagar' },
    { termos: ['energia', 'luz', 'agua', 'água', 'telefone', 'internet', 'conta de consumo'], contaDebito: '4.1.1.05', contaDebitoNome: 'Despesas com Utilidades', contaCredito: '1.1.1.01', contaCreditoNome: 'Caixa/Bancos' },
    { termos: ['compra', 'aquisicao', 'aquisição', 'fornecedor', 'mercadoria', 'estoque'], contaDebito: '1.1.3.01', contaDebitoNome: 'Estoque de Mercadorias', contaCredito: '2.1.1.01', contaCreditoNome: 'Fornecedores' },
    { termos: ['venda', 'receita', 'faturamento', 'recebimento de cliente'], contaDebito: '1.1.1.01', contaDebitoNome: 'Caixa/Bancos', contaCredito: '3.1.1.01', contaCreditoNome: 'Receita de Vendas' },
    { termos: ['imposto', 'tributo', 'icms', 'iss', 'pis', 'cofins', 'das', 'simples'], contaDebito: '4.1.3.01', contaDebitoNome: 'Despesas Tributárias', contaCredito: '2.1.2.01', contaCreditoNome: 'Impostos a Recolher' },
    { termos: ['juros', 'taxa bancaria', 'taxa bancária', 'tarifa', 'banco'], contaDebito: '4.1.4.01', contaDebitoNome: 'Despesas Financeiras', contaCredito: '1.1.1.01', contaCreditoNome: 'Caixa/Bancos' },
    { termos: ['combustivel', 'combustível', 'manutencao', 'manutenção', 'transporte', 'frete'], contaDebito: '4.1.1.08', contaDebitoNome: 'Despesas Operacionais', contaCredito: '1.1.1.01', contaCreditoNome: 'Caixa/Bancos' },
  ];

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.consultaForm = this.fb.group({
      tipo: ['CONSULTORIA_GERAL', Validators.required],
      pergunta: ['', Validators.required], contexto: [''],
    });
    this.classificacaoForm = this.fb.group({ descricao: ['', Validators.required] });
    this.carregarPendentes();
  }

  private tenantId(): string { return this.auth.tenantId() || 'default'; }
  private empresaId(): string { return this.auth.empresaId() || ''; }

  consultar() {
    if (!this.consultaForm.valid) return;
    this.processando.set(true);
    const inicio = Date.now();
    const { tipo, pergunta, contexto } = this.consultaForm.value as { tipo: string; pergunta: string; contexto: string };

    // TODO(appwrite): integração externa — substituir heurística local por chamada a IA/LLM.
    const { resposta, confianca } = this.gerarRespostaHeuristica(tipo, pergunta, contexto);
    const tempoProcessamentoMs = Date.now() - inicio;
    const agora = new Date().toISOString();

    this.appwrite.createDocument<ConsultaIaDoc>('consultas_ia', {
      pergunta,
      resposta,
      data: agora,
      usuario: this.auth.empresaId() ? this.auth.empresaId() : 'sistema',
      tenantId: this.tenantId(),
      createdAt: agora,
    }).subscribe({
      next: () => {
        this.respostaIA.set({ resposta, confianca, tempoProcessamentoMs });
        this.processando.set(false);
        this.snackBar.open('Resposta gerada por heurística local (sem LLM).', 'OK', { duration: 4000 });
      },
      error: (e: Error) => {
        this.processando.set(false);
        this.snackBar.open(e.message || 'Erro ao registrar consulta', 'OK', { duration: 3000, panelClass: ['error-snackbar'] });
      },
    });
  }

  classificar() {
    if (!this.classificacaoForm.valid) return;
    const descricao = (this.classificacaoForm.value as { descricao: string }).descricao;

    // TODO(appwrite): integração externa — substituir heurística local por chamada a IA/LLM.
    const { regra, confianca } = this.classificarHeuristica(descricao);
    const agora = new Date().toISOString();

    this.appwrite.createDocument<ClassificacaoDoc>('classificacoes_automaticas', {
      descricao,
      // Persistimos a conta de débito sugerida como conta principal da coleção.
      contaSugerida: regra.contaDebito,
      confianca,
      status: 'PENDENTE',
      empresaId: this.empresaId(),
      tenantId: this.tenantId(),
      createdAt: agora,
    }).subscribe({
      next: (doc) => {
        this.classificacao.set(this.toView(doc));
        this.snackBar.open('Classificação sugerida por heurística local (sem LLM).', 'OK', { duration: 4000 });
        this.carregarPendentes();
      },
      error: (e: Error) => this.snackBar.open(e.message || 'Erro ao classificar', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  carregarPendentes() {
    this.appwrite.listDocuments<ClassificacaoDoc>('classificacoes_automaticas', [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', this.tenantId()),
      this.appwrite.query.equal('status', 'PENDENTE'),
    ]).subscribe({
      next: (docs) => this.pendentes.set(docs.map((d) => this.toView(d))),
    });
  }

  aceitarClassificacao(id: string) {
    this.appwrite.updateDocument<ClassificacaoDoc>('classificacoes_automaticas', id, { status: 'ACEITA' }).subscribe({
      next: () => { this.snackBar.open('Classificação aceita!', 'OK', { duration: 2000, panelClass: ['success-snackbar'] }); this.classificacao.set(null); this.carregarPendentes(); },
      error: (e: Error) => this.snackBar.open(e.message || 'Erro ao aceitar', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  rejeitarClassificacao(id: string) {
    this.appwrite.updateDocument<ClassificacaoDoc>('classificacoes_automaticas', id, { status: 'REJEITADA' }).subscribe({
      next: () => { this.snackBar.open('Classificação rejeitada', 'OK', { duration: 2000 }); this.classificacao.set(null); this.carregarPendentes(); },
      error: (e: Error) => this.snackBar.open(e.message || 'Erro ao rejeitar', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  // ---- Heurísticas locais (substituem o LLM) -------------------------------

  private encontrarRegra(texto: string): { regra: RegraHeuristica; achou: boolean } {
    const t = (texto || '').toLowerCase();
    for (const regra of this.regras) {
      if (regra.termos.some((termo) => t.includes(termo))) {
        return { regra, achou: true };
      }
    }
    // Regra genérica padrão quando nenhuma palavra-chave casa.
    return {
      regra: { termos: [], contaDebito: '4.1.9.99', contaDebitoNome: 'Despesas Diversas', contaCredito: '1.1.1.01', contaCreditoNome: 'Caixa/Bancos' },
      achou: false,
    };
  }

  private classificarHeuristica(descricao: string): { regra: RegraHeuristica; confianca: number } {
    const { regra, achou } = this.encontrarRegra(descricao);
    return { regra, confianca: achou ? 0.85 : 0.4 };
  }

  private gerarRespostaHeuristica(tipo: string, pergunta: string, contexto: string): { resposta: string; confianca: number } {
    const { regra, achou } = this.encontrarRegra(`${pergunta} ${contexto}`);
    const linhas = [
      `[Sugestão heurística local — sem LLM]`,
      `Tipo de consulta: ${tipo}`,
      ``,
    ];
    if (achou) {
      linhas.push(
        `Com base nas palavras-chave da sua pergunta, o lançamento se assemelha a:`,
        `- Débito: ${regra.contaDebito} (${regra.contaDebitoNome})`,
        `- Crédito: ${regra.contaCredito} (${regra.contaCreditoNome})`,
        ``,
        `Revise antes de contabilizar. Para uma análise contextual completa é necessária integração com IA/LLM.`,
      );
    } else {
      linhas.push(
        `Não foi possível identificar um padrão contábil claro a partir das palavras-chave.`,
        `Recomenda-se revisão manual. Uma análise aprofundada requer integração com IA/LLM.`,
      );
    }
    return { resposta: linhas.join('\n'), confianca: achou ? 0.7 : 0.35 };
  }

  private toView(doc: ClassificacaoDoc): ClassificacaoView {
    const { regra } = this.encontrarRegra(doc.descricao);
    // A coleção só persiste a conta de débito (contaSugerida); o crédito é derivado da heurística.
    return {
      id: doc.$id,
      descricaoOriginal: doc.descricao,
      contaDebitoSugerida: doc.contaSugerida || regra.contaDebito,
      contaDebitoNome: regra.contaDebitoNome,
      contaCreditoSugerida: regra.contaCredito,
      contaCreditoNome: regra.contaCreditoNome,
      confianca: doc.confianca,
    };
  }
}
