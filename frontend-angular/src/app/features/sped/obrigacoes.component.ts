import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface ObrigacaoDoc {
  $id: string;
  tipo: string;
  competencia: string;
  dataVencimento: string;
  dataEntrega?: string;
  protocolo?: string;
  status: string;
  empresaId: string;
  tenantId: string;
  $createdAt: string;
}

// View-model exposto ao template (mantém os nomes de campos usados no HTML existente)
interface ObrigacaoView {
  id: string;
  tipo: string;
  competencia: string;
  prazoEntrega: string;
  status: string;
  protocoloRecibo: string;
  retificacao: boolean;
}

const COLLECTION = 'obrigacoes';

@Component({
  selector: 'bear-obrigacoes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Obrigações Acessórias</h1>
          <p class="page-header__subtitle">Gerencie e transmita obrigações acessórias</p>
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
            Nova Obrigação
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
            <mat-label>Competência</mat-label>
            <input matInput placeholder="YYYY-MM" #compInput>
          </mat-form-field>
          <button class="bear-btn bear-btn--outline" style="padding: 0.625rem 1.25rem; margin-bottom: 22px;"
                  (click)="buscarPorCompetencia(compInput.value)">
            <span class="material-symbols-rounded text-base mr-1.5">search</span>
            Buscar
          </button>
        </div>

        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
            <h3 class="text-heading text-base">Lista de Obrigações</h3>
            <span class="badge badge--info">{{ obrigacoes().length }} registro(s)</span>
          </div>
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="obrigacoes()" class="w-full">
              <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef class="text-label">Tipo</th><td mat-cell *matCellDef="let o">{{ o.tipo }}</td></ng-container>
              <ng-container matColumnDef="competencia"><th mat-header-cell *matHeaderCellDef class="text-label">Competência</th><td mat-cell *matCellDef="let o">{{ o.competencia }}</td></ng-container>
              <ng-container matColumnDef="prazo"><th mat-header-cell *matHeaderCellDef class="text-label">Prazo Entrega</th><td mat-cell *matCellDef="let o">{{ o.prazoEntrega | date:'dd/MM/yyyy' }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="text-label">Status</th>
                <td mat-cell *matCellDef="let o">
                  <span class="badge" [ngClass]="getStatusBadge(o.status)">
                    <span class="badge__dot"></span>
                    {{ o.status }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="protocolo"><th mat-header-cell *matHeaderCellDef class="text-label">Protocolo</th><td mat-cell *matCellDef="let o">{{ o.protocoloRecibo || '-' }}</td></ng-container>
              <ng-container matColumnDef="retificacao"><th mat-header-cell *matHeaderCellDef class="text-label">Retificação</th>
                <td mat-cell *matCellDef="let o">
                  <span class="material-symbols-rounded text-base" [style.color]="o.retificacao ? '#FF9500' : 'var(--text-secondary)'">
                    {{ o.retificacao ? 'check_circle' : 'remove_circle_outline' }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef class="text-label">Ações</th>
                <td mat-cell *matCellDef="let o">
                  @if (o.status === 'PENDENTE' || o.status === 'GERADA') {
                    <button class="bear-btn bear-btn--ghost p-2" title="Transmitir" (click)="transmitir(o.id)">
                      <span class="material-symbols-rounded text-base" style="color: var(--brand-primary);">send</span>
                    </button>
                  }
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
            @if (obrigacoes().length === 0 && !loading()) {
              <div class="empty-state py-12">
                <span class="material-symbols-rounded text-5xl mb-3" style="color: var(--text-secondary);">assignment</span>
                <p class="empty-state__title text-sm" style="color: var(--text-secondary);">Nenhuma obrigação encontrada</p>
              </div>
            }
          </div>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-heading text-base">Nova Obrigação Acessória</h3>
            <button class="bear-btn bear-btn--ghost p-2" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()" class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select formControlName="tipo">
                @for (t of tiposObrigacao; track t) { <mat-option [value]="t">{{ t }}</mat-option> }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Competência (YYYY-MM)</mat-label><input matInput formControlName="competencia"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Prazo Entrega</mat-label><input matInput type="date" formControlName="prazoEntrega"></mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Retificação</mat-label>
              <mat-select formControlName="retificacao"><mat-option [value]="false">Não</mat-option><mat-option [value]="true">Sim</mat-option></mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="col-span-2"><mat-label>Observação</mat-label><input matInput formControlName="observacao"></mat-form-field>
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
export class ObrigacoesComponent implements OnInit {
  obrigacoes = signal<ObrigacaoView[]>([]);
  loading = signal(false);
  showForm = signal(false);
  displayedColumns = ['tipo', 'competencia', 'prazo', 'status', 'protocolo', 'retificacao', 'acoes'];
  tiposObrigacao = ['SPED_FISCAL', 'SPED_CONTABIL', 'EFD_CONTRIBUICOES', 'ECF', 'DCTF', 'DIRF', 'RAIS', 'CAGED', 'SEFIP_GFIP', 'DEFIS', 'DASN', 'GIA'];
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  private get tenantId(): string { return this.auth.tenantId() || 'default'; }
  private get empresaId(): string { return this.auth.empresaId() || ''; }

  ngOnInit() {
    this.form = this.fb.group({
      tipo: ['', Validators.required], competencia: ['', Validators.required],
      prazoEntrega: ['', Validators.required], retificacao: [false], observacao: [''],
    });
    this.carregarPendentes();
  }

  private toView(d: ObrigacaoDoc): ObrigacaoView {
    return {
      id: d.$id,
      tipo: d.tipo,
      competencia: d.competencia,
      prazoEntrega: d.dataVencimento,
      status: d.status,
      protocoloRecibo: d.protocolo ?? '',
      retificacao: false,
    };
  }

  carregarPendentes() {
    this.loading.set(true);
    this.appwrite.listDocuments<ObrigacaoDoc>(COLLECTION, [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', this.tenantId),
      this.appwrite.query.equal('status', 'PENDENTE'),
    ]).subscribe({
      next: (res) => { this.obrigacoes.set(res.map((d) => this.toView(d))); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  buscarPorCompetencia(comp: string) {
    if (!comp) return;
    this.loading.set(true);
    this.appwrite.listDocuments<ObrigacaoDoc>(COLLECTION, [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', this.tenantId),
      this.appwrite.query.equal('competencia', comp),
    ]).subscribe({
      next: (res) => { this.obrigacoes.set(res.map((d) => this.toView(d))); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ retificacao: false }); }

  salvar() {
    if (!this.form.valid) return;
    const v = this.form.value;
    const data: Record<string, unknown> = {
      tipo: v.tipo,
      competencia: v.competencia,
      dataVencimento: v.prazoEntrega,
      status: 'PENDENTE',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
      createdAt: new Date().toISOString(),
    };
    this.appwrite.createDocument<ObrigacaoDoc>(COLLECTION, data).subscribe({
      next: () => { this.snackBar.open('Obrigação criada!', 'OK', { duration: 3000 }); this.showForm.set(false); this.carregarPendentes(); },
      error: () => this.snackBar.open('Erro ao criar obrigação', 'OK', { duration: 3000 }),
    });
  }

  transmitir(id: string) {
    // Transmissão real da obrigação acessória depende de integração externa (Receita/SEFAZ).
    // Aqui apenas atualizamos o status/registro no Appwrite.
    // TODO(appwrite): integração externa
    this.appwrite.updateDocument<ObrigacaoDoc>(COLLECTION, id, {
      status: 'ENTREGUE',
      dataEntrega: new Date().toISOString().slice(0, 10),
    }).subscribe({
      next: () => {
        this.snackBar.open('Transmissão de obrigação requer integração externa (não disponível nesta versão Appwrite). Status atualizado localmente.', 'OK', { duration: 5000 });
        this.carregarPendentes();
      },
      error: () => this.snackBar.open('Erro ao transmitir', 'OK', { duration: 3000 }),
    });
  }

  getStatusBadge(s: string): string {
    const map: Record<string, string> = {
      'PENDENTE': 'badge--warning',
      'GERADA': 'badge--info',
      'ENTREGUE': 'badge--success',
      'ATRASADA': 'badge--error',
      'CANCELADA': 'badge--neutral',
    };
    return map[s] || 'badge--neutral';
  }
}
