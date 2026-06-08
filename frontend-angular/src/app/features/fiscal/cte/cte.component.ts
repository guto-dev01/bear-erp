import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { FiscalService } from '../fiscal.service';

@Component({
  selector: 'bear-cte',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatSnackBarModule, MatTooltipModule,
    MatTableModule, MatPaginatorModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">CT-e - Conhecimento de Transporte</h1>
          <p class="page-header__subtitle">Emita e gerencie conhecimentos de transporte eletrônicos</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="openForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Novo CT-e
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">local_shipping</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ totalElements() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">check_circle</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Autorizados</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ autorizados() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFF4E5"><span class="material-symbols-rounded" style="color:#FF9500">pending</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Pendentes</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ pendentes() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFECEB"><span class="material-symbols-rounded" style="color:#FF3B30">cancel</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Cancelados</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ cancelados() }}</p></div>
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
          <table mat-table [dataSource]="ctes()" class="w-full">
            <ng-container matColumnDef="numero">
              <th mat-header-cell *matHeaderCellDef>Número</th>
              <td mat-cell *matCellDef="let c" class="font-mono text-xs">{{ c.numero }}</td>
            </ng-container>
            <ng-container matColumnDef="serie">
              <th mat-header-cell *matHeaderCellDef>Série</th>
              <td mat-cell *matCellDef="let c">{{ c.serie }}</td>
            </ng-container>
            <ng-container matColumnDef="remetente">
              <th mat-header-cell *matHeaderCellDef>Remetente</th>
              <td mat-cell *matCellDef="let c"><span class="font-medium">{{ c.remetenteNome }}</span></td>
            </ng-container>
            <ng-container matColumnDef="destinatario">
              <th mat-header-cell *matHeaderCellDef>Destinatário</th>
              <td mat-cell *matCellDef="let c">{{ c.destinatarioNome }}</td>
            </ng-container>
            <ng-container matColumnDef="modal">
              <th mat-header-cell *matHeaderCellDef>Modal</th>
              <td mat-cell *matCellDef="let c">
                <span class="badge badge--info">{{ c.modal || 'Rodoviário' }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef>Valor Frete</th>
              <td mat-cell *matCellDef="let c" class="font-semibold">{{ c.valorFrete | currency:'BRL' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let c">
                <span class="badge" [ngClass]="getStatusClass(c.status)">
                  <span class="badge__dot"></span>{{ c.status }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef class="w-28">Ações</th>
              <td mat-cell *matCellDef="let c">
                <div class="flex gap-0.5">
                  @if (c.status === 'DIGITACAO') {
                    <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;"
                            matTooltip="Autorizar" (click)="autorizar(c)">
                      <span class="material-symbols-rounded text-sm" style="color:#34C759">send</span>
                    </button>
                  }
                  @if (c.status === 'AUTORIZADO') {
                    <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;"
                            matTooltip="Cancelar" (click)="cancelar(c)">
                      <span class="material-symbols-rounded text-sm" style="color:#FF3B30">cancel</span>
                    </button>
                  }
                  <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;"
                          matTooltip="DACTE">
                    <span class="material-symbols-rounded text-sm">picture_as_pdf</span>
                  </button>
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>

          @if (!loading() && ctes().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">local_shipping</span></div>
              <h3 class="empty-state__title">Nenhum CT-e cadastrado</h3>
              <p class="empty-state__description">Emita o primeiro conhecimento de transporte</p>
            </div>
          }

          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)" [hidePageSize]="true"></mat-paginator>
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-4xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Novo CT-e</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <p class="text-label mb-3">Dados do Transporte</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <mat-form-field appearance="outline">
                <mat-label>Série</mat-label>
                <input matInput formControlName="serie" maxlength="3">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Modal</mat-label>
                <mat-select formControlName="modal">
                  <mat-option value="RODOVIARIO">Rodoviário</mat-option>
                  <mat-option value="AEREO">Aéreo</mat-option>
                  <mat-option value="AQUAVIARIO">Aquaviário</mat-option>
                  <mat-option value="FERROVIARIO">Ferroviário</mat-option>
                  <mat-option value="DUTOVIARIO">Dutoviário</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tipo Serviço</mat-label>
                <mat-select formControlName="tipoServico">
                  <mat-option value="NORMAL">Normal</mat-option>
                  <mat-option value="SUBCONTRATACAO">Subcontratação</mat-option>
                  <mat-option value="REDESPACHO">Redespacho</mat-option>
                  <mat-option value="REDESPACHO_INTERMEDIARIO">Redesp. Intermediário</mat-option>
                  <mat-option value="MULTIMODAL">Multimodal</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <p class="text-label mb-3">Remetente</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <mat-form-field appearance="outline"><mat-label>Nome/Razão Social</mat-label><input matInput formControlName="remetenteNome"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CNPJ/CPF</mat-label><input matInput formControlName="remetenteCnpjCpf" maxlength="14"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Cidade Origem</mat-label><input matInput formControlName="cidadeOrigem"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>UF Origem</mat-label><input matInput formControlName="ufOrigem" maxlength="2"></mat-form-field>
            </div>

            <p class="text-label mb-3">Destinatário</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <mat-form-field appearance="outline"><mat-label>Nome/Razão Social</mat-label><input matInput formControlName="destinatarioNome"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CNPJ/CPF</mat-label><input matInput formControlName="destinatarioCnpjCpf" maxlength="14"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Cidade Destino</mat-label><input matInput formControlName="cidadeDestino"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>UF Destino</mat-label><input matInput formControlName="ufDestino" maxlength="2"></mat-form-field>
            </div>

            <p class="text-label mb-3">Valores</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <mat-form-field appearance="outline"><mat-label>Valor Frete</mat-label><input matInput type="number" formControlName="valorFrete"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Valor Carga</mat-label><input matInput type="number" formControlName="valorCarga"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Peso (kg)</mat-label><input matInput type="number" formControlName="pesoBruto"></mat-form-field>
            </div>

            <p class="text-label mb-3">Impostos</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <mat-form-field appearance="outline"><mat-label>CFOP</mat-label><input matInput formControlName="cfop"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Base ICMS</mat-label><input matInput type="number" formControlName="baseIcms"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Alíq. ICMS (%)</mat-label><input matInput type="number" formControlName="aliqIcms"></mat-form-field>
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
export class CteComponent implements OnInit {
  ctes = signal<any[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalElements = signal(0);
  autorizados = signal(0);
  pendentes = signal(0);
  cancelados = signal(0);
  columns = ['numero', 'serie', 'remetente', 'destinatario', 'modal', 'valor', 'status', 'acoes'];
  form: FormGroup;

  constructor(private fb: FormBuilder, private service: FiscalService, private snackBar: MatSnackBar) {
    this.form = this.fb.group({
      serie: ['1'], modal: ['RODOVIARIO'], tipoServico: ['NORMAL'],
      remetenteNome: ['', Validators.required], remetenteCnpjCpf: ['', Validators.required],
      cidadeOrigem: [''], ufOrigem: [''],
      destinatarioNome: ['', Validators.required], destinatarioCnpjCpf: ['', Validators.required],
      cidadeDestino: [''], ufDestino: [''],
      valorFrete: [null, [Validators.required, Validators.min(0.01)]],
      valorCarga: [null], pesoBruto: [null],
      cfop: ['5353'], baseIcms: [null], aliqIcms: [null],
    });
  }

  ngOnInit() { this.carregar(); }

  carregar(_page = 0) {
    this.loading.set(true);
    this.service.listCtes(_page, 20).subscribe({
      next: (items) => {
        const list = Array.isArray(items) ? items : (items as any).content || [];
        this.ctes.set(list);
        this.totalElements.set(list.length);
        this.autorizados.set(list.filter((c: any) => c.status === 'AUTORIZADO').length);
        this.pendentes.set(list.filter((c: any) => c.status === 'DIGITACAO').length);
        this.cancelados.set(list.filter((c: any) => c.status === 'CANCELADO').length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openForm() {
    this.form.reset({ serie: '1', modal: 'RODOVIARIO', tipoServico: 'NORMAL', cfop: '5353' });
    this.showForm.set(true);
  }

  salvar() {
    if (this.form.invalid) return;
    const data = { ...this.form.value };
    this.service.createCte(data).subscribe({
      next: () => {
        this.snackBar.open('CT-e salvo!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
        this.showForm.set(false);
        this.carregar();
      },
      error: (e) => this.snackBar.open(e.error?.message || 'Erro', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] }),
    });
  }

  autorizar(c: any) {
    if (!confirm(`Autorizar CT-e nº ${c.numero}?`)) return;
    this.service.autorizarCte(c.id).subscribe({
      next: () => { this.snackBar.open('CT-e autorizado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao autorizar', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  cancelar(c: any) {
    if (!confirm(`Cancelar CT-e nº ${c.numero}?`)) return;
    this.service.cancelarCte(c.id, 'Cancelamento solicitado pelo usuário').subscribe({
      next: () => { this.snackBar.open('CT-e cancelado', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao cancelar', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  onPage(event: PageEvent) { this.carregar(event.pageIndex); }

  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'DIGITACAO': 'badge--warning', 'AUTORIZADO': 'badge--success',
      'CANCELADO': 'badge--error', 'DENEGADO': 'badge--neutral',
    };
    return map[status] || 'badge--neutral';
  }
}
