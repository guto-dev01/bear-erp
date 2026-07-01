import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { ContabilidadeService } from '../contabilidade.service';

@Component({
  selector: 'bear-lancamentos',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTooltipModule, MatSnackBarModule,
    MatTableModule, MatPaginatorModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Lançamentos Contábeis</h1>
          <p class="page-header__subtitle">Registre e consulte os lançamentos do plano de contas</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="openForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">add</span> Novo Lançamento
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">edit_note</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ totalElements() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">arrow_upward</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Débitos</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ totalDebitos() | currency:'BRL' }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFECEB"><span class="material-symbols-rounded" style="color:#FF3B30">arrow_downward</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Créditos</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ totalCreditos() | currency:'BRL' }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" [style.background]="saldoOk() ? '#E9FAEF' : '#FFECEB'">
            <span class="material-symbols-rounded" [style.color]="saldoOk() ? '#34C759' : '#FF3B30'">{{ saldoOk() ? 'check_circle' : 'error' }}</span>
          </div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Balanço</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ saldoOk() ? 'OK' : 'Divergente' }}</p></div>
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
          <table mat-table [dataSource]="lancamentos()" class="w-full">
            <ng-container matColumnDef="numero">
              <th mat-header-cell *matHeaderCellDef>Nº</th>
              <td mat-cell *matCellDef="let l" class="font-mono text-xs">{{ l.numero }}</td>
            </ng-container>
            <ng-container matColumnDef="data">
              <th mat-header-cell *matHeaderCellDef>Data</th>
              <td mat-cell *matCellDef="let l">{{ l.data | date:'dd/MM/yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="historico">
              <th mat-header-cell *matHeaderCellDef>Histórico</th>
              <td mat-cell *matCellDef="let l"><span class="font-medium">{{ l.historico }}</span></td>
            </ng-container>
            <ng-container matColumnDef="debito">
              <th mat-header-cell *matHeaderCellDef>Débito</th>
              <td mat-cell *matCellDef="let l" class="font-mono text-xs">{{ l.contaDebito?.codigo }} - {{ l.contaDebito?.descricao }}</td>
            </ng-container>
            <ng-container matColumnDef="credito">
              <th mat-header-cell *matHeaderCellDef>Crédito</th>
              <td mat-cell *matCellDef="let l" class="font-mono text-xs">{{ l.contaCredito?.codigo }} - {{ l.contaCredito?.descricao }}</td>
            </ng-container>
            <ng-container matColumnDef="valor">
              <th mat-header-cell *matHeaderCellDef>Valor</th>
              <td mat-cell *matCellDef="let l" class="font-semibold">{{ l.valor | currency:'BRL' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let l">
                <span class="badge" [ngClass]="l.estornado ? 'badge--error' : 'badge--success'">
                  <span class="badge__dot"></span>{{ l.estornado ? 'Estornado' : 'Ativo' }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef class="w-20">Ações</th>
              <td mat-cell *matCellDef="let l">
                @if (!l.estornado) {
                  <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:#FF3B30;"
                          matTooltip="Estornar" (click)="estornar(l)">
                    <span class="material-symbols-rounded text-sm">undo</span>
                  </button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>

          @if (!loading() && lancamentos().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">edit_note</span></div>
              <h3 class="empty-state__title">Nenhum lançamento registrado</h3>
              <p class="empty-state__description">Crie um novo lançamento contábil para começar</p>
            </div>
          }

          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)" [hidePageSize]="true"></mat-paginator>
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-3xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">Novo Lançamento Contábil</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <mat-form-field appearance="outline">
                <mat-label>Data</mat-label>
                <input matInput type="date" formControlName="data">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tipo</mat-label>
                <mat-select formControlName="tipo">
                  <mat-option value="NORMAL">Normal</mat-option>
                  <mat-option value="ABERTURA">Abertura</mat-option>
                  <mat-option value="ENCERRAMENTO">Encerramento</mat-option>
                  <mat-option value="AJUSTE">Ajuste</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2">
                <mat-label>Histórico</mat-label>
                <input matInput formControlName="historico" placeholder="Descrição do lançamento">
              </mat-form-field>
            </div>

            <p class="text-label mb-3">Partidas</p>
            <div class="mb-4">
              @for (partida of partidas.controls; track partida; let i = $index) {
                <div class="grid grid-cols-12 gap-2 mb-2 items-end" [formGroup]="getPartida(i)">
                  <div class="col-span-4">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Conta</mat-label>
                      <mat-select formControlName="contaId">
                        @for (c of contasAnaliticas(); track c.id) {
                          <mat-option [value]="c.id">{{ c.codigo }} - {{ c.descricao }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </div>
                  <div class="col-span-3">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Tipo</mat-label>
                      <mat-select formControlName="tipo">
                        <mat-option value="DEBITO">Débito</mat-option>
                        <mat-option value="CREDITO">Crédito</mat-option>
                      </mat-select>
                    </mat-form-field>
                  </div>
                  <div class="col-span-3">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Valor</mat-label>
                      <input matInput type="number" formControlName="valor">
                    </mat-form-field>
                  </div>
                  <div class="col-span-2 flex gap-1 pb-5">
                    @if (i > 1) {
                      <button type="button" class="bear-btn bear-btn--ghost" style="padding:0.25rem;color:#FF3B30;" (click)="removePartida(i)">
                        <span class="material-symbols-rounded text-sm">remove_circle</span>
                      </button>
                    }
                  </div>
                </div>
              }
              <button type="button" class="bear-btn bear-btn--outline" style="padding:0.375rem 0.75rem;font-size:0.75rem;" (click)="addPartida()">
                <span class="material-symbols-rounded text-sm mr-1">add</span> Adicionar Partida
              </button>
            </div>

            <div class="flex gap-3 justify-end mt-6">
              <button type="button" class="bear-btn bear-btn--outline" style="padding:0.5rem 1.5rem" (click)="showForm.set(false)">Cancelar</button>
              <button type="submit" class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" [disabled]="form.invalid">
                <span class="material-symbols-rounded text-lg mr-1">save</span> Lançar
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class LancamentosComponent implements OnInit {
  lancamentos = signal<any[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalElements = signal(0);
  totalDebitos = signal(0);
  totalCreditos = signal(0);
  contasAnaliticas = signal<any[]>([]);
  columns = ['numero', 'data', 'historico', 'debito', 'credito', 'valor', 'status', 'acoes'];
  form: FormGroup;

  saldoOk = signal(true);

  get partidas(): FormArray { return this.form.get('partidas') as FormArray; }

  constructor(private fb: FormBuilder, private service: ContabilidadeService, private snackBar: MatSnackBar) {
    this.form = this.fb.group({
      data: ['', Validators.required],
      tipo: ['NORMAL'],
      historico: ['', Validators.required],
      partidas: this.fb.array([]),
    });
    this.addPartida('DEBITO');
    this.addPartida('CREDITO');
  }

  ngOnInit() {
    this.carregar();
    this.service.listContasAnaliticas().subscribe({
      next: d => this.contasAnaliticas.set(d),
      error: () => {},
    });
  }

  carregar(page = 0) {
    this.loading.set(true);
    this.service.listLancamentos(page).subscribe({
      next: (res) => {
        const items = res.content || res || [];
        this.lancamentos.set(items);
        this.totalElements.set(res.totalElements || items.length);
        let deb = 0, cred = 0;
        items.forEach((l: any) => {
          if (l.partidas) {
            l.partidas.forEach((p: any) => {
              if (p.tipo === 'DEBITO') deb += p.valor || 0;
              else cred += p.valor || 0;
            });
          } else {
            deb += l.valor || 0;
            cred += l.valor || 0;
          }
        });
        this.totalDebitos.set(deb);
        this.totalCreditos.set(cred);
        this.saldoOk.set(Math.abs(deb - cred) < 0.01);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  openForm() {
    this.form.reset({ tipo: 'NORMAL', data: new Date().toISOString().split('T')[0] });
    this.partidas.clear();
    this.addPartida('DEBITO');
    this.addPartida('CREDITO');
    this.showForm.set(true);
  }

  addPartida(tipo = 'DEBITO') {
    this.partidas.push(this.fb.group({
      contaId: ['', Validators.required],
      tipo: [tipo, Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
    }));
  }

  removePartida(i: number) { this.partidas.removeAt(i); }

  getPartida(i: number): FormGroup { return this.partidas.at(i) as FormGroup; }

  salvar() {
    if (this.form.invalid) return;
    const data = { ...this.form.value };
    this.service.createLancamento(data).subscribe({
      next: () => {
        this.snackBar.open('Lançamento registrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
        this.showForm.set(false);
        this.carregar();
      },
      error: (e) => this.snackBar.open(e.error?.message || e.message || 'Erro ao lançar', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] }),
    });
  }

  estornar(l: any) {
    if (!confirm(`Estornar lançamento nº ${l.numero}?`)) return;
    this.service.estornarLancamento(l.id, { motivo: 'Estorno manual' }).subscribe({
      next: () => { this.snackBar.open('Estornado!', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao estornar', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  onPage(event: PageEvent) { this.carregar(event.pageIndex); }
}
