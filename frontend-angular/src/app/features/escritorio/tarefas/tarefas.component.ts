import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'bear-tarefas',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Tarefas Contábeis</h1>
          <p class="page-header__subtitle">Kanban de atividades e obrigações do escritório</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1rem;font-size:0.8125rem;" (click)="carregarAtrasadas()">
            <span class="material-symbols-rounded text-base mr-1" style="color:#FF3B30">warning</span> Atrasadas
          </button>
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Nova Tarefa
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        @for (col of kanbanCols; track col.status; let i = $index) {
          <div class="bear-card p-4 flex items-center gap-3 animate-fade-in-up" [style.animation-delay]="(i*60)+'ms'"
               [style.cursor]="'pointer'" (click)="filtroStatus.set(col.status === filtroStatus() ? '' : col.status)">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" [style.background]="col.bgColor">
              <span class="material-symbols-rounded" [style.color]="col.color">{{ col.icon }}</span>
            </div>
            <div>
              <p class="text-xs font-medium" style="color:var(--text-secondary)">{{ col.label }}</p>
              <p class="text-xl font-bold" style="color:var(--text-primary)">{{ countByStatus(col.status) }}</p>
            </div>
          </div>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <!-- Kanban Board -->
      @if (!loading() && !showForm()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          @for (col of kanbanCols.slice(0, 4); track col.status) {
            <div>
              <div class="flex items-center gap-2 mb-3 px-1">
                <span class="w-2 h-2 rounded-full" [style.background]="col.color"></span>
                <span class="text-xs font-semibold uppercase tracking-wider" style="color:var(--text-secondary)">{{ col.label }}</span>
                <span class="text-xs px-1.5 py-0.5 rounded-md" style="background:var(--surface-2);color:var(--text-tertiary)">{{ countByStatus(col.status) }}</span>
              </div>
              <div class="flex flex-col gap-3">
                @for (t of getByStatus(col.status); track t.id) {
                  <div class="bear-card p-4 animate-fade-in-up">
                    <div class="flex items-start justify-between mb-2">
                      <span class="text-xs px-2 py-0.5 rounded-md font-medium" [style.background]="getPrioridadeBg(t.prioridade)" [style.color]="getPrioridadeColor(t.prioridade)">{{ t.prioridade }}</span>
                      <mat-select [value]="t.status" (selectionChange)="atualizarStatus(t.id, $event.value)"
                                  style="width:120px;font-size:0.6875rem;" class="text-xs">
                        <mat-option value="PENDENTE">Pendente</mat-option>
                        <mat-option value="EM_ANDAMENTO">Em Andamento</mat-option>
                        <mat-option value="AGUARDANDO_CLIENTE">Aguard. Cliente</mat-option>
                        <mat-option value="CONCLUIDA">Concluída</mat-option>
                      </mat-select>
                    </div>
                    <h4 class="text-sm font-semibold mb-1" style="color:var(--text-primary)">{{ t.titulo }}</h4>
                    @if (t.clienteEmpresaNome) {
                      <p class="text-xs mb-2" style="color:var(--text-tertiary)">
                        <span class="material-symbols-rounded text-xs mr-0.5" style="vertical-align:middle;">business</span>{{ t.clienteEmpresaNome }}
                      </p>
                    }
                    <div class="flex items-center justify-between pt-2" style="border-top:1px solid var(--border-subtle)">
                      <span class="text-xs" style="color:var(--text-tertiary)">
                        <span class="material-symbols-rounded text-xs mr-0.5" style="vertical-align:middle;">calendar_today</span>
                        {{ t.dataVencimento | date:'dd/MM' }}
                      </span>
                      @if (t.responsavelNome) {
                        <span class="text-xs px-2 py-0.5 rounded-full" style="background:var(--surface-2);color:var(--text-secondary)">{{ t.responsavelNome }}</span>
                      }
                    </div>
                  </div>
                }
                @if (getByStatus(col.status).length === 0) {
                  <div class="p-4 rounded-xl text-center text-xs" style="background:var(--surface-1);color:var(--text-tertiary);border:1px dashed var(--border-subtle);">
                    Nenhuma tarefa
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Nova Tarefa</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Título</mat-label><input matInput formControlName="titulo"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Tipo</mat-label>
                <mat-select formControlName="tipo">
                  @for (t of tipos; track t) { <mat-option [value]="t">{{ formatTipo(t) }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Prioridade</mat-label>
                <mat-select formControlName="prioridade">
                  <mat-option value="BAIXA">Baixa</mat-option>
                  <mat-option value="MEDIA">Média</mat-option>
                  <mat-option value="ALTA">Alta</mat-option>
                  <mat-option value="URGENTE">Urgente</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Empresa Cliente</mat-label><input matInput formControlName="clienteEmpresaNome"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Responsável</mat-label><input matInput formControlName="responsavelNome"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Competência</mat-label><input matInput formControlName="competencia" placeholder="2026-03"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Data Vencimento</mat-label><input matInput type="date" formControlName="dataVencimento"></mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Descrição</mat-label><input matInput formControlName="descricao"></mat-form-field>
            </div>
            <div class="flex gap-3 justify-end mt-6">
              <button type="button" class="bear-btn bear-btn--outline" style="padding:0.5rem 1.5rem" (click)="showForm.set(false)">Cancelar</button>
              <button type="submit" class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" [disabled]="form.invalid">
                <span class="material-symbols-rounded text-lg mr-1">add</span> Criar Tarefa
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class TarefasComponent implements OnInit {
  tarefas = signal<any[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalElements = signal(0);
  filtroStatus = signal('');
  form!: FormGroup;
  private apiUrl = `${environment.apiUrl}/escritorio`;

  tipos = ['ESCRITURACAO_FISCAL', 'ESCRITURACAO_CONTABIL', 'FOLHA_PAGAMENTO', 'APURACAO_IMPOSTOS', 'OBRIGACAO_ACESSORIA', 'FECHAMENTO_BALANCETE', 'CONCILIACAO', 'DECLARACAO_IR', 'CONSULTORIA', 'OUTROS'];

  kanbanCols = [
    { status: 'PENDENTE', label: 'Pendente', icon: 'schedule', color: '#FF9500', bgColor: '#FFF4E5' },
    { status: 'EM_ANDAMENTO', label: 'Em Andamento', icon: 'play_circle', color: '#007AFF', bgColor: '#E5F1FF' },
    { status: 'AGUARDANDO_CLIENTE', label: 'Aguardando', icon: 'hourglass_top', color: '#AF52DE', bgColor: '#F2EBFB' },
    { status: 'CONCLUIDA', label: 'Concluída', icon: 'check_circle', color: '#34C759', bgColor: '#E9FAEF' },
    { status: '', label: 'Total', icon: 'task', color: '#007AFF', bgColor: '#ECEBFB' },
  ];

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      titulo: ['', Validators.required], tipo: ['', Validators.required], descricao: [''],
      clienteEmpresaNome: [''], responsavelNome: [''], competencia: [''],
      dataVencimento: ['', Validators.required], prioridade: ['MEDIA'],
    });
    this.carregar();
  }

  carregar(page = 0) {
    this.loading.set(true);
    const params = new HttpParams().set('page', page).set('size', 100);
    this.http.get<any>(`${this.apiUrl}/tarefas`, { params }).subscribe({
      next: (res) => { this.tarefas.set(res.content || res || []); this.totalElements.set(res.totalElements || 0); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ prioridade: 'MEDIA', tipo: '' }); }

  countByStatus(status: string): number {
    if (!status) return this.tarefas().length;
    return this.tarefas().filter(t => t.status === status).length;
  }

  getByStatus(status: string): any[] {
    return this.tarefas().filter(t => t.status === status);
  }

  salvar() {
    if (this.form.valid) {
      this.http.post<any>(`${this.apiUrl}/tarefas`, this.form.value).subscribe({
        next: () => { this.snackBar.open('Tarefa criada!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao criar tarefa', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }

  atualizarStatus(id: string, status: string) {
    this.http.patch<any>(`${this.apiUrl}/tarefas/${id}/status`, null, { params: { status } }).subscribe({
      next: () => { this.snackBar.open('Status atualizado!', 'OK', { duration: 2000 }); this.carregar(); },
    });
  }

  carregarAtrasadas() {
    this.loading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/tarefas/atrasadas`).subscribe({
      next: (res) => { this.tarefas.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  formatTipo(t: string): string { return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

  getPrioridadeBg(p: string): string {
    const m: Record<string, string> = { 'BAIXA': '#f3f4f6', 'MEDIA': '#CCE3FF', 'ALTA': '#FFEACC', 'URGENTE': '#FFD0CD' };
    return m[p] || '#f3f4f6';
  }
  getPrioridadeColor(p: string): string {
    const m: Record<string, string> = { 'BAIXA': '#6b7280', 'MEDIA': '#0040DD', 'ALTA': '#c2410c', 'URGENTE': '#FF3B30' };
    return m[p] || '#6b7280';
  }
}
