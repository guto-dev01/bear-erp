import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FiscalService } from '../fiscal.service';

@Component({
  selector: 'bear-apuracoes',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatTabsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Apurações Fiscais</h1>
          <p class="page-header__subtitle">Calcule e consulte as apurações de ICMS e PIS/COFINS</p>
        </div>
        <div class="page-header__actions">
          <mat-form-field appearance="outline" class="!mb-0 w-24">
            <mat-label>Ano</mat-label>
            <input matInput [(ngModel)]="ano" type="number">
          </mat-form-field>
          <mat-form-field appearance="outline" class="!mb-0 w-24">
            <mat-label>Mês</mat-label>
            <mat-select [(ngModel)]="mes">
              @for (m of meses; track m.value) {
                <mat-option [value]="m.value">{{ m.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-center p-8">
          <div class="login__spinner" style="width:32px;height:32px;border:3px solid var(--surface-3);border-top-color:var(--brand-primary);"></div>
        </div>
      }

      <mat-tab-group>
        <mat-tab label="ICMS">
          <div class="p-4">
            <div class="flex gap-3 mb-4">
              <button class="bear-btn bear-btn--primary" (click)="calcularIcms()">
                <span class="material-symbols-rounded">calculate</span> Calcular ICMS
              </button>
              <button class="bear-btn bear-btn--outline" (click)="consultarIcms()">
                <span class="material-symbols-rounded">search</span> Consultar
              </button>
            </div>
            @if (apuracaoIcms()) {
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: var(--brand-primary-light, #DAD9F6);">
                      <span class="material-symbols-rounded" style="color: var(--brand-primary);">trending_up</span>
                    </div>
                    <div>
                      <p class="text-label">Total Débitos</p>
                      <p class="text-heading">{{ apuracaoIcms().totalDebitos | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: #DCF3E0;">
                      <span class="material-symbols-rounded" style="color: #34C759;">trending_down</span>
                    </div>
                    <div>
                      <p class="text-label">Total Créditos</p>
                      <p class="text-heading">{{ apuracaoIcms().totalCreditos | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: #FFECEB;">
                      <span class="material-symbols-rounded" style="color: #FF3B30;">payments</span>
                    </div>
                    <div>
                      <p class="text-label">ICMS a Recolher</p>
                      <p class="text-heading">{{ apuracaoIcms().icmsRecolher | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: #F2EBFB;">
                      <span class="material-symbols-rounded" style="color: #5856D6;">account_balance</span>
                    </div>
                    <div>
                      <p class="text-label">Saldo Credor</p>
                      <p class="text-heading">{{ apuracaoIcms().saldoCredorTransportar | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="bear-card">
                <div class="p-4">
                  <h3 class="text-heading" style="font-size: 1rem; margin-bottom: 0.75rem;">Detalhamento</h3>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>Débitos Saídas: {{ apuracaoIcms().totalDebitosSaidas | currency:'BRL' }}</div>
                    <div>Créditos Entradas: {{ apuracaoIcms().totalCreditosEntradas | currency:'BRL' }}</div>
                    <div>Outros Débitos: {{ apuracaoIcms().outrosDebitos | currency:'BRL' }}</div>
                    <div>Outros Créditos: {{ apuracaoIcms().outrosCreditos | currency:'BRL' }}</div>
                    <div>Estorno Créditos: {{ apuracaoIcms().estornoCreditos | currency:'BRL' }}</div>
                    <div>Estorno Débitos: {{ apuracaoIcms().estornoDebitos | currency:'BRL' }}</div>
                    <div>Saldo Credor Anterior: {{ apuracaoIcms().saldoCredorAnterior | currency:'BRL' }}</div>
                    <div>ICMS-ST a Recolher: {{ apuracaoIcms().icmsStRecolher | currency:'BRL' }}</div>
                    <div>DIFAL a Recolher: {{ apuracaoIcms().difalRecolher | currency:'BRL' }}</div>
                    <div>Status:
                      <span class="badge" [ngClass]="{
                        'badge--success': apuracaoIcms().status === 'FECHADA',
                        'badge--warning': apuracaoIcms().status === 'ABERTA',
                        'badge--neutral': apuracaoIcms().status !== 'FECHADA' && apuracaoIcms().status !== 'ABERTA'
                      }">
                        <span class="badge__dot"></span>
                        {{ apuracaoIcms().status }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            } @else if (!loading()) {
              <div class="empty-state">
                <span class="material-symbols-rounded empty-state__icon">calculate</span>
                <p class="empty-state__title">Nenhuma apuração de ICMS</p>
                <p class="empty-state__description">Clique em "Calcular ICMS" para gerar a apuração do período selecionado.</p>
              </div>
            }
          </div>
        </mat-tab>

        <mat-tab label="PIS/COFINS">
          <div class="p-4">
            <div class="flex gap-3 mb-4">
              <button class="bear-btn bear-btn--primary" (click)="calcularPisCofins()">
                <span class="material-symbols-rounded">calculate</span> Calcular PIS/COFINS
              </button>
              <button class="bear-btn bear-btn--outline" (click)="consultarPisCofins()">
                <span class="material-symbols-rounded">search</span> Consultar
              </button>
            </div>
            @if (apuracaoPisCofins()) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="bear-card">
                  <div class="p-4">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: var(--brand-primary-light, #DAD9F6);">
                        <span class="material-symbols-rounded" style="color: var(--brand-primary);">receipt</span>
                      </div>
                      <h3 class="text-heading" style="font-size: 1rem;">PIS</h3>
                    </div>
                    <div class="grid grid-cols-2 gap-1 text-sm">
                      <div>Débitos: {{ apuracaoPisCofins().pisDebitoSaidas | currency:'BRL' }}</div>
                      <div>Créditos: {{ apuracaoPisCofins().pisCreditoEntradas | currency:'BRL' }}</div>
                      <div>Retido: {{ apuracaoPisCofins().pisRetidoFonte | currency:'BRL' }}</div>
                      <div>Saldo Anterior: {{ apuracaoPisCofins().pisSaldoCredorAnterior | currency:'BRL' }}</div>
                      <div class="col-span-2 text-lg font-bold mt-2" style="color: var(--status-error, #FF3B30);">A Recolher: {{ apuracaoPisCofins().pisRecolher | currency:'BRL' }}</div>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="p-4">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="flex items-center justify-center w-10 h-10 rounded-lg" style="background: #DCF3E0;">
                        <span class="material-symbols-rounded" style="color: #34C759;">receipt</span>
                      </div>
                      <h3 class="text-heading" style="font-size: 1rem;">COFINS</h3>
                    </div>
                    <div class="grid grid-cols-2 gap-1 text-sm">
                      <div>Débitos: {{ apuracaoPisCofins().cofinsDebitoSaidas | currency:'BRL' }}</div>
                      <div>Créditos: {{ apuracaoPisCofins().cofinsCreditoEntradas | currency:'BRL' }}</div>
                      <div>Retido: {{ apuracaoPisCofins().cofinsRetidoFonte | currency:'BRL' }}</div>
                      <div>Saldo Anterior: {{ apuracaoPisCofins().cofinsSaldoCredorAnterior | currency:'BRL' }}</div>
                      <div class="col-span-2 text-lg font-bold mt-2" style="color: var(--status-error, #FF3B30);">A Recolher: {{ apuracaoPisCofins().cofinsRecolher | currency:'BRL' }}</div>
                    </div>
                  </div>
                </div>
              </div>
            } @else if (!loading()) {
              <div class="empty-state">
                <span class="material-symbols-rounded empty-state__icon">calculate</span>
                <p class="empty-state__title">Nenhuma apuração de PIS/COFINS</p>
                <p class="empty-state__description">Clique em "Calcular PIS/COFINS" para gerar a apuração do período selecionado.</p>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
})
export class ApuracoesComponent {
  loading = signal(false);
  apuracaoIcms = signal<any>(null);
  apuracaoPisCofins = signal<any>(null);
  ano = new Date().getFullYear();
  mes = new Date().getMonth() + 1;
  meses = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i] }));

  constructor(private fiscalService: FiscalService, private snackBar: MatSnackBar) {}

  calcularIcms() {
    this.loading.set(true);
    this.fiscalService.calcularApuracaoIcms(this.ano, this.mes).subscribe({
      next: data => { this.apuracaoIcms.set(data); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 }); }
    });
  }

  consultarIcms() {
    this.loading.set(true);
    this.fiscalService.getApuracaoIcms(this.ano, this.mes).subscribe({
      next: data => { this.apuracaoIcms.set(data); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Sem apuração', 'Fechar', { duration: 3000 }); }
    });
  }

  calcularPisCofins() {
    this.loading.set(true);
    this.fiscalService.calcularApuracaoPisCofins(this.ano, this.mes).subscribe({
      next: data => { this.apuracaoPisCofins.set(data); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 }); }
    });
  }

  consultarPisCofins() {
    this.loading.set(true);
    this.fiscalService.getApuracaoPisCofins(this.ano, this.mes).subscribe({
      next: data => { this.apuracaoPisCofins.set(data); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Sem apuração', 'Fechar', { duration: 3000 }); }
    });
  }
}
