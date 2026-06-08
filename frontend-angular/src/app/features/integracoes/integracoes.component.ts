import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface IntegracaoDoc {
  $id: string;
  nome: string;
  tipo: string;
  provedor?: string;
  status: string;
  config?: string;
  ultimaSincronizacao?: string;
  tenantId: string;
  createdAt?: string;
  $createdAt: string;
}

interface LogIntegracaoDoc {
  $id: string;
  integracaoId: string;
  nivel: string;
  mensagem: string;
  timestamp: string;
  tenantId: string;
  createdAt?: string;
  $createdAt: string;
}

// Campos extras (não existentes como atributos próprios na coleção) são
// persistidos serializados no atributo `config` (string JSON).
interface IntegracaoConfig {
  descricao?: string;
  sincronizacaoAutomatica?: boolean;
  totalSincronizacoes?: number;
  ultimoErro?: string;
}

// Modelo de view usado pelo template (mantém os mesmos campos do backend Java).
interface IntegracaoView {
  id: string;
  nome: string;
  tipo: string;
  descricao: string;
  status: string;
  totalSincronizacoes: number;
  ultimaSincronizacao: string | null;
  ultimoErro: string | null;
  sincronizacaoAutomatica: boolean;
}

// Modelo de view de log mapeado a partir de logs_integracao.
interface LogView {
  dataExecucao: string;
  direcao: string;
  status: string;
  registrosProcessados: number;
  registrosComErro: number;
  tempoExecucaoMs: number;
  mensagem: string;
}

@Component({
  selector: 'bear-integracoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, MatSlideToggleModule, MatPaginatorModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Integrações</h1>
          <p class="page-header__subtitle">Gerencie integrações com sistemas externos</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-base mr-1.5">add</span>
            Nova Integração
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <!-- KPI Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #ecfdf5;">
            <span class="material-symbols-rounded" style="color: #059669;">check_circle</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Ativas</p>
            <p class="text-2xl font-bold" style="color: #059669;">{{ contarPorStatus('ATIVA') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #fffbeb;">
            <span class="material-symbols-rounded" style="color: #d97706;">settings</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Configurando</p>
            <p class="text-2xl font-bold" style="color: #d97706;">{{ contarPorStatus('CONFIGURANDO') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #fef2f2;">
            <span class="material-symbols-rounded" style="color: #dc2626;">error</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Com Erro</p>
            <p class="text-2xl font-bold" style="color: #dc2626;">{{ contarPorStatus('ERRO') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: var(--surface-2);">
            <span class="material-symbols-rounded" style="color: var(--text-secondary);">pause_circle</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Inativas</p>
            <p class="text-2xl font-bold" style="color: var(--text-secondary);">{{ contarPorStatus('INATIVA') }}</p>
          </div>
        </div>
      </div>

      @if (!showForm() && !showLogs()) {
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          @for (i of integracoes(); track i.id) {
            <div class="bear-card bear-card--interactive p-5">
              <div class="flex items-start justify-between mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" [style.background]="getIconBg(i.status)">
                    <span class="material-symbols-rounded" [style.color]="getIconColorHex(i.status)">{{ getTipoIcon(i.tipo) }}</span>
                  </div>
                  <div>
                    <h4 class="text-heading text-sm">{{ i.nome }}</h4>
                    <p class="text-xs" style="color: var(--text-secondary);">{{ i.tipo }} - {{ i.descricao }}</p>
                  </div>
                </div>
                <span class="badge" [ngClass]="getStatusBadge(i.status)">
                  <span class="badge__dot"></span>
                  {{ i.status }}
                </span>
              </div>
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs" style="color: var(--text-secondary);">{{ i.totalSincronizacoes }} sincronizações</span>
              </div>
              @if (i.ultimaSincronizacao) {
                <p class="text-xs mb-1" style="color: var(--text-secondary);">Última sync: {{ i.ultimaSincronizacao | date:'dd/MM/yyyy HH:mm' }}</p>
              }
              @if (i.ultimoErro) {
                <p class="text-xs mt-1" style="color: #dc2626;">Erro: {{ i.ultimoErro }}</p>
              }
              <div class="flex gap-2 mt-4 pt-3 border-t" style="border-color: var(--border-subtle);">
                @if (i.status === 'ATIVA' || i.status === 'CONFIGURANDO') {
                  <button class="bear-btn bear-btn--outline" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;" (click)="sincronizar(i.id)">
                    <span class="material-symbols-rounded text-sm mr-1">sync</span> Sync
                  </button>
                }
                @if (i.status !== 'ATIVA') {
                  <button class="bear-btn bear-btn--outline" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;" (click)="ativar(i.id)">
                    <span class="material-symbols-rounded text-sm mr-1">play_arrow</span> Ativar
                  </button>
                } @else {
                  <button class="bear-btn bear-btn--ghost" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;" (click)="desativar(i.id)">
                    <span class="material-symbols-rounded text-sm mr-1">pause</span> Desativar
                  </button>
                }
                <button class="bear-btn bear-btn--ghost" style="padding: 0.375rem 0.75rem; font-size: 0.75rem;" (click)="verLogs(i.id, i.nome)">
                  <span class="material-symbols-rounded text-sm mr-1">history</span> Logs
                </button>
                <button class="bear-btn bear-btn--ghost p-2 ml-auto" title="Excluir" (click)="excluir(i.id)">
                  <span class="material-symbols-rounded text-base" style="color: #dc2626;">delete</span>
                </button>
              </div>
            </div>
          }
        </div>

        @if (integracoes().length === 0 && !loading()) {
          <div class="empty-state py-12">
            <span class="material-symbols-rounded text-5xl mb-3" style="color: var(--text-secondary);">integration_instructions</span>
            <p class="empty-state__title text-sm" style="color: var(--text-secondary);">Nenhuma integração configurada</p>
            <p class="empty-state__description text-xs" style="color: var(--text-secondary);">Adicione uma integração para começar</p>
          </div>
        }
      }

      @if (showLogs()) {
        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
            <h3 class="text-heading text-base">Logs - {{ logNome() }}</h3>
            <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                    (click)="showLogs.set(false)">
              <span class="material-symbols-rounded text-base mr-1.5">arrow_back</span>
              Voltar
            </button>
          </div>
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="logs()" class="w-full">
              <ng-container matColumnDef="data"><th mat-header-cell *matHeaderCellDef class="text-label">Data</th><td mat-cell *matCellDef="let l">{{ l.dataExecucao | date:'dd/MM/yyyy HH:mm' }}</td></ng-container>
              <ng-container matColumnDef="direcao"><th mat-header-cell *matHeaderCellDef class="text-label">Direção</th><td mat-cell *matCellDef="let l">{{ l.direcao }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="text-label">Status</th>
                <td mat-cell *matCellDef="let l">
                  <span class="badge" [ngClass]="{'badge--success': l.status === 'SUCESSO', 'badge--error': l.status === 'FALHA', 'badge--warning': l.status === 'PARCIAL'}">
                    <span class="badge__dot"></span>
                    {{ l.status }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="registros"><th mat-header-cell *matHeaderCellDef class="text-label">Registros</th><td mat-cell *matCellDef="let l">{{ l.registrosProcessados }} ({{ l.registrosComErro }} erros)</td></ng-container>
              <ng-container matColumnDef="tempo"><th mat-header-cell *matHeaderCellDef class="text-label">Tempo</th><td mat-cell *matCellDef="let l">{{ l.tempoExecucaoMs }}ms</td></ng-container>
              <ng-container matColumnDef="mensagem"><th mat-header-cell *matHeaderCellDef class="text-label">Mensagem</th><td mat-cell *matCellDef="let l">{{ l.mensagem }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="logColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: logColumns;"></tr>
            </table>
          </div>
          <mat-paginator [length]="logsTotal()" [pageSize]="20" (page)="onLogPage($event)"></mat-paginator>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-heading text-base">Nova Integração</h3>
            <button class="bear-btn bear-btn--ghost p-2" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()" class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome"></mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select formControlName="tipo">
                @for (t of tiposIntegracao; track t.value) { <mat-option [value]="t.value">{{ t.label }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="col-span-2"><mat-label>Descrição</mat-label><input matInput formControlName="descricao"></mat-form-field>
            <div class="col-span-2">
              <mat-slide-toggle formControlName="sincronizacaoAutomatica">Sincronização Automática</mat-slide-toggle>
            </div>
            <div class="col-span-2 flex gap-3 justify-end">
              <button class="bear-btn bear-btn--outline" type="button" (click)="showForm.set(false)">Cancelar</button>
              <button class="bear-btn bear-btn--primary" type="submit" [disabled]="form.invalid">Salvar</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class IntegracoesComponent implements OnInit {
  integracoes = signal<IntegracaoView[]>([]); loading = signal(false); showForm = signal(false);
  showLogs = signal(false); logs = signal<LogView[]>([]); logsTotal = signal(0);
  logIntegracaoId = signal(''); logNome = signal('');
  logColumns = ['data', 'direcao', 'status', 'registros', 'tempo', 'mensagem'];
  form!: FormGroup;
  private logsCompletos: LogView[] = [];
  private readonly COL_INTEGRACOES = 'integracoes';
  private readonly COL_LOGS = 'logs_integracao';

  tiposIntegracao = [
    { value: 'BANCO_OFX', label: 'Banco (OFX)' }, { value: 'BANCO_API', label: 'Banco (API)' },
    { value: 'SEFAZ_NFE', label: 'SEFAZ NF-e' }, { value: 'SEFAZ_CTE', label: 'SEFAZ CT-e' },
    { value: 'PREFEITURA_NFSE', label: 'Prefeitura NFS-e' }, { value: 'ESOCIAL', label: 'eSocial' },
    { value: 'REINF', label: 'EFD-Reinf' }, { value: 'ECAC', label: 'e-CAC' },
    { value: 'SERPRO', label: 'SERPRO' }, { value: 'CORREIOS', label: 'Correios' },
    { value: 'CONTABILIDADE_EXTERNA', label: 'Contabilidade Externa' },
    { value: 'ERP_EXTERNO', label: 'ERP Externo' }, { value: 'PLANILHA', label: 'Planilha' },
    { value: 'WEBHOOK', label: 'Webhook' },
  ];

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      nome: ['', Validators.required], tipo: ['', Validators.required],
      descricao: [''], sincronizacaoAutomatica: [false],
    });
    this.carregar();
  }

  private tenantId(): string { return this.auth.tenantId() || 'default'; }

  private parseConfig(raw?: string): IntegracaoConfig {
    if (!raw) return {};
    try { return JSON.parse(raw) as IntegracaoConfig; } catch { return {}; }
  }

  private toView(d: IntegracaoDoc): IntegracaoView {
    const cfg = this.parseConfig(d.config);
    return {
      id: d.$id,
      nome: d.nome,
      tipo: d.tipo,
      descricao: cfg.descricao ?? '',
      status: d.status,
      totalSincronizacoes: cfg.totalSincronizacoes ?? 0,
      ultimaSincronizacao: d.ultimaSincronizacao ?? null,
      ultimoErro: cfg.ultimoErro ?? null,
      sincronizacaoAutomatica: cfg.sincronizacaoAutomatica ?? false,
    };
  }

  carregar() {
    this.loading.set(true);
    this.appwrite.listDocuments<IntegracaoDoc>(this.COL_INTEGRACOES, [
      this.appwrite.query.equal('tenantId', this.tenantId()),
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
    ]).subscribe({
      next: (res) => { this.integracoes.set(res.map(d => this.toView(d))); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ sincronizacaoAutomatica: false }); }

  salvar() {
    if (!this.form.valid) return;
    const v = this.form.value as { nome: string; tipo: string; descricao: string; sincronizacaoAutomatica: boolean };
    const config: IntegracaoConfig = {
      descricao: v.descricao || '',
      sincronizacaoAutomatica: !!v.sincronizacaoAutomatica,
      totalSincronizacoes: 0,
    };
    const data: Record<string, unknown> = {
      nome: v.nome,
      tipo: v.tipo,
      status: 'CONFIGURANDO',
      config: JSON.stringify(config),
      tenantId: this.tenantId(),
    };
    this.appwrite.createDocument<IntegracaoDoc>(this.COL_INTEGRACOES, data).subscribe({
      next: () => { this.snackBar.open('Integração criada!', 'OK', { duration: 3000 }); this.showForm.set(false); this.carregar(); },
      error: () => this.snackBar.open('Erro ao criar integração', 'OK', { duration: 3000 }),
    });
  }

  sincronizar(id: string) {
    // TODO(appwrite): integração externa — a sincronização real depende de
    // comunicação com sistemas externos (bancos, SEFAZ, eSocial, etc.) que não
    // roda no navegador. Apenas registra a tentativa como log informativo.
    const log: Record<string, unknown> = {
      integracaoId: id,
      nivel: 'INFO',
      mensagem: 'Sincronização requer integração externa (não disponível nesta versão Appwrite)',
      timestamp: new Date().toISOString(),
      tenantId: this.tenantId(),
    };
    this.appwrite.createDocument(this.COL_LOGS, log).subscribe();
    this.snackBar.open('Sincronização requer integração externa (não disponível nesta versão Appwrite)', 'OK', { duration: 4000 });
  }

  private mudarStatus(id: string, status: string, msg: string) {
    this.appwrite.updateDocument<IntegracaoDoc>(this.COL_INTEGRACOES, id, { status }).subscribe({
      next: () => { this.snackBar.open(msg, 'OK', { duration: 2000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao atualizar integração', 'OK', { duration: 3000 }),
    });
  }

  ativar(id: string) { this.mudarStatus(id, 'ATIVA', 'Integração ativada!'); }
  desativar(id: string) { this.mudarStatus(id, 'INATIVA', 'Integração desativada'); }

  excluir(id: string) {
    if (!confirm('Excluir esta integração?')) return;
    this.appwrite.deleteDocument(this.COL_INTEGRACOES, id).subscribe({
      next: () => { this.snackBar.open('Integração excluída', 'OK', { duration: 2000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao excluir', 'OK', { duration: 3000 }),
    });
  }

  private nivelToStatus(nivel: string): string {
    const n = (nivel || '').toUpperCase();
    if (n === 'ERROR' || n === 'ERRO' || n === 'FATAL') return 'FALHA';
    if (n === 'WARN' || n === 'WARNING' || n === 'AVISO') return 'PARCIAL';
    return 'SUCESSO';
  }

  private logToView(l: LogIntegracaoDoc): LogView {
    return {
      dataExecucao: l.timestamp || l.$createdAt,
      direcao: '-',
      status: this.nivelToStatus(l.nivel),
      registrosProcessados: 0,
      registrosComErro: this.nivelToStatus(l.nivel) === 'FALHA' ? 1 : 0,
      tempoExecucaoMs: 0,
      mensagem: l.mensagem,
    };
  }

  verLogs(integracaoId: string, nome: string, page = 0) {
    this.logIntegracaoId.set(integracaoId);
    this.logNome.set(nome);
    this.showLogs.set(true);
    this.appwrite.listDocuments<LogIntegracaoDoc>(this.COL_LOGS, [
      this.appwrite.query.equal('tenantId', this.tenantId()),
      this.appwrite.query.equal('integracaoId', integracaoId),
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
    ]).subscribe({
      next: (res) => {
        this.logsCompletos = res.map(l => this.logToView(l));
        this.logsTotal.set(this.logsCompletos.length);
        this.aplicarPaginaLogs(page);
      },
      error: () => { this.logsCompletos = []; this.logsTotal.set(0); this.logs.set([]); },
    });
  }

  private aplicarPaginaLogs(page: number) {
    const start = page * 20;
    this.logs.set(this.logsCompletos.slice(start, start + 20));
  }

  onLogPage(event: PageEvent) { this.aplicarPaginaLogs(event.pageIndex); }
  contarPorStatus(status: string): number { return this.integracoes().filter(i => i.status === status).length; }

  getTipoIcon(tipo: string): string {
    const map: Record<string, string> = { BANCO_OFX: 'account_balance', BANCO_API: 'account_balance', SEFAZ_NFE: 'receipt', SEFAZ_CTE: 'local_shipping', PREFEITURA_NFSE: 'apartment', ESOCIAL: 'verified_user', WEBHOOK: 'webhook' };
    return map[tipo] || 'integration_instructions';
  }

  getIconBg(status: string): string {
    const map: Record<string, string> = { ATIVA: '#ecfdf5', INATIVA: 'var(--surface-2)', ERRO: '#fef2f2', CONFIGURANDO: '#fffbeb' };
    return map[status] || 'var(--surface-2)';
  }

  getIconColorHex(status: string): string {
    const map: Record<string, string> = { ATIVA: '#059669', INATIVA: 'var(--text-secondary)', ERRO: '#dc2626', CONFIGURANDO: '#d97706' };
    return map[status] || 'var(--text-secondary)';
  }

  getStatusBadge(s: string): string {
    const map: Record<string, string> = {
      'ATIVA': 'badge--success',
      'CONFIGURANDO': 'badge--warning',
      'ERRO': 'badge--error',
      'INATIVA': 'badge--neutral',
    };
    return map[s] || 'badge--neutral';
  }
}
