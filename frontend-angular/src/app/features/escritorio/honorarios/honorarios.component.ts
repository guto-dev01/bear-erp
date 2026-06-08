import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface Honorario {
  $id: string;
  empresaId: string;
  empresaNome?: string;
  valor: number;
  competencia: string;
  dataVencimento: string;
  dataPagamento?: string;
  status: string;
  tenantId: string;
  $createdAt: string;
  // aliases usados pelo template existente
  id?: string;
  clienteEmpresaNome?: string;
  valorTotal?: number;
}

@Component({
  selector: 'bear-honorarios',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatTableModule, MatPaginatorModule, MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Honorários</h1>
          <p class="page-header__subtitle">Faturamento e cobrança de serviços contábeis</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="padding:0.5rem 1rem;font-size:0.8125rem;" (click)="carregarVencidos()">
            <span class="material-symbols-rounded text-base mr-1" style="color:#ef4444">warning</span> Vencidos
          </button>
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Novo Honorário
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#eef2ff"><span class="material-symbols-rounded" style="color:#4f46e5">receipt</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ totalElements() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ecfdf5"><span class="material-symbols-rounded" style="color:#059669">paid</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Pagos</p><p class="text-2xl font-bold" style="color:#059669">{{ countPagos() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#fffbeb"><span class="material-symbols-rounded" style="color:#d97706">pending</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Abertos</p><p class="text-2xl font-bold" style="color:#d97706">{{ countAbertos() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#fef2f2"><span class="material-symbols-rounded" style="color:#ef4444">error</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Vencidos</p><p class="text-2xl font-bold" style="color:#ef4444">{{ countVencidos() }}</p></div>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="flex justify-center py-12">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <!-- Table -->
      @if (!loading() && !showForm()) {
        <div class="bear-card overflow-hidden animate-fade-in-up">
          <table mat-table [dataSource]="honorarios()" class="w-full">
            <ng-container matColumnDef="cliente">
              <th mat-header-cell *matHeaderCellDef>Cliente</th>
              <td mat-cell *matCellDef="let h"><span class="font-medium">{{ h.clienteEmpresaNome }}</span></td>
            </ng-container>
            <ng-container matColumnDef="competencia">
              <th mat-header-cell *matHeaderCellDef>Competência</th>
              <td mat-cell *matCellDef="let h" class="font-mono text-xs">{{ h.competencia }}</td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef>Valor</th>
              <td mat-cell *matCellDef="let h" class="font-semibold">{{ h.valorTotal | currency:'BRL' }}</td>
            </ng-container>
            <ng-container matColumnDef="vencimento">
              <th mat-header-cell *matHeaderCellDef>Vencimento</th>
              <td mat-cell *matCellDef="let h">{{ h.dataVencimento | date:'dd/MM/yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let h">
                <span class="badge" [ngClass]="getStatusBadge(h.status)">
                  <span class="badge__dot"></span>{{ h.status }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef class="w-24">Ações</th>
              <td mat-cell *matCellDef="let h">
                @if (h.status === 'ABERTO' || h.status === 'VENCIDO') {
                  <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;"
                          matTooltip="Registrar pagamento" (click)="registrarPagamento(h.id)">
                    <span class="material-symbols-rounded text-sm" style="color:#059669">payments</span>
                  </button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          @if (!loading() && honorarios().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">receipt</span></div>
              <h3 class="empty-state__title">Nenhum honorário encontrado</h3>
              <p class="empty-state__description">Crie o primeiro faturamento de honorários</p>
            </div>
          }

          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)" [hidePageSize]="true"></mat-paginator>
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Novo Honorário</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Empresa Cliente</mat-label><input matInput formControlName="clienteEmpresaNome"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Competência (YYYY-MM)</mat-label><input matInput formControlName="competencia" placeholder="2026-03"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Data Vencimento</mat-label><input matInput type="date" formControlName="dataVencimento"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Valor Honorário</mat-label><input matInput type="number" formControlName="valorHonorario"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Serviços Extras</mat-label><input matInput type="number" formControlName="valorServicosExtras"></mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Observação</mat-label><input matInput formControlName="observacao"></mat-form-field>
            </div>
            <div class="flex gap-3 justify-end mt-6">
              <button type="button" class="bear-btn bear-btn--outline" style="padding:0.5rem 1.5rem" (click)="showForm.set(false)">Cancelar</button>
              <button type="submit" class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" [disabled]="form.invalid">
                <span class="material-symbols-rounded text-lg mr-1">save</span> Salvar
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class HonorariosComponent implements OnInit {
  honorarios = signal<Honorario[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalElements = signal(0);
  displayedColumns = ['cliente', 'competencia', 'valor', 'vencimento', 'status', 'acoes'];
  form!: FormGroup;

  constructor(private fb: FormBuilder, private appwrite: AppwriteService, private auth: AuthService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      clienteEmpresaNome: ['', Validators.required], competencia: ['', Validators.required],
      valorHonorario: [null, [Validators.required, Validators.min(1)]], valorServicosExtras: [0],
      dataVencimento: ['', Validators.required], observacao: [''],
    });
    this.carregar();
  }

  private mapHonorario(h: Honorario): Honorario {
    // Status VENCIDO derivado no cliente quando em aberto e vencido
    const hoje = new Date().toISOString().slice(0, 10);
    let status = h.status;
    if (status === 'ABERTO' && h.dataVencimento && h.dataVencimento < hoje) status = 'VENCIDO';
    // Aliases para manter o template existente funcionando
    return { ...h, status, id: h.$id, clienteEmpresaNome: h.empresaNome, valorTotal: h.valor };
  }

  carregar() {
    this.loading.set(true);
    this.appwrite.listDocuments<Honorario>('honorarios', [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', this.auth.tenantId() || 'default'),
    ]).subscribe({
      next: (res) => {
        const mapped = res.map(h => this.mapHonorario(h));
        this.honorarios.set(mapped);
        this.totalElements.set(mapped.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ valorServicosExtras: 0 }); }
  onPage(_event: PageEvent) { /* listagem completa carregada (limit 100); paginação apenas visual */ }

  countPagos(): number { return this.honorarios().filter(h => h.status === 'PAGO').length; }
  countAbertos(): number { return this.honorarios().filter(h => h.status === 'ABERTO').length; }
  countVencidos(): number { return this.honorarios().filter(h => h.status === 'VENCIDO').length; }

  salvar() {
    if (!this.form.valid) return;
    const v = this.form.value;
    const valorHon = Number(v.valorHonorario) || 0;
    const valorExtra = Number(v.valorServicosExtras) || 0;
    const data: Record<string, unknown> = {
      empresaNome: v.clienteEmpresaNome,
      competencia: v.competencia,
      valor: valorHon + valorExtra,
      dataVencimento: v.dataVencimento,
      status: 'ABERTO',
      tenantId: this.auth.tenantId() || 'default',
      empresaId: this.auth.empresaId() || '',
      createdAt: new Date().toISOString(),
    };
    this.appwrite.createDocument('honorarios', data).subscribe({
      next: () => { this.snackBar.open('Honorário criado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
      error: () => this.snackBar.open('Erro ao criar honorário', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  registrarPagamento(id: string) {
    const data: Record<string, unknown> = { status: 'PAGO', dataPagamento: new Date().toISOString().slice(0, 10) };
    this.appwrite.updateDocument('honorarios', id, data).subscribe({
      next: () => { this.snackBar.open('Pagamento registrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.carregar(); },
      error: () => this.snackBar.open('Erro', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  carregarVencidos() {
    // "vencidos" = filtro no cliente por dataVencimento (em aberto e vencidos)
    this.loading.set(true);
    this.appwrite.listDocuments<Honorario>('honorarios', [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', this.auth.tenantId() || 'default'),
    ]).subscribe({
      next: (res) => {
        const vencidos = res.map(h => this.mapHonorario(h)).filter(h => h.status === 'VENCIDO');
        this.honorarios.set(vencidos);
        this.totalElements.set(vencidos.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  getStatusBadge(s: string): string {
    const m: Record<string, string> = { 'ABERTO': 'badge--warning', 'PAGO': 'badge--success', 'VENCIDO': 'badge--error', 'CANCELADO': 'badge--neutral' };
    return m[s] || 'badge--neutral';
  }
}
