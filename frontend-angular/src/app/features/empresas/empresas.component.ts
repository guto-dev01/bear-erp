import { Component, signal, OnInit } from '@angular/core';
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
  estado: string;
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
  empresaForm: FormGroup;

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
      email: ['', [Validators.required, Validators.email]],
      telefone: [''],
      endereco: [''],
      cidade: [''],
      estado: [''],
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
    if (this.empresaForm.invalid) return;

    const data = { ...this.empresaForm.value, status: 'ATIVA', tenantId: 'default' };
    const editing = this.editingId();

    const obs = editing
      ? this.appwrite.updateDocument<Empresa>(this.collectionId, editing, data)
      : this.appwrite.createDocument<Empresa>(this.collectionId, data);

    obs.subscribe({
      next: () => {
        this.snackBar.open(editing ? 'Empresa atualizada!' : 'Empresa criada!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
        this.closeForm();
        this.loadEmpresas();
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Erro ao salvar', 'Fechar', { duration: 5000, panelClass: ['error-snackbar'] });
      },
    });
  }

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
