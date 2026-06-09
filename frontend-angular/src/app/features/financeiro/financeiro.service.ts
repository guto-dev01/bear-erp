import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

/**
 * Serviço Financeiro migrado para Appwrite.
 *
 * Mantém as MESMAS assinaturas públicas usadas pelos componentes
 * (contas-pagar, contas-receber, contas-bancarias, conciliacao, fluxo-caixa),
 * mas troca a origem dos dados do backend Java para o Appwrite.
 *
 * Como os templates existentes consomem alguns nomes de campo diferentes do
 * schema do Appwrite (ex.: `id`, `valorOriginal`, `numero`), o serviço faz o
 * mapeamento de/para o schema para manter 100% do visual funcionando sem
 * alterar HTML/SCSS.
 */

// ── Coleções ────────────────────────────────────────────────
const COL_CONTAS_PAGAR = 'contas_pagar';
const COL_CONTAS_RECEBER = 'contas_receber';
const COL_CONTAS_BANCARIAS = 'contas_bancarias';
const COL_MOVIMENTOS = 'movimentos_bancarios';
const COL_CONCILIACOES = 'conciliacoes';

// ── Tipos de documento (schema Appwrite) ────────────────────
interface ContaPagarDoc {
  $id: string;
  $createdAt: string;
  descricao: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  valor: number;
  valorPago?: number;
  dataEmissao: string;
  dataVencimento: string;
  dataPagamento?: string;
  formaPagamento?: string;
  categoria?: string;
  documentoRef?: string;
  parcela?: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

interface ContaReceberDoc {
  $id: string;
  $createdAt: string;
  descricao: string;
  clienteId?: string;
  clienteNome?: string;
  valor: number;
  valorRecebido?: number;
  dataEmissao: string;
  dataVencimento: string;
  dataRecebimento?: string;
  formaPagamento?: string;
  categoria?: string;
  documentoRef?: string;
  parcela?: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

interface ContaBancariaDoc {
  $id: string;
  $createdAt: string;
  banco: string;
  codigoBanco?: string;
  agencia: string;
  conta: string;
  tipoConta: string;
  descricao?: string;
  saldoAtual?: number;
  saldoConciliado?: number;
  dataUltimaConciliacao?: string;
  pix?: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

interface MovimentoBancarioDoc {
  $id: string;
  $createdAt: string;
  contaBancariaId: string;
  data: string;
  descricao: string;
  tipo: string;
  valor: number;
  conciliado?: boolean;
  empresaId: string;
  tenantId: string;
}

// ── Formato consumido pelos templates ───────────────────────
// (os componentes ainda esperam alguns aliases legados)
interface ContaPagarView extends ContaPagarDoc {
  id: string;
  numero: string;
  valorOriginal: number;
}

interface ContaReceberView extends ContaReceberDoc {
  id: string;
  numero: string;
  valorOriginal: number;
}

interface ContaBancariaView extends ContaBancariaDoc {
  id: string;
  tipo: string;
  saldoInicial: number;
}

interface MovimentoView extends MovimentoBancarioDoc {
  id: string;
  saldoApos: number;
}

interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

interface FluxoItem {
  data: string;
  descricao: string;
  tipo: 'ENTRADA' | 'SAIDA';
  valor: number;
  saldoAcumulado: number;
  origem: string;
}

interface FluxoCaixa {
  saldoInicial: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinal: number;
  itens: FluxoItem[];
}

@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  constructor(private appwrite: AppwriteService, private auth: AuthService) {}

  private get tenantId(): string {
    return this.auth.tenantId() || 'default';
  }

  private get empresaId(): string {
    return this.auth.empresaId() || '';
  }

  private get Q() {
    return this.appwrite.query;
  }

  private baseQueries(extra: string[] = []): string[] {
    return [
      this.Q.limit(100),
      this.Q.orderDesc('$createdAt'),
      this.Q.equal('tenantId', this.tenantId),
      ...extra,
    ];
  }

  // ── Helpers de mapeamento ─────────────────────────────────
  private toPagarView(d: ContaPagarDoc): ContaPagarView {
    return { ...d, id: d.$id, numero: d.documentoRef || d.parcela || d.$id.slice(-6), valorOriginal: d.valor };
  }

  private toReceberView(d: ContaReceberDoc): ContaReceberView {
    return { ...d, id: d.$id, numero: d.documentoRef || d.parcela || d.$id.slice(-6), valorOriginal: d.valor };
  }

  private toContaBancariaView(d: ContaBancariaDoc): ContaBancariaView {
    return { ...d, id: d.$id, tipo: d.tipoConta, saldoInicial: d.saldoAtual ?? 0 };
  }

  private toPage<T>(items: T[]): Page<T> {
    return { content: items, totalElements: items.length, totalPages: 1, number: 0, size: items.length };
  }

  private isVencida(c: { dataVencimento: string; status: string }): boolean {
    const hoje = new Date().toISOString().split('T')[0];
    const aberta = c.status !== 'PAGA' && c.status !== 'CANCELADA';
    return aberta && !!c.dataVencimento && c.dataVencimento < hoje;
  }

  // ── Contas a Pagar ────────────────────────────────────────
  listContasPagar(page = 0, size = 20, status?: string): Observable<Page<ContaPagarView>> {
    const extra = status ? [this.Q.equal('status', status)] : [];
    return this.appwrite.listDocuments<ContaPagarDoc>(COL_CONTAS_PAGAR, this.baseQueries(extra)).pipe(
      map(docs => this.toPage(docs.map(d => this.toPagarView(d)))),
    );
  }

  getContaPagar(id: string): Observable<ContaPagarView> {
    return this.appwrite.getDocument<ContaPagarDoc>(COL_CONTAS_PAGAR, id).pipe(
      map(d => this.toPagarView(d)),
    );
  }

  createContaPagar(data: Record<string, unknown>): Observable<ContaPagarView> {
    const payload: Record<string, unknown> = {
      descricao: data['descricao'] ?? '',
      fornecedorId: data['fornecedorId'] ?? '',
      fornecedorNome: data['fornecedorNome'] ?? '',
      valor: Number(data['valorOriginal'] ?? data['valor'] ?? 0),
      dataEmissao: data['dataEmissao'] ?? '',
      dataVencimento: data['dataVencimento'] ?? '',
      formaPagamento: data['formaPagamento'] ?? data['formaRecebimento'] ?? '',
      categoria: data['categoria'] ?? '',
      documentoRef: data['documentoRef'] ?? data['codigoBarras'] ?? '',
      parcela: String(data['parcela'] ?? data['totalParcelas'] ?? ''),
      status: 'ABERTA',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
      createdAt: new Date().toISOString(),
    };
    return this.appwrite.createDocument<ContaPagarDoc>(COL_CONTAS_PAGAR, payload).pipe(
      map(d => this.toPagarView(d)),
    );
  }

  baixarContaPagar(id: string, data: Record<string, unknown>): Observable<ContaPagarView> {
    const payload: Record<string, unknown> = {
      status: 'PAGA',
      valorPago: Number(data['valor'] ?? data['valorPago'] ?? 0),
      dataPagamento: data['data'] ?? data['dataPagamento'] ?? new Date().toISOString().split('T')[0],
      formaPagamento: data['formaPagamento'] ?? '',
    };
    return this.appwrite.updateDocument<ContaPagarDoc>(COL_CONTAS_PAGAR, id, payload).pipe(
      map(d => this.toPagarView(d)),
    );
  }

  cancelarContaPagar(id: string): Observable<ContaPagarView> {
    return this.appwrite.updateDocument<ContaPagarDoc>(COL_CONTAS_PAGAR, id, { status: 'CANCELADA' }).pipe(
      map(d => this.toPagarView(d)),
    );
  }

  listContasPagarVencidas(): Observable<ContaPagarView[]> {
    return this.appwrite.listDocuments<ContaPagarDoc>(COL_CONTAS_PAGAR, this.baseQueries()).pipe(
      map(docs => docs.filter(d => this.isVencida(d)).map(d => this.toPagarView(d))),
    );
  }

  // ── Contas a Receber ──────────────────────────────────────
  listContasReceber(page = 0, size = 20, status?: string): Observable<Page<ContaReceberView>> {
    const extra = status ? [this.Q.equal('status', status)] : [];
    return this.appwrite.listDocuments<ContaReceberDoc>(COL_CONTAS_RECEBER, this.baseQueries(extra)).pipe(
      map(docs => this.toPage(docs.map(d => this.toReceberView(d)))),
    );
  }

  getContaReceber(id: string): Observable<ContaReceberView> {
    return this.appwrite.getDocument<ContaReceberDoc>(COL_CONTAS_RECEBER, id).pipe(
      map(d => this.toReceberView(d)),
    );
  }

  createContaReceber(data: Record<string, unknown>): Observable<ContaReceberView> {
    const payload: Record<string, unknown> = {
      descricao: data['descricao'] ?? '',
      clienteId: data['clienteId'] ?? '',
      clienteNome: data['clienteNome'] ?? '',
      valor: Number(data['valorOriginal'] ?? data['valor'] ?? 0),
      dataEmissao: data['dataEmissao'] ?? '',
      dataVencimento: data['dataVencimento'] ?? '',
      formaPagamento: data['formaRecebimento'] ?? data['formaPagamento'] ?? '',
      categoria: data['categoria'] ?? '',
      documentoRef: data['documentoRef'] ?? '',
      parcela: String(data['parcela'] ?? data['totalParcelas'] ?? ''),
      status: 'ABERTA',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
      createdAt: new Date().toISOString(),
    };
    return this.appwrite.createDocument<ContaReceberDoc>(COL_CONTAS_RECEBER, payload).pipe(
      map(d => this.toReceberView(d)),
    );
  }

  baixarContaReceber(id: string, data: Record<string, unknown>): Observable<ContaReceberView> {
    const payload: Record<string, unknown> = {
      status: 'PAGA',
      valorRecebido: Number(data['valor'] ?? data['valorRecebido'] ?? 0),
      dataRecebimento: data['data'] ?? data['dataRecebimento'] ?? new Date().toISOString().split('T')[0],
      formaPagamento: data['formaPagamento'] ?? '',
    };
    return this.appwrite.updateDocument<ContaReceberDoc>(COL_CONTAS_RECEBER, id, payload).pipe(
      map(d => this.toReceberView(d)),
    );
  }

  cancelarContaReceber(id: string): Observable<ContaReceberView> {
    return this.appwrite.updateDocument<ContaReceberDoc>(COL_CONTAS_RECEBER, id, { status: 'CANCELADA' }).pipe(
      map(d => this.toReceberView(d)),
    );
  }

  listContasReceberVencidas(): Observable<ContaReceberView[]> {
    return this.appwrite.listDocuments<ContaReceberDoc>(COL_CONTAS_RECEBER, this.baseQueries()).pipe(
      map(docs => docs.filter(d => this.isVencida(d)).map(d => this.toReceberView(d))),
    );
  }

  // ── Contas Bancárias ──────────────────────────────────────
  listContasBancarias(): Observable<ContaBancariaView[]> {
    return this.appwrite.listDocuments<ContaBancariaDoc>(COL_CONTAS_BANCARIAS, this.baseQueries()).pipe(
      map(docs => docs.map(d => this.toContaBancariaView(d))),
    );
  }

  listTodasContasBancarias(): Observable<ContaBancariaView[]> {
    // Sem filtro de tenant — visão global (mantida por compatibilidade).
    return this.appwrite
      .listDocuments<ContaBancariaDoc>(COL_CONTAS_BANCARIAS, [this.Q.limit(100), this.Q.orderDesc('$createdAt')])
      .pipe(map(docs => docs.map(d => this.toContaBancariaView(d))));
  }

  createContaBancaria(data: Record<string, unknown>): Observable<ContaBancariaView> {
    const saldo = Number(data['saldoInicial'] ?? data['saldoAtual'] ?? 0);
    const payload: Record<string, unknown> = {
      banco: data['banco'] ?? '',
      codigoBanco: data['codigoBanco'] ?? '',
      agencia: data['agencia'] ?? '',
      conta: data['conta'] ?? '',
      tipoConta: data['tipo'] ?? data['tipoConta'] ?? 'CORRENTE',
      descricao: data['responsavel'] ?? data['descricao'] ?? '',
      saldoAtual: saldo,
      saldoConciliado: 0,
      pix: data['pix'] ?? '',
      status: 'ATIVA',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
      createdAt: new Date().toISOString(),
    };
    return this.appwrite.createDocument<ContaBancariaDoc>(COL_CONTAS_BANCARIAS, payload).pipe(
      map(d => this.toContaBancariaView(d)),
    );
  }

  updateContaBancaria(id: string, data: Record<string, unknown>): Observable<ContaBancariaView> {
    const payload: Record<string, unknown> = {
      banco: data['banco'] ?? '',
      agencia: data['agencia'] ?? '',
      conta: data['conta'] ?? '',
      tipoConta: data['tipo'] ?? data['tipoConta'] ?? 'CORRENTE',
      descricao: data['responsavel'] ?? data['descricao'] ?? '',
    };
    if (data['saldoAtual'] !== undefined) payload['saldoAtual'] = Number(data['saldoAtual']);
    if (data['status'] !== undefined) payload['status'] = data['status'];
    return this.appwrite.updateDocument<ContaBancariaDoc>(COL_CONTAS_BANCARIAS, id, payload).pipe(
      map(d => this.toContaBancariaView(d)),
    );
  }

  listMovimentos(contaId: string, page = 0, size = 50): Observable<Page<MovimentoView>> {
    return this.appwrite
      .listDocuments<MovimentoBancarioDoc>(COL_MOVIMENTOS, this.baseQueries([this.Q.equal('contaBancariaId', contaId)]))
      .pipe(map(docs => this.toPage(this.computeSaldoApos(docs))));
  }

  /** Calcula saldo acumulado por movimento (ordem cronológica). */
  private computeSaldoApos(docs: MovimentoBancarioDoc[]): MovimentoView[] {
    const cronologico = [...docs].sort((a, b) => a.data.localeCompare(b.data));
    let saldo = 0;
    const comSaldo = cronologico.map(d => {
      saldo += d.tipo === 'CREDITO' ? d.valor : -d.valor;
      return { ...d, id: d.$id, saldoApos: saldo } as MovimentoView;
    });
    // Devolve em ordem decrescente de data (como o template legado esperava).
    return comSaldo.reverse();
  }

  // ── Fluxo de Caixa (calculado no cliente) ─────────────────
  getFluxoCaixa(dataInicio: string, dataFim: string): Observable<FluxoCaixa> {
    return this.appwrite.listDocuments<ContaPagarDoc>(COL_CONTAS_PAGAR, this.baseQueries()).pipe(
      switchMap(pagar =>
        this.appwrite.listDocuments<ContaReceberDoc>(COL_CONTAS_RECEBER, this.baseQueries()).pipe(
          switchMap(receber =>
            this.appwrite.listDocuments<MovimentoBancarioDoc>(COL_MOVIMENTOS, this.baseQueries()).pipe(
              map(movimentos => this.calcularFluxo(dataInicio, dataFim, pagar, receber, movimentos)),
            ),
          ),
        ),
      ),
    );
  }

  /**
   * Reimplementa o cálculo de fluxo de caixa que era feito no backend Java.
   * Entradas: contas a receber pagas (dataRecebimento) + movimentos CREDITO.
   * Saídas: contas a pagar pagas (dataPagamento) + movimentos DEBITO.
   * Saldo inicial = soma do efeito de tudo que ocorreu ANTES do período.
   */
  private calcularFluxo(
    dataInicio: string,
    dataFim: string,
    pagar: ContaPagarDoc[],
    receber: ContaReceberDoc[],
    movimentos: MovimentoBancarioDoc[],
  ): FluxoCaixa {
    interface Evento { data: string; descricao: string; tipo: 'ENTRADA' | 'SAIDA'; valor: number; origem: string; }
    const eventos: Evento[] = [];

    for (const r of receber) {
      if (r.status === 'PAGA' && r.dataRecebimento) {
        eventos.push({
          data: r.dataRecebimento,
          descricao: r.descricao,
          tipo: 'ENTRADA',
          valor: r.valorRecebido ?? r.valor,
          origem: 'Contas a Receber',
        });
      }
    }
    for (const p of pagar) {
      if (p.status === 'PAGA' && p.dataPagamento) {
        eventos.push({
          data: p.dataPagamento,
          descricao: p.descricao,
          tipo: 'SAIDA',
          valor: p.valorPago ?? p.valor,
          origem: 'Contas a Pagar',
        });
      }
    }
    for (const m of movimentos) {
      eventos.push({
        data: m.data,
        descricao: m.descricao,
        tipo: m.tipo === 'CREDITO' ? 'ENTRADA' : 'SAIDA',
        valor: m.valor,
        origem: 'Movimento Bancário',
      });
    }

    const efeito = (e: Evento) => (e.tipo === 'ENTRADA' ? e.valor : -e.valor);

    const saldoInicial = eventos
      .filter(e => e.data < dataInicio)
      .reduce((s, e) => s + efeito(e), 0);

    const noPeriodo = eventos
      .filter(e => e.data >= dataInicio && e.data <= dataFim)
      .sort((a, b) => a.data.localeCompare(b.data));

    let saldo = saldoInicial;
    const itens: FluxoItem[] = noPeriodo.map(e => {
      saldo += efeito(e);
      return { data: e.data, descricao: e.descricao, tipo: e.tipo, valor: e.valor, saldoAcumulado: saldo, origem: e.origem };
    });

    const totalEntradas = noPeriodo.filter(e => e.tipo === 'ENTRADA').reduce((s, e) => s + e.valor, 0);
    const totalSaidas = noPeriodo.filter(e => e.tipo === 'SAIDA').reduce((s, e) => s + e.valor, 0);

    return {
      saldoInicial,
      totalEntradas,
      totalSaidas,
      saldoFinal: saldoInicial + totalEntradas - totalSaidas,
      itens,
    };
  }

  // ── Conciliação ───────────────────────────────────────────
  listNaoConciliados(contaId: string): Observable<MovimentoView[]> {
    return this.appwrite
      .listDocuments<MovimentoBancarioDoc>(
        COL_MOVIMENTOS,
        this.baseQueries([this.Q.equal('contaBancariaId', contaId), this.Q.equal('conciliado', false)]),
      )
      .pipe(map(docs => this.computeSaldoApos(docs)));
  }

  listMovimentosPeriodo(contaId: string, inicio: string, fim: string): Observable<MovimentoView[]> {
    return this.appwrite
      .listDocuments<MovimentoBancarioDoc>(
        COL_MOVIMENTOS,
        this.baseQueries([
          this.Q.equal('contaBancariaId', contaId),
          this.Q.greaterThanEqual('data', inicio),
          this.Q.lessThanEqual('data', fim),
        ]),
      )
      .pipe(map(docs => this.computeSaldoApos(docs)));
  }

  conciliar(movimentoIds: string[]): Observable<unknown> {
    // Marca cada movimento como conciliado. Registra também uma conciliação resumo.
    return this.appwrite
      .listDocuments<MovimentoBancarioDoc>(COL_MOVIMENTOS, [this.Q.limit(100), this.Q.equal('$id', movimentoIds)])
      .pipe(
        switchMap(movs => {
          const updates = movimentoIds.map(id =>
            this.appwrite.updateDocument<MovimentoBancarioDoc>(COL_MOVIMENTOS, id, { conciliado: true }),
          );
          // Gera registro de conciliação (best-effort) com base nos movimentos.
          const contaId = movs[0]?.contaBancariaId ?? '';
          const datas = movs.map(m => m.data).sort();
          const saldo = movs.reduce((s, m) => s + (m.tipo === 'CREDITO' ? m.valor : -m.valor), 0);
          const conciliacao: Record<string, unknown> = {
            contaBancariaId: contaId,
            dataInicio: datas[0] ?? new Date().toISOString().split('T')[0],
            dataFim: datas[datas.length - 1] ?? new Date().toISOString().split('T')[0],
            saldoExtrato: saldo,
            saldoContabil: saldo,
            diferenca: 0,
            itensConferidos: movs.length,
            itensPendentes: 0,
            status: 'CONCILIADO',
            empresaId: this.empresaId,
            tenantId: this.tenantId,
            createdAt: new Date().toISOString(),
          };
          const ops: Observable<unknown>[] = [...updates];
          if (contaId) ops.push(this.appwrite.createDocument(COL_CONCILIACOES, conciliacao));
          return this.runSequential(ops);
        }),
      );
  }

  desconciliar(movimentoId: string): Observable<unknown> {
    return this.appwrite.updateDocument<MovimentoBancarioDoc>(COL_MOVIMENTOS, movimentoId, { conciliado: false });
  }

  /** Executa observables em sequência e completa ao final. */
  private runSequential(ops: Observable<unknown>[]): Observable<unknown> {
    return new Observable<unknown>(subscriber => {
      let i = 0;
      const next = (): void => {
        if (i >= ops.length) {
          subscriber.next(null);
          subscriber.complete();
          return;
        }
        ops[i++].subscribe({
          next: () => {},
          error: err => subscriber.error(err),
          complete: () => next(),
        });
      };
      next();
    });
  }
}
