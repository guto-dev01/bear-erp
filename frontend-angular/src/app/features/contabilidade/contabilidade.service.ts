import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

// ── Tipos de documentos Appwrite ───────────────────────────────
interface PlanoContaDoc {
  $id: string;
  $createdAt: string;
  codigo: string;
  nome: string;
  tipo: string;          // SINTETICA | ANALITICA
  natureza: string;      // DEVEDORA | CREDORA
  classificacao: string; // ATIVO | PASSIVO | PATRIMONIO_LIQUIDO | RECEITA | DESPESA | CUSTO
  contaPaiId?: string;
  nivel: number;
  aceitaLancamento?: boolean;
  empresaId: string;
  tenantId: string;
  ativo?: boolean;
}

interface LancamentoDoc {
  $id: string;
  $createdAt: string;
  numero: number;
  data: string;
  tipo: string;
  historico: string;
  valor: number;
  contaDebitoId: string;
  contaCreditoId: string;
  contaDebitoCodigo?: string;
  contaCreditoCodigo?: string;
  documentoRef?: string;
  competencia: string; // YYYY-MM
  status: string;      // NORMAL | ESTORNADO | ESTORNO
  empresaId: string;
  tenantId: string;
}

interface CentroCustoDoc {
  $id: string;
  $createdAt: string;
  codigo: string;
  descricao: string;
  centroPaiId?: string;
  nivel?: number;
  tipo: string;
  responsavel?: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

interface RegraDoc {
  $id: string;
  $createdAt: string;
  nome: string;
  descricao?: string;
  tipoEvento: string;
  contaDebito: string;
  contaCredito: string;
  condicao?: string;
  historicoPadrao?: string;
  ativa?: boolean;
  prioridade?: number;
  empresaId: string;
  tenantId: string;
}

interface PeriodoDoc {
  $id: string;
  $createdAt: string;
  ano: number;
  mes: number;
  status: string;
  dataFechamento?: string;
  empresaId: string;
  tenantId: string;
}

interface ExercicioDoc {
  $id: string;
  $createdAt: string;
  ano: number;
  status: string;
  dataEncerramento?: string;
  empresaId: string;
  tenantId: string;
}

interface HistoricoDoc {
  $id: string;
  $createdAt: string;
  codigo: string;
  descricao: string;
  empresaId: string;
  tenantId: string;
}

// ── Tipos de view consumidos pelos componentes ────────────────
export interface ContaView {
  id: string;
  $id: string;
  codigo: string;
  descricao: string;
  nome: string;
  natureza: string;
  tipo: string;
  classificacao: string;
  contaPaiId?: string;
  nivel: number;
  aceitaLancamento: boolean;
  filhos?: ContaView[];
}

export interface ContaRef {
  id: string;
  codigo: string;
  descricao: string;
}

export interface PartidaView {
  contaId: string;
  tipo: 'DEBITO' | 'CREDITO';
  valor: number;
}

export interface LancamentoView {
  id: string;
  $id: string;
  numero: number;
  data: string;
  tipo: string;
  historico: string;
  valor: number;
  competencia: string;
  status: string;
  estornado: boolean;
  contaDebito?: ContaRef;
  contaCredito?: ContaRef;
  partidas?: PartidaView[];
}

export interface Page<T> {
  content: T[];
  totalElements: number;
}

export interface LinhaBalancete {
  codigo: string;
  descricao: string;
  natureza: string;
  classificacao: string;
  nivel: number;
  saldoAnterior: number;
  debitos: number;
  creditos: number;
  saldoAtual: number;
}

export interface DreResult {
  linhas: {
    descricao: string;
    valor: number;
    nivel: number;
    tipo: string;
    destaque?: boolean;
  }[];
  receitaBruta: number;
  custos: number;
  despesas: number;
  resultadoLiquido: number;
}

export interface ContaBP {
  codigo: string;
  descricao: string;
  nivel: number;
  saldo: number;
  tipo: 'GRUPO' | 'ANALITICA';
  natureza: 'ATIVO' | 'PASSIVO' | 'PL';
}

export interface CentroCustoView {
  $id: string;
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  responsavel: string;
  orcamento: number;
  valorUtilizado: number;
  status: string;
}

export interface RegraView {
  $id: string;
  id: string;
  nome: string;
  descricao: string;
  tipoEvento: string;
  contaDebito: string;
  contaCredito: string;
  condicao: string;
  historicoPadrao: string;
  ativa: boolean;
  prioridade: number;
}

interface FixoDoc {
  $id: string;
  $createdAt: string;
  historico: string;
  contaDebitoId: string;
  contaCreditoId: string;
  contaDebitoCodigo?: string;
  contaCreditoCodigo?: string;
  valor: number;
  diaVencimento?: number;
  tipo?: string;
  ativo?: boolean;
  vigenciaInicio?: string; // YYYY-MM
  vigenciaFim?: string;    // YYYY-MM
  empresaId: string;
  tenantId: string;
}

export interface FixoView {
  id: string;
  $id: string;
  historico: string;
  contaDebitoId: string;
  contaCreditoId: string;
  contaDebitoCodigo: string;
  contaCreditoCodigo: string;
  valor: number;
  diaVencimento: number;
  tipo: string;
  ativo: boolean;
  vigenciaInicio: string;
  vigenciaFim: string;
}

const COL_PLANO = 'plano_contas';
const COL_LANC = 'lancamentos';
const COL_FIXOS = 'lancamentos_fixos';
const COL_CENTROS = 'centros_custo';
const COL_REGRAS = 'regras_contabilizacao';
const COL_PERIODOS = 'periodos_contabeis';
const COL_EXERCICIOS = 'exercicios_contabeis';
const COL_HISTORICOS = 'historicos_padrao';
const COL_EMPRESAS = 'empresas';

export interface EmpresaContabil {
  id: string;
  nome: string;
  cnpj: string;        // só dígitos
  ie: string;
  im: string;
  municipio: string;
  uf: string;
  nire: string;
  codMun: string;      // código IBGE (se cadastrado)
  regimeTributario: string;
  // Signatários
  contadorNome: string;
  contadorCpf: string;
  contadorCrc: string;
  contadorCrcUf: string;
  responsavelNome: string;
  responsavelCpf: string;
  responsavelQualificacao: string;
}

@Injectable({ providedIn: 'root' })
export class ContabilidadeService {
  constructor(private appwrite: AppwriteService, private auth: AuthService) {}

  private get tenantId(): string { return this.auth.tenantId() || 'default'; }
  private get empresaId(): string { return this.auth.empresaId() || ''; }

  private baseQueries(): string[] {
    return [this.appwrite.query.limit(100), this.appwrite.query.orderDesc('$createdAt')];
  }

  private tenantScope(): string[] {
    const qs = [this.appwrite.query.equal('tenantId', this.tenantId)];
    if (this.empresaId) qs.push(this.appwrite.query.equal('empresaId', this.empresaId));
    return qs;
  }

  /** Empresa atualmente selecionada (para termos dos livros e Bloco 0 do ECD). */
  getEmpresaAtual(): Observable<EmpresaContabil | null> {
    const id = this.empresaId;
    if (!id) return of(null);
    return this.appwrite.getDocument<any>(COL_EMPRESAS, id).pipe(
      map((e: any) => ({
        id: e.$id,
        nome: e.razaoSocial || e.nomeFantasia || '',
        cnpj: (e.cnpj || '').replace(/\D/g, ''),
        ie: e.inscricaoEstadual || '',
        im: e.inscricaoMunicipal || '',
        municipio: e.cidade || '',
        uf: e.uf || '',
        nire: e.nire || '',
        codMun: e.codigoMunicipio || e.codMun || '',
        regimeTributario: e.regimeTributario || '',
        contadorNome: e.contadorNome || '',
        contadorCpf: (e.contadorCpf || '').replace(/\D/g, ''),
        contadorCrc: e.contadorCrc || '',
        contadorCrcUf: e.contadorCrcUf || '',
        responsavelNome: e.responsavelNome || '',
        responsavelCpf: (e.responsavelCpf || '').replace(/\D/g, ''),
        responsavelQualificacao: e.responsavelQualificacao || '',
      } as EmpresaContabil)),
    );
  }

  // ── helpers de mapeamento ─────────────────────────────────────
  private mapConta = (d: PlanoContaDoc): ContaView => ({
    id: d.$id,
    $id: d.$id,
    codigo: d.codigo,
    descricao: d.nome,
    nome: d.nome,
    natureza: d.natureza,
    tipo: d.tipo,
    classificacao: d.classificacao,
    contaPaiId: d.contaPaiId,
    nivel: d.nivel ?? 0,
    aceitaLancamento: d.aceitaLancamento ?? (d.tipo === 'ANALITICA'),
  });

  private mapLancamento(d: LancamentoDoc, contasById: Map<string, ContaView>): LancamentoView {
    const cd = contasById.get(d.contaDebitoId);
    const cc = contasById.get(d.contaCreditoId);
    const debRef: ContaRef = { id: d.contaDebitoId, codigo: cd?.codigo ?? d.contaDebitoCodigo ?? '', descricao: cd?.descricao ?? '' };
    const credRef: ContaRef = { id: d.contaCreditoId, codigo: cc?.codigo ?? d.contaCreditoCodigo ?? '', descricao: cc?.descricao ?? '' };
    const estornado = d.status === 'ESTORNADO';
    return {
      id: d.$id,
      $id: d.$id,
      numero: d.numero,
      data: d.data,
      tipo: d.tipo,
      historico: d.historico,
      valor: d.valor,
      competencia: d.competencia,
      status: d.status,
      estornado,
      contaDebito: debRef,
      contaCredito: credRef,
      partidas: [
        { contaId: d.contaDebitoId, tipo: 'DEBITO', valor: d.valor },
        { contaId: d.contaCreditoId, tipo: 'CREDITO', valor: d.valor },
      ],
    };
  }

  // ════════════════════════════════════════════════════════════
  // Plano de Contas
  // ════════════════════════════════════════════════════════════
  private loadContas(): Observable<ContaView[]> {
    return this.appwrite
      .listDocuments<PlanoContaDoc>(COL_PLANO, [...this.tenantScope(), this.appwrite.query.limit(100), this.appwrite.query.orderAsc('codigo')])
      .pipe(map(docs => docs.map(this.mapConta)));
  }

  listContas(): Observable<ContaView[]> { return this.loadContas(); }

  getContaById(id: string): Observable<ContaView> {
    return this.appwrite.getDocument<PlanoContaDoc>(COL_PLANO, id).pipe(map(this.mapConta));
  }

  createConta(data: Record<string, unknown>): Observable<ContaView> {
    return this.appwrite.createDocument<PlanoContaDoc>(COL_PLANO, this.buildContaPayload(data)).pipe(map(this.mapConta));
  }

  updateConta(id: string, data: Record<string, unknown>): Observable<ContaView> {
    return this.appwrite.updateDocument<PlanoContaDoc>(COL_PLANO, id, this.buildContaPayload(data, true)).pipe(map(this.mapConta));
  }

  deleteConta(id: string): Observable<unknown> { return this.appwrite.deleteDocument(COL_PLANO, id); }

  /** "árvore" = montar hierarquia no cliente por contaPaiId, com fallback por código. */
  getArvoreContas(): Observable<ContaView[]> {
    return this.loadContas().pipe(map(contas => this.buildArvore(contas)));
  }

  /** "analíticas" = contas que aceitam lançamento. */
  listContasAnaliticas(): Observable<ContaView[]> {
    return this.loadContas().pipe(map(contas => contas.filter(c => c.aceitaLancamento || c.tipo === 'ANALITICA')));
  }

  /**
   * Importa um plano de contas referencial mínimo (CFC/CPC) criando os documentos
   * no Appwrite. Sem dependência externa — gera as contas básicas localmente.
   */
  importPlanoReferencial(): Observable<ContaView[]> {
    const ref = this.planoReferencial();
    const creates = ref.map(c => this.appwrite.createDocument<PlanoContaDoc>(COL_PLANO, this.buildContaPayload(c)));
    return forkJoin(creates).pipe(map(docs => docs.map(this.mapConta)));
  }

  private buildContaPayload(data: Record<string, unknown>, isUpdate = false): Record<string, unknown> {
    const tipo = (data['tipo'] as string) ?? 'ANALITICA';
    const aceita = data['aceitaLancamento'] != null ? !!data['aceitaLancamento'] : tipo === 'ANALITICA';
    const payload: Record<string, unknown> = {
      codigo: data['codigo'],
      nome: (data['nome'] ?? data['descricao']) as string,
      tipo,
      natureza: data['natureza'],
      classificacao: data['classificacao'],
      nivel: data['nivel'] != null ? Number(data['nivel']) : this.nivelFromCodigo((data['codigo'] as string) ?? ''),
      aceitaLancamento: aceita,
      ativo: data['ativo'] != null ? !!data['ativo'] : true,
    };
    if (data['contaPaiId'] != null) payload['contaPaiId'] = data['contaPaiId'];
    if (!isUpdate) {
      payload['tenantId'] = this.tenantId;
      payload['empresaId'] = this.empresaId;
    }
    return payload;
  }

  private nivelFromCodigo(codigo: string): number {
    if (!codigo) return 1;
    return codigo.split('.').length;
  }

  private buildArvore(contas: ContaView[]): ContaView[] {
    const byId = new Map<string, ContaView>();
    const nodes = contas.map(c => ({ ...c, filhos: [] as ContaView[] }));
    nodes.forEach(n => byId.set(n.id, n));
    const byCodigo = new Map<string, ContaView>();
    nodes.forEach(n => byCodigo.set(n.codigo, n));
    const roots: ContaView[] = [];
    for (const n of nodes) {
      let parent: ContaView | undefined;
      if (n.contaPaiId && byId.has(n.contaPaiId)) {
        parent = byId.get(n.contaPaiId);
      } else {
        const parentCode = this.parentCodigo(n.codigo);
        if (parentCode) parent = byCodigo.get(parentCode);
      }
      if (parent && parent !== n) parent.filhos!.push(n);
      else roots.push(n);
    }
    const sortRec = (list: ContaView[]) => {
      list.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
      list.forEach(c => c.filhos && sortRec(c.filhos));
    };
    sortRec(roots);
    return roots;
  }

  private parentCodigo(codigo: string): string | null {
    const parts = codigo.split('.');
    if (parts.length <= 1) return null;
    return parts.slice(0, -1).join('.');
  }

  // ════════════════════════════════════════════════════════════
  // Lançamentos
  // ════════════════════════════════════════════════════════════
  listLancamentos(page = 0, size = 20): Observable<Page<LancamentoView>> {
    return this.loadContasMap().pipe(
      switchMap(contasById =>
        this.appwrite
          .listDocuments<LancamentoDoc>(COL_LANC, [...this.tenantScope(), this.appwrite.query.limit(100), this.appwrite.query.orderDesc('numero')])
          .pipe(
            map(docs => {
              const all = docs.map(d => this.mapLancamento(d, contasById));
              const start = page * size;
              return { content: all.slice(start, start + size), totalElements: all.length };
            }),
          ),
      ),
    );
  }

  getLancamento(id: string): Observable<LancamentoView> {
    return this.loadContasMap().pipe(
      switchMap(contasById =>
        this.appwrite.getDocument<LancamentoDoc>(COL_LANC, id).pipe(map(d => this.mapLancamento(d, contasById))),
      ),
    );
  }

  /**
   * Cria lançamento. Aceita o formato com partidas (DÉBITO/CRÉDITO) usado pelo
   * formulário e converte para os campos planos da coleção `lancamentos`.
   */
  createLancamento(data: Record<string, unknown>): Observable<LancamentoView> {
    return this.nextNumero().pipe(
      switchMap(numero => {
        const payload = this.buildLancamentoPayload(data, numero);
        return this.appwrite.createDocument<LancamentoDoc>(COL_LANC, payload).pipe(
          switchMap(() => this.getLancamentoFresh(payload)),
        );
      }),
    );
  }

  private getLancamentoFresh(payload: Record<string, unknown>): Observable<LancamentoView> {
    return this.loadContasMap().pipe(
      map(contasById => this.mapLancamento(payload as unknown as LancamentoDoc, contasById)),
    );
  }

  /** "estornar" = atualiza status do lançamento para ESTORNADO. */
  estornarLancamento(id: string, _data: Record<string, unknown>): Observable<LancamentoView> {
    return this.appwrite.updateDocument<LancamentoDoc>(COL_LANC, id, { status: 'ESTORNADO' }).pipe(
      switchMap(() => this.getLancamento(id)),
    );
  }

  listByCompetencia(ano: number, mes: number): Observable<LancamentoView[]> {
    const competencia = `${ano}-${String(mes).padStart(2, '0')}`;
    return this.loadContasMap().pipe(
      switchMap(contasById =>
        this.appwrite
          .listDocuments<LancamentoDoc>(COL_LANC, [
            ...this.tenantScope(),
            this.appwrite.query.equal('competencia', competencia),
            this.appwrite.query.limit(100),
            this.appwrite.query.orderDesc('numero'),
          ])
          .pipe(map(docs => docs.map(d => this.mapLancamento(d, contasById)))),
      ),
    );
  }

  private loadContasMap(): Observable<Map<string, ContaView>> {
    return this.loadContas().pipe(
      map(contas => {
        const m = new Map<string, ContaView>();
        contas.forEach(c => m.set(c.id, c));
        return m;
      }),
    );
  }

  private nextNumero(): Observable<number> {
    return this.appwrite
      .listDocuments<LancamentoDoc>(COL_LANC, [...this.tenantScope(), this.appwrite.query.orderDesc('numero'), this.appwrite.query.limit(1)])
      .pipe(map(docs => (docs[0]?.numero ?? 0) + 1));
  }

  private buildLancamentoPayload(data: Record<string, unknown>, numero: number): Record<string, unknown> {
    const partidas = (data['partidas'] as PartidaView[] | undefined) ?? [];
    let contaDebitoId = (data['contaDebitoId'] as string) ?? '';
    let contaCreditoId = (data['contaCreditoId'] as string) ?? '';
    let valor = Number(data['valor'] ?? 0);
    if (partidas.length) {
      const deb = partidas.find(p => p.tipo === 'DEBITO');
      const cred = partidas.find(p => p.tipo === 'CREDITO');
      contaDebitoId = deb?.contaId ?? contaDebitoId;
      contaCreditoId = cred?.contaId ?? contaCreditoId;
      valor = Number(deb?.valor ?? cred?.valor ?? valor);
    }
    const dataStr = (data['data'] as string) ?? new Date().toISOString().split('T')[0];
    const competencia = (data['competencia'] as string) ?? dataStr.slice(0, 7);
    return {
      numero,
      data: dataStr,
      tipo: (data['tipo'] as string) ?? 'NORMAL',
      historico: (data['historico'] as string) ?? '',
      valor,
      contaDebitoId,
      contaCreditoId,
      competencia,
      status: 'NORMAL',
      tenantId: this.tenantId,
      empresaId: this.empresaId,
    };
  }

  // ════════════════════════════════════════════════════════════
  // Balancete (calculado no cliente)
  // ════════════════════════════════════════════════════════════
  gerarBalancete(ano: number, mes: number): Observable<{ linhas: LinhaBalancete[] }> {
    return forkJoin({
      contas: this.loadContas(),
      lancamentos: this.loadAllLancamentos(),
    }).pipe(
      map(({ contas, lancamentos }) => ({ linhas: this.calcBalancete(contas, lancamentos, ano, mes) })),
    );
  }

  private loadAllLancamentos(): Observable<LancamentoDoc[]> {
    return this.appwrite.listDocuments<LancamentoDoc>(COL_LANC, [...this.tenantScope(), this.appwrite.query.limit(100), this.appwrite.query.orderAsc('numero')]);
  }

  private calcBalancete(contas: ContaView[], lancamentos: LancamentoDoc[], ano: number, mes: number): LinhaBalancete[] {
    const competencia = `${ano}-${String(mes).padStart(2, '0')}`;
    // saldoAnterior = movimentos antes da competência; debitos/creditos = na competência.
    const debAnterior = new Map<string, number>();
    const credAnterior = new Map<string, number>();
    const debMes = new Map<string, number>();
    const credMes = new Map<string, number>();
    const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);

    for (const l of lancamentos) {
      if (l.status === 'ESTORNADO') continue;
      const comp = l.competencia ?? (l.data ?? '').slice(0, 7);
      if (comp < competencia) {
        add(debAnterior, l.contaDebitoId, l.valor);
        add(credAnterior, l.contaCreditoId, l.valor);
      } else if (comp === competencia) {
        add(debMes, l.contaDebitoId, l.valor);
        add(credMes, l.contaCreditoId, l.valor);
      }
    }

    const linhas: LinhaBalancete[] = [];
    for (const c of contas) {
      const da = debAnterior.get(c.id) ?? 0;
      const ca = credAnterior.get(c.id) ?? 0;
      const dm = debMes.get(c.id) ?? 0;
      const cm = credMes.get(c.id) ?? 0;
      if (da === 0 && ca === 0 && dm === 0 && cm === 0 && !c.aceitaLancamento) continue;
      const sinal = c.natureza === 'DEVEDORA' ? 1 : -1;
      const saldoAnterior = sinal * (da - ca);
      const saldoAtual = sinal * (da + dm - ca - cm);
      if (da === 0 && ca === 0 && dm === 0 && cm === 0) continue;
      linhas.push({
        codigo: c.codigo,
        descricao: c.descricao,
        natureza: c.natureza,
        classificacao: c.classificacao,
        nivel: c.nivel,
        saldoAnterior,
        debitos: dm,
        creditos: cm,
        saldoAtual,
      });
    }
    linhas.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
    return linhas;
  }

  // ════════════════════════════════════════════════════════════
  // DRE (calculada no cliente)
  // ════════════════════════════════════════════════════════════
  gerarDre(ano: number, mes: number): Observable<DreResult> {
    return forkJoin({
      contas: this.loadContas(),
      lancamentos: this.loadAllLancamentos(),
    }).pipe(map(({ contas, lancamentos }) => this.calcDre(contas, lancamentos, ano, mes)));
  }

  private calcDre(contas: ContaView[], lancamentos: LancamentoDoc[], ano: number, mes: number): DreResult {
    const competencia = `${ano}-${String(mes).padStart(2, '0')}`;
    const contaById = new Map<string, ContaView>();
    contas.forEach(c => contaById.set(c.id, c));
    const deb = new Map<string, number>();
    const cred = new Map<string, number>();
    const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
    for (const l of lancamentos) {
      if (l.status === 'ESTORNADO') continue;
      const comp = l.competencia ?? (l.data ?? '').slice(0, 7);
      if (comp !== competencia) continue;
      add(deb, l.contaDebitoId, l.valor);
      add(cred, l.contaCreditoId, l.valor);
    }
    // Receita: contas RECEITA (natureza credora) -> crédito - débito.
    // Custo/Despesa: contas CUSTO/DESPESA (natureza devedora) -> débito - crédito.
    let receitaBruta = 0;
    let custos = 0;
    let despesas = 0;
    for (const c of contas) {
      const d = deb.get(c.id) ?? 0;
      const cr = cred.get(c.id) ?? 0;
      if (c.classificacao === 'RECEITA') receitaBruta += cr - d;
      else if (c.classificacao === 'CUSTO') custos += d - cr;
      else if (c.classificacao === 'DESPESA') despesas += d - cr;
    }
    const receitaLiquida = receitaBruta;
    const lucroBruto = receitaLiquida - custos;
    const resultadoLiquido = lucroBruto - despesas;
    const linhas = [
      { descricao: 'RECEITA OPERACIONAL BRUTA', valor: receitaBruta, nivel: 0, tipo: 'RECEITA', destaque: true },
      { descricao: '(=) RECEITA OPERACIONAL LÍQUIDA', valor: receitaLiquida, nivel: 0, tipo: 'RECEITA', destaque: true },
      { descricao: '(-) Custo dos Produtos/Serviços', valor: -custos, nivel: 1, tipo: 'CUSTO' },
      { descricao: '(=) LUCRO BRUTO', valor: lucroBruto, nivel: 0, tipo: 'RESULTADO', destaque: true },
      { descricao: '(-) Despesas Operacionais', valor: -despesas, nivel: 1, tipo: 'DESPESA' },
      { descricao: '(=) RESULTADO LÍQUIDO DO EXERCÍCIO', valor: resultadoLiquido, nivel: 0, tipo: 'RESULTADO', destaque: true },
    ];
    return { linhas, receitaBruta, custos, despesas, resultadoLiquido };
  }

  // ════════════════════════════════════════════════════════════
  // Balanço Patrimonial (calculado no cliente)
  // ════════════════════════════════════════════════════════════
  gerarBalanco(dataBase: string): Observable<{ contas: ContaBP[] }> {
    const [anoStr, mesStr] = (dataBase ?? '').split('-');
    const ano = Number(anoStr) || new Date().getFullYear();
    const mes = Number(mesStr) || 12;
    return this.gerarBalancoMensal(ano, mes);
  }

  gerarBalancoMensal(ano: number, mes: number): Observable<{ contas: ContaBP[] }> {
    return forkJoin({
      contas: this.loadContas(),
      lancamentos: this.loadAllLancamentos(),
    }).pipe(map(({ contas, lancamentos }) => ({ contas: this.calcBalanco(contas, lancamentos, ano, mes) })));
  }

  private calcBalanco(contas: ContaView[], lancamentos: LancamentoDoc[], ano: number, mes: number): ContaBP[] {
    const competencia = `${ano}-${String(mes).padStart(2, '0')}`;
    const deb = new Map<string, number>();
    const cred = new Map<string, number>();
    const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
    for (const l of lancamentos) {
      if (l.status === 'ESTORNADO') continue;
      const comp = l.competencia ?? (l.data ?? '').slice(0, 7);
      if (comp > competencia) continue; // acumulado até a data-base
      add(deb, l.contaDebitoId, l.valor);
      add(cred, l.contaCreditoId, l.valor);
    }
    const mapNatureza = (classificacao: string): 'ATIVO' | 'PASSIVO' | 'PL' | null => {
      if (classificacao === 'ATIVO') return 'ATIVO';
      if (classificacao === 'PASSIVO') return 'PASSIVO';
      if (classificacao === 'PATRIMONIO_LIQUIDO') return 'PL';
      return null;
    };
    const result: ContaBP[] = [];
    for (const c of contas) {
      const nat = mapNatureza(c.classificacao);
      if (!nat) continue;
      const d = deb.get(c.id) ?? 0;
      const cr = cred.get(c.id) ?? 0;
      const sinal = c.natureza === 'DEVEDORA' ? 1 : -1;
      const saldo = sinal * (d - cr);
      const isAnalitica = c.aceitaLancamento || c.tipo === 'ANALITICA';
      if (isAnalitica && saldo === 0) continue;
      result.push({
        codigo: c.codigo,
        descricao: c.descricao,
        nivel: c.nivel,
        saldo,
        tipo: isAnalitica ? 'ANALITICA' : 'GRUPO',
        natureza: nat,
      });
    }
    result.sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true }));
    return result;
  }

  // ════════════════════════════════════════════════════════════
  // Períodos
  // ════════════════════════════════════════════════════════════
  listarPeriodos(ano: number): Observable<PeriodoDoc[]> {
    return this.appwrite.listDocuments<PeriodoDoc>(COL_PERIODOS, [
      ...this.tenantScope(),
      this.appwrite.query.equal('ano', ano),
      this.appwrite.query.limit(100),
      this.appwrite.query.orderAsc('mes'),
    ]);
  }

  fecharPeriodo(data: Record<string, unknown>): Observable<PeriodoDoc> {
    const ano = Number(data['ano']);
    const mes = Number(data['mes']);
    return this.appwrite
      .listDocuments<PeriodoDoc>(COL_PERIODOS, [
        ...this.tenantScope(),
        this.appwrite.query.equal('ano', ano),
        this.appwrite.query.equal('mes', mes),
        this.appwrite.query.limit(1),
      ])
      .pipe(
        switchMap(docs => {
          const fechamento = { status: 'FECHADO', dataFechamento: new Date().toISOString() };
          if (docs[0]) return this.appwrite.updateDocument<PeriodoDoc>(COL_PERIODOS, docs[0].$id, fechamento);
          return this.appwrite.createDocument<PeriodoDoc>(COL_PERIODOS, {
            ano, mes, ...fechamento, tenantId: this.tenantId, empresaId: this.empresaId,
          });
        }),
      );
  }

  reabrirPeriodo(ano: number, mes: number): Observable<PeriodoDoc> {
    return this.appwrite
      .listDocuments<PeriodoDoc>(COL_PERIODOS, [
        ...this.tenantScope(),
        this.appwrite.query.equal('ano', ano),
        this.appwrite.query.equal('mes', mes),
        this.appwrite.query.limit(1),
      ])
      .pipe(
        switchMap(docs => {
          if (docs[0]) return this.appwrite.updateDocument<PeriodoDoc>(COL_PERIODOS, docs[0].$id, { status: 'ABERTO' });
          return this.appwrite.createDocument<PeriodoDoc>(COL_PERIODOS, {
            ano, mes, status: 'ABERTO', tenantId: this.tenantId, empresaId: this.empresaId,
          });
        }),
      );
  }

  // ════════════════════════════════════════════════════════════
  // Exercícios
  // ════════════════════════════════════════════════════════════
  criarExercicio(ano: number): Observable<ExercicioDoc> {
    return this.appwrite.createDocument<ExercicioDoc>(COL_EXERCICIOS, {
      ano, status: 'ABERTO', tenantId: this.tenantId, empresaId: this.empresaId,
    });
  }

  encerrarExercicio(ano: number): Observable<ExercicioDoc> {
    return this.appwrite
      .listDocuments<ExercicioDoc>(COL_EXERCICIOS, [
        ...this.tenantScope(),
        this.appwrite.query.equal('ano', ano),
        this.appwrite.query.limit(1),
      ])
      .pipe(
        switchMap(docs => {
          const enc = { status: 'ENCERRADO', dataEncerramento: new Date().toISOString() };
          if (docs[0]) return this.appwrite.updateDocument<ExercicioDoc>(COL_EXERCICIOS, docs[0].$id, enc);
          return this.appwrite.createDocument<ExercicioDoc>(COL_EXERCICIOS, {
            ano, ...enc, tenantId: this.tenantId, empresaId: this.empresaId,
          });
        }),
      );
  }

  // ════════════════════════════════════════════════════════════
  // Históricos Padrão
  // ════════════════════════════════════════════════════════════
  listHistoricos(): Observable<HistoricoDoc[]> {
    return this.appwrite.listDocuments<HistoricoDoc>(COL_HISTORICOS, [...this.tenantScope(), ...this.baseQueries()]);
  }

  createHistorico(data: Record<string, unknown>): Observable<HistoricoDoc> {
    return this.appwrite.createDocument<HistoricoDoc>(COL_HISTORICOS, {
      codigo: data['codigo'], descricao: data['descricao'],
      tenantId: this.tenantId, empresaId: this.empresaId,
    });
  }

  // ════════════════════════════════════════════════════════════
  // Centros de Custo
  // ════════════════════════════════════════════════════════════
  listCentrosCusto(): Observable<CentroCustoView[]> {
    return this.appwrite
      .listDocuments<CentroCustoDoc>(COL_CENTROS, [...this.tenantScope(), ...this.baseQueries()])
      .pipe(map(docs => docs.map(d => this.mapCentro(d))));
  }

  private mapCentro(d: CentroCustoDoc): CentroCustoView {
    return {
      $id: d.$id,
      id: d.$id,
      codigo: d.codigo,
      nome: d.descricao,
      descricao: d.descricao,
      responsavel: d.responsavel ?? '',
      orcamento: 0,
      valorUtilizado: 0,
      status: d.status,
    };
  }

  createCentroCusto(data: Record<string, unknown>): Observable<CentroCustoView> {
    const payload: Record<string, unknown> = {
      codigo: data['codigo'],
      descricao: (data['descricao'] ?? data['nome']) as string,
      tipo: (data['tipo'] as string) ?? 'ANALITICO',
      responsavel: (data['responsavel'] as string) ?? '',
      status: (data['status'] as string) ?? 'ATIVO',
      tenantId: this.tenantId,
      empresaId: this.empresaId,
    };
    if (data['nivel'] != null) payload['nivel'] = Number(data['nivel']);
    if (data['centroPaiId'] != null) payload['centroPaiId'] = data['centroPaiId'];
    return this.appwrite.createDocument<CentroCustoDoc>(COL_CENTROS, payload).pipe(map(d => this.mapCentro(d)));
  }

  // ════════════════════════════════════════════════════════════
  // Regras de Contabilização Automática
  // ════════════════════════════════════════════════════════════
  listRegras(): Observable<RegraView[]> {
    return this.appwrite
      .listDocuments<RegraDoc>(COL_REGRAS, [...this.tenantScope(), this.appwrite.query.limit(100), this.appwrite.query.orderDesc('prioridade')])
      .pipe(map(docs => docs.map(d => this.mapRegra(d))));
  }

  private mapRegra(d: RegraDoc): RegraView {
    return {
      $id: d.$id,
      id: d.$id,
      nome: d.nome,
      descricao: d.descricao ?? '',
      tipoEvento: d.tipoEvento,
      contaDebito: d.contaDebito,
      contaCredito: d.contaCredito,
      condicao: d.condicao ?? '',
      historicoPadrao: d.historicoPadrao ?? '',
      ativa: d.ativa ?? true,
      prioridade: d.prioridade ?? 0,
    };
  }

  createRegra(data: Record<string, unknown>): Observable<RegraView> {
    const payload: Record<string, unknown> = {
      nome: data['nome'],
      descricao: (data['descricao'] as string) ?? '',
      tipoEvento: data['tipoEvento'],
      contaDebito: data['contaDebito'],
      contaCredito: data['contaCredito'],
      condicao: (data['condicao'] as string) ?? '',
      historicoPadrao: (data['historicoPadrao'] as string) ?? '',
      ativa: data['ativa'] != null ? !!data['ativa'] : true,
      prioridade: data['prioridade'] != null ? Number(data['prioridade']) : 0,
      tenantId: this.tenantId,
      empresaId: this.empresaId,
    };
    return this.appwrite.createDocument<RegraDoc>(COL_REGRAS, payload).pipe(map(d => this.mapRegra(d)));
  }

  // ════════════════════════════════════════════════════════════
  // Lançamentos Fixos (recorrentes)
  // ════════════════════════════════════════════════════════════
  private mapFixo = (d: FixoDoc): FixoView => ({
    id: d.$id,
    $id: d.$id,
    historico: d.historico,
    contaDebitoId: d.contaDebitoId,
    contaCreditoId: d.contaCreditoId,
    contaDebitoCodigo: d.contaDebitoCodigo ?? '',
    contaCreditoCodigo: d.contaCreditoCodigo ?? '',
    valor: d.valor,
    diaVencimento: d.diaVencimento ?? 1,
    tipo: d.tipo ?? 'NORMAL',
    ativo: d.ativo ?? true,
    vigenciaInicio: d.vigenciaInicio ?? '',
    vigenciaFim: d.vigenciaFim ?? '',
  });

  listFixos(): Observable<FixoView[]> {
    return this.appwrite
      .listDocuments<FixoDoc>(COL_FIXOS, [...this.tenantScope(), ...this.baseQueries()])
      .pipe(map(docs => docs.map(this.mapFixo)));
  }

  private buildFixoPayload(data: Record<string, unknown>): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      historico: (data['historico'] as string) ?? '',
      contaDebitoId: (data['contaDebitoId'] as string) ?? '',
      contaCreditoId: (data['contaCreditoId'] as string) ?? '',
      contaDebitoCodigo: (data['contaDebitoCodigo'] as string) ?? '',
      contaCreditoCodigo: (data['contaCreditoCodigo'] as string) ?? '',
      valor: Number(data['valor'] ?? 0),
      diaVencimento: data['diaVencimento'] != null ? Number(data['diaVencimento']) : 1,
      tipo: (data['tipo'] as string) ?? 'NORMAL',
      ativo: data['ativo'] != null ? !!data['ativo'] : true,
      vigenciaInicio: (data['vigenciaInicio'] as string) ?? '',
      vigenciaFim: (data['vigenciaFim'] as string) ?? '',
    };
    return payload;
  }

  createFixo(data: Record<string, unknown>): Observable<FixoView> {
    const payload = { ...this.buildFixoPayload(data), tenantId: this.tenantId, empresaId: this.empresaId };
    return this.appwrite.createDocument<FixoDoc>(COL_FIXOS, payload).pipe(map(this.mapFixo));
  }

  updateFixo(id: string, data: Record<string, unknown>): Observable<FixoView> {
    return this.appwrite.updateDocument<FixoDoc>(COL_FIXOS, id, this.buildFixoPayload(data)).pipe(map(this.mapFixo));
  }

  setFixoAtivo(id: string, ativo: boolean): Observable<FixoView> {
    return this.appwrite.updateDocument<FixoDoc>(COL_FIXOS, id, { ativo }).pipe(map(this.mapFixo));
  }

  deleteFixo(id: string): Observable<unknown> { return this.appwrite.deleteDocument(COL_FIXOS, id); }

  /** Um fixo está vigente na competência se início <= comp <= fim (limites opcionais). */
  private fixoVigente(f: FixoView, competencia: string): boolean {
    if (f.vigenciaInicio && competencia < f.vigenciaInicio) return false;
    if (f.vigenciaFim && competencia > f.vigenciaFim) return false;
    return true;
  }

  /**
   * Gera os lançamentos dos fixos ativos para a competência (ano/mês).
   * Idempotente: marca cada lançamento com documentoRef = FIXO:<id>:<competencia>
   * e pula os que já foram gerados.
   */
  gerarFixos(ano: number, mes: number): Observable<{ criados: number; pulados: number; total: number }> {
    const competencia = `${ano}-${String(mes).padStart(2, '0')}`;
    const diasNoMes = new Date(ano, mes, 0).getDate();
    return forkJoin({
      fixos: this.listFixos(),
      lancs: this.loadAllLancamentos(),
      numero: this.nextNumero(),
    }).pipe(
      switchMap(({ fixos, lancs, numero }) => {
        const jaGerados = new Set(lancs.map(l => l.documentoRef).filter(Boolean) as string[]);
        const vigentes = fixos.filter(f => f.ativo && this.fixoVigente(f, competencia));
        const aCriar = vigentes.filter(f => !jaGerados.has(`FIXO:${f.id}:${competencia}`));
        const pulados = vigentes.length - aCriar.length;
        if (!aCriar.length) return of({ criados: 0, pulados, total: vigentes.length });
        let n = numero;
        const creates = aCriar.map(f => {
          const dia = Math.min(Math.max(f.diaVencimento || 1, 1), diasNoMes);
          return this.appwrite.createDocument<LancamentoDoc>(COL_LANC, {
            numero: n++,
            data: `${competencia}-${String(dia).padStart(2, '0')}`,
            tipo: f.tipo || 'NORMAL',
            historico: f.historico,
            valor: f.valor,
            contaDebitoId: f.contaDebitoId,
            contaCreditoId: f.contaCreditoId,
            contaDebitoCodigo: f.contaDebitoCodigo,
            contaCreditoCodigo: f.contaCreditoCodigo,
            competencia,
            status: 'NORMAL',
            documentoRef: `FIXO:${f.id}:${competencia}`,
            tenantId: this.tenantId,
            empresaId: this.empresaId,
          });
        });
        return forkJoin(creates).pipe(map(() => ({ criados: aCriar.length, pulados, total: vigentes.length })));
      }),
    );
  }

  /**
   * "executar" regras: lê as contas a pagar/receber recentes e, para cada regra
   * ativa cujo tipoEvento corresponda, gera os lançamentos contábeis no Appwrite.
   * O cálculo (matching de evento + condição valor) é feito no cliente.
   */
  executarRegras(): Observable<LancamentoView[]> {
    return forkJoin({
      regras: this.listRegras(),
      contas: this.loadContas(),
      pagar: this.appwrite.listDocuments<Record<string, unknown>>('contas_pagar', [...this.tenantScope(), this.appwrite.query.limit(100), this.appwrite.query.orderDesc('$createdAt')]),
      receber: this.appwrite.listDocuments<Record<string, unknown>>('contas_receber', [...this.tenantScope(), this.appwrite.query.limit(100), this.appwrite.query.orderDesc('$createdAt')]),
    }).pipe(
      switchMap(({ regras, contas, pagar, receber }) => {
        const ativas = regras.filter(r => r.ativa);
        const codigoToId = new Map<string, string>();
        contas.forEach(c => codigoToId.set(c.codigo, c.id));
        const payloads: { regra: RegraView; doc: Record<string, unknown> }[] = [];
        const tryMatch = (evento: string, registros: Record<string, unknown>[], dataField: string) => {
          for (const r of ativas.filter(x => x.tipoEvento === evento)) {
            for (const reg of registros) {
              const valor = Number(reg['valor'] ?? 0);
              if (!this.condicaoOk(r.condicao, valor)) continue;
              const dataStr = (reg[dataField] as string) ?? new Date().toISOString().split('T')[0];
              payloads.push({
                regra: r,
                doc: {
                  data: dataStr,
                  competencia: dataStr.slice(0, 7),
                  tipo: 'NORMAL',
                  historico: r.historicoPadrao || r.nome,
                  valor,
                  contaDebitoId: codigoToId.get(r.contaDebito) ?? r.contaDebito,
                  contaCreditoId: codigoToId.get(r.contaCredito) ?? r.contaCredito,
                  contaDebitoCodigo: r.contaDebito,
                  contaCreditoCodigo: r.contaCredito,
                },
              });
            }
          }
        };
        tryMatch('PAGAMENTO', pagar, 'dataVencimento');
        tryMatch('NF_ENTRADA', pagar, 'dataEmissao');
        tryMatch('RECEBIMENTO', receber, 'dataVencimento');
        tryMatch('NF_SAIDA', receber, 'dataEmissao');

        if (!payloads.length) return of<LancamentoView[]>([]);

        return this.nextNumero().pipe(
          switchMap(start => {
            const creates = payloads.map((p, i) =>
              this.appwrite.createDocument<LancamentoDoc>(COL_LANC, {
                ...p.doc,
                numero: start + i,
                status: 'NORMAL',
                tenantId: this.tenantId,
                empresaId: this.empresaId,
              }),
            );
            return forkJoin(creates).pipe(
              switchMap(() => this.loadContasMap()),
              map(contasById =>
                payloads.map((p, i) =>
                  this.mapLancamento(
                    { ...(p.doc as object), numero: start + i, status: 'NORMAL', $id: '', $createdAt: '' } as unknown as LancamentoDoc,
                    contasById,
                  ),
                ),
              ),
            );
          }),
        );
      }),
    );
  }

  private condicaoOk(condicao: string, valor: number): boolean {
    if (!condicao) return true;
    // heurística simples: suporta "valor > N", "valor >= N", "valor < N", "valor <= N", "valor = N"
    const m = condicao.replace(/\s+/g, '').match(/^valor(>=|<=|>|<|=)(\d+(?:\.\d+)?)$/i);
    if (!m) return true;
    const op = m[1];
    const n = Number(m[2]);
    switch (op) {
      case '>': return valor > n;
      case '>=': return valor >= n;
      case '<': return valor < n;
      case '<=': return valor <= n;
      case '=': return valor === n;
      default: return true;
    }
  }

  // ── Plano referencial mínimo (CFC/CPC) ────────────────────────
  private planoReferencial(): Record<string, unknown>[] {
    const c = (codigo: string, nome: string, classificacao: string, natureza: string, tipo: string) =>
      ({ codigo, nome, classificacao, natureza, tipo, aceitaLancamento: tipo === 'ANALITICA' });
    return [
      c('1', 'ATIVO', 'ATIVO', 'DEVEDORA', 'SINTETICA'),
      c('1.1', 'ATIVO CIRCULANTE', 'ATIVO', 'DEVEDORA', 'SINTETICA'),
      c('1.1.01', 'Caixa e Equivalentes', 'ATIVO', 'DEVEDORA', 'ANALITICA'),
      c('1.1.02', 'Bancos Conta Movimento', 'ATIVO', 'DEVEDORA', 'ANALITICA'),
      c('1.1.03', 'Clientes a Receber', 'ATIVO', 'DEVEDORA', 'ANALITICA'),
      c('1.1.04', 'Estoques', 'ATIVO', 'DEVEDORA', 'ANALITICA'),
      c('1.2', 'ATIVO NÃO CIRCULANTE', 'ATIVO', 'DEVEDORA', 'SINTETICA'),
      c('1.2.01', 'Imobilizado', 'ATIVO', 'DEVEDORA', 'ANALITICA'),
      c('2', 'PASSIVO', 'PASSIVO', 'CREDORA', 'SINTETICA'),
      c('2.1', 'PASSIVO CIRCULANTE', 'PASSIVO', 'CREDORA', 'SINTETICA'),
      c('2.1.01', 'Fornecedores', 'PASSIVO', 'CREDORA', 'ANALITICA'),
      c('2.1.02', 'Obrigações Trabalhistas', 'PASSIVO', 'CREDORA', 'ANALITICA'),
      c('2.1.03', 'Obrigações Fiscais', 'PASSIVO', 'CREDORA', 'ANALITICA'),
      c('3', 'PATRIMÔNIO LÍQUIDO', 'PATRIMONIO_LIQUIDO', 'CREDORA', 'SINTETICA'),
      c('3.1', 'Capital Social', 'PATRIMONIO_LIQUIDO', 'CREDORA', 'ANALITICA'),
      c('3.2', 'Reservas de Lucros', 'PATRIMONIO_LIQUIDO', 'CREDORA', 'ANALITICA'),
      c('4', 'RECEITAS', 'RECEITA', 'CREDORA', 'SINTETICA'),
      c('4.1', 'Receita de Vendas/Serviços', 'RECEITA', 'CREDORA', 'ANALITICA'),
      c('5', 'CUSTOS', 'CUSTO', 'DEVEDORA', 'SINTETICA'),
      c('5.1', 'Custo dos Produtos/Serviços', 'CUSTO', 'DEVEDORA', 'ANALITICA'),
      c('6', 'DESPESAS', 'DESPESA', 'DEVEDORA', 'SINTETICA'),
      c('6.1', 'Despesas Administrativas', 'DESPESA', 'DEVEDORA', 'ANALITICA'),
      c('6.2', 'Despesas Comerciais', 'DESPESA', 'DEVEDORA', 'ANALITICA'),
      c('6.3', 'Despesas Financeiras', 'DESPESA', 'DEVEDORA', 'ANALITICA'),
    ];
  }
}
