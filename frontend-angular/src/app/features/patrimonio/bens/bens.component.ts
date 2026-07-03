import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface BemPatrimonial {
  $id: string;
  codigo: string;
  descricao: string;
  grupo: string;
  dataAquisicao: string;
  valorAquisicao: number;
  valorResidual?: number;
  vidaUtil?: number;
  taxaDepreciacao?: number;
  depreciacaoAcumulada?: number;
  valorAtual?: number;
  localizacao?: string;
  notaFiscal?: string;
  fornecedor?: string;
  contaContabil?: string;
  status: string;
  empresaId?: string;
  tenantId?: string;
  $createdAt?: string;
  // Campos derivados para o template (compatibilidade visual)
  grupoContabil?: string;
  valorDepreciadoAcumulado?: number;
}

@Component({
  selector: 'bear-bens',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTableModule, MatPaginatorModule,
    MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Bens Patrimoniais</h1>
          <p class="page-header__subtitle">Controle do ativo imobilizado da empresa</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Novo Bem
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="stat-icon stat-icon--brand"><span class="material-symbols-rounded">inventory_2</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total Bens</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ totalElements() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="stat-icon stat-icon--success"><span class="material-symbols-rounded">payments</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Valor Total</p><p class="text-xl font-bold ink-success">{{ valorTotal() | currency:'BRL' }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="stat-icon stat-icon--error"><span class="material-symbols-rounded">trending_down</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Deprec. Acum.</p><p class="text-xl font-bold ink-error">{{ depreciacao() | currency:'BRL' }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="stat-icon stat-icon--teal"><span class="material-symbols-rounded">account_balance</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Valor Atual</p><p class="text-xl font-bold ink-teal">{{ valorAtual() | currency:'BRL' }}</p></div>
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
          <table mat-table [dataSource]="bens()" class="w-full">
            <ng-container matColumnDef="codigo"><th mat-header-cell *matHeaderCellDef>Código</th><td mat-cell *matCellDef="let b" class="font-mono text-xs">{{ b.codigo }}</td></ng-container>
            <ng-container matColumnDef="descricao"><th mat-header-cell *matHeaderCellDef>Descrição</th><td mat-cell *matCellDef="let b"><span class="font-medium">{{ b.descricao }}</span></td></ng-container>
            <ng-container matColumnDef="grupo"><th mat-header-cell *matHeaderCellDef>Grupo</th><td mat-cell *matCellDef="let b"><span class="badge badge--info">{{ formatGrupo(b.grupoContabil) }}</span></td></ng-container>
            <ng-container matColumnDef="valorAquisicao"><th mat-header-cell *matHeaderCellDef>Valor Aquisição</th><td mat-cell *matCellDef="let b" class="font-semibold">{{ b.valorAquisicao | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="valorAtual"><th mat-header-cell *matHeaderCellDef>Valor Atual</th><td mat-cell *matCellDef="let b">{{ b.valorAtual | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="depreciacao"><th mat-header-cell *matHeaderCellDef>Deprec. Acum.</th><td mat-cell *matCellDef="let b" class="ink-error">{{ b.valorDepreciadoAcumulado | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let b">
                <span class="badge" [ngClass]="b.status === 'ATIVO' ? 'badge--success' : 'badge--neutral'">
                  <span class="badge__dot"></span>{{ b.status }}
                </span>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          @if (!loading() && bens().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">inventory_2</span></div>
              <h3 class="empty-state__title">Nenhum bem cadastrado</h3>
              <p class="empty-state__description">Cadastre o primeiro bem patrimonial</p>
            </div>
          }

          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)" [hidePageSize]="true"></mat-paginator>
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Novo Bem Patrimonial</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <p class="text-label mb-3">Identificação</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Descrição</mat-label><input matInput formControlName="descricao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Grupo Contábil</mat-label>
                <mat-select formControlName="grupoContabil">
                  @for (g of grupos; track g) { <mat-option [value]="g">{{ formatGrupo(g) }}</mat-option> }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Marca</mat-label><input matInput formControlName="marca"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Modelo</mat-label><input matInput formControlName="modelo"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nº Série</mat-label><input matInput formControlName="numeroSerie"></mat-form-field>
            </div>
            <p class="text-label mb-3">Aquisição</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <mat-form-field appearance="outline"><mat-label>Nota Fiscal</mat-label><input matInput formControlName="notaFiscal"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Fornecedor</mat-label><input matInput formControlName="fornecedorNome"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Data Aquisição</mat-label><input matInput type="date" formControlName="dataAquisicao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Valor Aquisição</mat-label><input matInput type="number" formControlName="valorAquisicao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Vida Útil (meses)</mat-label><input matInput type="number" formControlName="vidaUtilMeses"></mat-form-field>
            </div>
            <p class="text-label mb-3">Localização</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <mat-form-field appearance="outline"><mat-label>Local</mat-label><input matInput formControlName="localDescricao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Responsável</mat-label><input matInput formControlName="responsavel"></mat-form-field>
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
export class BensComponent implements OnInit {
  bens = signal<BemPatrimonial[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalElements = signal(0);
  valorTotal = signal(0);
  depreciacao = signal(0);
  valorAtual = signal(0);
  displayedColumns = ['codigo', 'descricao', 'grupo', 'valorAquisicao', 'valorAtual', 'depreciacao', 'status'];
  grupos = ['IMOVEIS', 'VEICULOS', 'MAQUINAS_EQUIPAMENTOS', 'MOVEIS_UTENSILIOS', 'EQUIPAMENTOS_INFORMATICA', 'INSTALACOES', 'TERRENOS', 'OUTROS'];
  form!: FormGroup;
  private pageSize = 20;

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.form = this.fb.group({
      descricao: ['', Validators.required], grupoContabil: ['', Validators.required],
      marca: [''], modelo: [''], numeroSerie: [''], notaFiscal: [''],
      fornecedorNome: [''], localDescricao: [''], responsavel: [''],
      dataAquisicao: ['', Validators.required], valorAquisicao: [null, [Validators.required, Validators.min(0.01)]],
      vidaUtilMeses: [60],
    });
    this.carregar();
  }

  carregar(page = 0) {
    this.loading.set(true);
    const tenantId = this.auth.tenantId() || 'default';
    const queries = [
      this.appwrite.query.limit(100),
      this.appwrite.query.orderDesc('$createdAt'),
      this.appwrite.query.equal('tenantId', tenantId),
    ];
    this.appwrite.listDocuments<BemPatrimonial>('bens_patrimoniais', queries).subscribe({
      next: (docs) => {
        // Mapeia para os campos esperados pelo template (compatibilidade visual).
        const mapped = docs.map(b => ({
          ...b,
          grupoContabil: b.grupo,
          valorDepreciadoAcumulado: b.depreciacaoAcumulada ?? 0,
          valorAtual: b.valorAtual ?? b.valorAquisicao,
        }));
        const start = page * this.pageSize;
        const pageItems = mapped.slice(start, start + this.pageSize);
        this.bens.set(pageItems);
        this.totalElements.set(mapped.length);
        this.valorTotal.set(mapped.reduce((s, b) => s + (b.valorAquisicao || 0), 0));
        this.depreciacao.set(mapped.reduce((s, b) => s + (b.depreciacaoAcumulada || 0), 0));
        this.valorAtual.set(mapped.reduce((s, b) => s + (b.valorAtual || b.valorAquisicao || 0), 0));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ vidaUtilMeses: 60, grupoContabil: '' }); }
  onPage(event: PageEvent) { this.carregar(event.pageIndex); }

  formatGrupo(g: string): string { return (g || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()); }

  salvar() {
    if (!this.form.valid) return;
    const v = this.form.value;
    const valorAquisicao = Number(v.valorAquisicao) || 0;
    const vidaUtil = Number(v.vidaUtilMeses) || 0;
    // Taxa anual de depreciação derivada da vida útil em meses (linear).
    const taxaDepreciacao = vidaUtil > 0 ? Number(((1200 / vidaUtil)).toFixed(4)) : 0;
    const tenantId = this.auth.tenantId() || 'default';
    const empresaId = this.auth.empresaId() || '';
    const data: Record<string, unknown> = {
      codigo: this.gerarCodigo(),
      descricao: v.descricao,
      grupo: v.grupoContabil,
      dataAquisicao: v.dataAquisicao,
      valorAquisicao,
      valorResidual: 0,
      vidaUtil,
      taxaDepreciacao,
      depreciacaoAcumulada: 0,
      valorAtual: valorAquisicao,
      localizacao: [v.localDescricao, v.responsavel].filter(Boolean).join(' - '),
      notaFiscal: v.notaFiscal || '',
      fornecedor: v.fornecedorNome || '',
      status: 'ATIVO',
      tenantId,
      empresaId,
    };
    this.appwrite.createDocument('bens_patrimoniais', data).subscribe({
      next: () => {
        this.snackBar.open('Bem cadastrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
        this.showForm.set(false);
        this.carregar();
      },
      error: (e) => this.snackBar.open(e?.message || 'Erro ao cadastrar', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  private gerarCodigo(): string {
    return 'BEM-' + Date.now().toString(36).toUpperCase();
  }
}
