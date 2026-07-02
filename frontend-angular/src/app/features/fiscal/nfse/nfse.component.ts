import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FiscalService } from '../fiscal.service';

@Component({
  selector: 'bear-nfse',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatPaginatorModule, MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">NFS-e - Nota Fiscal de Serviço</h1>
          <p class="page-header__subtitle">Gerencie suas notas fiscais de serviço eletrônicas</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded">add</span> Nova NFS-e
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
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: var(--brand-primary-light, #DAD9F6);">
                <span class="material-symbols-rounded" style="color: var(--brand-primary);">receipt_long</span>
              </div>
              <div>
                <p class="text-label">Total NFS-es</p>
                <p class="text-heading">{{ totalElements() }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="stat-icon stat-icon--success"><span class="material-symbols-rounded">check_circle</span></div>
              <div>
                <p class="text-label">Autorizadas</p>
                <p class="text-heading">{{ countByStatus('AUTORIZADA') }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="stat-icon stat-icon--error"><span class="material-symbols-rounded">cancel</span></div>
              <div>
                <p class="text-label">Canceladas</p>
                <p class="text-heading">{{ countByStatus('CANCELADA') }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bear-card">
          <table mat-table [dataSource]="nfses()" class="w-full">
            <ng-container matColumnDef="numero">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Número</th>
              <td mat-cell *matCellDef="let n">{{ n.numero }}</td>
            </ng-container>
            <ng-container matColumnDef="tomador">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Tomador</th>
              <td mat-cell *matCellDef="let n">{{ n.tomadorRazaoSocial }}</td>
            </ng-container>
            <ng-container matColumnDef="servico">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Serviço</th>
              <td mat-cell *matCellDef="let n">{{ n.descricaoServico | slice:0:40 }}</td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Valor</th>
              <td mat-cell *matCellDef="let n">{{ n.valorServico | currency:'BRL' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Status</th>
              <td mat-cell *matCellDef="let n">
                <span class="badge" [ngClass]="getStatusBadge(n.status)">
                  <span class="badge__dot"></span>
                  {{ n.status }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef class="!font-bold w-28">Ações</th>
              <td mat-cell *matCellDef="let n">
                @if (n.status === 'RASCUNHO') {
                  <button class="bear-btn bear-btn--ghost" (click)="autorizar(n)" matTooltip="Autorizar">
                    <span class="material-symbols-rounded" style="font-size:18px;">send</span>
                  </button>
                }
                @if (n.status === 'AUTORIZADA') {
                  <button class="bear-btn bear-btn--ghost" (click)="cancelar(n)" matTooltip="Cancelar" style="color: var(--status-error, #FF3B30);">
                    <span class="material-symbols-rounded" style="font-size:18px;">cancel</span>
                  </button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-gray-50"></tr>
          </table>
          @if (!loading() && nfses().length === 0) {
            <div class="empty-state">
              <span class="material-symbols-rounded empty-state__icon">receipt_long</span>
              <p class="empty-state__title">Nenhuma NFS-e cadastrada</p>
              <p class="empty-state__description">Clique em "Nova NFS-e" para emitir sua primeira nota fiscal de serviço.</p>
            </div>
          }
          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)"></mat-paginator>
        </div>
      }

      @if (showForm()) {
        <div class="bear-card">
          <div class="p-6">
            <h2 class="text-heading" style="margin-bottom: 1rem;">Nova NFS-e</h2>
            <form [formGroup]="nfseForm" (ngSubmit)="salvar()">
              <h3 class="text-label" style="font-size: 1rem; margin-bottom: 0.75rem;">Tomador do Serviço</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4" formGroupName="tomador">
                <mat-form-field appearance="outline"><mat-label>CPF/CNPJ</mat-label><input matInput formControlName="cpfCnpj"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Razão Social</mat-label><input matInput formControlName="razaoSocial"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput formControlName="email"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Cidade</mat-label><input matInput formControlName="cidade"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>UF</mat-label><input matInput formControlName="uf" maxlength="2"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>CEP</mat-label><input matInput formControlName="cep"></mat-form-field>
              </div>

              <h3 class="text-label" style="font-size: 1rem; margin-bottom: 0.75rem; margin-top: 1rem;">Serviço</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field appearance="outline"><mat-label>Código Serviço (LC 116)</mat-label><input matInput formControlName="codigoServico"></mat-form-field>
                <mat-form-field appearance="outline" class="col-span-2"><mat-label>Descrição do Serviço</mat-label><textarea matInput formControlName="descricaoServico" rows="3"></textarea></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Valor do Serviço</mat-label><input matInput formControlName="valorServico" type="number"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Alíquota ISS (%)</mat-label><input matInput formControlName="aliquotaIss" type="number"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Competência</mat-label><input matInput formControlName="competencia" type="date"></mat-form-field>
                <mat-checkbox formControlName="issRetido" class="mt-2">ISS Retido</mat-checkbox>
              </div>

              <h3 class="text-label" style="font-size: 1rem; margin-bottom: 0.75rem; margin-top: 1rem;">Retenções Federais</h3>
              <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
                <mat-form-field appearance="outline"><mat-label>PIS</mat-label><input matInput formControlName="valorPis" type="number"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>COFINS</mat-label><input matInput formControlName="valorCofins" type="number"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>INSS</mat-label><input matInput formControlName="valorInss" type="number"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>IR</mat-label><input matInput formControlName="valorIr" type="number"></mat-form-field>
                <mat-form-field appearance="outline"><mat-label>CSLL</mat-label><input matInput formControlName="valorCsll" type="number"></mat-form-field>
              </div>

              <div class="flex gap-2 mt-4">
                <button class="bear-btn bear-btn--primary flex-1" type="submit" [disabled]="nfseForm.invalid">Salvar</button>
                <button class="bear-btn bear-btn--outline flex-1" type="button" (click)="showForm.set(false)">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class NfseComponent implements OnInit {
  loading = signal(false);
  showForm = signal(false);
  nfses = signal<any[]>([]);
  totalElements = signal(0);
  displayedColumns = ['numero', 'tomador', 'servico', 'valor', 'status', 'acoes'];
  nfseForm: FormGroup;

  constructor(private fb: FormBuilder, private fiscalService: FiscalService, private snackBar: MatSnackBar) {
    this.nfseForm = this.fb.group({
      tomador: this.fb.group({
        cpfCnpj: ['', Validators.required], razaoSocial: ['', Validators.required],
        email: [''], cidade: [''], uf: [''], cep: [''],
      }),
      codigoServico: ['', Validators.required],
      descricaoServico: ['', Validators.required],
      valorServico: [0, [Validators.required, Validators.min(0.01)]],
      aliquotaIss: [5, Validators.required],
      competencia: ['', Validators.required],
      issRetido: [false],
      valorPis: [0], valorCofins: [0], valorInss: [0], valorIr: [0], valorCsll: [0],
    });
  }

  ngOnInit() { this.loadNfses(); }

  loadNfses(page = 0) {
    this.loading.set(true);
    this.fiscalService.listNfses(page).subscribe({
      next: data => { this.nfses.set(data.content || []); this.totalElements.set(data.totalElements || 0); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Erro ao carregar NFS-es', 'Fechar', { duration: 3000 }); }
    });
  }

  salvar() {
    this.fiscalService.createNfse(this.nfseForm.value).subscribe({
      next: () => { this.snackBar.open('NFS-e criada!', 'OK', { duration: 3000 }); this.showForm.set(false); this.loadNfses(); },
      error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
    });
  }

  autorizar(n: any) {
    if (confirm(`Autorizar NFS-e #${n.numero}?`)) {
      // TODO(appwrite): integração externa — transmissão à prefeitura não disponível nesta versão.
      this.fiscalService.autorizarNfse(n.id).subscribe({
        next: () => { this.snackBar.open('Autorização da NFS-e requer integração externa (não disponível nesta versão Appwrite)', 'Fechar', { duration: 5000 }); this.loadNfses(); },
        error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
      });
    }
  }

  cancelar(n: any) {
    const motivo = prompt('Motivo do cancelamento:');
    if (motivo) {
      // TODO(appwrite): integração externa — cancelamento na prefeitura não disponível nesta versão.
      this.fiscalService.cancelarNfse(n.id, motivo).subscribe({
        next: () => { this.snackBar.open('Cancelamento da NFS-e requer integração externa (não disponível nesta versão Appwrite)', 'Fechar', { duration: 5000 }); this.loadNfses(); },
        error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
      });
    }
  }

  onPage(event: PageEvent) { this.loadNfses(event.pageIndex); }
  resetForm() { this.nfseForm.reset({ aliquotaIss: 5, issRetido: false, valorPis: 0, valorCofins: 0, valorInss: 0, valorIr: 0, valorCsll: 0 }); }

  countByStatus(status: string): number {
    return this.nfses().filter(n => n.status === status).length;
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'AUTORIZADA': return 'badge--success';
      case 'CANCELADA': return 'badge--error';
      default: return 'badge--neutral';
    }
  }
}
