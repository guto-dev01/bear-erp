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
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

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
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #E9FAEF;">
            <span class="material-symbols-rounded" style="color: #34C759;">check_circle</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Ativas</p>
            <p class="text-2xl font-bold" style="color: #34C759;">{{ contarPorStatus('ATIVA') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #FFF4E5;">
            <span class="material-symbols-rounded" style="color: #FF9500;">settings</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Configurando</p>
            <p class="text-2xl font-bold" style="color: #FF9500;">{{ contarPorStatus('CONFIGURANDO') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #FFECEB;">
            <span class="material-symbols-rounded" style="color: #FF3B30;">error</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Com Erro</p>
            <p class="text-2xl font-bold" style="color: #FF3B30;">{{ contarPorStatus('ERRO') }}</p>
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
                <p class="text-xs mt-1" style="color: #FF3B30;">Erro: {{ i.ultimoErro }}</p>
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
                  <span class="material-symbols-rounded text-base" style="color: #FF3B30;">delete</span>
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
  integracoes = signal<any[]>([]); loading = signal(false); showForm = signal(false);
  showLogs = signal(false); logs = signal<any[]>([]); logsTotal = signal(0);
  logIntegracaoId = signal(''); logNome = signal('');
  logColumns = ['data', 'direcao', 'status', 'registros', 'tempo', 'mensagem'];
  form!: FormGroup;
  private apiUrl = `${environment.apiUrl}/integracoes`;

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

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      nome: ['', Validators.required], tipo: ['', Validators.required],
      descricao: [''], sincronizacaoAutomatica: [false],
    });
    this.carregar();
  }

  carregar() {
    this.loading.set(true);
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (res) => { this.integracoes.set(res || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ sincronizacaoAutomatica: false }); }

  salvar() {
    if (this.form.valid) {
      this.http.post<any>(this.apiUrl, this.form.value).subscribe({
        next: () => { this.snackBar.open('Integração criada!', 'OK', { duration: 3000 }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao criar integração', 'OK', { duration: 3000 }),
      });
    }
  }

  sincronizar(id: string) {
    this.http.post<any>(`${this.apiUrl}/${id}/sincronizar`, {}).subscribe({
      next: () => { this.snackBar.open('Sincronização realizada!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro na sincronização', 'OK', { duration: 3000 }),
    });
  }

  ativar(id: string) { this.http.post<any>(`${this.apiUrl}/${id}/ativar`, {}).subscribe({ next: () => { this.snackBar.open('Integração ativada!', 'OK', { duration: 2000 }); this.carregar(); } }); }
  desativar(id: string) { this.http.post<any>(`${this.apiUrl}/${id}/desativar`, {}).subscribe({ next: () => { this.snackBar.open('Integração desativada', 'OK', { duration: 2000 }); this.carregar(); } }); }
  excluir(id: string) { this.http.delete(`${this.apiUrl}/${id}`).subscribe({ next: () => { this.snackBar.open('Integração excluída', 'OK', { duration: 2000 }); this.carregar(); } }); }

  verLogs(integracaoId: string, nome: string, page = 0) {
    this.logIntegracaoId.set(integracaoId);
    this.logNome.set(nome);
    this.showLogs.set(true);
    this.http.get<any>(`${this.apiUrl}/${integracaoId}/logs`, { params: { page, size: 20 } }).subscribe({
      next: (res) => { this.logs.set(res.content || []); this.logsTotal.set(res.totalElements || 0); },
    });
  }

  onLogPage(event: PageEvent) { this.verLogs(this.logIntegracaoId(), this.logNome(), event.pageIndex); }
  contarPorStatus(status: string): number { return this.integracoes().filter(i => i.status === status).length; }

  getTipoIcon(tipo: string): string {
    const map: Record<string, string> = { BANCO_OFX: 'account_balance', BANCO_API: 'account_balance', SEFAZ_NFE: 'receipt', SEFAZ_CTE: 'local_shipping', PREFEITURA_NFSE: 'apartment', ESOCIAL: 'verified_user', WEBHOOK: 'webhook' };
    return map[tipo] || 'integration_instructions';
  }

  getIconBg(status: string): string {
    const map: Record<string, string> = { ATIVA: '#E9FAEF', INATIVA: 'var(--surface-2)', ERRO: '#FFECEB', CONFIGURANDO: '#FFF4E5' };
    return map[status] || 'var(--surface-2)';
  }

  getIconColorHex(status: string): string {
    const map: Record<string, string> = { ATIVA: '#34C759', INATIVA: 'var(--text-secondary)', ERRO: '#FF3B30', CONFIGURANDO: '#FF9500' };
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
