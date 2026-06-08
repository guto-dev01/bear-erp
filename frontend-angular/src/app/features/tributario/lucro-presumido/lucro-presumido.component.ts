import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface ResultadoPresumido {
  baseCalculoIrpj: number;
  irpjNormal: number;
  irpjAdicional: number;
  irpjTotal: number;
  csll: number;
  pisCumulativo: number;
  cofinsCumulativo: number;
  totalTributos: number;
}

@Component({
  selector: 'bear-lucro-presumido',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Lucro Presumido</h1>
          <p class="page-header__subtitle">Apuração trimestral de IRPJ, CSLL, PIS e COFINS</p>
        </div>
      </div>

      <div class="bear-card mb-6">
        <div class="p-5 border-b border-[var(--border-subtle)]">
          <h2 class="text-heading">Apuração Trimestral</h2>
        </div>
        <div class="p-6">
          <form [formGroup]="form" (ngSubmit)="calcular()" class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline"><mat-label>Trimestre (ex: 2024-T1)</mat-label><input matInput formControlName="trimestre"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Tipo Atividade</mat-label>
              <mat-select formControlName="tipoAtividade">
                <mat-option value="COMERCIO_INDUSTRIA">Comércio/Indústria (8%)</mat-option>
                <mat-option value="SERVICOS_GERAL">Serviços Geral (32%)</mat-option>
                <mat-option value="TRANSPORTE_CARGAS">Transporte Cargas (8%)</mat-option>
                <mat-option value="TRANSPORTE_PASSAGEIROS">Transporte Passageiros (16%)</mat-option>
                <mat-option value="SERVICOS_HOSPITALARES">Serviços Hospitalares (8%)</mat-option>
                <mat-option value="REVENDA_COMBUSTIVEIS">Revenda Combustíveis (1,6%)</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Receita Bruta Trimestre</mat-label><input matInput type="number" formControlName="receitaBrutaTrimestre"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Demais Receitas</mat-label><input matInput type="number" formControlName="demaisReceitas"></mat-form-field>
            <div class="col-span-2">
              <button class="bear-btn bear-btn--primary" type="submit" [disabled]="form.invalid">
                <span class="material-symbols-rounded">calculate</span> Calcular
              </button>
            </div>
          </form>
        </div>
      </div>

      @if (resultado(); as r) {
        <div class="grid grid-cols-2 gap-4 mb-6 animate-fade-in-up">
          <div class="bear-card">
            <div class="p-5 border-b border-[var(--border-subtle)]">
              <h2 class="text-heading">IRPJ</h2>
            </div>
            <div class="p-5">
              <div class="space-y-2">
                <div class="flex justify-between"><span class="text-label">Base de Cálculo</span><span>{{ r.baseCalculoIrpj | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">IRPJ Normal (15%)</span><span>{{ r.irpjNormal | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">IRPJ Adicional (10%)</span><span>{{ r.irpjAdicional | currency:'BRL' }}</span></div>
                <div class="flex justify-between pt-2 border-t"><span class="text-heading">Total IRPJ</span><span class="text-heading">{{ r.irpjTotal | currency:'BRL' }}</span></div>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="p-5 border-b border-[var(--border-subtle)]">
              <h2 class="text-heading">CSLL / PIS / COFINS</h2>
            </div>
            <div class="p-5">
              <div class="space-y-2">
                <div class="flex justify-between"><span class="text-label">CSLL (9%)</span><span>{{ r.csll | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">PIS (0,65%)</span><span>{{ r.pisCumulativo | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">COFINS (3%)</span><span>{{ r.cofinsCumulativo | currency:'BRL' }}</span></div>
              </div>
            </div>
          </div>
        </div>
        <div class="bear-card">
          <div class="flex items-center justify-center gap-4 p-6">
            <div class="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
              <span class="material-symbols-rounded text-amber-700">account_balance</span>
            </div>
            <div class="text-center">
              <p class="text-label">Total de Tributos</p>
              <p class="text-3xl font-bold" style="color: var(--brand-primary);">{{ r.totalTributos | currency:'BRL' }}</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class LucroPresumidoComponent {
  form!: FormGroup; resultado = signal<ResultadoPresumido | null>(null);

  // Percentual de presunção do IRPJ por tipo de atividade.
  private readonly presuncaoIrpj: Record<string, number> = {
    COMERCIO_INDUSTRIA: 0.08, SERVICOS_GERAL: 0.32, TRANSPORTE_CARGAS: 0.08,
    TRANSPORTE_PASSAGEIROS: 0.16, SERVICOS_HOSPITALARES: 0.08, REVENDA_COMBUSTIVEIS: 0.016,
  };
  // Percentual de presunção da CSLL por tipo de atividade.
  private readonly presuncaoCsll: Record<string, number> = {
    COMERCIO_INDUSTRIA: 0.12, SERVICOS_GERAL: 0.32, TRANSPORTE_CARGAS: 0.12,
    TRANSPORTE_PASSAGEIROS: 0.12, SERVICOS_HOSPITALARES: 0.12, REVENDA_COMBUSTIVEIS: 0.12,
  };

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      trimestre: ['', Validators.required], tipoAtividade: ['COMERCIO_INDUSTRIA', Validators.required],
      receitaBrutaTrimestre: [null, [Validators.required, Validators.min(1)]], demaisReceitas: [0],
    });
  }

  calcular() {
    if (!this.form.valid) return;
    const { trimestre, tipoAtividade, receitaBrutaTrimestre, demaisReceitas } = this.form.value;
    const receita = Number(receitaBrutaTrimestre);
    const demais = Number(demaisReceitas) || 0;

    const presIrpj = this.presuncaoIrpj[tipoAtividade] ?? 0.32;
    const presCsll = this.presuncaoCsll[tipoAtividade] ?? 0.32;

    // IRPJ: base = receita * presunção + demais receitas; 15% normal + 10% adicional sobre excedente de R$ 60.000/trimestre.
    const baseCalculoIrpj = receita * presIrpj + demais;
    const irpjNormal = baseCalculoIrpj * 0.15;
    const irpjAdicional = Math.max(0, baseCalculoIrpj - 60000) * 0.10;
    const irpjTotal = irpjNormal + irpjAdicional;

    // CSLL: base = receita * presunção CSLL + demais; alíquota 9%.
    const baseCsll = receita * presCsll + demais;
    const csll = baseCsll * 0.09;

    // PIS/COFINS cumulativos sobre a receita bruta.
    const pisCumulativo = receita * 0.0065;
    const cofinsCumulativo = receita * 0.03;

    const totalTributos = irpjTotal + csll + pisCumulativo + cofinsCumulativo;

    const resultado: ResultadoPresumido = {
      baseCalculoIrpj, irpjNormal, irpjAdicional, irpjTotal,
      csll, pisCumulativo, cofinsCumulativo, totalTributos,
    };
    this.resultado.set(resultado);
    this.persistirApuracao(trimestre, baseCalculoIrpj, totalTributos);
    this.snackBar.open('Apuração calculada!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private persistirApuracao(competencia: string, baseCalculo: number, valorRecolher: number) {
    const data = {
      tipo: 'LUCRO_PRESUMIDO',
      competencia,
      baseCalculo,
      valorApurado: valorRecolher,
      valorRecolher,
      status: 'APURADO',
      empresaId: this.auth.empresaId() || '',
      tenantId: this.auth.tenantId() || 'default',
    };
    this.appwrite.createDocument('apuracoes_fiscais', data).subscribe({ next: () => {}, error: () => {} });
  }
}
