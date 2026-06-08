import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface ResultadoReal {
  lucroContabil: number;
  adicoes: number;
  exclusoes: number;
  compensacoes: number;
  lucroReal: number;
  irpjNormal: number;
  irpjAdicional: number;
  irpjTotal: number;
  csll: number;
  pisNaoCumulativo: number;
  cofinsNaoCumulativo: number;
  creditosPisCofins: number;
  pisAPagar: number;
  cofinsAPagar: number;
  totalTributos: number;
}

@Component({
  selector: 'bear-lucro-real',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Lucro Real - LALUR</h1>
          <p class="page-header__subtitle">Apuração de IRPJ, CSLL e PIS/COFINS não-cumulativo</p>
        </div>
      </div>

      <div class="bear-card mb-6">
        <div class="p-5 border-b border-[var(--border-subtle)]">
          <h2 class="text-heading">Apuração IRPJ/CSLL</h2>
        </div>
        <div class="p-6">
          <form [formGroup]="form" (ngSubmit)="calcular()" class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline"><mat-label>Período</mat-label><input matInput formControlName="periodo" placeholder="2024-01 ou 2024-T1"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Tipo Período</mat-label>
              <mat-select formControlName="tipoPeriodo">
                <mat-option value="MENSAL">Mensal</mat-option><mat-option value="TRIMESTRAL">Trimestral</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Lucro Contábil</mat-label><input matInput type="number" formControlName="lucroContabil"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Saldo Prejuízo Fiscal Anterior</mat-label><input matInput type="number" formControlName="saldoPrejuizoAnterior"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Créditos PIS/COFINS</mat-label><input matInput type="number" formControlName="creditosPisCofins"></mat-form-field>
            <div></div>
            <div class="col-span-2">
              <button class="bear-btn bear-btn--primary" type="submit" [disabled]="form.invalid">
                <span class="material-symbols-rounded">calculate</span> Calcular LALUR
              </button>
            </div>
          </form>
        </div>
      </div>

      @if (resultado()) {
        <div class="grid grid-cols-3 gap-4 mb-6 animate-fade-in-up">
          <div class="bear-card">
            <div class="p-5 border-b border-[var(--border-subtle)]">
              <h2 class="text-heading">LALUR - Parte A</h2>
            </div>
            <div class="p-5">
              <div class="space-y-2">
                <div class="flex justify-between"><span class="text-label">Lucro Contábil</span><span>{{ resultado().lucroContabil | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">Adições</span><span>{{ resultado().adicoes | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">Exclusões</span><span>{{ resultado().exclusoes | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">Compensações</span><span>{{ resultado().compensacoes | currency:'BRL' }}</span></div>
                <div class="flex justify-between pt-2 border-t"><span class="text-heading">Lucro Real</span><span class="text-heading">{{ resultado().lucroReal | currency:'BRL' }}</span></div>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="p-5 border-b border-[var(--border-subtle)]">
              <h2 class="text-heading">IRPJ / CSLL</h2>
            </div>
            <div class="p-5">
              <div class="space-y-2">
                <div class="flex justify-between"><span class="text-label">IRPJ Normal (15%)</span><span>{{ resultado().irpjNormal | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">IRPJ Adicional (10%)</span><span>{{ resultado().irpjAdicional | currency:'BRL' }}</span></div>
                <div class="flex justify-between pt-2 border-t"><span class="text-heading">Total IRPJ</span><span class="text-heading">{{ resultado().irpjTotal | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">CSLL (9%)</span><span>{{ resultado().csll | currency:'BRL' }}</span></div>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="p-5 border-b border-[var(--border-subtle)]">
              <h2 class="text-heading">PIS/COFINS Não-Cumulativo</h2>
            </div>
            <div class="p-5">
              <div class="space-y-2">
                <div class="flex justify-between"><span class="text-label">PIS (1,65%)</span><span>{{ resultado().pisNaoCumulativo | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">COFINS (7,6%)</span><span>{{ resultado().cofinsNaoCumulativo | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">Créditos</span><span>{{ resultado().creditosPisCofins | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">PIS a Pagar</span><span>{{ resultado().pisAPagar | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">COFINS a Pagar</span><span>{{ resultado().cofinsAPagar | currency:'BRL' }}</span></div>
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
              <p class="text-3xl font-bold" style="color: var(--brand-primary);">{{ resultado().totalTributos | currency:'BRL' }}</p>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class LucroRealComponent {
  form!: FormGroup; resultado = signal<ResultadoReal | null>(null);

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      periodo: ['', Validators.required], tipoPeriodo: ['TRIMESTRAL', Validators.required],
      lucroContabil: [null, Validators.required], saldoPrejuizoAnterior: [0], creditosPisCofins: [0],
    });
  }

  calcular() {
    if (!this.form.valid) return;
    const { periodo, tipoPeriodo, lucroContabil, saldoPrejuizoAnterior, creditosPisCofins } = this.form.value;
    const lucro = Number(lucroContabil);
    const prejuizoAnterior = Number(saldoPrejuizoAnterior) || 0;
    const creditos = Number(creditosPisCofins) || 0;

    // LALUR Parte A — sem lançamentos extras informados, adições/exclusões = 0.
    const adicoes = 0;
    const exclusoes = 0;
    const lucroAjustado = lucro + adicoes - exclusoes;
    // Compensação de prejuízo fiscal limitada a 30% do lucro ajustado.
    const compensacoes = lucroAjustado > 0
      ? Math.min(prejuizoAnterior, lucroAjustado * 0.30)
      : 0;
    const lucroReal = lucroAjustado - compensacoes;

    // Adicional de 10% sobre o que exceder o limite do período (R$ 20.000/mês ou R$ 60.000/trimestre).
    const limiteAdicional = tipoPeriodo === 'MENSAL' ? 20000 : 60000;
    const baseTributavel = Math.max(0, lucroReal);
    const irpjNormal = baseTributavel * 0.15;
    const irpjAdicional = Math.max(0, baseTributavel - limiteAdicional) * 0.10;
    const irpjTotal = irpjNormal + irpjAdicional;
    const csll = baseTributavel * 0.09;

    // PIS/COFINS não-cumulativo — débitos sobre o lucro contábil (proxy de receita), abatidos os créditos informados.
    const pisNaoCumulativo = lucro * 0.0165;
    const cofinsNaoCumulativo = lucro * 0.076;
    const proporcaoPis = 0.0165 / (0.0165 + 0.076);
    const pisAPagar = Math.max(0, pisNaoCumulativo - creditos * proporcaoPis);
    const cofinsAPagar = Math.max(0, cofinsNaoCumulativo - creditos * (1 - proporcaoPis));

    const totalTributos = irpjTotal + csll + pisAPagar + cofinsAPagar;

    const resultado: ResultadoReal = {
      lucroContabil: lucro, adicoes, exclusoes, compensacoes, lucroReal,
      irpjNormal, irpjAdicional, irpjTotal, csll,
      pisNaoCumulativo, cofinsNaoCumulativo, creditosPisCofins: creditos,
      pisAPagar, cofinsAPagar, totalTributos,
    };
    this.resultado.set(resultado);
    this.persistirApuracao(periodo, lucroReal, totalTributos);
    this.snackBar.open('LALUR calculado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
  }

  private persistirApuracao(competencia: string, baseCalculo: number, valorRecolher: number) {
    const data = {
      tipo: 'LUCRO_REAL',
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
