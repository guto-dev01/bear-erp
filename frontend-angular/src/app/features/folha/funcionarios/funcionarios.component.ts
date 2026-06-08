import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@env/environment';

@Component({
  selector: 'bear-funcionarios',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatTableModule, MatPaginatorModule,
    MatTooltipModule, MatSnackBarModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h1 class="page-header__title">Funcionários</h1>
          <p class="page-header__subtitle">Cadastro e gestão da folha de pessoal</p>
        </div>
        <div class="page-header__actions">
          <button class="bear-btn bear-btn--primary" style="padding:0.5rem 1.25rem;font-size:0.875rem;" (click)="showForm.set(true); editingId.set(null); resetForm()">
            <span class="material-symbols-rounded text-lg mr-1.5">person_add</span> Novo Funcionário
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#ECEBFB"><span class="material-symbols-rounded" style="color:#007AFF">groups</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Total</p><p class="text-2xl font-bold" style="color:var(--text-primary)">{{ totalElements() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E9FAEF"><span class="material-symbols-rounded" style="color:#34C759">badge</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Ativos</p><p class="text-2xl font-bold" style="color:#34C759">{{ countAtivos() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#FFF4E5"><span class="material-symbols-rounded" style="color:#FF9500">beach_access</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Férias</p><p class="text-2xl font-bold" style="color:#FF9500">{{ countFerias() }}</p></div>
        </div>
        <div class="bear-card p-4 flex items-center gap-4">
          <div class="w-11 h-11 rounded-xl flex items-center justify-center" style="background:#E6F8FB"><span class="material-symbols-rounded" style="color:#30B0C7">payments</span></div>
          <div><p class="text-xs font-medium" style="color:var(--text-secondary)">Folha Total</p><p class="text-xl font-bold" style="color:#30B0C7">{{ totalFolha() | currency:'BRL' }}</p></div>
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
          <table mat-table [dataSource]="funcionarios()" class="w-full">
            <ng-container matColumnDef="matricula"><th mat-header-cell *matHeaderCellDef>Matrícula</th><td mat-cell *matCellDef="let f" class="font-mono text-xs">{{ f.matricula }}</td></ng-container>
            <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Nome</th><td mat-cell *matCellDef="let f"><span class="font-medium">{{ f.nome }}</span></td></ng-container>
            <ng-container matColumnDef="cpf"><th mat-header-cell *matHeaderCellDef>CPF</th><td mat-cell *matCellDef="let f" class="font-mono text-xs">{{ f.cpf }}</td></ng-container>
            <ng-container matColumnDef="cargo"><th mat-header-cell *matHeaderCellDef>Cargo</th><td mat-cell *matCellDef="let f">{{ f.cargo }}</td></ng-container>
            <ng-container matColumnDef="departamento"><th mat-header-cell *matHeaderCellDef>Departamento</th><td mat-cell *matCellDef="let f">{{ f.departamento }}</td></ng-container>
            <ng-container matColumnDef="salario"><th mat-header-cell *matHeaderCellDef>Salário</th><td mat-cell *matCellDef="let f" class="font-semibold">{{ f.salarioBase | currency:'BRL' }}</td></ng-container>
            <ng-container matColumnDef="status"><th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let f">
                <span class="badge" [ngClass]="getStatusBadge(f.status)">
                  <span class="badge__dot"></span>{{ f.status }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acoes"><th mat-header-cell *matHeaderCellDef class="w-24">Ações</th>
              <td mat-cell *matCellDef="let f">
                <div class="flex gap-0.5">
                  <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;" matTooltip="Editar" (click)="editar(f)">
                    <span class="material-symbols-rounded text-sm">edit</span>
                  </button>
                  @if (f.status === 'ATIVO') {
                    <button class="bear-btn bear-btn--ghost" style="padding:0.25rem 0.5rem;font-size:0.75rem;color:#FF3B30;" matTooltip="Demitir" (click)="demitir(f.id)">
                      <span class="material-symbols-rounded text-sm">person_remove</span>
                    </button>
                  }
                </div>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          @if (!loading() && funcionarios().length === 0) {
            <div class="empty-state">
              <div class="empty-state__icon"><span class="material-symbols-rounded">groups</span></div>
              <h3 class="empty-state__title">Nenhum funcionário cadastrado</h3>
              <p class="empty-state__description">Adicione o primeiro funcionário</p>
            </div>
          }

          <mat-paginator [length]="totalElements()" [pageSize]="20" (page)="onPage($event)" [hidePageSize]="true"></mat-paginator>
        </div>
      }

      <!-- Form -->
      @if (showForm()) {
        <div class="bear-card p-6 max-w-4xl animate-fade-in-up">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-heading text-lg">{{ editingId() ? 'Editar' : 'Novo' }} Funcionário</h2>
            <button class="bear-btn bear-btn--ghost" style="padding:0.375rem" (click)="showForm.set(false)">
              <span class="material-symbols-rounded">close</span>
            </button>
          </div>
          <form [formGroup]="form" (ngSubmit)="salvar()">
            <p class="text-label mb-3">Dados Pessoais</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CPF</mat-label><input matInput formControlName="cpf"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>PIS</mat-label><input matInput formControlName="pis"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>RG</mat-label><input matInput formControlName="rg"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CTPS</mat-label><input matInput formControlName="ctps"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Data Nascimento</mat-label><input matInput type="date" formControlName="dataNascimento"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Sexo</mat-label>
                <mat-select formControlName="sexo"><mat-option value="MASCULINO">Masculino</mat-option><mat-option value="FEMININO">Feminino</mat-option></mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Estado Civil</mat-label>
                <mat-select formControlName="estadoCivil"><mat-option value="SOLTEIRO">Solteiro</mat-option><mat-option value="CASADO">Casado</mat-option><mat-option value="DIVORCIADO">Divorciado</mat-option><mat-option value="VIUVO">Viúvo</mat-option></mat-select>
              </mat-form-field>
            </div>

            <p class="text-label mb-3">Endereço</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <mat-form-field appearance="outline"><mat-label>CEP</mat-label><input matInput formControlName="cep"></mat-form-field>
              <mat-form-field appearance="outline" class="md:col-span-2"><mat-label>Logradouro</mat-label><input matInput formControlName="logradouro"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Número</mat-label><input matInput formControlName="numero"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Bairro</mat-label><input matInput formControlName="bairro"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Cidade</mat-label><input matInput formControlName="cidade"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>UF</mat-label><input matInput formControlName="uf" maxlength="2"></mat-form-field>
            </div>

            <p class="text-label mb-3">Contato e Dados Bancários</p>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <mat-form-field appearance="outline"><mat-label>Telefone</mat-label><input matInput formControlName="telefone"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Email</mat-label><input matInput type="email" formControlName="email"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Banco</mat-label><input matInput formControlName="banco"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Agência</mat-label><input matInput formControlName="agencia"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Conta</mat-label><input matInput formControlName="conta"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Tipo Conta</mat-label>
                <mat-select formControlName="tipoConta"><mat-option value="CORRENTE">Corrente</mat-option><mat-option value="POUPANCA">Poupança</mat-option></mat-select>
              </mat-form-field>
            </div>

            <p class="text-label mb-3">Dados Contratuais</p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <mat-form-field appearance="outline"><mat-label>Data Admissão</mat-label><input matInput type="date" formControlName="dataAdmissao"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Tipo Contrato</mat-label>
                <mat-select formControlName="tipoContrato"><mat-option value="CLT">CLT</mat-option><mat-option value="TEMPORARIO">Temporário</mat-option><mat-option value="ESTAGIO">Estágio</mat-option><mat-option value="JOVEM_APRENDIZ">Jovem Aprendiz</mat-option></mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Cargo</mat-label><input matInput formControlName="cargo"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Departamento</mat-label><input matInput formControlName="departamento"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Salário Base</mat-label><input matInput type="number" formControlName="salarioBase"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Tipo Salário</mat-label>
                <mat-select formControlName="tipoSalario"><mat-option value="MENSAL">Mensal</mat-option><mat-option value="HORISTA">Horista</mat-option><mat-option value="COMISSAO">Comissão</mat-option></mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Categoria</mat-label>
                <mat-select formControlName="categoria"><mat-option value="EMPREGADO">Empregado</mat-option><mat-option value="DOMESTICO">Doméstico</mat-option><mat-option value="ESTAGIARIO">Estagiário</mat-option><mat-option value="APRENDIZ">Aprendiz</mat-option></mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline"><mat-label>CBO</mat-label><input matInput formControlName="codigoCbo"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Carga Horária (h/sem)</mat-label><input matInput type="number" formControlName="cargaHorariaSemanal"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nº Dependentes</mat-label><input matInput type="number" formControlName="numeroDependentes"></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nº Dependentes IR</mat-label><input matInput type="number" formControlName="numeroDependentesIr"></mat-form-field>
            </div>

            <div class="flex gap-3 justify-end mt-6">
              <button type="button" class="bear-btn bear-btn--outline" style="padding:0.5rem 1.5rem" (click)="showForm.set(false)">Cancelar</button>
              <button type="submit" class="bear-btn bear-btn--primary" style="padding:0.5rem 1.5rem" [disabled]="form.invalid">
                <span class="material-symbols-rounded text-lg mr-1">save</span> Salvar
              </button>
            </div>
          </form>
        </div>
      }
    </div>
  `,
})
export class FuncionariosComponent implements OnInit {
  funcionarios = signal<any[]>([]);
  loading = signal(false);
  showForm = signal(false);
  totalElements = signal(0);
  editingId = signal<string | null>(null);
  displayedColumns = ['matricula', 'nome', 'cpf', 'cargo', 'departamento', 'salario', 'status', 'acoes'];
  form!: FormGroup;
  private apiUrl = `${environment.apiUrl}/folha/funcionarios`;

  constructor(private fb: FormBuilder, private http: HttpClient, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      nome: ['', Validators.required], cpf: ['', Validators.required], pis: [''], rg: [''], ctps: [''],
      dataNascimento: [''], sexo: ['MASCULINO'], estadoCivil: ['SOLTEIRO'],
      cep: [''], logradouro: [''], numero: [''], bairro: [''], cidade: [''], uf: [''],
      telefone: [''], email: [''],
      banco: [''], agencia: [''], conta: [''], tipoConta: ['CORRENTE'],
      dataAdmissao: ['', Validators.required], tipoContrato: ['CLT', Validators.required],
      cargo: ['', Validators.required], departamento: [''], centroCustoId: [''],
      salarioBase: [null, [Validators.required, Validators.min(1)]], tipoSalario: ['MENSAL'],
      categoria: ['EMPREGADO'], codigoCbo: [''], cargaHorariaSemanal: [44],
      numeroDependentes: [0], numeroDependentesIr: [0],
    });
    this.carregar();
  }

  carregar(page = 0) {
    this.loading.set(true);
    const params = new HttpParams().set('page', page).set('size', 20);
    this.http.get<any>(this.apiUrl, { params }).subscribe({
      next: (res) => {
        const items = res.content || res || [];
        this.funcionarios.set(items);
        this.totalElements.set(res.totalElements || items.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  countAtivos(): number { return this.funcionarios().filter(f => f.status === 'ATIVO').length; }
  countFerias(): number { return this.funcionarios().filter(f => f.status === 'FERIAS').length; }
  totalFolha(): number { return this.funcionarios().filter(f => f.status === 'ATIVO').reduce((s, f) => s + (f.salarioBase || 0), 0); }

  resetForm() { this.form.reset({ sexo: 'MASCULINO', estadoCivil: 'SOLTEIRO', tipoConta: 'CORRENTE', tipoContrato: 'CLT', tipoSalario: 'MENSAL', categoria: 'EMPREGADO', cargaHorariaSemanal: 44, numeroDependentes: 0, numeroDependentesIr: 0 }); }
  onPage(event: PageEvent) { this.carregar(event.pageIndex); }

  editar(f: any) {
    this.editingId.set(f.id);
    this.showForm.set(true);
    this.form.patchValue(f);
  }

  salvar() {
    if (this.form.valid) {
      const id = this.editingId();
      const req = id ? this.http.put<any>(`${this.apiUrl}/${id}`, this.form.value) : this.http.post<any>(this.apiUrl, this.form.value);
      req.subscribe({
        next: () => { this.snackBar.open(id ? 'Atualizado!' : 'Cadastrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao salvar', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }

  demitir(id: string) {
    if (!confirm('Confirma a demissão deste funcionário?')) return;
    this.http.post<any>(`${this.apiUrl}/${id}/demitir`, {}).subscribe({
      next: () => { this.snackBar.open('Funcionário demitido', 'OK', { duration: 3000 }); this.carregar(); },
      error: () => this.snackBar.open('Erro ao demitir', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] }),
    });
  }

  getStatusBadge(s: string): string {
    const m: Record<string, string> = { 'ATIVO': 'badge--success', 'DEMITIDO': 'badge--error', 'AFASTADO': 'badge--warning', 'FERIAS': 'badge--info' };
    return m[s] || 'badge--neutral';
  }
}
