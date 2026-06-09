import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface AuditLogDoc {
  $id: string;
  usuario: string;
  acao: string;
  modulo: string;
  descricao: string;
  ip?: string;
  detalhes?: string;
  timestamp: string;
  tenantId: string;
  $createdAt: string;
}

interface AuditEvent {
  id: string;
  usuario: string;
  acao: string;
  modulo: string;
  descricao: string;
  ip: string;
  timestamp: Date;
  detalhes?: string;
}

@Component({
  selector: 'bear-auditoria',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Auditoria e Logs</h1>
          <p class="page-header__subtitle">Trilha de auditoria e registro de atividades do sistema</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1rem;font-size:0.8125rem;" (click)="exportar()">
            <span class="material-symbols-rounded text-base mr-1">download</span> Exportar
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">today</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Eventos Hoje</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ countHoje() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">date_range</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Eventos Semana</p><p class="text-2xl font-bold" style="color:#34C759">{{ eventos().length }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#F2EBFB"><span class="material-symbols-rounded" style="color:#AF52DE">group</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Usuários Ativos</p><p class="text-2xl font-bold" style="color:#AF52DE">{{ uniqueUsers() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFECEB"><span class="material-symbols-rounded" style="color:#FF3B30">warning</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Alertas</p><p class="text-2xl font-bold" style="color:#FF3B30">{{ countAlertas() }}</p></div>
        </div>
      </div>

      <!-- Filters -->
      <div class="bear-card p-4 mb-6 animate-fade-in-up">
        <div class="flex flex-wrap items-end gap-3">
          <mat-form-field appearance="outline" style="width:150px;" subscriptSizing="dynamic">
            <mat-label>Data Início</mat-label>
            <input matInput type="date" [(ngModel)]="filtroDataInicio">
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:150px;" subscriptSizing="dynamic">
            <mat-label>Data Fim</mat-label>
            <input matInput type="date" [(ngModel)]="filtroDataFim">
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:160px;" subscriptSizing="dynamic">
            <mat-label>Usuário</mat-label>
            <input matInput [(ngModel)]="filtroUsuario">
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:140px;" subscriptSizing="dynamic">
            <mat-label>Ação</mat-label>
            <mat-select [(ngModel)]="filtroAcao">
              <mat-option value="">Todas</mat-option>
              <mat-option value="CRIAR">Criar</mat-option>
              <mat-option value="EDITAR">Editar</mat-option>
              <mat-option value="EXCLUIR">Excluir</mat-option>
              <mat-option value="LOGIN">Login</mat-option>
              <mat-option value="LOGOUT">Logout</mat-option>
              <mat-option value="EXPORTAR">Exportar</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" style="width:160px;" subscriptSizing="dynamic">
            <mat-label>Módulo</mat-label>
            <mat-select [(ngModel)]="filtroModulo">
              <mat-option value="">Todos</mat-option>
              <mat-option value="CONTABILIDADE">Contabilidade</mat-option>
              <mat-option value="FISCAL">Fiscal</mat-option>
              <mat-option value="FINANCEIRO">Financeiro</mat-option>
              <mat-option value="FOLHA">Folha</mat-option>
              <mat-option value="SISTEMA">Sistema</mat-option>
            </mat-select>
          </mat-form-field>
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1rem;font-size:0.8125rem;margin-bottom:4px;" (click)="carregar()">
            <span class="material-symbols-rounded text-base mr-1">search</span> Filtrar
          </button>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <!-- Timeline -->
      @if (!loading()) {
        @if (filteredEvents().length === 0) {
          <div class="empty-state">
            <div class="empty-state__icon"><span class="material-symbols-rounded">history</span></div>
            <h3 class="empty-state__title">Nenhum evento encontrado</h3>
            <p class="empty-state__description">Ajuste os filtros ou aguarde novas atividades</p>
          </div>
        } @else {
          <div class="flex flex-col gap-3">
            @for (e of filteredEvents(); track e.id) {
              <div class="bear-card p-4 flex items-start gap-4 animate-fade-in-up">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     [style.background]="getActionBg(e.acao)">
                  <span class="material-symbols-rounded" [style.color]="getActionColor(e.acao)">{{ getActionIcon(e.acao) }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <span class="text-sm font-semibold" style="color:var(--text-primary)">{{ e.usuario }}</span>
                    <span class="badge" [ngClass]="getModuleBadge(e.modulo)">{{ e.modulo }}</span>
                    <span class="text-xs" style="color:var(--text-tertiary)">{{ getRelativeTime(e.timestamp) }}</span>
                  </div>
                  <p class="text-sm mb-1" style="color:var(--text-secondary)">{{ e.descricao }}</p>
                  @if (e.detalhes && expandedId() === e.id) {
                    <div class="p-3 rounded-lg mt-2 text-xs font-mono" style="background:var(--surface-1);color:var(--text-tertiary)">{{ e.detalhes }}</div>
                  }
                </div>
                <div class="flex items-center gap-2 flex-shrink-0">
                  <span class="text-xs font-mono" style="color:var(--text-tertiary)">{{ e.ip }}</span>
                  @if (e.detalhes) {
                    <button class="bear-btn bear-btn--ghost" style="padding:0.25rem" (click)="expandedId.set(expandedId() === e.id ? '' : e.id)" matTooltip="Detalhes">
                      <span class="material-symbols-rounded text-sm">{{ expandedId() === e.id ? 'expand_less' : 'expand_more' }}</span>
                    </button>
                  }
                </div>
              </div>
            }
          </div>

          @if (hasMore()) {
            <div class="flex justify-center mt-6">
              <button class="bear-btn bear-btn--outline" style="padding:0.5rem 2rem" (click)="carregarMais()">
                <span class="material-symbols-rounded text-base mr-1">expand_more</span> Carregar mais
              </button>
            </div>
          }
        }
      }
    </div>
  `,
})
export class AuditoriaComponent implements OnInit {
  eventos = signal<AuditEvent[]>([]);
  loading = signal(false);
  expandedId = signal('');
  hasMore = signal(true);
  filtroDataInicio = '';
  filtroDataFim = '';
  filtroUsuario = '';
  filtroAcao = '';
  filtroModulo = '';
  private page = 0;

  constructor(private appwrite: AppwriteService, private auth: AuthService) {}

  ngOnInit() { this.carregar(); }

  private tenant(): string { return this.auth.tenantId() || 'default'; }

  carregar() {
    this.loading.set(true);
    this.page = 0;
    const queries = [
      this.appwrite.query.equal('tenantId', this.tenant()),
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
    ];
    if (this.filtroAcao) queries.push(this.appwrite.query.equal('acao', this.filtroAcao));
    if (this.filtroModulo) queries.push(this.appwrite.query.equal('modulo', this.filtroModulo));

    this.appwrite.listDocuments<AuditLogDoc>('audit_logs', queries).subscribe({
      next: (docs) => {
        this.eventos.set(docs.map(d => this.toEvent(d)));
        this.hasMore.set(docs.length >= 100);
        this.loading.set(false);
      },
      error: () => {
        this.eventos.set([]);
        this.loading.set(false);
      },
    });
  }

  private toEvent(d: AuditLogDoc): AuditEvent {
    return {
      id: d.$id,
      usuario: d.usuario,
      acao: d.acao,
      modulo: d.modulo,
      descricao: d.descricao,
      ip: d.ip || '',
      timestamp: new Date(d.timestamp || d.$createdAt),
      detalhes: d.detalhes || undefined,
    };
  }

  carregarMais() {
    this.page++;
    this.hasMore.set(this.page < 3);
  }

  filteredEvents(): AuditEvent[] {
    return this.eventos().filter(e => {
      if (this.filtroAcao && e.acao !== this.filtroAcao) return false;
      if (this.filtroModulo && e.modulo !== this.filtroModulo) return false;
      if (this.filtroUsuario && !e.usuario.toLowerCase().includes(this.filtroUsuario.toLowerCase())) return false;
      return true;
    });
  }

  countHoje(): number {
    const today = new Date().toDateString();
    return this.eventos().filter(e => new Date(e.timestamp).toDateString() === today).length;
  }

  uniqueUsers(): number {
    return new Set(this.eventos().map(e => e.usuario)).size;
  }

  countAlertas(): number {
    return this.eventos().filter(e => e.acao === 'EXCLUIR' || e.acao === 'LOGIN').length;
  }

  exportar() {
    const rows = this.filteredEvents();
    const header = ['Usuario', 'Acao', 'Modulo', 'Descricao', 'IP', 'Timestamp'];
    const esc = (v: string) => '"' + (v || '').replace(/"/g, '""') + '"';
    const csv = [
      header.join(','),
      ...rows.map(e => [e.usuario, e.acao, e.modulo, e.descricao, e.ip, new Date(e.timestamp).toISOString()].map(esc).join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    // Registra a própria exportação na trilha de auditoria.
    const user = this.auth.user();
    this.appwrite.createDocument('audit_logs', {
      usuario: user?.nome || user?.email || 'Sistema',
      acao: 'EXPORTAR',
      modulo: 'SISTEMA',
      descricao: `Exportou ${rows.length} evento(s) de auditoria em CSV`,
      ip: '',
      timestamp: new Date().toISOString(),
      tenantId: this.tenant(),
    }).subscribe({ next: () => {}, error: () => {} });
  }

  getActionIcon(a: string): string {
    const m: Record<string, string> = { CRIAR: 'add_circle', EDITAR: 'edit', EXCLUIR: 'delete', LOGIN: 'login', LOGOUT: 'logout', EXPORTAR: 'download' };
    return m[a] || 'info';
  }

  getActionBg(a: string): string {
    const m: Record<string, string> = { CRIAR: '#E9FAEF', EDITAR: '#E5F1FF', EXCLUIR: '#FFECEB', LOGIN: '#F2EBFB', LOGOUT: '#F2EBFB', EXPORTAR: '#FFF4E5' };
    return m[a] || '#f3f4f6';
  }

  getActionColor(a: string): string {
    const m: Record<string, string> = { CRIAR: '#34C759', EDITAR: '#007AFF', EXCLUIR: '#FF3B30', LOGIN: '#AF52DE', LOGOUT: '#AF52DE', EXPORTAR: '#FF9500' };
    return m[a] || '#6b7280';
  }

  getModuleBadge(m: string): string {
    const map: Record<string, string> = { CONTABILIDADE: 'badge--info', FISCAL: 'badge--warning', FINANCEIRO: 'badge--success', FOLHA: 'badge--purple', SISTEMA: 'badge--neutral' };
    return map[m] || 'badge--neutral';
  }

  getRelativeTime(ts: Date): string {
    const now = Date.now();
    const diff = now - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `há ${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `há ${days}d`;
  }
}
