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
import { AnexoSimples, AtividadePresumido } from '../engine/apuracao-federal';

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
          <p class="page-header__subtitle">Calcule e consulte as apurações de ICMS, IPI, PIS/COFINS, IRPJ/CSLL e Simples</p>
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

      <div class="bear-card mb-4">
        <div class="flex items-center justify-between flex-wrap gap-3 p-4">
          <div>
            <p class="text-heading" style="font-size: 1rem;">Arquivos SPED</p>
            <p class="text-label">Exporta o período selecionado no layout oficial (.txt).</p>
          </div>
          <div class="flex gap-3">
            <button class="bear-btn bear-btn--outline" (click)="baixarSpedFiscal()">
              <span class="material-symbols-rounded">download</span> SPED Fiscal (ICMS/IPI)
            </button>
            <button class="bear-btn bear-btn--outline" (click)="baixarSpedContribuicoes()">
              <span class="material-symbols-rounded">download</span> EFD-Contribuições
            </button>
          </div>
        </div>
      </div>

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
                    <div class="stat-icon stat-icon--brand">
                      <span class="material-symbols-rounded">trending_up</span>
                    </div>
                    <div>
                      <p class="text-label">Total Débitos</p>
                      <p class="text-heading">{{ apuracaoIcms().totalDebitos | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="stat-icon stat-icon--success">
                      <span class="material-symbols-rounded">trending_down</span>
                    </div>
                    <div>
                      <p class="text-label">Total Créditos</p>
                      <p class="text-heading">{{ apuracaoIcms().totalCreditos | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="stat-icon stat-icon--error">
                      <span class="material-symbols-rounded">payments</span>
                    </div>
                    <div>
                      <p class="text-label">ICMS a Recolher</p>
                      <p class="text-heading">{{ apuracaoIcms().icmsRecolher | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="stat-icon stat-icon--purple">
                      <span class="material-symbols-rounded">account_balance</span>
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

        <mat-tab label="IPI">
          <div class="p-4">
            <div class="flex gap-3 mb-4">
              <button class="bear-btn bear-btn--primary" (click)="calcularIpi()">
                <span class="material-symbols-rounded">calculate</span> Calcular IPI
              </button>
              <button class="bear-btn bear-btn--outline" (click)="consultarIpi()">
                <span class="material-symbols-rounded">search</span> Consultar
              </button>
            </div>
            @if (apuracaoIpi()) {
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="stat-icon stat-icon--brand">
                      <span class="material-symbols-rounded">trending_up</span>
                    </div>
                    <div>
                      <p class="text-label">Total Débitos</p>
                      <p class="text-heading">{{ apuracaoIpi().totalDebitos | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="stat-icon stat-icon--success">
                      <span class="material-symbols-rounded">trending_down</span>
                    </div>
                    <div>
                      <p class="text-label">Total Créditos</p>
                      <p class="text-heading">{{ apuracaoIpi().totalCreditos | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="stat-icon stat-icon--error">
                      <span class="material-symbols-rounded">payments</span>
                    </div>
                    <div>
                      <p class="text-label">IPI a Recolher</p>
                      <p class="text-heading">{{ apuracaoIpi().ipiRecolher | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="flex items-center gap-3 p-4">
                    <div class="stat-icon stat-icon--purple">
                      <span class="material-symbols-rounded">account_balance</span>
                    </div>
                    <div>
                      <p class="text-label">Saldo Credor</p>
                      <p class="text-heading">{{ apuracaoIpi().saldoCredorTransportar | currency:'BRL' }}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div class="bear-card">
                <div class="p-4">
                  <h3 class="text-heading" style="font-size: 1rem; margin-bottom: 0.75rem;">Detalhamento</h3>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>Débitos Saídas: {{ apuracaoIpi().totalDebitosSaidas | currency:'BRL' }}</div>
                    <div>Créditos Entradas: {{ apuracaoIpi().totalCreditosEntradas | currency:'BRL' }}</div>
                    <div>Saldo Credor Anterior: {{ apuracaoIpi().saldoCredorAnterior | currency:'BRL' }}</div>
                    <div>Status:
                      <span class="badge" [ngClass]="{
                        'badge--success': apuracaoIpi().status === 'FECHADA',
                        'badge--warning': apuracaoIpi().status === 'ABERTA',
                        'badge--neutral': apuracaoIpi().status !== 'FECHADA' && apuracaoIpi().status !== 'ABERTA'
                      }">
                        <span class="badge__dot"></span>
                        {{ apuracaoIpi().status }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            } @else if (!loading()) {
              <div class="empty-state">
                <span class="material-symbols-rounded empty-state__icon">calculate</span>
                <p class="empty-state__title">Nenhuma apuração de IPI</p>
                <p class="empty-state__description">Clique em "Calcular IPI" para gerar a apuração do período selecionado.</p>
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
                      <div class="stat-icon stat-icon--brand">
                        <span class="material-symbols-rounded">receipt</span>
                      </div>
                      <h3 class="text-heading" style="font-size: 1rem;">PIS</h3>
                    </div>
                    <div class="grid grid-cols-2 gap-1 text-sm">
                      <div>Débitos: {{ apuracaoPisCofins().pisDebitoSaidas | currency:'BRL' }}</div>
                      <div>Créditos: {{ apuracaoPisCofins().pisCreditoEntradas | currency:'BRL' }}</div>
                      <div>Retido: {{ apuracaoPisCofins().pisRetidoFonte | currency:'BRL' }}</div>
                      <div>Saldo Anterior: {{ apuracaoPisCofins().pisSaldoCredorAnterior | currency:'BRL' }}</div>
                      <div class="col-span-2 text-lg font-bold mt-2 ink-error">A Recolher: {{ apuracaoPisCofins().pisRecolher | currency:'BRL' }}</div>
                    </div>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="p-4">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="stat-icon stat-icon--success">
                        <span class="material-symbols-rounded">receipt</span>
                      </div>
                      <h3 class="text-heading" style="font-size: 1rem;">COFINS</h3>
                    </div>
                    <div class="grid grid-cols-2 gap-1 text-sm">
                      <div>Débitos: {{ apuracaoPisCofins().cofinsDebitoSaidas | currency:'BRL' }}</div>
                      <div>Créditos: {{ apuracaoPisCofins().cofinsCreditoEntradas | currency:'BRL' }}</div>
                      <div>Retido: {{ apuracaoPisCofins().cofinsRetidoFonte | currency:'BRL' }}</div>
                      <div>Saldo Anterior: {{ apuracaoPisCofins().cofinsSaldoCredorAnterior | currency:'BRL' }}</div>
                      <div class="col-span-2 text-lg font-bold mt-2 ink-error">A Recolher: {{ apuracaoPisCofins().cofinsRecolher | currency:'BRL' }}</div>
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

        <mat-tab label="IRPJ/CSLL">
          <div class="p-4">
            <div class="flex gap-3 mb-4 items-center">
              <mat-form-field appearance="outline" class="!mb-0 w-56">
                <mat-label>Atividade (presunção)</mat-label>
                <mat-select [(ngModel)]="atividade">
                  @for (a of atividades; track a.value) {
                    <mat-option [value]="a.value">{{ a.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button class="bear-btn bear-btn--primary" (click)="calcularIrpjCsll()">
                <span class="material-symbols-rounded">calculate</span> Calcular IRPJ/CSLL
              </button>
              <button class="bear-btn bear-btn--outline" (click)="consultarIrpjCsll()">
                <span class="material-symbols-rounded">search</span> Consultar
              </button>
            </div>
            <p class="text-label mb-4">Lucro Presumido — trimestre do mês selecionado.</p>
            @if (apuracaoIrpjCsll()) {
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div class="bear-card">
                  <div class="p-4">
                    <p class="text-label">Receita do Trimestre</p>
                    <p class="text-heading">{{ apuracaoIrpjCsll().receitaBruta | currency:'BRL' }}</p>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="p-4">
                    <p class="text-label">IRPJ (15% + adic.)</p>
                    <p class="text-heading">{{ apuracaoIrpjCsll().irpjTotal | currency:'BRL' }}</p>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="p-4">
                    <p class="text-label">CSLL (9%)</p>
                    <p class="text-heading">{{ apuracaoIrpjCsll().csll | currency:'BRL' }}</p>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="p-4">
                    <p class="text-label">Total a Recolher</p>
                    <p class="text-heading">{{ apuracaoIrpjCsll().totalRecolher | currency:'BRL' }}</p>
                  </div>
                </div>
              </div>
              <div class="bear-card">
                <div class="p-4">
                  <h3 class="text-heading" style="font-size: 1rem; margin-bottom: 0.75rem;">Detalhamento</h3>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>Base IRPJ: {{ apuracaoIrpjCsll().baseIrpj | currency:'BRL' }}</div>
                    <div>Base CSLL: {{ apuracaoIrpjCsll().baseCsll | currency:'BRL' }}</div>
                    <div>IRPJ (15%): {{ apuracaoIrpjCsll().irpj | currency:'BRL' }}</div>
                    <div>Adicional IRPJ (10%): {{ apuracaoIrpjCsll().adicionalIrpj | currency:'BRL' }}</div>
                  </div>
                </div>
              </div>
            } @else if (!loading()) {
              <div class="empty-state">
                <span class="material-symbols-rounded empty-state__icon">calculate</span>
                <p class="empty-state__title">Nenhuma apuração de IRPJ/CSLL</p>
                <p class="empty-state__description">Escolha a atividade e clique em "Calcular IRPJ/CSLL" para o trimestre selecionado.</p>
              </div>
            }
          </div>
        </mat-tab>

        <mat-tab label="Simples">
          <div class="p-4">
            <div class="flex gap-3 mb-4 items-center">
              <mat-form-field appearance="outline" class="!mb-0 w-40">
                <mat-label>Anexo</mat-label>
                <mat-select [(ngModel)]="anexo">
                  @for (a of anexos; track a.value) {
                    <mat-option [value]="a.value">{{ a.label }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <button class="bear-btn bear-btn--primary" (click)="calcularSimples()">
                <span class="material-symbols-rounded">calculate</span> Calcular DAS
              </button>
              <button class="bear-btn bear-btn--outline" (click)="consultarSimples()">
                <span class="material-symbols-rounded">search</span> Consultar
              </button>
            </div>
            @if (apuracaoSimples()) {
              @if (apuracaoSimples().foraDoSimples) {
                <div class="bear-card mb-4" style="border-left: 3px solid var(--color-error);">
                  <div class="p-4 text-sm">RBT12 acima de R$ 4,8 milhões — empresa fora do limite do Simples Nacional.</div>
                </div>
              }
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div class="bear-card">
                  <div class="p-4">
                    <p class="text-label">Receita do Mês</p>
                    <p class="text-heading">{{ apuracaoSimples().receitaMes | currency:'BRL' }}</p>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="p-4">
                    <p class="text-label">RBT12</p>
                    <p class="text-heading">{{ apuracaoSimples().rbt12 | currency:'BRL' }}</p>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="p-4">
                    <p class="text-label">Alíquota Efetiva</p>
                    <p class="text-heading">{{ apuracaoSimples().aliquotaEfetiva | number:'1.2-2' }}%</p>
                  </div>
                </div>
                <div class="bear-card">
                  <div class="p-4">
                    <p class="text-label">DAS a Recolher</p>
                    <p class="text-heading">{{ apuracaoSimples().valorDas | currency:'BRL' }}</p>
                  </div>
                </div>
              </div>
              <div class="bear-card">
                <div class="p-4">
                  <h3 class="text-heading" style="font-size: 1rem; margin-bottom: 0.75rem;">Detalhamento</h3>
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div>Anexo: {{ apuracaoSimples().anexo }}</div>
                    <div>Faixa: {{ apuracaoSimples().faixa }}ª</div>
                    <div>Alíquota Nominal: {{ apuracaoSimples().aliquotaNominal | number:'1.2-2' }}%</div>
                    <div>Alíquota Efetiva: {{ apuracaoSimples().aliquotaEfetiva | number:'1.2-2' }}%</div>
                  </div>
                </div>
              </div>
            } @else if (!loading()) {
              <div class="empty-state">
                <span class="material-symbols-rounded empty-state__icon">calculate</span>
                <p class="empty-state__title">Nenhuma apuração do Simples</p>
                <p class="empty-state__description">Escolha o anexo e clique em "Calcular DAS" para o mês selecionado.</p>
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
  apuracaoIpi = signal<any>(null);
  apuracaoPisCofins = signal<any>(null);
  apuracaoIrpjCsll = signal<any>(null);
  apuracaoSimples = signal<any>(null);
  ano = new Date().getFullYear();
  mes = new Date().getMonth() + 1;
  meses = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i] }));
  atividade: AtividadePresumido = 'COMERCIO';
  atividades: { value: AtividadePresumido; label: string }[] = [
    { value: 'COMERCIO', label: 'Comércio (8%)' },
    { value: 'INDUSTRIA', label: 'Indústria (8%)' },
    { value: 'SERVICOS', label: 'Serviços (32%)' },
    { value: 'TRANSPORTE_CARGA', label: 'Transporte de carga (8%)' },
    { value: 'TRANSPORTE_PASSAGEIROS', label: 'Transporte de passageiros (16%)' },
    { value: 'REVENDA_COMBUSTIVEL', label: 'Revenda de combustível (1,6%)' },
  ];
  anexo: AnexoSimples = 'I';
  anexos: { value: AnexoSimples; label: string }[] = [
    { value: 'I', label: 'Anexo I — Comércio' },
    { value: 'II', label: 'Anexo II — Indústria' },
    { value: 'III', label: 'Anexo III — Serviços' },
    { value: 'IV', label: 'Anexo IV — Serviços' },
    { value: 'V', label: 'Anexo V — Serviços' },
  ];

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

  calcularIpi() {
    this.loading.set(true);
    this.fiscalService.calcularApuracaoIpi(this.ano, this.mes).subscribe({
      next: data => { this.apuracaoIpi.set(data); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 }); }
    });
  }

  consultarIpi() {
    this.loading.set(true);
    this.fiscalService.getApuracaoIpi(this.ano, this.mes).subscribe({
      next: data => { this.apuracaoIpi.set(data); this.loading.set(false); },
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

  calcularIrpjCsll() {
    this.loading.set(true);
    this.fiscalService.calcularIrpjCsll(this.ano, this.mes, this.atividade).subscribe({
      next: data => { this.apuracaoIrpjCsll.set(data); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 }); }
    });
  }

  consultarIrpjCsll() {
    this.loading.set(true);
    this.fiscalService.getIrpjCsll(this.ano, this.mes).subscribe({
      next: data => { this.apuracaoIrpjCsll.set(data); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Sem apuração', 'Fechar', { duration: 3000 }); }
    });
  }

  calcularSimples() {
    this.loading.set(true);
    this.fiscalService.calcularSimples(this.ano, this.mes, this.anexo).subscribe({
      next: data => { this.apuracaoSimples.set(data); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Erro', 'Fechar', { duration: 5000 }); }
    });
  }

  consultarSimples() {
    this.loading.set(true);
    this.fiscalService.getSimples(this.ano, this.mes).subscribe({
      next: data => { this.apuracaoSimples.set(data); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Sem apuração', 'Fechar', { duration: 3000 }); }
    });
  }

  baixarSpedFiscal() {
    this.loading.set(true);
    this.fiscalService.gerarArquivoSpedFiscal(this.ano, this.mes).subscribe({
      next: txt => { this.baixarTxt(txt, `SPED-Fiscal-${this.ano}-${String(this.mes).padStart(2, '0')}.txt`); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Erro ao gerar SPED', 'Fechar', { duration: 5000 }); }
    });
  }

  baixarSpedContribuicoes() {
    this.loading.set(true);
    this.fiscalService.gerarArquivoSpedContribuicoes(this.ano, this.mes).subscribe({
      next: txt => { this.baixarTxt(txt, `EFD-Contribuicoes-${this.ano}-${String(this.mes).padStart(2, '0')}.txt`); this.loading.set(false); },
      error: err => { this.loading.set(false); this.snackBar.open(err.error?.message || 'Erro ao gerar EFD', 'Fechar', { duration: 5000 }); }
    });
  }

  private baixarTxt(conteudo: string, nome: string) {
    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  }
}
