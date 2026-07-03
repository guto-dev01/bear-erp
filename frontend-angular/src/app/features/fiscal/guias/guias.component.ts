import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FiscalService } from '../fiscal.service';

@Component({
  selector: 'bear-guias',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule,
    MatButtonModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Guias Fiscais</h1>
          <p class="page-header__subtitle">Gerencie DARF, DAS, GPS, GNRE e outras guias de recolhimento</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--outline" style="color: var(--status-error, #FF3B30); border-color: var(--status-error, #FF3B30);" (click)="loadVencidas()">
            <span class="material-symbols-rounded">warning</span> Vencidas
          </button>
          <button class="bear-btn bear-btn--primary" (click)="showForm.set(true); resetForm()">
            <span class="material-symbols-rounded">add</span> Nova Guia
          </button>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      @if (!showForm()) {
        <div class="flex gap-3 mb-4 items-end">
          <mat-form-field appearance="outline" class="w-40">
            <mat-label>Competência</mat-label>
            <input matInput [(ngModel)]="competencia" placeholder="2026-03">
          </mat-form-field>
          <button class="bear-btn bear-btn--outline" (click)="loadGuias(); loadObrigacoes()" style="margin-bottom: 22px;">
            <span class="material-symbols-rounded">search</span> Buscar
          </button>
        </div>

        <!-- KPI Cards -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: var(--brand-primary-light, #DAD9F6);">
                <span class="material-symbols-rounded" style="color: var(--brand-primary);">receipt</span>
              </div>
              <div>
                <p class="text-label">Total Guias</p>
                <p class="text-heading">{{ guias().length }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="stat-icon stat-icon--warning">
                <span class="material-symbols-rounded">schedule</span>
              </div>
              <div>
                <p class="text-label">Geradas</p>
                <p class="text-heading">{{ countByStatus('GERADA') }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="stat-icon stat-icon--success">
                <span class="material-symbols-rounded">check_circle</span>
              </div>
              <div>
                <p class="text-label">Pagas</p>
                <p class="text-heading">{{ countByStatus('PAGA') }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-3 p-4">
              <div class="stat-icon stat-icon--error">
                <span class="material-symbols-rounded">error</span>
              </div>
              <div>
                <p class="text-label">Vencidas</p>
                <p class="text-heading">{{ countByStatus('VENCIDA') }}</p>
              </div>
            </div>
          </div>
        </div>

        <div class="bear-card">
          <table mat-table [dataSource]="guias()" class="w-full">
            <ng-container matColumnDef="tipo">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Tipo</th>
              <td mat-cell *matCellDef="let g">
                <span class="badge badge--info">{{ g.tipoGuia }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="competencia">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Competência</th>
              <td mat-cell *matCellDef="let g">{{ g.competencia }}</td>
            </ng-container>
            <ng-container matColumnDef="vencimento">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Vencimento</th>
              <td mat-cell *matCellDef="let g">{{ g.dataVencimento | date:'dd/MM/yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Valor Total</th>
              <td mat-cell *matCellDef="let g">{{ g.valorTotal | currency:'BRL' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="!font-bold">Status</th>
              <td mat-cell *matCellDef="let g">
                <span class="badge" [ngClass]="getStatusBadge(g.status)">
                  <span class="badge__dot"></span>
                  {{ g.status }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef class="!font-bold w-32">Ações</th>
              <td mat-cell *matCellDef="let g">
                @if (g.status === 'GERADA' || g.status === 'VENCIDA') {
                  <button class="bear-btn bear-btn--ghost" (click)="pagar(g)" matTooltip="Marcar como paga">
                    <span class="material-symbols-rounded" style="font-size:18px;">paid</span>
                  </button>
                  <button class="bear-btn bear-btn--ghost" (click)="cancelar(g)" matTooltip="Cancelar" style="color: var(--status-error, #FF3B30);">
                    <span class="material-symbols-rounded" style="font-size:18px;">cancel</span>
                  </button>
                }
                <button class="bear-btn bear-btn--ghost" (click)="copiarLinha(g)" matTooltip="Copiar linha digitável">
                  <span class="material-symbols-rounded" style="font-size:18px;">qr_code</span>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="hover:bg-gray-50"></tr>
          </table>
          @if (!loading() && guias().length === 0) {
            <div class="empty-state">
              <span class="material-symbols-rounded empty-state__icon">receipt</span>
              <p class="empty-state__title">Nenhuma guia encontrada</p>
              <p class="empty-state__description">Busque por competência ou clique em "Nova Guia" para registrar uma guia fiscal.</p>
            </div>
          }
        </div>

        <div class="bear-card mt-4">
          <div class="flex items-center justify-between flex-wrap gap-3 p-4">
            <div>
              <p class="text-heading" style="font-size: 1rem;">Obrigações Acessórias</p>
              <p class="text-label">Calendário da competência {{ competencia }} conforme o regime da empresa.</p>
            </div>
            <button class="bear-btn bear-btn--outline" (click)="gerarObrigacoes()">
              <span class="material-symbols-rounded">event_repeat</span> Gerar do período
            </button>
          </div>
          @if (obrigacoes().length > 0) {
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left" style="color: var(--text-secondary);">
                  <th class="p-2">Obrigação</th><th class="p-2">Vencimento</th><th class="p-2">Status</th><th class="p-2"></th>
                </tr>
              </thead>
              <tbody>
                @for (o of obrigacoes(); track o.id) {
                  <tr style="border-top: 1px solid var(--surface-3);">
                    <td class="p-2">{{ o.descricao }}</td>
                    <td class="p-2">{{ o.dataVencimento }}</td>
                    <td class="p-2">
                      <span class="badge" [ngClass]="o.status === 'ENTREGUE' ? 'badge--success' : 'badge--warning'">
                        <span class="badge__dot"></span>{{ o.status }}
                      </span>
                    </td>
                    <td class="p-2">
                      @if (o.status !== 'ENTREGUE') {
                        <button class="bear-btn bear-btn--ghost" (click)="entregar(o)" matTooltip="Marcar como entregue">
                          <span class="material-symbols-rounded" style="font-size:18px;">task_alt</span>
                        </button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          } @else if (!loading()) {
            <p class="text-label p-4">Nenhuma obrigação gerada para esta competência. Clique em "Gerar do período".</p>
          }
        </div>
      }

      @if (showForm()) {
        <div class="bear-card">
          <div class="p-6">
            <h2 class="text-heading" style="margin-bottom: 1rem;">Nova Guia Fiscal</h2>
            <form [formGroup]="guiaForm" (ngSubmit)="salvar()">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <mat-form-field appearance="outline">
                  <mat-label>Tipo</mat-label>
                  <mat-select formControlName="tipoGuia">
                    <mat-option value="DARF">DARF</mat-option>
                    <mat-option value="DAS">DAS</mat-option>
                    <mat-option value="GPS">GPS</mat-option>
                    <mat-option value="GNRE">GNRE</mat-option>
                    <mat-option value="GIA">GIA</mat-option>
                    <mat-option value="FGTS">FGTS</mat-option>
                    <mat-option value="DAE">DAE</mat-option>
                    <mat-option value="ISS">ISS</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Competência</mat-label>
                  <input matInput formControlName="competencia" placeholder="2026-03">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Data Vencimento</mat-label>
                  <input matInput formControlName="dataVencimento" type="date">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Valor Principal</mat-label>
                  <input matInput formControlName="valorPrincipal" type="number">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Código Receita</mat-label>
                  <input matInput formControlName="codigoReceita">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Código de Barras</mat-label>
                  <input matInput formControlName="codigoBarras">
                </mat-form-field>
                <mat-form-field appearance="outline" class="col-span-2">
                  <mat-label>Observação</mat-label>
                  <input matInput formControlName="observacao">
                </mat-form-field>
              </div>
              <div class="flex gap-2 mt-4">
                <button class="bear-btn bear-btn--primary flex-1" type="submit" [disabled]="guiaForm.invalid">Salvar</button>
                <button class="bear-btn bear-btn--outline flex-1" type="button" (click)="showForm.set(false)">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `,
})
export class GuiasComponent implements OnInit {
  loading = signal(false);
  showForm = signal(false);
  guias = signal<any[]>([]);
  obrigacoes = signal<any[]>([]);
  competencia = '';
  displayedColumns = ['tipo', 'competencia', 'vencimento', 'valor', 'status', 'acoes'];
  guiaForm: FormGroup;

  constructor(private fb: FormBuilder, private fiscalService: FiscalService, private snackBar: MatSnackBar) {
    const now = new Date();
    this.competencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    this.guiaForm = this.fb.group({
      tipoGuia: ['DARF', Validators.required],
      competencia: [this.competencia, Validators.required],
      dataVencimento: ['', Validators.required],
      valorPrincipal: [0, [Validators.required, Validators.min(0.01)]],
      codigoReceita: [''], codigoBarras: [''], observacao: [''],
    });
  }

  ngOnInit() { this.loadGuias(); this.loadObrigacoes(); }

  private anoMes(): [number, number] {
    const [a, m] = this.competencia.split('-').map(Number);
    return [a, m];
  }

  loadGuias() {
    if (!this.competencia) return;
    this.loading.set(true);
    this.fiscalService.listarGuiasPorCompetencia(this.competencia).subscribe({
      next: data => { this.guias.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); this.snackBar.open('Erro ao carregar guias', 'Fechar', { duration: 3000 }); }
    });
  }

  loadObrigacoes() {
    if (!this.competencia) return;
    const [ano, mes] = this.anoMes();
    this.fiscalService.listarObrigacoes(ano, mes).subscribe({
      next: data => this.obrigacoes.set(data),
      error: () => {},
    });
  }

  gerarObrigacoes() {
    const [ano, mes] = this.anoMes();
    this.loading.set(true);
    this.fiscalService.gerarObrigacoes(ano, mes).subscribe({
      next: data => { this.obrigacoes.set(data); this.loading.set(false); this.snackBar.open('Obrigações do período geradas', 'OK', { duration: 3000 }); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 }); }
    });
  }

  entregar(o: any) {
    this.fiscalService.entregarObrigacao(o.id).subscribe({
      next: () => { this.snackBar.open('Obrigação marcada como entregue', 'OK', { duration: 3000 }); this.loadObrigacoes(); },
      error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
    });
  }

  copiarLinha(g: any) {
    this.fiscalService.detalharGuia(g.id).subscribe({
      next: (d: any) => {
        const linha = d.linhaDigitavelFormatada as string;
        navigator.clipboard?.writeText((d.linhaDigitavel as string) ?? '').catch(() => {});
        const extra = d.diasAtraso > 0 ? ` — c/ acréscimos: total ${this.fmt(d.valorTotal)}` : '';
        this.snackBar.open(`Linha digitável copiada: ${linha}${extra}`, 'OK', { duration: 6000 });
      },
      error: err => this.snackBar.open(err.error?.message || 'Erro ao gerar linha digitável', 'Fechar', { duration: 5000 })
    });
  }

  private fmt(v: number): string {
    return v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '';
  }

  loadVencidas() {
    this.loading.set(true);
    this.fiscalService.listarGuiasVencidas().subscribe({
      next: data => { this.guias.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); }
    });
  }

  salvar() {
    this.fiscalService.criarGuia(this.guiaForm.value).subscribe({
      next: () => { this.snackBar.open('Guia criada!', 'OK', { duration: 3000 }); this.showForm.set(false); this.loadGuias(); },
      error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
    });
  }

  pagar(g: any) {
    if (confirm(`Marcar guia ${g.tipoGuia} como paga?`)) {
      this.fiscalService.pagarGuia(g.id, { dataPagamento: new Date().toISOString().split('T')[0] }).subscribe({
        next: () => { this.snackBar.open('Guia paga!', 'OK', { duration: 3000 }); this.loadGuias(); },
        error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
      });
    }
  }

  cancelar(g: any) {
    if (confirm(`Cancelar guia ${g.tipoGuia}?`)) {
      this.fiscalService.cancelarGuia(g.id).subscribe({
        next: () => { this.snackBar.open('Guia cancelada', 'OK', { duration: 3000 }); this.loadGuias(); },
        error: err => this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 })
      });
    }
  }

  resetForm() { this.guiaForm.reset({ tipoGuia: 'DARF', competencia: this.competencia, valorPrincipal: 0 }); }

  countByStatus(status: string): number {
    return this.guias().filter(g => g.status === status).length;
  }

  getStatusBadge(status: string): string {
    switch (status) {
      case 'PAGA': return 'badge--success';
      case 'VENCIDA': return 'badge--error';
      case 'GERADA': return 'badge--warning';
      case 'CANCELADA': return 'badge--neutral';
      default: return 'badge--neutral';
    }
  }
}
