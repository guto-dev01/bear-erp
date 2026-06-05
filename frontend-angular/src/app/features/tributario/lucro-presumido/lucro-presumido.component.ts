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

      @if (resultado()) {
        <div class="grid grid-cols-2 gap-4 mb-6 animate-fade-in-up">
          <div class="bear-card">
            <div class="p-5 border-b border-[var(--border-subtle)]">
              <h2 class="text-heading">IRPJ</h2>
            </div>
            <div class="p-5">
              <div class="space-y-2">
                <div class="flex justify-between"><span class="text-label">Base de Cálculo</span><span>{{ resultado().baseCalculoIrpj | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">IRPJ Normal (15%)</span><span>{{ resultado().irpjNormal | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">IRPJ Adicional (10%)</span><span>{{ resultado().irpjAdicional | currency:'BRL' }}</span></div>
                <div class="flex justify-between pt-2 border-t"><span class="text-heading">Total IRPJ</span><span class="text-heading">{{ resultado().irpjTotal | currency:'BRL' }}</span></div>
              </div>
            </div>
          </div>
          <div class="bear-card">
            <div class="p-5 border-b border-[var(--border-subtle)]">
              <h2 class="text-heading">CSLL / PIS / COFINS</h2>
            </div>
            <div class="p-5">
              <div class="space-y-2">
                <div class="flex justify-between"><span class="text-label">CSLL (9%)</span><span>{{ resultado().csll | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">PIS (0,65%)</span><span>{{ resultado().pisCumulativo | currency:'BRL' }}</span></div>
                <div class="flex justify-between"><span class="text-label">COFINS (3%)</span><span>{{ resultado().cofinsCumulativo | currency:'BRL' }}</span></div>
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
export class LucroPresumidoComponent {
  form!: FormGroup; resultado = signal<any>(null);
  private apiUrl = `${environment.apiUrl}/tributario/lucro-presumido`;

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {
    this.form = this.fb.group({
      trimestre: ['', Validators.required], tipoAtividade: ['COMERCIO_INDUSTRIA', Validators.required],
      receitaBrutaTrimestre: [null, [Validators.required, Validators.min(1)]], demaisReceitas: [0],
    });
  }

  calcular() {
    if (this.form.valid) {
      this.http.post<any>(`${this.apiUrl}/calcular`, this.form.value).subscribe({
        next: (res) => { this.resultado.set(res); this.snackBar.open('Apuração calculada!', 'OK', { duration: 3000 }); },
        error: () => this.snackBar.open('Erro ao calcular', 'OK', { duration: 3000 }),
      });
    }
  }
}
