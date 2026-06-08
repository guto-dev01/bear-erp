import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'bear-certificados',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule, MatPaginatorModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Certificados Digitais</h1>
          <p class="page-header__subtitle">Gerencie certificados digitais A1 e A3</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="carregarProximosVencimento()">
            <span class="material-symbols-rounded text-base mr-1.5">warning</span>
            Próximos a Vencer
          </button>
          <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                  (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded text-base mr-1.5">add</span>
            Novo Certificado
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
            <span class="material-symbols-rounded" style="color: #34C759;">verified</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Ativos</p>
            <p class="text-2xl font-bold" style="color: #34C759;">{{ contarPorStatus('ATIVO') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #FFF4E5;">
            <span class="material-symbols-rounded" style="color: #FF9500;">schedule</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Próximos a Vencer</p>
            <p class="text-2xl font-bold" style="color: #FF9500;">{{ contarPorStatus('PROXIMO_VENCIMENTO') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #FFECEB;">
            <span class="material-symbols-rounded" style="color: #FF3B30;">error</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Expirados</p>
            <p class="text-2xl font-bold" style="color: #FF3B30;">{{ contarPorStatus('EXPIRADO') }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: var(--surface-2);">
            <span class="material-symbols-rounded" style="color: var(--text-secondary);">block</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Revogados</p>
            <p class="text-2xl font-bold" style="color: var(--text-secondary);">{{ contarPorStatus('REVOGADO') }}</p>
          </div>
        </div>
      </div>

      @if (!showForm() && !showOperacoes()) {
        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
            <h3 class="text-heading text-base">Certificados</h3>
            <span class="badge badge--info">{{ certificados().length }} registro(s)</span>
          </div>
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="certificados()" class="w-full">
              <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef class="text-label">Nome</th><td mat-cell *matCellDef="let c" class="font-medium">{{ c.nome }}</td></ng-container>
              <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef class="text-label">Tipo</th>
                <td mat-cell *matCellDef="let c">
                  <span class="badge" [ngClass]="{'badge--info': c.tipo === 'A1', 'badge--neutral': c.tipo === 'A3'}">{{ c.tipo }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="cnpjCpf"><th mat-header-cell *matHeaderCellDef class="text-label">CNPJ/CPF</th><td mat-cell *matCellDef="let c">{{ c.cnpjCpf }}</td></ng-container>
              <ng-container matColumnDef="razaoSocial"><th mat-header-cell *matHeaderCellDef class="text-label">Razão Social</th><td mat-cell *matCellDef="let c">{{ c.razaoSocial }}</td></ng-container>
              <ng-container matColumnDef="validade"><th mat-header-cell *matHeaderCellDef class="text-label">Validade</th><td mat-cell *matCellDef="let c">{{ c.dataValidade | date:'dd/MM/yyyy' }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="text-label">Status</th>
                <td mat-cell *matCellDef="let c">
                  <span class="badge" [ngClass]="getStatusBadge(c.status)">
                    <span class="badge__dot"></span>
                    {{ formatStatus(c.status) }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="usos"><th mat-header-cell *matHeaderCellDef class="text-label">Usos</th><td mat-cell *matCellDef="let c">{{ c.totalUsos }}</td></ng-container>
              <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef class="text-label">Ações</th>
                <td mat-cell *matCellDef="let c">
                  <div class="flex gap-1">
                    <button class="bear-btn bear-btn--ghost p-2" title="Operações" (click)="verOperacoes(c.id, c.nome)">
                      <span class="material-symbols-rounded text-base" style="color: var(--brand-primary);">history</span>
                    </button>
                    @if (c.status === 'ATIVO' || c.status === 'PROXIMO_VENCIMENTO') {
                      <button class="bear-btn bear-btn--ghost p-2" title="Revogar" (click)="revogar(c.id)">
                        <span class="material-symbols-rounded text-base" style="color: #FF3B30;">block</span>
                      </button>
                    }
                  </div>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
            @if (certificados().length === 0 && !loading()) {
              <div class="empty-state py-12">
                <span class="material-symbols-rounded text-5xl mb-3" style="color: var(--text-secondary);">badge</span>
                <p class="empty-state__title text-sm" style="color: var(--text-secondary);">Nenhum certificado encontrado</p>
              </div>
            }
          </div>
        </div>
      }

      @if (showOperacoes()) {
        <div class="bear-card">
          <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
            <h3 class="text-heading text-base">Operações - {{ operacoesCertNome() }}</h3>
            <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                    (click)="showOperacoes.set(false)">
              <span class="material-symbols-rounded text-base mr-1.5">arrow_back</span>
              Voltar
            </button>
          </div>
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="operacoes()" class="w-full">
              <ng-container matColumnDef="data"><th mat-header-cell *matHeaderCellDef class="text-label">Data</th><td mat-cell *matCellDef="let o">{{ o.dataOperacao | date:'dd/MM/yyyy HH:mm' }}</td></ng-container>
              <ng-container matColumnDef="tipo"><th mat-header-cell *matHeaderCellDef class="text-label">Tipo</th><td mat-cell *matCellDef="let o">{{ o.tipoOperacao }}</td></ng-container>
              <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef class="text-label">Status</th>
                <td mat-cell *matCellDef="let o">
                  <span class="badge" [ngClass]="{'badge--success': o.statusOperacao === 'SUCESSO', 'badge--error': o.statusOperacao === 'FALHA'}">
                    <span class="badge__dot"></span>
                    {{ o.statusOperacao }}
                  </span>
                </td>
              </ng-container>
              <ng-container matColumnDef="descricao"><th mat-header-cell *matHeaderCellDef class="text-label">Descrição</th><td mat-cell *matCellDef="let o">{{ o.descricao }}</td></ng-container>
              <ng-container matColumnDef="documento"><th mat-header-cell *matHeaderCellDef class="text-label">Documento</th><td mat-cell *matCellDef="let o">{{ o.documentoReferencia || '-' }}</td></ng-container>
              <tr mat-header-row *matHeaderRowDef="operacoesCols"></tr>
              <tr mat-row *matRowDef="let row; columns: operacoesCols;"></tr>
            </table>
          </div>
          <mat-paginator [length]="operacoesTotal()" [pageSize]="20" (page)="onOperacoesPage($event)"></mat-paginator>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-heading text-base">Novo Certificado Digital</h3>
            <button class="bear-btn bear-btn--ghost p-2" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()" class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome"></mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select formControlName="tipo"><mat-option value="A1">A1 (Arquivo)</mat-option><mat-option value="A3">A3 (Token/Smartcard)</mat-option></mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>CNPJ/CPF</mat-label><input matInput formControlName="cnpjCpf"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Razão Social</mat-label><input matInput formControlName="razaoSocial"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Número Serial</mat-label><input matInput formControlName="serialNumber"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Emissor</mat-label><input matInput formControlName="emissor"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Data Emissão</mat-label><input matInput type="date" formControlName="dataEmissao"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Data Validade</mat-label><input matInput type="date" formControlName="dataValidade"></mat-form-field>
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
export class CertificadosComponent implements OnInit {
  certificados = signal<any[]>([]); loading = signal(false); showForm = signal(false);
  showOperacoes = signal(false); operacoes = signal<any[]>([]); operacoesTotal = signal(0);
  operacoesCertId = signal(''); operacoesCertNome = signal('');
  displayedColumns = ['nome', 'tipo', 'cnpjCpf', 'razaoSocial', 'validade', 'status', 'usos', 'acoes'];
  operacoesCols = ['data', 'tipo', 'status', 'descricao', 'documento'];
  form!: FormGroup;
  private apiUrl = `${environment.apiUrl}/certificados`;

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      nome: ['', Validators.required], tipo: ['A1', Validators.required],
      cnpjCpf: ['', Validators.required], razaoSocial: [''],
      serialNumber: [''], emissor: [''],
      dataEmissao: ['', Validators.required], dataValidade: ['', Validators.required],
      observacao: [''],
    });
    this.carregar();
  }

  carregar() {
    this.loading.set(true);
    this.http.get<any[]>(this.apiUrl).subscribe({
      next: (res) => { this.certificados.set(res || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  carregarProximosVencimento() {
    this.loading.set(true);
    this.http.get<any[]>(`${this.apiUrl}/proximos-vencimento`).subscribe({
      next: (res) => { this.certificados.set(res || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  resetForm() { this.form.reset({ tipo: 'A1' }); }

  salvar() {
    if (this.form.valid) {
      this.http.post<any>(this.apiUrl, this.form.value).subscribe({
        next: () => { this.snackBar.open('Certificado cadastrado!', 'OK', { duration: 3000 }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao cadastrar certificado', 'OK', { duration: 3000 }),
      });
    }
  }

  revogar(id: string) {
    this.http.post<any>(`${this.apiUrl}/${id}/revogar`, {}).subscribe({
      next: () => { this.snackBar.open('Certificado revogado!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao revogar', 'OK', { duration: 3000 }),
    });
  }

  verOperacoes(certId: string, certNome: string, page = 0) {
    this.operacoesCertId.set(certId);
    this.operacoesCertNome.set(certNome);
    this.showOperacoes.set(true);
    this.http.get<any>(`${this.apiUrl}/${certId}/operacoes`, { params: { page, size: 20 } }).subscribe({
      next: (res) => { this.operacoes.set(res.content || []); this.operacoesTotal.set(res.totalElements || 0); },
    });
  }

  onOperacoesPage(event: PageEvent) { this.verOperacoes(this.operacoesCertId(), this.operacoesCertNome(), event.pageIndex); }

  contarPorStatus(status: string): number {
    return this.certificados().filter(c => c.status === status).length;
  }

  formatStatus(s: string): string {
    const map: Record<string, string> = { ATIVO: 'Ativo', EXPIRADO: 'Expirado', REVOGADO: 'Revogado', PROXIMO_VENCIMENTO: 'Próx. Vencimento' };
    return map[s] || s;
  }

  getStatusBadge(s: string): string {
    const map: Record<string, string> = {
      'ATIVO': 'badge--success',
      'PROXIMO_VENCIMENTO': 'badge--warning',
      'EXPIRADO': 'badge--error',
      'REVOGADO': 'badge--neutral',
    };
    return map[s] || 'badge--neutral';
  }
}
