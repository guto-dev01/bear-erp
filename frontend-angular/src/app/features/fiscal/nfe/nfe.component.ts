import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { FiscalService } from '../fiscal.service';

@Component({
  selector: 'bear-nfe',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatPaginatorModule, MatSnackBarModule, MatTooltipModule, MatDialogModule,
  ],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">NF-e - Nota Fiscal Eletrônica</h1>
          <p class="page-header__subtitle">Gerencie suas notas fiscais eletrônicas de produtos</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded">add</span> Nova NF-e
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      @if (!showForm()) {
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: var(--brand-primary-light, #e0e7ff);">
                <span class="material-symbols-rounded" style="color: var(--brand-primary);">description</span>
              </div>
              <div>
                <p class="text-label">Total NF-es</p>
                <p class="text-heading">{{ totalElements() }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: #dcfce7;">
                <span class="material-symbols-rounded" style="color: #16a34a;">check_circle</span>
              </div>
              <div>
                <p class="text-label">Autorizadas</p>
                <p class="text-heading">{{ countByStatus('AUTORIZADA') }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: #f3f4f6;">
                <span class="material-symbols-rounded" style="color: #6b7280;">edit_note</span>
              </div>
              <div>
                <p class="text-label">Rascunhos</p>
                <p class="text-heading">{{ countByStatus('RASCUNHO') }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: #fef2f2;">
                <span class="material-symbols-rounded" style="color: #dc2626;">cancel</span>
              </div>
              <div>
                <p class="text-label">Canceladas</p>
                <p class="text-heading">{{ countByStatus('CANCELADA') }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bear-card">
          <table mat-table [dataSource]="nfes()" class="w-full">
            <ng-container matColumnDef="numero">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Número</th>
              <td mat-cell *matCellDef="let nfe">{{ nfe.numero }}</td>
            </ng-container>
            <ng-container matColumnDef="destinatario">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Destinatário</th>
              <td mat-cell *matCellDef="let nfe">{{ nfe.destinatarioRazaoSocial || nfe.destinatarioCnpjCpf }}</td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Valor Total</th>
              <td mat-cell *matCellDef="let nfe">{{ nfe.totalNfe | currency:'BRL' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Status</th>
              <td mat-cell *matCellDef="let nfe">
                <span class="badge" [ngClass]="getStatusBadge(nfe.status)">
                  <span class="badge__dot"></span>
                  {{ nfe.status }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef class="!font-bold w-32">Ações</th>
              <td mat-cell *matCellDef="let nfe">
                <div class="flex gap-1">
                  @if (nfe.status === 'RASCUNHO') {
                    <button class="bear-btn bear-btn--ghost" (click)="autorizar(nfe)" matTooltip="Autorizar">
                      <span class="material-symbols-rounded" style="font-size:18px;">send</span>
                    </button>
                  }
                  @if (nfe.status === 'AUTORIZADA') {
                    <button class="bear-btn bear-btn--ghost" (click)="cancelar(nfe)" matTooltip="Cancelar" style="color: var(--status-error, #dc2626);">
                      <span class="material-symbols-rounded" style="font-size:18px;">cancel</span>
                    </button>
                  }
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-gray-50 cursor-pointer"></tr>
          </table>
          @if (!loading() && nfes().length === 0) {
            <div class="empty-state">
              <span class="material-symbols-rounded empty-state__icon">description</span>
              <p class="empty-state__title">Nenhuma NF-e cadastrada</p>
              <p class="empty-state__description">Clique em "Nova NF-e" para emitir sua primeira nota fiscal eletrônica.</p>
            </div>
          }
          <mat-paginator [length]="totalElements()" [pageSize]="20" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)"></mat-paginator>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card">
          <div class="p-6">
            <h2 class="text-heading" style="margin-bottom: 1rem;">Nova NF-e</h2>
            <form [formGroup]="nfeForm" (ngSubmit)="salvar()">
              <h3 class="text-label" style="font-size: 1rem; margin-bottom: 0.75rem;">Destinatário</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4" formGroupName="destinatario">
                <mat-form-field appearance="outline">
                  <mat-label>CNPJ/CPF</mat-label>
                  <input matInput formControlName="cnpjCpf">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Razão Social</mat-label>
                  <input matInput formControlName="razaoSocial">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>IE</mat-label>
                  <input matInput formControlName="inscricaoEstadual">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>UF</mat-label>
                  <input matInput formControlName="uf" maxlength="2">
                </mat-form-field>
              </div>

              <h3 class="text-label" style="font-size: 1rem; margin-bottom: 0.75rem; margin-top: 1rem;">Dados da NF-e</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <mat-form-field appearance="outline">
                  <mat-label>Tipo</mat-label>
                  <mat-select formControlName="tipo">
                    <mat-option value="SAIDA">Saída</mat-option>
                    <mat-option value="ENTRADA">Entrada</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Natureza da Operação</mat-label>
                  <input matInput formControlName="naturezaOperacao">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Finalidade</mat-label>
                  <mat-select formControlName="finalidade">
                    <mat-option value="NORMAL">Normal</mat-option>
                    <mat-option value="COMPLEMENTAR">Complementar</mat-option>
                    <mat-option value="AJUSTE">Ajuste</mat-option>
                    <mat-option value="DEVOLUCAO">Devolução</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <h3 class="text-label" style="font-size: 1rem; margin-bottom: 0.75rem; margin-top: 1rem;">Itens</h3>
              <div formArrayName="itens">
                @for (item of itensArray.controls; track $index) {
                  <div class="border rounded p-3 mb-2" [formGroupName]="$index">
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <mat-form-field appearance="outline" class="col-span-2">
                        <mat-label>Descrição</mat-label>
                        <input matInput formControlName="descricao">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>NCM</mat-label>
                        <input matInput formControlName="ncm">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>CFOP</mat-label>
                        <input matInput formControlName="cfop">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Qtd</mat-label>
                        <input matInput formControlName="quantidade" type="number">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Valor Unit.</mat-label>
                        <input matInput formControlName="valorUnitario" type="number">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>CST ICMS</mat-label>
                        <input matInput formControlName="cstIcms">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Alíq. ICMS (%)</mat-label>
                        <input matInput formControlName="aliquotaIcms" type="number">
                      </mat-form-field>
                      <div class="flex items-center">
                        <button class="bear-btn bear-btn--ghost" type="button" (click)="removeItem($index)" style="color: var(--status-error, #dc2626);">
                          <span class="material-symbols-rounded">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
              <button class="bear-btn bear-btn--outline" type="button" (click)="addItem()" style="margin-bottom: 1rem;">
                <span class="material-symbols-rounded">add</span> Adicionar Item
              </button>

              <div class="flex gap-2 mt-4">
                <button class="bear-btn bear-btn--primary flex-1" type="submit" [disabled]="nfeForm.invalid">Salvar Rascunho</button>
                <button class="bear-btn bear-btn--outline flex-1" type="button" (click)="showForm.set(false)">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class NfeComponent implements OnInit {
  loading = signal(false);
  showForm = signal(false);
  nfes = signal<any[]>([]);
  totalElements = signal(0);
  displayedColumns = ['numero', 'destinatario', 'valor', 'status', 'acoes'];
  nfeForm: FormGroup;

  constructor(private fb: FormBuilder, private fiscalService: FiscalService, private snackBar: MatSnackBar) {
    this.nfeForm = this.fb.group({
      tipo: ['SAIDA', Validators.required],
      naturezaOperacao: ['Venda de Mercadorias', Validators.required],
      finalidade: ['NORMAL', Validators.required],
      destinatario: this.fb.group({
        cnpjCpf: ['', Validators.required],
        razaoSocial: ['', Validators.required],
        inscricaoEstadual: [''],
        uf: ['', Validators.required],
      }),
      itens: this.fb.array([]),
    });
  }

  get itensArray() { return this.nfeForm.get('itens') as FormArray; }

  ngOnInit() { this.loadNfes(); }

  loadNfes(page = 0) {
    this.loading.set(true);
    this.fiscalService.listNfes(page).subscribe({
      next: data => {
        this.nfes.set(data.content || []);
        this.totalElements.set(data.totalElements || 0);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.snackBar.open('Erro ao carregar NF-es', 'Fechar', { duration: 3000 }); }
    });
  }

  addItem() {
    this.itensArray.push(this.fb.group({
      descricao: ['', Validators.required], ncm: [''], cfop: ['5102', Validators.required],
      quantidade: [1, [Validators.required, Validators.min(1)]],
      valorUnitario: [0, [Validators.required, Validators.min(0.01)]],
      cstIcms: ['00'], aliquotaIcms: [18],
    }));
  }

  removeItem(i: number) { this.itensArray.removeAt(i); }

  salvar() {
    this.fiscalService.createNfe(this.nfeForm.value).subscribe({
      next: () => { this.snackBar.open('NF-e criada!', 'OK', { duration: 3000 }); this.showForm.set(false); this.loadNfes(); },
      error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
    });
  }

  autorizar(nfe: any) {
    if (confirm(`Autorizar NF-e #${nfe.numero}?`)) {
      this.fiscalService.autorizarNfe(nfe.id).subscribe({
        next: () => { this.snackBar.open('NF-e autorizada!', 'OK', { duration: 3000 }); this.loadNfes(); },
        error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
      });
    }
  }

  cancelar(nfe: any) {
    if (confirm(`Cancelar NF-e #${nfe.numero}?`)) {
      this.fiscalService.cancelarNfe(nfe.id).subscribe({
        next: () => { this.snackBar.open('NF-e cancelada', 'OK', { duration: 3000 }); this.loadNfes(); },
        error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
      });
    }
  }

  onPage(event: PageEvent) { this.loadNfes(event.pageIndex); }

  resetForm() { this.nfeForm.reset({ tipo: 'SAIDA', naturezaOperacao: 'Venda de Mercadorias', finalidade: 'NORMAL' }); this.itensArray.clear(); this.addItem(); }

  countByStatus(status: string): number {
    return this.nfes().filter(n => n.status === status).length;
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'AUTORIZADA': return 'badge--success';
      case 'CANCELADA': case 'REJEITADA': return 'badge--error';
      case 'DENEGADA': return 'badge--warning';
      default: return 'badge--neutral';
    }
  }
}
