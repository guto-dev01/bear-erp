import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpBackend } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AppwriteService } from '@core/services/appwrite.service';

interface Empresa {
  $id: string;
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  regimeTributario: string;
  email: string;
  telefone: string;
  endereco: string;
  cidade: string;
  uf: string;
  cep: string;
  status: string;
  $createdAt: string;
}

@Component({
  selector: 'bear-empresas',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatIconModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatDialogModule,
    MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './empresas.component.html',
  styleUrl: './empresas.component.scss',
})
export class EmpresasComponent implements OnInit {
  empresas = signal<Empresa[]>([]);
  loading = signal(true);
  showForm = signal(false);
  editingId = signal<string | null>(null);
  searchTerm = signal('');
  cnpjLoading = signal(false);
  saving = signal(false);
  empresaForm: FormGroup;

  private readonly collectionId = 'empresas';
  /** HttpClient sem interceptors — evita enviar Authorization/headers de tenant para APIs externas */
  private readonly http: HttpClient;

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private snackBar: MatSnackBar,
    httpBackend: HttpBackend,
  ) {
    this.http = new HttpClient(httpBackend);
    this.empresaForm = this.fb.group({
      razaoSocial: ['', Validators.required],
      nomeFantasia: ['', Validators.required],
      cnpj: ['', [Validators.required, Validators.minLength(14)]],
      inscricaoEstadual: [''],
      inscricaoMunicipal: [''],
      regimeTributario: ['SIMPLES_NACIONAL', Validators.required],
      email: ['', [Validators.email]],
      telefone: [''],
      endereco: [''],
      cidade: [''],
      uf: [''],
      cep: [''],
    });
  }

  ngOnInit() {
    this.loadEmpresas();
  }

  loadEmpresas() {
    this.loading.set(true);
    this.appwrite.listDocuments<Empresa>(this.collectionId).subscribe({
      next: (data) => {
        this.empresas.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erro ao carregar empresas', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] });
      },
    });
  }

  filteredEmpresas(): Empresa[] {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.empresas();
    return this.empresas().filter(e =>
      e.razaoSocial?.toLowerCase().includes(term) ||
      e.nomeFantasia?.toLowerCase().includes(term) ||
      e.cnpj?.includes(term)
    );
  }

  /** Dispara a busca na Receita quando o CNPJ tiver 14 dígitos. */
  onCnpjInput(value: string) {
    const digits = (value || '').replace(/\D/g, '');
    if (this.empresaForm.get('cnpj')?.value !== digits) {
      this.empresaForm.patchValue({ cnpj: digits }, { emitEvent: false });
    }
    if (digits.length === 14) {
      this.buscarCnpj(digits);
    }
  }

  /** Consulta os dados públicos do CNPJ na BrasilAPI e preenche o formulário. */
  buscarCnpj(cnpj: string) {
    if (this.cnpjLoading()) return;
    this.cnpjLoading.set(true);

    this.http.get<any>(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`).subscribe({
      next: (data) => {
        const telefone = (data.ddd_telefone_1 || '').toString().trim();
        const endereco = [data.descricao_tipo_de_logradouro, data.logradouro, data.numero]
          .filter((p: string) => p && p.trim())
          .join(' ')
          .trim();

        this.empresaForm.patchValue({
          razaoSocial: data.razao_social || this.empresaForm.value.razaoSocial,
          nomeFantasia: data.nome_fantasia || data.razao_social || this.empresaForm.value.nomeFantasia,
          email: data.email || this.empresaForm.value.email,
          telefone: telefone || this.empresaForm.value.telefone,
          endereco: endereco || this.empresaForm.value.endereco,
          cidade: data.municipio || this.empresaForm.value.cidade,
          uf: data.uf || this.empresaForm.value.uf,
          cep: (data.cep || '').toString().replace(/\D/g, '') || this.empresaForm.value.cep,
        });

        this.cnpjLoading.set(false);
        this.snackBar.open('Dados preenchidos pela Receita Federal', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: (err) => {
        this.cnpjLoading.set(false);
        const msg = err.status === 404 ? 'CNPJ não encontrado na Receita' : 'Não foi possível consultar o CNPJ';
        this.snackBar.open(msg, 'Fechar', { duration: 4000, panelClass: ['error-snackbar'] });
      },
    });
  }

  openForm(empresa?: Empresa) {
    if (empresa) {
      this.editingId.set(empresa.$id);
      this.empresaForm.patchValue(empresa);
    } else {
      this.editingId.set(null);
      this.empresaForm.reset({ regimeTributario: 'SIMPLES_NACIONAL' });
    }
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingId.set(null);
    this.empresaForm.reset();
  }

  save() {
    if (this.empresaForm.invalid) {
      this.empresaForm.markAllAsTouched();
      const faltando = Object.keys(this.empresaForm.controls)
        .filter(k => this.empresaForm.get(k)?.invalid)
        .map(k => this.fieldLabels[k] || k);
      this.snackBar.open(`Preencha os campos obrigatórios: ${faltando.join(', ')}`, 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] });
      return;
    }

    this.saving.set(true);
    const data = { ...this.empresaForm.value, status: 'ATIVA', tenantId: 'default' };
    const editing = this.editingId();

    const obs = editing
      ? this.appwrite.updateDocument<Empresa>(this.collectionId, editing, data)
      : this.appwrite.createDocument<Empresa>(this.collectionId, data);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.snackBar.open(editing ? 'Empresa atualizada!' : 'Empresa criada!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
        this.closeForm();
        this.loadEmpresas();
      },
      error: (err) => {
        this.saving.set(false);
        this.snackBar.open(err.message || 'Erro ao salvar', 'Fechar', { duration: 6000, panelClass: ['error-snackbar'] });
      },
    });
  }

  private readonly fieldLabels: Record<string, string> = {
    razaoSocial: 'Razão Social',
    nomeFantasia: 'Nome Fantasia',
    cnpj: 'CNPJ',
    regimeTributario: 'Regime Tributário',
    email: 'Email',
  };

  delete(empresa: Empresa) {
    if (!confirm(`Excluir "${empresa.razaoSocial}"?`)) return;
    this.appwrite.deleteDocument(this.collectionId, empresa.$id).subscribe({
      next: () => {
        this.snackBar.open('Empresa excluída', 'OK', { duration: 3000 });
        this.loadEmpresas();
      },
      error: () => {
        this.snackBar.open('Erro ao excluir', 'Fechar', { duration: 3000, panelClass: ['error-snackbar'] });
      },
    });
  }

  getRegimeLabel(regime: string): string {
    const map: Record<string, string> = {
      'SIMPLES_NACIONAL': 'Simples Nacional',
      'LUCRO_PRESUMIDO': 'Lucro Presumido',
      'LUCRO_REAL': 'Lucro Real',
      'MEI': 'MEI',
    };
    return map[regime] || regime;
  }

  getRegimeColor(regime: string): string {
    const map: Record<string, string> = {
      'SIMPLES_NACIONAL': 'success',
      'LUCRO_PRESUMIDO': 'info',
      'LUCRO_REAL': 'warning',
      'MEI': 'neutral',
    };
    return map[regime] || 'neutral';
  }

  formatCnpj(cnpj: string): string {
    if (!cnpj || cnpj.length !== 14) return cnpj;
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
}
