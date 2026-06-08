import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

interface FaixaSimples {
  $id: string;
  anexo: string;
  faixa: number;
  receitaBrutaMin: number;
  receitaBrutaMax: number;
  aliquota: number;
  parcelaDeducao: number;
  vigencia: string;
}

interface ReparticaoItem { tributo: string; percentual: number; valor: number; }

interface ResultadoSimples {
  faixa: number;
  aliquotaNominal: number;
  aliquotaEfetiva: number;
  valorDas: number;
  reparticao: ReparticaoItem[];
}

@Component({
  selector: 'bear-simples',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTableModule, MatSnackBarModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Simples Nacional</h1>
          <p class="page-header__subtitle">Cálculo do DAS e repartição de tributos</p>
        </div>
      </div>

      <div class="bear-card mb-6">
        <div class="p-5 border-b border-[var(--border-subtle)]">
          <h2 class="text-heading">Calcular DAS</h2>
        </div>
        <div class="p-6">
          <form [formGroup]="form" (ngSubmit)="calcular()" class="grid grid-cols-2 gap-4">
            <mat-form-field appearance="outline"><mat-label>Competência (YYYY-MM)</mat-label><input matInput formControlName="competencia"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Anexo</mat-label>
              <mat-select formControlName="anexo">
                <mat-option value="ANEXO_I">Anexo I - Comércio</mat-option>
                <mat-option value="ANEXO_II">Anexo II - Indústria</mat-option>
                <mat-option value="ANEXO_III">Anexo III - Serviços (ISS)</mat-option>
                <mat-option value="ANEXO_IV">Anexo IV - Serviços (construção)</mat-option>
                <mat-option value="ANEXO_V">Anexo V - Serviços (fator R)</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Receita Bruta 12 meses (RBT12)</mat-label><input matInput type="number" formControlName="receitaBruta12Meses"></mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Receita Bruta do Mês</mat-label><input matInput type="number" formControlName="receitaBrutaMes"></mat-form-field>
            <div class="col-span-2">
              <button class="bear-btn bear-btn--primary" type="submit" [disabled]="form.invalid">
                <span class="material-symbols-rounded">calculate</span> Calcular DAS
              </button>
            </div>
          </form>
        </div>
      </div>

      @if (resultado()) {
        <div class="grid grid-cols-4 gap-4 mb-6 animate-fade-in-up">
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-blue-700">layers</span>
              </div>
              <div>
                <p class="text-label">Faixa</p>
                <p class="text-heading">{{ resultado().faixa }}</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-yellow-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-yellow-700">percent</span>
              </div>
              <div>
                <p class="text-label">Alíquota Nominal</p>
                <p class="text-heading">{{ resultado().aliquotaNominal }}%</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-green-700">functions</span>
              </div>
              <div>
                <p class="text-label">Alíquota Efetiva</p>
                <p class="text-heading">{{ resultado().aliquotaEfetiva | number:'1.2-4' }}%</p>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="flex items-center gap-4 p-5">
              <div class="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                <span class="material-symbols-rounded text-amber-700">payments</span>
              </div>
              <div>
                <p class="text-label">Valor DAS</p>
                <p class="text-heading">{{ resultado().valorDas | currency:'BRL' }}</p>
              </div>
            </div>
          </div>
        </div>
        @if (resultado().reparticao) {
          <div class="bear-card">
            <div class="p-5 border-b border-[var(--border-subtle)]">
              <h2 class="text-heading">Repartição dos Tributos</h2>
            </div>
            <div class="p-0">
              <table mat-table [dataSource]="resultado().reparticao" class="w-full">
                <ng-container matColumnDef="tributo"><th mat-header-cell *matHeaderCellDef class="!font-bold">Tributo</th><td mat-cell *matCellDef="let r">{{ r.tributo }}</td></ng-container>
                <ng-container matColumnDef="percentual"><th mat-header-cell *matHeaderCellDef class="!font-bold">Percentual</th><td mat-cell *matCellDef="let r">{{ r.percentual }}%</td></ng-container>
                <ng-container matColumnDef="valor"><th mat-header-cell *matHeaderCellDef class="!font-bold">Valor</th><td mat-cell *matCellDef="let r">{{ r.valor | currency:'BRL' }}</td></ng-container>
                <tr mat-header-row *matHeaderRowDef="['tributo','percentual','valor']"></tr>
                <tr mat-row *matRowDef="let row; columns: ['tributo','percentual','valor'];"></tr>
              </table>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class SimplesComponent {
  form!: FormGroup; resultado = signal<ResultadoSimples | null>(null);

  // Repartição aproximada dos tributos por anexo (percentual sobre o DAS).
  private readonly reparticaoPorAnexo: Record<string, ReparticaoItem[]> = {
    I: [
      { tributo: 'IRPJ', percentual: 5.5, valor: 0 }, { tributo: 'CSLL', percentual: 3.5, valor: 0 },
      { tributo: 'COFINS', percentual: 12.74, valor: 0 }, { tributo: 'PIS/PASEP', percentual: 2.76, valor: 0 },
      { tributo: 'CPP', percentual: 41.5, valor: 0 }, { tributo: 'ICMS', percentual: 34.0, valor: 0 },
    ],
    II: [
      { tributo: 'IRPJ', percentual: 5.5, valor: 0 }, { tributo: 'CSLL', percentual: 3.5, valor: 0 },
      { tributo: 'COFINS', percentual: 11.51, valor: 0 }, { tributo: 'PIS/PASEP', percentual: 2.49, valor: 0 },
      { tributo: 'CPP', percentual: 37.5, valor: 0 }, { tributo: 'IPI', percentual: 7.5, valor: 0 },
      { tributo: 'ICMS', percentual: 32.0, valor: 0 },
    ],
    III: [
      { tributo: 'IRPJ', percentual: 4.0, valor: 0 }, { tributo: 'CSLL', percentual: 3.5, valor: 0 },
      { tributo: 'COFINS', percentual: 12.82, valor: 0 }, { tributo: 'PIS/PASEP', percentual: 2.78, valor: 0 },
      { tributo: 'CPP', percentual: 43.4, valor: 0 }, { tributo: 'ISS', percentual: 33.5, valor: 0 },
    ],
    IV: [
      { tributo: 'IRPJ', percentual: 18.8, valor: 0 }, { tributo: 'CSLL', percentual: 15.2, valor: 0 },
      { tributo: 'COFINS', percentual: 17.67, valor: 0 }, { tributo: 'PIS/PASEP', percentual: 3.83, valor: 0 },
      { tributo: 'ISS', percentual: 44.5, valor: 0 },
    ],
    V: [
      { tributo: 'IRPJ', percentual: 25.0, valor: 0 }, { tributo: 'CSLL', percentual: 15.0, valor: 0 },
      { tributo: 'COFINS', percentual: 14.1, valor: 0 }, { tributo: 'PIS/PASEP', percentual: 3.05, valor: 0 },
      { tributo: 'CPP', percentual: 28.85, valor: 0 }, { tributo: 'ISS', percentual: 14.0, valor: 0 },
    ],
  };

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
  ) {
    this.form = this.fb.group({
      competencia: ['', Validators.required], anexo: ['ANEXO_I', Validators.required],
      receitaBruta12Meses: [null, [Validators.required, Validators.min(1)]],
      receitaBrutaMes: [null, [Validators.required, Validators.min(1)]],
    });
  }

  calcular() {
    if (!this.form.valid) return;
    const { competencia, anexo, receitaBruta12Meses, receitaBrutaMes } = this.form.value;
    const rbt12 = Number(receitaBruta12Meses);
    const receitaMes = Number(receitaBrutaMes);
    const anexoKey = String(anexo).replace('ANEXO_', ''); // ANEXO_I -> I

    const Q = this.appwrite.query;
    this.appwrite.listDocuments<FaixaSimples>('tabela_simples', [
      Q.limit(100), Q.orderDesc('$createdAt'), Q.equal('anexo', anexoKey),
    ]).subscribe({
      next: (faixas) => {
        const faixa = faixas.find(f => rbt12 >= f.receitaBrutaMin && rbt12 <= f.receitaBrutaMax)
          ?? faixas.slice().sort((a, b) => b.receitaBrutaMax - a.receitaBrutaMax)[0];
        if (!faixa) {
          this.snackBar.open('Faixa não encontrada para o anexo/RBT12', 'OK', { duration: 4000, panelClass: ['error-snackbar'] });
          return;
        }
        // Alíquota efetiva = (RBT12 * aliq - parcelaDeducao) / RBT12
        const aliqEfetivaFrac = ((rbt12 * (faixa.aliquota / 100)) - faixa.parcelaDeducao) / rbt12;
        const valorDas = receitaMes * aliqEfetivaFrac;
        const reparticao = (this.reparticaoPorAnexo[anexoKey] ?? []).map(r => ({
          ...r, valor: valorDas * (r.percentual / 100),
        }));
        const resultado: ResultadoSimples = {
          faixa: faixa.faixa,
          aliquotaNominal: faixa.aliquota,
          aliquotaEfetiva: aliqEfetivaFrac * 100,
          valorDas,
          reparticao,
        };
        this.resultado.set(resultado);
        this.persistirApuracao(competencia, rbt12, valorDas);
        this.snackBar.open('DAS calculado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: () => this.snackBar.open('Erro ao calcular', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  private persistirApuracao(competencia: string, baseCalculo: number, valorRecolher: number) {
    const data = {
      tipo: 'SIMPLES',
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
