import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface EventoEsocialDoc {
  $id: string;
  $createdAt: string;
  tipoEvento: string;
  competencia: string;
  funcionarioId?: string;
  funcionarioCpf?: string;
  funcionarioNome?: string;
  status: string;
  protocolo?: string;
  observacao?: string;
  empresaId: string;
  tenantId: string;
}

/** Modelo enriquecido usado pelo template (deriva grupo e protocoloEnvio). */
interface EventoEsocialView extends EventoEsocialDoc {
  id: string;
  grupoEvento: string;
  protocoloEnvio: string;
}

@Component({
  selector: 'bear-esocial',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatPaginatorModule, MatSnackBarModule, MatTabsModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">eSocial</h1>
          <p class="page-header__subtitle">Gestão de eventos do eSocial</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="carregarPendentes()">
            <span class="material-symbols-rounded text-base mr-1.5">pending_actions</span>
            Pendentes
          </button>
          <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-base mr-1.5">add</span>
            Novo Evento
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      @if (!showForm()) {
        <div class="flex gap-4 mb-4 items-end">
          <mat-form-field appearance="outline" class="w-48">
            <mat-label>Filtrar por tipo</mat-label>
            <mat-select (selectionChange)="filtrarPorTipo($event.value)">
              <mat-option value="">Todos</mat-option>
              @for (g of gruposEventos; track g.grupo) {
                <mat-option disabled class="!font-bold !text-gray-600">{{ g.grupo }}</mat-option>
                @for (t of g.tipos; track t) {
                  <mat-option [value]="t">{{ t }}</mat-option>
                }
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-48">
            <mat-label>Competência</mat-label>
            <input matInput placeholder="YYYY-MM" (change)="filtrarPorCompetencia($event)">
          </mat-form-field>
        </div>

        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
            <h3 class="text-heading text-base">Eventos eSocial</h3>
            <span class="badge badge--info">{{ totalElements() }} total</span>
          </div>
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="eventos()" class="w-full">
              <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef class="text-label">Tipo</th><td mat-cell *matCellDef="let e">{{ e.tipoEvento }}</td></ng-container>
              <ng-container matColumnDef="grupo"><th mat-header-cell *matHeaderCellDef class="text-label">Grupo</th><td mat-cell *matCellDef="let e">{{ e.grupoEvento }}</td></ng-container>
              <ng-container matColumnDef="funcionario"><th mat-header-cell *matHeaderCellDef class="text-label">Funcionário</th><td mat-cell *matCellDef="let e">{{ e.funcionarioNome || '-' }}</td></ng-container>
              <ng-container matColumnDef="competencia"><th mat-header-cell *matHeaderCellDef class="text-label">Competência</th><td mat-cell *matCellDef="let e">{{ e.competencia }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="text-label">Status</th>
                <td mat-cell *matCellDef="let e">
                  <span class="badge" [ngClass]="getStatusBadge(e.status)">
                    <span class="badge__dot"></span>
                    {{ e.status }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="protocolo"><th mat-header-cell *matHeaderCellDef class="text-label">Protocolo</th><td mat-cell *matCellDef="let e">{{ e.protocoloEnvio || '-' }}</td></ng-container>
              <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef class="text-label">Ações</th>
                <td mat-cell *matCellDef="let e">
                  <div class="flex gap-1">
                    @if (e.status === 'RASCUNHO') {
                      <button class="bear-btn bear-btn--ghost p-2" title="Validar" (click)="validar(e.id)">
                        <span class="material-symbols-rounded text-base" style="color: var(--brand-primary);">check_circle</span>
                      </button>
                    }
                    @if (e.status === 'VALIDADO') {
                      <button class="bear-btn bear-btn--ghost p-2" title="Enviar" (click)="enviar(e.id)">
                        <span class="material-symbols-rounded text-base" style="color: #34C759;">send</span>
                      </button>
                    }
                  </div>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
            @if (eventos().length === 0 && !loading()) {
              <div class="empty-state py-12">
                <span class="material-symbols-rounded text-5xl mb-3" style="color: var(--text-secondary);">event_note</span>
                <p class="empty-state__title text-sm" style="color: var(--text-secondary);">Nenhum evento encontrado</p>
              </div>
            }
          </div>
          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)"></mat-paginator>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-heading text-base">Novo Evento eSocial</h3>
            <button class="bear-btn bear-btn--ghost p-2" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()" class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline" class="col-span-2">
              <mat-label>Tipo Evento</mat-label>
              <mat-select formControlName="tipoEvento">
                @for (g of gruposEventos; track g.grupo) {
                  <mat-option disabled class="!font-bold !text-gray-600">{{ g.grupo }}</mat-option>
                  @for (t of g.tipos; track t) {
                    <mat-option [value]="t">{{ t }}</mat-option>
                  }
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Funcionário ID</mat-label><input matInput formControlName="funcionarioId"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>CPF Funcionário</mat-label><input matInput formControlName="funcionarioCpf"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Nome Funcionário</mat-label><input matInput formControlName="funcionarioNome"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Competência (YYYY-MM)</mat-label><input matInput formControlName="competencia"></mat-form-field>
            <mat-form-field appearance="outline" class="col-span-2"><mat-label>Observação</mat-label><input matInput formControlName="observacao"></mat-form-field>
            <div class="col-span-2 flex gap-3 justify-end">
              <button class="bear-btn bear-btn--outline" type="button" (click)="showForm.set(false)">Cancelar</button>
              <button class="bear-btn bear-btn--primary" type="submit" [disabled]="form.invalid">Criar Evento</button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class EsocialComponent implements OnInit {
  eventos = signal<EventoEsocialView[]>([]); loading = signal(false); showForm = signal(false); totalElements = signal(0);
  displayedColumns = ['tipo', 'grupo', 'funcionario', 'competencia', 'status', 'protocolo', 'acoes'];
  form!: FormGroup;
  private readonly COLLECTION = 'eventos_esocial';
  private filtroTipo = '';

  gruposEventos = [
    { grupo: 'Tabelas', tipos: ['S1000', 'S1005', 'S1010', 'S1020', 'S1030', 'S1035', 'S1040', 'S1050', 'S1060', 'S1070', 'S1080'] },
    { grupo: 'Não Periódicos', tipos: ['S2190', 'S2200', 'S2205', 'S2206', 'S2210', 'S2220', 'S2230', 'S2240', 'S2298', 'S2299', 'S2300', 'S2306', 'S2399', 'S2400'] },
    { grupo: 'Periódicos', tipos: ['S1200', 'S1202', 'S1207', 'S1210', 'S1260', 'S1270', 'S1280', 'S1298', 'S1299'] },
  ];

  constructor(private fb: FormBuilder, private appwrite: AppwriteService, private auth: AuthService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      tipoEvento: ['', Validators.required], funcionarioId: [''], funcionarioCpf: [''],
      funcionarioNome: [''], competencia: [''], observacao: [''],
    });
    this.carregar();
  }

  private grupoDoTipo(tipo: string): string {
    const g = this.gruposEventos.find(grp => grp.tipos.includes(tipo));
    return g ? g.grupo : '';
  }

  private toView(d: EventoEsocialDoc): EventoEsocialView {
    return {
      ...d,
      id: d.$id,
      grupoEvento: this.grupoDoTipo(d.tipoEvento),
      protocoloEnvio: d.protocolo ?? '',
    };
  }

  private baseQueries(): string[] {
    const q = [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', this.auth.tenantId() || 'default'),
    ];
    const empresaId = this.auth.empresaId();
    if (empresaId) q.push(this.appwrite.query.equal('empresaId', empresaId));
    return q;
  }

  carregar(_page = 0) {
    this.loading.set(true);
    const queries = this.baseQueries();
    if (this.filtroTipo) queries.push(this.appwrite.query.equal('tipoEvento', this.filtroTipo));
    this.appwrite.listDocuments<EventoEsocialDoc>(this.COLLECTION, queries).subscribe({
      next: (res) => {
        const views = res.map(d => this.toView(d));
        this.eventos.set(views);
        this.totalElements.set(views.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onPage(_event: PageEvent) { /* paginação client-side: todos os itens já carregados (limit 100) */ }
  resetForm() { this.form.reset(); }

  filtrarPorTipo(tipo: string) {
    this.filtroTipo = tipo || '';
    this.carregar();
  }

  filtrarPorCompetencia(event: Event) {
    const comp = (event.target as HTMLInputElement).value;
    if (!comp) { this.carregar(); return; }
    this.loading.set(true);
    const queries = this.baseQueries();
    queries.push(this.appwrite.query.equal('competencia', comp));
    this.appwrite.listDocuments<EventoEsocialDoc>(this.COLLECTION, queries).subscribe({
      next: (res) => {
        const views = res.map(d => this.toView(d));
        this.eventos.set(views);
        this.totalElements.set(views.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  carregarPendentes() {
    this.loading.set(true);
    const queries = this.baseQueries();
    // Pendentes = ainda não aceitos pelo governo (rascunho/validado/enviado/processado).
    this.appwrite.listDocuments<EventoEsocialDoc>(this.COLLECTION, queries).subscribe({
      next: (res) => {
        const finalizados = ['ACEITO', 'REJEITADO'];
        const views = res.filter(d => !finalizados.includes(d.status)).map(d => this.toView(d));
        this.eventos.set(views);
        this.totalElements.set(views.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  salvar() {
    if (!this.form.valid) return;
    const v = this.form.value;
    const data: Record<string, unknown> = {
      tipoEvento: v.tipoEvento,
      competencia: v.competencia ?? '',
      funcionarioId: v.funcionarioId ?? '',
      funcionarioCpf: v.funcionarioCpf ?? '',
      funcionarioNome: v.funcionarioNome ?? '',
      observacao: v.observacao ?? '',
      status: 'RASCUNHO',
      protocolo: '',
      tenantId: this.auth.tenantId() || 'default',
      empresaId: this.auth.empresaId() || '',
    };
    this.appwrite.createDocument<EventoEsocialDoc>(this.COLLECTION, data).subscribe({
      next: () => { this.snackBar.open('Evento criado!', 'OK', { duration: 3000 }); this.showForm.set(false); this.carregar(); },
      error: () => this.snackBar.open('Erro ao criar evento', 'OK', { duration: 3000 }),
    });
  }

  validar(id: string) {
    const evento = this.eventos().find(e => e.id === id);
    if (!evento) { this.snackBar.open('Evento não encontrado', 'OK', { duration: 3000 }); return; }
    // Validação local simples: confere campos obrigatórios do layout eSocial.
    const erros: string[] = [];
    if (!evento.tipoEvento) erros.push('tipo do evento');
    if (!evento.competencia || !/^\d{4}-\d{2}$/.test(evento.competencia)) erros.push('competência (YYYY-MM)');
    const grupoNaoPeriodicos = this.grupoDoTipo(evento.tipoEvento) === 'Não Periódicos';
    if (grupoNaoPeriodicos && !evento.funcionarioId && !evento.funcionarioCpf) {
      erros.push('identificação do funcionário');
    }
    if (erros.length > 0) {
      this.snackBar.open(`Validação falhou: faltam ${erros.join(', ')}`, 'OK', { duration: 5000 });
      return;
    }
    this.appwrite.updateDocument<EventoEsocialDoc>(this.COLLECTION, id, { status: 'VALIDADO' }).subscribe({
      next: () => { this.snackBar.open('Evento validado!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao validar', 'OK', { duration: 3000 }),
    });
  }

  enviar(_id: string) {
    // TODO(appwrite): integração externa
    // Transmissão de eventos ao ambiente do governo (eSocial) requer assinatura com
    // certificado digital e webservice oficial — não disponível no navegador.
    this.snackBar.open('Transmissão do eSocial requer integração externa (não disponível nesta versão Appwrite)', 'OK', { duration: 5000 });
  }

  getStatusBadge(s: string): string {
    const map: Record<string, string> = {
      'RASCUNHO': 'badge--neutral',
      'VALIDADO': 'badge--info',
      'ENVIADO': 'badge--warning',
      'PROCESSADO': 'badge--info',
      'ACEITO': 'badge--success',
      'REJEITADO': 'badge--error',
    };
    return map[s] || 'badge--neutral';
  }
}
