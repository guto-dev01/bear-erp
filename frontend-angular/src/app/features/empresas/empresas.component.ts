import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { environment } from '@env/environment';

/** Dados de CNPJ retornados pelo backend (integracoes-service). */
interface DadosCnpj {
  razaoSocial?: string;
  nomeFantasia?: string;
  email?: string;
  telefone?: string;
  logradouro?: string;
  numero?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

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
  activeTab = signal<'dados' | 'contato' | 'endereco'>('dados');
  searchTerm = signal('');
  regimeFilter = signal<string | null>(null);
  cnpjLoading = signal(false);
  saving = signal(false);
  empresaForm: FormGroup;

  // Paginação
  pageSize = signal(10);
  currentPage = signal(1);
  readonly pageSizeOptions = [10, 25, 50];

  /** Total de empresas cadastradas (independente de busca/filtro). */
  total = computed(() => this.empresas().length);

  /** Resumo por regime tributário, usado nos cards de estatística. */
  resumo = computed(() => {
    const list = this.empresas();
    const total = list.length || 1;
    const count = (regime: string) => list.filter(e => e.regimeTributario === regime).length;
    return [
      { regime: 'SIMPLES_NACIONAL', label: 'Simples Nacional', icon: 'eco',          color: '#34C759', bg: '#E9FAEF', value: count('SIMPLES_NACIONAL') },
      { regime: 'LUCRO_PRESUMIDO',  label: 'Lucro Presumido',  icon: 'trending_up',  color: '#007AFF', bg: '#E5F1FF', value: count('LUCRO_PRESUMIDO') },
      { regime: 'LUCRO_REAL',       label: 'Lucro Real',       icon: 'account_balance', color: '#FF9500', bg: '#FFF4E5', value: count('LUCRO_REAL') },
    ].map(r => ({ ...r, percent: Math.round((r.value / total) * 100) }));
  });

  private readonly collectionId = 'empresas';

  constructor(
    private fb: FormBuilder,
    private appwrite: AppwriteService,
    private snackBar: MatSnackBar,
  ) {
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
    const regime = this.regimeFilter();
    return this.empresas().filter(e => {
      const matchTerm = !term ||
        e.razaoSocial?.toLowerCase().includes(term) ||
        e.nomeFantasia?.toLowerCase().includes(term) ||
        e.cnpj?.includes(term);
      const matchRegime = !regime || e.regimeTributario === regime;
      return matchTerm && matchRegime;
    });
  }

  /** Empresas da página atual. */
  pagedEmpresas(): Empresa[] {
    const start = (this.currentPage() - 1) * this.pageSize();
    return this.filteredEmpresas().slice(start, start + this.pageSize());
  }

  totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEmpresas().length / this.pageSize()));
  }

  /** Intervalo exibido no rodapé: "Mostrando X a Y de Z". */
  pageRange(): { from: number; to: number; total: number } {
    const total = this.filteredEmpresas().length;
    if (total === 0) return { from: 0, to: 0, total };
    const from = (this.currentPage() - 1) * this.pageSize() + 1;
    const to = Math.min(from + this.pageSize() - 1, total);
    return { from, to, total };
  }

  goToPage(page: number) {
    this.currentPage.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  setPageSize(size: number) {
    this.pageSize.set(size);
    this.currentPage.set(1);
  }

  onSearch(value: string) {
    this.searchTerm.set(value);
    this.currentPage.set(1);
  }

  toggleRegimeFilter(regime: string) {
    this.regimeFilter.set(this.regimeFilter() === regime ? null : regime);
    this.currentPage.set(1);
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

  /** Consulta os dados do CNPJ via backend (integracoes-service) e preenche o formulário. */
  buscarCnpj(cnpj: string) {
    if (this.cnpjLoading()) return;
    this.cnpjLoading.set(true);

    this.appwrite.executeFunction<DadosCnpj & { ok?: boolean; erro?: string }>(
      environment.appwrite.functions.consultaCnpj, { cnpj }).subscribe({
      next: (d) => {
        this.cnpjLoading.set(false);
        if (!d || d.ok === false) {
          this.snackBar.open(d?.erro || 'CNPJ não encontrado na Receita', 'Fechar', { duration: 4000, panelClass: ['error-snackbar'] });
          return;
        }
        const endereco = [d.logradouro, d.numero]
          .filter((p): p is string => !!p && p.trim().length > 0)
          .join(' ')
          .trim();

        this.empresaForm.patchValue({
          razaoSocial: d.razaoSocial || this.empresaForm.value.razaoSocial,
          nomeFantasia: d.nomeFantasia || d.razaoSocial || this.empresaForm.value.nomeFantasia,
          email: d.email || this.empresaForm.value.email,
          telefone: d.telefone || this.empresaForm.value.telefone,
          endereco: endereco || this.empresaForm.value.endereco,
          cidade: d.municipio || this.empresaForm.value.cidade,
          uf: d.uf || this.empresaForm.value.uf,
          cep: (d.cep || '').toString().replace(/\D/g, '') || this.empresaForm.value.cep,
        });

        this.snackBar.open('Dados preenchidos pela Receita Federal', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
      },
      error: () => {
        this.cnpjLoading.set(false);
        this.snackBar.open('Não foi possível consultar o CNPJ', 'Fechar', { duration: 4000, panelClass: ['error-snackbar'] });
      },
    });
  }

  openForm(empresa?: Empresa) {
    this.activeTab.set('dados');
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
      const invalidos = Object.keys(this.empresaForm.controls)
        .filter(k => this.empresaForm.get(k)?.invalid);
      // Leva o usuário até a aba que contém o primeiro campo inválido.
      const primeiraAba = this.fieldTab[invalidos[0]];
      if (primeiraAba) this.activeTab.set(primeiraAba);
      const faltando = invalidos.map(k => this.fieldLabels[k] || k);
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

  /** Aba em que cada campo do formulário vive (usado para focar erros). */
  private readonly fieldTab: Record<string, 'dados' | 'contato' | 'endereco'> = {
    razaoSocial: 'dados', nomeFantasia: 'dados', cnpj: 'dados',
    inscricaoEstadual: 'dados', inscricaoMunicipal: 'dados', regimeTributario: 'dados',
    email: 'contato', telefone: 'contato',
    endereco: 'endereco', cidade: 'endereco', uf: 'endereco', cep: 'endereco',
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

  /**
   * Infere o ícone do segmento da empresa a partir de palavras-chave na
   * razão social / nome fantasia. Sem campo dedicado de segmento, esta
   * heurística cobre os ramos mais comuns dos clientes do escritório.
   */
  getSegmentIcon(empresa: Empresa): string {
    const text = `${empresa.nomeFantasia || ''} ${empresa.razaoSocial || ''}`.toLowerCase();
    const match = (...words: string[]) => words.some(w => text.includes(w));

    if (match('industri', 'metal', 'fabric', 'fábric', 'siderur', 'manufat')) return 'factory';
    if (match('construt', 'edific', 'engenharia', 'obras', 'incorpora')) return 'engineering';
    if (match('restaur', 'pizza', 'lanchon', 'bar ', 'aliment', 'food', 'sabor', 'gastro')) return 'restaurant';
    if (match('comerci', 'comércio', 'store', 'loja', 'varejo', 'atacad', 'mercado')) return 'storefront';
    if (match('tech', 'tecnsolog', 'tecnolog', 'software', 'sistema', 'digital', 'solutions', 'soluç', 'informát')) return 'memory';
    if (match('transport', 'logístic', 'logistic', 'frete', 'cargo')) return 'local_shipping';
    if (match('saúde', 'saude', 'clínic', 'clinic', 'hospital', 'farmác', 'farmac', 'médic', 'odonto')) return 'medical_services';
    if (match('escola', 'educa', 'ensino', 'colégio', 'colegio', 'curso')) return 'school';
    if (match('contábil', 'contabil', 'advoc', 'consultor', 'assessor', 'escritório', 'jurídic')) return 'business_center';
    if (match('agro', 'fazenda', 'rural', 'agríc', 'agric', 'pecuár')) return 'agriculture';
    if (match('hotel', 'pousada', 'turismo', 'viage')) return 'hotel';
    if (match('imóve', 'imovel', 'imobiliár', 'imobiliar')) return 'real_estate_agent';
    if (match('posto', 'combustí', 'combusti', 'energia', 'petról', 'petrol')) return 'local_gas_station';
    return 'apartment';
  }

  formatCnpj(cnpj: string): string {
    if (!cnpj || cnpj.length !== 14) return cnpj;
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
}
