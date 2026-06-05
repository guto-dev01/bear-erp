import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

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
  form!: FormGroup; resultado = signal<any>(null);
  private apiUrl = `${environment.apiUrl}/tributario/lucro-real`;

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {
    this.form = this.fb.group({
      periodo: ['', Validators.required], tipoPeriodo: ['TRIMESTRAL', Validators.required],
      lucroContabil: [null, Validators.required], saldoPrejuizoAnterior: [0], creditosPisCofins: [0],
    });
  }

  calcular() {
    if (this.form.valid) {
      this.http.post<any>(`${this.apiUrl}/calcular`, this.form.value).subscribe({
        next: (res) => { this.resultado.set(res); this.snackBar.open('LALUR calculado!', 'OK', { duration: 3000 }); },
        error: () => this.snackBar.open('Erro ao calcular', 'OK', { duration: 3000 }),
      });
    }
  }
}
