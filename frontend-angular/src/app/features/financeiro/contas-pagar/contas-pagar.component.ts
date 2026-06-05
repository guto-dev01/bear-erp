import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FinanceiroService } from '../financeiro.service';

@Component({
  selector: 'bear-contas-pagar',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatTableModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatPaginatorModule, MatSnackBarModule, MatTooltipModule,
  ],
  templateUrl: './contas-pagar.component.html',
  styleUrl: './contas-pagar.component.scss',
})
export class ContasPagarComponent implements OnInit {
  contas = signal<any[]>([]);
  loading = signal(false);
  showForm = signal(false);
  showBaixa = signal(false);
  contaSelecionada = signal<any>(null);
  totalElements = signal(0);
  totalContas = signal(0);
  contasAbertas = signal(0);
  contasVencidas = signal(0);
  contasPagas = signal(0);
  displayedColumns = ['numero', 'descricao', 'fornecedor', 'vencimento', 'valor', 'pago', 'status', 'acoes'];
  form!: FormGroup;
  baixaForm!: FormGroup;

  constructor(private fb: FormBuilder, private service: FinanceiroService, private snackBar: MatSnackBar) {}

  ngOnInit() {
    this.form = this.fb.group({
      descricao: ['', Validators.required], fornecedorId: [''], fornecedorNome: ['', Validators.required],
      fornecedorCnpjCpf: [''], categoria: [''], dataEmissao: ['', Validators.required],
      dataVencimento: ['', Validators.required], valorOriginal: [null, [Validators.required, Validators.min(0.01)]],
      totalParcelas: [1], formaPagamento: ['BOLETO'], codigoBarras: [''], observacao: [''],
    });
    this.baixaForm = this.fb.group({
      data: ['', Validators.required], valor: [null, [Validators.required, Validators.min(0.01)]],
      formaPagamento: ['PIX'], observacao: [''],
    });
    this.carregar();
  }

  carregar(page = 0) {
    this.loading.set(true);
    this.service.listContasPagar(page).subscribe({ next: (res) => {
      this.contas.set(res.content || []);
      this.totalElements.set(res.totalElements || 0);
      this.totalContas.set(res.totalElements || 0);
      const c = this.contas();
      this.contasAbertas.set(c.filter((x: any) => x.status === 'ABERTA').length);
      this.contasVencidas.set(c.filter((x: any) => x.status === 'VENCIDA').length);
      this.contasPagas.set(c.filter((x: any) => x.status === 'PAGA').length);
      this.loading.set(false);
    }, error: () => this.loading.set(false) });
  }

  resetForm() { this.form.reset({ totalParcelas: 1, formaPagamento: 'BOLETO' }); }

  salvar() {
    if (this.form.valid) {
      this.service.createContaPagar(this.form.value).subscribe({
        next: () => { this.snackBar.open('Conta criada!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showForm.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao criar conta', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }

  iniciarBaixa(conta: any) {
    this.contaSelecionada.set(conta);
    const saldo = conta.valorOriginal - (conta.valorPago || 0);
    this.baixaForm.reset({ valor: saldo, formaPagamento: 'PIX', data: new Date().toISOString().split('T')[0] });
    this.showBaixa.set(true);
  }

  confirmarBaixa() {
    if (this.baixaForm.valid && this.contaSelecionada()) {
      this.service.baixarContaPagar(this.contaSelecionada().id, this.baixaForm.value).subscribe({
        next: () => { this.snackBar.open('Pagamento registrado!', 'OK', { duration: 3000, panelClass: ['success-snackbar'] }); this.showBaixa.set(false); this.carregar(); },
        error: () => this.snackBar.open('Erro ao registrar pagamento', 'OK', { duration: 3000, panelClass: ['error-snackbar'] }),
      });
    }
  }

  cancelar(id: string) {
    this.service.cancelarContaPagar(id).subscribe({
      next: () => { this.snackBar.open('Conta cancelada', 'OK', { duration: 3000 }); this.carregar(); },
    });
  }

  carregarVencidas() {
    this.loading.set(true);
    this.service.listContasPagarVencidas().subscribe({
      next: (res) => { this.contas.set(res); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  onPage(event: PageEvent) { this.carregar(event.pageIndex); }

  getStatusBadgeClass(status: string): string {
    const map: Record<string, string> = {
      'ABERTA': 'badge--warning',
      'PARCIAL': 'badge--info',
      'PAGA': 'badge--success',
      'VENCIDA': 'badge--error',
      'CANCELADA': 'badge--neutral',
    };
    return map[status] || 'badge--neutral';
  }
}
