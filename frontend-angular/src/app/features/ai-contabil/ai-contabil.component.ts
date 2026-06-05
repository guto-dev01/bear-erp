import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'bear-ai-contabil',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTabsModule, MatSnackBarModule],
  template: `
    <div class="page-container animate-fade-in-up">
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-header__title">AI Contábil</h1>
          <p class="page-header__subtitle">Inteligência artificial para suporte contábil e fiscal</p>
        </div>
        <div class="page-header__actions">
          <span class="badge badge--success">
            <span class="badge__dot"></span>
            IA Ativa
          </span>
        </div>
      </div>

      <!-- Capability Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #eef2ff;">
            <span class="material-symbols-rounded" style="color: #4f46e5;">smart_toy</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Consultas Respondidas</p>
            <p class="text-2xl font-bold" style="color: var(--text-primary);">—</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #ecfdf5;">
            <span class="material-symbols-rounded" style="color: #059669;">auto_fix_high</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Classificações Automáticas</p>
            <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ pendentes().length }}</p>
          </div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background: #fffbeb;">
            <span class="material-symbols-rounded" style="color: #d97706;">pending_actions</span>
          </div>
          <div>
            <p class="text-xs font-medium" style="color: var(--text-secondary);">Pendentes de Revisão</p>
            <p class="text-2xl font-bold" style="color: var(--text-primary);">{{ pendentes().length }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <mat-tab-group>
        <!-- Consulta IA -->
        <mat-tab label="Consulta Inteligente">
          <div class="pt-6 flex flex-col gap-6">
            <!-- Form Card -->
            <div class="bear-card p-6">
              <div class="flex items-center gap-3 mb-5">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: #eef2ff;">
                  <span class="material-symbols-rounded" style="color: #4f46e5;">smart_toy</span>
                </div>
                <div>
                  <h3 class="text-heading text-base">Fazer uma Consulta</h3>
                  <p class="text-xs" style="color: var(--text-secondary);">Descreva sua dúvida contábil ou fiscal</p>
                </div>
              </div>
              <form [formGroup]="consultaForm" (ngSubmit)="consultar()" class="flex flex-col gap-4">
                <mat-form-field appearance="outline">
                  <mat-label>Tipo de Consulta</mat-label>
                  <mat-select formControlName="tipo">
                    <mat-option value="CLASSIFICACAO_CONTABIL">Classificação Contábil</mat-option>
                    <mat-option value="ANALISE_FISCAL">Análise Fiscal</mat-option>
                    <mat-option value="ANALISE_TRIBUTARIA">Análise Tributária</mat-option>
                    <mat-option value="PREVISAO_FLUXO_CAIXA">Previsão Fluxo de Caixa</mat-option>
                    <mat-option value="DETECCAO_ANOMALIAS">Detecção de Anomalias</mat-option>
                    <mat-option value="CONCILIACAO_AUTOMATICA">Conciliação Automática</mat-option>
                    <mat-option value="CONSULTORIA_GERAL">Consultoria Geral</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Sua pergunta</mat-label>
                  <textarea matInput formControlName="pergunta" rows="3"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Contexto adicional (opcional)</mat-label>
                  <textarea matInput formControlName="contexto" rows="2"></textarea>
                </mat-form-field>
                <div>
                  <button class="bear-btn bear-btn--primary" type="submit"
                          [disabled]="consultaForm.invalid || processando()"
                          style="padding: 0.625rem 1.25rem;">
                    @if (processando()) {
                      <div class="login__spinner" style="width:16px;height:16px;border:2px solid var(--surface-3);border-top-color:white;margin-right:8px;display:inline-block;vertical-align:middle;"></div>
                      Processando...
                    } @else {
                      <span class="material-symbols-rounded text-base mr-1.5">smart_toy</span>
                      Consultar IA
                    }
                  </button>
                </div>
              </form>
            </div>

            <!-- IA Response -->
            @if (respostaIA()) {
              <div class="bear-card p-6" style="border-left: 4px solid var(--brand-primary);">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: #eef2ff;">
                    <span class="material-symbols-rounded" style="color: #4f46e5;">smart_toy</span>
                  </div>
                  <h3 class="text-heading text-base">Resposta da IA</h3>
                </div>
                <p class="text-sm leading-relaxed whitespace-pre-wrap mb-4" style="color: var(--text-primary);">{{ respostaIA().resposta }}</p>
                <div class="flex items-center gap-4 pt-4 border-t" style="border-color: var(--border-subtle);">
                  <div class="flex items-center gap-2">
                    <span class="text-label text-xs">Confiança:</span>
                    <span class="badge" [ngClass]="{
                      'badge--success': respostaIA().confianca >= 0.8,
                      'badge--warning': respostaIA().confianca >= 0.5 && respostaIA().confianca < 0.8,
                      'badge--error': respostaIA().confianca < 0.5
                    }">{{ (respostaIA().confianca * 100) | number:'1.0-0' }}%</span>
                  </div>
                  <span class="text-xs" style="color: var(--text-secondary);">
                    <span class="material-symbols-rounded text-xs mr-0.5">timer</span>
                    {{ respostaIA().tempoProcessamentoMs }}ms
                  </span>
                </div>
              </div>
            }
          </div>
        </mat-tab>

        <!-- Classificação Automática -->
        <mat-tab label="Classificação Automática">
          <div class="pt-6 flex flex-col gap-6">
            <!-- Classify Form -->
            <div class="bear-card p-6">
              <div class="flex items-center gap-3 mb-5">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: #ecfdf5;">
                  <span class="material-symbols-rounded" style="color: #059669;">auto_fix_high</span>
                </div>
                <div>
                  <h3 class="text-heading text-base">Classificar Lançamento</h3>
                  <p class="text-xs" style="color: var(--text-secondary);">A IA sugere o débito e crédito automaticamente</p>
                </div>
              </div>
              <form [formGroup]="classificacaoForm" (ngSubmit)="classificar()" class="flex gap-4 items-end">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Descrição do lançamento</mat-label>
                  <input matInput formControlName="descricao" placeholder="Ex: Pagamento de aluguel escritório">
                </mat-form-field>
                <button class="bear-btn bear-btn--primary" type="submit"
                        [disabled]="classificacaoForm.invalid"
                        style="padding: 0.625rem 1.25rem; margin-bottom: 22px;">
                  <span class="material-symbols-rounded text-base mr-1.5">auto_fix_high</span>
                  Classificar
                </button>
              </form>
            </div>

            <!-- Classification Result -->
            @if (classificacao()) {
              <div class="bear-card p-6" style="border-left: 4px solid #059669;">
                <div class="flex items-center gap-3 mb-5">
                  <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background: #ecfdf5;">
                    <span class="material-symbols-rounded" style="color: #059669;">check_circle</span>
                  </div>
                  <h3 class="text-heading text-base">Sugestão de Classificação</h3>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-5">
                  <div class="p-4 rounded-xl" style="background: var(--surface-1);">
                    <p class="text-label text-xs mb-2">Conta Débito</p>
                    <p class="text-lg font-bold" style="color: var(--text-primary);">{{ classificacao().contaDebitoSugerida }}</p>
                    <p class="text-sm" style="color: var(--text-secondary);">{{ classificacao().contaDebitoNome }}</p>
                  </div>
                  <div class="p-4 rounded-xl" style="background: var(--surface-1);">
                    <p class="text-label text-xs mb-2">Conta Crédito</p>
                    <p class="text-lg font-bold" style="color: var(--text-primary);">{{ classificacao().contaCreditoSugerida }}</p>
                    <p class="text-sm" style="color: var(--text-secondary);">{{ classificacao().contaCreditoNome }}</p>
                  </div>
                </div>
                <div class="flex items-center justify-between pt-4 border-t" style="border-color: var(--border-subtle);">
                  <div class="flex items-center gap-2">
                    <span class="text-label text-xs">Confiança:</span>
                    <span class="badge" [ngClass]="{
                      'badge--success': classificacao().confianca >= 0.8,
                      'badge--warning': classificacao().confianca >= 0.5,
                      'badge--error': classificacao().confianca < 0.5
                    }">{{ (classificacao().confianca * 100) | number:'1.0-0' }}%</span>
                  </div>
                  <div class="flex gap-3">
                    <button class="bear-btn bear-btn--primary" style="padding: 0.5rem 1rem; font-size: 0.8125rem;"
                            (click)="aceitarClassificacao(classificacao().id)">
                      <span class="material-symbols-rounded text-base mr-1.5">check</span>
                      Aceitar
                    </button>
                    <button class="bear-btn bear-btn--outline" style="padding: 0.5rem 1rem; font-size: 0.8125rem; color: #dc2626; border-color: #dc2626;"
                            (click)="rejeitarClassificacao(classificacao().id)">
                      <span class="material-symbols-rounded text-base mr-1.5">close</span>
                      Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            }

            <!-- Pending Classifications -->
            @if (pendentes().length > 0) {
              <div class="bear-card">
                <div class="flex items-center justify-between px-5 py-4 border-b" style="border-color: var(--border-subtle);">
                  <h3 class="text-heading text-base">Classificações Pendentes</h3>
                  <span class="badge badge--warning">{{ pendentes().length }} pendente(s)</span>
                </div>
                <div class="overflow-x-auto">
                  <table mat-table [dataSource]="pendentes()" class="w-full">
                    <ng-container matColumnDef="descricao">
                      <th mat-header-cell *matHeaderCellDef class="text-label">Descrição</th>
                      <td mat-cell *matCellDef="let c">{{ c.descricaoOriginal }}</td>
                    </ng-container>
                    <ng-container matColumnDef="debito">
                      <th mat-header-cell *matHeaderCellDef class="text-label">Débito</th>
                      <td mat-cell *matCellDef="let c" class="font-medium">{{ c.contaDebitoSugerida }} - {{ c.contaDebitoNome }}</td>
                    </ng-container>
                    <ng-container matColumnDef="credito">
                      <th mat-header-cell *matHeaderCellDef class="text-label">Crédito</th>
                      <td mat-cell *matCellDef="let c" class="font-medium">{{ c.contaCreditoSugerida }} - {{ c.contaCreditoNome }}</td>
                    </ng-container>
                    <ng-container matColumnDef="confianca">
                      <th mat-header-cell *matHeaderCellDef class="text-label">Confiança</th>
                      <td mat-cell *matCellDef="let c">
                        <span class="badge" [ngClass]="{
                          'badge--success': c.confianca >= 0.8,
                          'badge--warning': c.confianca >= 0.5 && c.confianca < 0.8,
                          'badge--error': c.confianca < 0.5
                        }">{{ (c.confianca * 100) | number:'1.0-0' }}%</span>
                      </td>
                    </ng-container>
                    <ng-container matColumnDef="acoes">
                      <th mat-header-cell *matHeaderCellDef class="text-label">Ações</th>
                      <td mat-cell *matCellDef="let c">
                        <div class="flex gap-1">
                          <button class="bear-btn bear-btn--ghost p-2" title="Aceitar" (click)="aceitarClassificacao(c.id)">
                            <span class="material-symbols-rounded text-base" style="color: #059669;">check_circle</span>
                          </button>
                          <button class="bear-btn bear-btn--ghost p-2" title="Rejeitar" (click)="rejeitarClassificacao(c.id)">
                            <span class="material-symbols-rounded text-base" style="color: #dc2626;">cancel</span>
                          </button>
                        </div>
                      </td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="pendentesColumns"></tr>
                    <tr mat-row *matRowDef="let row; columns: pendentesColumns;"></tr>
                  </table>
                </div>
              </div>
            }
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
})
export class AiContabilComponent implements OnInit {
  respostaIA = signal<any>(null); classificacao = signal<any>(null);
  pendentes = signal<any[]>([]); processando = signal(false);
  pendentesColumns = ['descricao', 'debito', 'credito', 'confianca', 'acoes'];
  consultaForm!: FormGroup; classificacaoForm!: FormGroup;
  private apiUrl = `${environment.apiUrl}/ai-contabil`;

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.consultaForm = this.fb.group({
      tipo: ['CONSULTORIA_GERAL', Validators.required],
      pergunta: ['', Validators.required], contexto: [''],
    });
    this.classificacaoForm = this.fb.group({ descricao: ['', Validators.required] });
    this.carregarPendentes();
  }

  consultar() {
    if (this.consultaForm.valid) {
      this.processando.set(true);
      this.http.post<any>(`${this.apiUrl}/consultar`, this.consultaForm.value).subscribe({
        next: (res) => { this.respostaIA.set(res); this.processando.set(false); },
        error: () => { this.processando.set(false); this.snackBar.open('Erro ao consultar IA', 'OK', { duration: 3000 }); },
      });
    }
  }

  classificar() {
    if (this.classificacaoForm.valid) {
      this.http.post<any>(`${this.apiUrl}/classificar`, this.classificacaoForm.value).subscribe({
        next: (res) => { this.classificacao.set(res); this.snackBar.open('Classificação sugerida!', 'OK', { duration: 3000 }); },
        error: () => this.snackBar.open('Erro ao classificar', 'OK', { duration: 3000 }),
      });
    }
  }

  carregarPendentes() {
    this.http.get<any[]>(`${this.apiUrl}/classificacoes/pendentes`).subscribe({
      next: (res) => this.pendentes.set(res || []),
    });
  }

  aceitarClassificacao(id: string) {
    this.http.post<any>(`${this.apiUrl}/classificacoes/${id}/aceitar`, {}).subscribe({
      next: () => { this.snackBar.open('Classificação aceita!', 'OK', { duration: 2000 }); this.classificacao.set(null); this.carregarPendentes(); },
    });
  }

  rejeitarClassificacao(id: string) {
    this.http.post<any>(`${this.apiUrl}/classificacoes/${id}/rejeitar`, {}).subscribe({
      next: () => { this.snackBar.open('Classificação rejeitada', 'OK', { duration: 2000 }); this.classificacao.set(null); this.carregarPendentes(); },
    });
  }
}
