import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { AppwriteService } from '@core/services/appwrite.service';
import { AuthService } from '@core/auth/auth.service';

// ────────────────────────────────────────────────────────────
// Documentos Appwrite (apenas os campos definidos em scripts/appwrite-setup.js)
// ────────────────────────────────────────────────────────────
interface NotaFiscalDoc {
  $id: string;
  $createdAt: string;
  tipo: string;            // 'NFE' | 'NFSE'
  numero?: number;
  serie?: string;
  chaveAcesso?: string;
  dataEmissao: string;
  destinatarioNome?: string;
  destinatarioCpfCnpj?: string;
  valorTotal: number;
  valorICMS?: number;
  valorIPI?: number;
  valorPIS?: number;
  valorCOFINS?: number;
  valorISS?: number;
  naturezaOperacao?: string;
  cfop?: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

interface CteDoc {
  $id: string;
  $createdAt: string;
  numero?: number;
  serie?: number;
  chave?: string;
  tipoCte: string;
  modal: string;
  naturezaOperacao?: string;
  remetenteNome?: string;
  remetenteCnpjCpf?: string;
  destinatarioNome?: string;
  destinatarioCnpjCpf?: string;
  valorTotalServico?: number;
  valorCarga?: number;
  produtoPredominante?: string;
  icmsBase?: number;
  icmsAliquota?: number;
  icmsValor?: number;
  dataEmissao?: string;
  status: string;
  protocolo?: string;
  empresaId: string;
  tenantId: string;
}

interface ApuracaoDoc {
  $id: string;
  $createdAt: string;
  tipo: string;            // 'ICMS' | 'PIS_COFINS'
  competencia: string;
  baseCalculo?: number;
  debitos?: number;
  creditos?: number;
  valorApurado?: number;
  valorRecolher?: number;
  saldoCredor?: number;
  status: string;
  empresaId: string;
  tenantId: string;
}

interface EscrituracaoDoc {
  $id: string;
  $createdAt: string;
  tipo: string;
  competencia: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

interface CiapDoc {
  $id: string;
  $createdAt: string;
  descricao: string;
  valor: number;
  parcelas: number;
  parcelaAtual: number;
  competencia: string;
  empresaId: string;
  tenantId: string;
}

interface GuiaDoc {
  $id: string;
  $createdAt: string;
  tipo: string;
  competencia: string;
  valor: number;
  dataVencimento: string;
  dataPagamento?: string;
  status: string;
  empresaId: string;
  tenantId: string;
}

/** Página no formato que os componentes esperam (compatível com Spring Page). */
interface Page<T> {
  content: T[];
  totalElements: number;
  number: number;
  size: number;
}

const NOTAS = 'notas_fiscais';
const CTE = 'cte';
const APURACOES = 'apuracoes_fiscais';
const ESCRITURACOES = 'escrituracoes_fiscais';
const CIAP = 'ciap';
const GUIAS = 'guias_fiscais';

@Injectable({ providedIn: 'root' })
export class FiscalService {
  constructor(private appwrite: AppwriteService, private auth: AuthService) {}

  // ── Contexto de tenant/empresa ─────────────────────────────
  private get tenantId(): string { return this.auth.tenantId() || 'default'; }
  private get empresaId(): string { return this.auth.empresaId() || ''; }

  private get Q() { return this.appwrite.query; }

  private baseQueries(extra: string[] = []): string[] {
    return [this.Q.limit(100), this.Q.orderDesc('$createdAt'), this.Q.equal('tenantId', this.tenantId), ...extra];
  }

  private paginate<T>(items: T[], page: number, size: number): Page<T> {
    const start = page * size;
    return {
      content: items.slice(start, start + size),
      totalElements: items.length,
      number: page,
      size,
    };
  }

  private toNumber(value: unknown): number {
    const n = typeof value === 'number' ? value : parseFloat(String(value ?? 0));
    return isNaN(n) ? 0 : n;
  }

  // ============================================================
  // NF-e  (notas_fiscais, tipo = 'NFE')
  // ============================================================
  /** Normaliza um doc Appwrite para os campos usados no template da NF-e. */
  private mapNfe(doc: NotaFiscalDoc): Record<string, unknown> {
    return {
      ...doc,
      id: doc.$id,
      destinatarioRazaoSocial: doc.destinatarioNome,
      destinatarioCnpjCpf: doc.destinatarioCpfCnpj,
      totalNfe: doc.valorTotal,
    };
  }

  /** Converte o formulário (com destinatário aninhado + itens) para o schema Appwrite. */
  private buildNfePayload(form: Record<string, unknown>): Record<string, unknown> {
    const dest = (form['destinatario'] as Record<string, unknown>) ?? {};
    const itens = (form['itens'] as Array<Record<string, unknown>>) ?? [];
    let valorTotal = 0;
    let valorICMS = 0;
    for (const item of itens) {
      const qtd = this.toNumber(item['quantidade']);
      const vUnit = this.toNumber(item['valorUnitario']);
      const aliq = this.toNumber(item['aliquotaIcms']);
      const subtotal = qtd * vUnit;
      valorTotal += subtotal;
      valorICMS += subtotal * (aliq / 100);
    }
    return {
      tipo: 'NFE',
      dataEmissao: new Date().toISOString().split('T')[0],
      destinatarioNome: (dest['razaoSocial'] as string) ?? '',
      destinatarioCpfCnpj: (dest['cnpjCpf'] as string) ?? '',
      valorTotal,
      valorICMS,
      naturezaOperacao: (form['naturezaOperacao'] as string) ?? '',
      status: 'RASCUNHO',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  listNfes(page = 0, size = 20): Observable<Page<Record<string, unknown>>> {
    return this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, this.baseQueries([this.Q.equal('tipo', 'NFE')])).pipe(
      map(docs => this.paginate(docs.map(d => this.mapNfe(d)), page, size)),
    );
  }

  getNfe(id: string): Observable<Record<string, unknown>> {
    return this.appwrite.getDocument<NotaFiscalDoc>(NOTAS, id).pipe(map(d => this.mapNfe(d)));
  }

  createNfe(data: Record<string, unknown>): Observable<NotaFiscalDoc> {
    return this.appwrite.createDocument<NotaFiscalDoc>(NOTAS, this.buildNfePayload(data));
  }

  autorizarNfe(id: string): Observable<NotaFiscalDoc> {
    // TODO(appwrite): integração externa — transmissão real à SEFAZ não está disponível.
    // Persistimos a mudança de status; a autorização real exige integração externa.
    return this.appwrite.updateDocument<NotaFiscalDoc>(NOTAS, id, { status: 'AUTORIZADA' });
  }

  cancelarNfe(id: string): Observable<NotaFiscalDoc> {
    // TODO(appwrite): integração externa — evento de cancelamento na SEFAZ não disponível.
    return this.appwrite.updateDocument<NotaFiscalDoc>(NOTAS, id, { status: 'CANCELADA' });
  }

  listNfesByTipo(tipo: string): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, this.baseQueries([this.Q.equal('tipo', tipo)])).pipe(
      map(docs => docs.map(d => this.mapNfe(d))),
    );
  }

  // ============================================================
  // NFS-e  (notas_fiscais, tipo = 'NFSE')
  // ============================================================
  private mapNfse(doc: NotaFiscalDoc): Record<string, unknown> {
    return {
      ...doc,
      id: doc.$id,
      tomadorRazaoSocial: doc.destinatarioNome,
      tomadorCpfCnpj: doc.destinatarioCpfCnpj,
      valorServico: doc.valorTotal,
      descricaoServico: doc.naturezaOperacao,
    };
  }

  private buildNfsePayload(form: Record<string, unknown>): Record<string, unknown> {
    const tomador = (form['tomador'] as Record<string, unknown>) ?? {};
    const valorServico = this.toNumber(form['valorServico']);
    const aliquotaIss = this.toNumber(form['aliquotaIss']);
    const valorISS = valorServico * (aliquotaIss / 100);
    return {
      tipo: 'NFSE',
      dataEmissao: new Date().toISOString().split('T')[0],
      destinatarioNome: (tomador['razaoSocial'] as string) ?? '',
      destinatarioCpfCnpj: (tomador['cpfCnpj'] as string) ?? '',
      valorTotal: valorServico,
      valorISS,
      valorPIS: this.toNumber(form['valorPis']),
      valorCOFINS: this.toNumber(form['valorCofins']),
      naturezaOperacao: (form['descricaoServico'] as string) ?? '',
      status: 'RASCUNHO',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  listNfses(page = 0, size = 20): Observable<Page<Record<string, unknown>>> {
    return this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, this.baseQueries([this.Q.equal('tipo', 'NFSE')])).pipe(
      map(docs => this.paginate(docs.map(d => this.mapNfse(d)), page, size)),
    );
  }

  getNfse(id: string): Observable<Record<string, unknown>> {
    return this.appwrite.getDocument<NotaFiscalDoc>(NOTAS, id).pipe(map(d => this.mapNfse(d)));
  }

  createNfse(data: Record<string, unknown>): Observable<NotaFiscalDoc> {
    return this.appwrite.createDocument<NotaFiscalDoc>(NOTAS, this.buildNfsePayload(data));
  }

  autorizarNfse(id: string): Observable<NotaFiscalDoc> {
    // TODO(appwrite): integração externa — transmissão à prefeitura não disponível.
    return this.appwrite.updateDocument<NotaFiscalDoc>(NOTAS, id, { status: 'AUTORIZADA' });
  }

  cancelarNfse(id: string, _motivo: string): Observable<NotaFiscalDoc> {
    // TODO(appwrite): integração externa — cancelamento na prefeitura não disponível.
    return this.appwrite.updateDocument<NotaFiscalDoc>(NOTAS, id, { status: 'CANCELADA' });
  }

  // ============================================================
  // Apuração ICMS  (apuracoes_fiscais, tipo = 'ICMS')
  // Cálculo reimplementado no cliente a partir de notas_fiscais.
  // ============================================================
  private competencia(ano: number, mes: number): string {
    return `${ano}-${String(mes).padStart(2, '0')}`;
  }

  /** Enriquece o doc persistido com o detalhamento exibido no template. */
  private mapApuracaoIcms(doc: ApuracaoDoc | null, detalhe?: Record<string, number>): Record<string, unknown> | null {
    if (!doc && !detalhe) return null;
    const debitos = detalhe ? detalhe['debitos'] : this.toNumber(doc?.debitos);
    const creditos = detalhe ? detalhe['creditos'] : this.toNumber(doc?.creditos);
    const recolher = detalhe ? detalhe['recolher'] : this.toNumber(doc?.valorRecolher);
    const saldoCredor = detalhe ? detalhe['saldoCredor'] : this.toNumber(doc?.saldoCredor);
    return {
      ...(doc ?? {}),
      id: doc?.$id,
      totalDebitos: debitos,
      totalCreditos: creditos,
      icmsRecolher: recolher,
      saldoCredorTransportar: saldoCredor,
      totalDebitosSaidas: debitos,
      totalCreditosEntradas: creditos,
      outrosDebitos: 0,
      outrosCreditos: 0,
      estornoCreditos: 0,
      estornoDebitos: 0,
      saldoCredorAnterior: 0,
      icmsStRecolher: 0,
      difalRecolher: 0,
      status: doc?.status ?? 'ABERTA',
    };
  }

  calcularApuracaoIcms(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    const comp = this.competencia(ano, mes);
    // Lê as notas fiscais do tenant/empresa e separa débitos (saídas/NFE) de créditos (ICMS de entradas).
    return this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, this.baseQueries([this.Q.equal('empresaId', this.empresaId)])).pipe(
      switchMap(notas => {
        const doMes = notas.filter(n => (n.dataEmissao ?? '').startsWith(comp) && n.status === 'AUTORIZADA');
        // Débito = ICMS destacado em NFE de saída; Crédito = ICMS de notas de entrada (heurística simples).
        const debitos = doMes.filter(n => n.tipo === 'NFE').reduce((s, n) => s + this.toNumber(n.valorICMS), 0);
        const creditos = 0; // sem distinção de entrada no schema atual; mantém zero.
        const apurado = debitos - creditos;
        const recolher = Math.max(apurado, 0);
        const saldoCredor = Math.max(-apurado, 0);
        const payload: Record<string, unknown> = {
          tipo: 'ICMS', competencia: comp,
          baseCalculo: doMes.reduce((s, n) => s + this.toNumber(n.valorTotal), 0),
          debitos, creditos, valorApurado: apurado, valorRecolher: recolher, saldoCredor,
          status: 'ABERTA', empresaId: this.empresaId, tenantId: this.tenantId,
        };
        const detalhe = { debitos, creditos, recolher, saldoCredor };
        // Atualiza apuração existente da competência ou cria nova.
        return this.findApuracao('ICMS', comp).pipe(
          switchMap(existing => existing
            ? this.appwrite.updateDocument<ApuracaoDoc>(APURACOES, existing.$id, payload)
            : this.appwrite.createDocument<ApuracaoDoc>(APURACOES, payload),
          ),
          map(doc => this.mapApuracaoIcms(doc, detalhe)),
        );
      }),
    );
  }

  getApuracaoIcms(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    return this.findApuracao('ICMS', this.competencia(ano, mes)).pipe(map(doc => this.mapApuracaoIcms(doc)));
  }

  listarApuracoesIcms(ano: number): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<ApuracaoDoc>(APURACOES, this.baseQueries([this.Q.equal('tipo', 'ICMS')])).pipe(
      map(docs => docs.filter(d => d.competencia.startsWith(String(ano)))
        .map(d => this.mapApuracaoIcms(d)!)),
    );
  }

  fecharApuracaoIcms(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    return this.findApuracao('ICMS', this.competencia(ano, mes)).pipe(
      switchMap(existing => existing
        ? this.appwrite.updateDocument<ApuracaoDoc>(APURACOES, existing.$id, { status: 'FECHADA' })
        : of(null)),
      map(doc => this.mapApuracaoIcms(doc)),
    );
  }

  // ============================================================
  // Apuração PIS/COFINS  (apuracoes_fiscais, tipo = 'PIS_COFINS')
  // ============================================================
  private mapApuracaoPisCofins(
    doc: ApuracaoDoc | null,
    detalhe?: { pis: number; cofins: number; pisRec: number; cofinsRec: number },
  ): Record<string, unknown> | null {
    if (!doc && !detalhe) return null;
    const pisRec = detalhe ? detalhe.pisRec : this.toNumber(doc?.valorRecolher) / 2;
    const cofinsRec = detalhe ? detalhe.cofinsRec : this.toNumber(doc?.valorRecolher) / 2;
    return {
      ...(doc ?? {}),
      id: doc?.$id,
      pisDebitoSaidas: detalhe?.pis ?? this.toNumber(doc?.debitos) / 2,
      pisCreditoEntradas: 0,
      pisRetidoFonte: 0,
      pisSaldoCredorAnterior: 0,
      pisRecolher: pisRec,
      cofinsDebitoSaidas: detalhe?.cofins ?? this.toNumber(doc?.debitos) / 2,
      cofinsCreditoEntradas: 0,
      cofinsRetidoFonte: 0,
      cofinsSaldoCredorAnterior: 0,
      cofinsRecolher: cofinsRec,
      status: doc?.status ?? 'ABERTA',
    };
  }

  calcularApuracaoPisCofins(ano: number, mes: number, regime = 'NAO_CUMULATIVO'): Observable<Record<string, unknown> | null> {
    const comp = this.competencia(ano, mes);
    // Alíquotas do regime não-cumulativo (padrão); cumulativo usa 0,65% / 3%.
    const aliqPis = regime === 'CUMULATIVO' ? 0.0065 : 0.0165;
    const aliqCofins = regime === 'CUMULATIVO' ? 0.03 : 0.076;
    return this.appwrite.listDocuments<NotaFiscalDoc>(NOTAS, this.baseQueries([this.Q.equal('empresaId', this.empresaId)])).pipe(
      switchMap(notas => {
        const doMes = notas.filter(n => (n.dataEmissao ?? '').startsWith(comp) && n.status === 'AUTORIZADA');
        const baseSaidas = doMes.reduce((s, n) => s + this.toNumber(n.valorTotal), 0);
        // Usa valores destacados quando existirem; senão aplica alíquota sobre a base.
        const pis = doMes.reduce((s, n) => s + this.toNumber(n.valorPIS), 0) || baseSaidas * aliqPis;
        const cofins = doMes.reduce((s, n) => s + this.toNumber(n.valorCOFINS), 0) || baseSaidas * aliqCofins;
        const apurado = pis + cofins;
        const payload: Record<string, unknown> = {
          tipo: 'PIS_COFINS', competencia: comp, baseCalculo: baseSaidas,
          debitos: apurado, creditos: 0, valorApurado: apurado, valorRecolher: apurado, saldoCredor: 0,
          status: 'ABERTA', empresaId: this.empresaId, tenantId: this.tenantId,
        };
        const detalhe = { pis, cofins, pisRec: pis, cofinsRec: cofins };
        return this.findApuracao('PIS_COFINS', comp).pipe(
          switchMap(existing => existing
            ? this.appwrite.updateDocument<ApuracaoDoc>(APURACOES, existing.$id, payload)
            : this.appwrite.createDocument<ApuracaoDoc>(APURACOES, payload),
          ),
          map(doc => this.mapApuracaoPisCofins(doc, detalhe)),
        );
      }),
    );
  }

  getApuracaoPisCofins(ano: number, mes: number): Observable<Record<string, unknown> | null> {
    return this.findApuracao('PIS_COFINS', this.competencia(ano, mes)).pipe(map(doc => this.mapApuracaoPisCofins(doc)));
  }

  listarApuracoesPisCofins(ano: number): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<ApuracaoDoc>(APURACOES, this.baseQueries([this.Q.equal('tipo', 'PIS_COFINS')])).pipe(
      map(docs => docs.filter(d => d.competencia.startsWith(String(ano)))
        .map(d => this.mapApuracaoPisCofins(d)!)),
    );
  }

  private findApuracao(tipo: string, competencia: string): Observable<ApuracaoDoc | null> {
    return this.appwrite.listDocuments<ApuracaoDoc>(APURACOES, [
      this.Q.equal('tenantId', this.tenantId),
      this.Q.equal('tipo', tipo),
      this.Q.equal('competencia', competencia),
      this.Q.limit(1),
    ]).pipe(map(docs => docs[0] ?? null));
  }

  // ============================================================
  // Escrituração Fiscal  (escrituracoes_fiscais)
  // ============================================================
  criarEscrituracao(data: Record<string, unknown>): Observable<EscrituracaoDoc> {
    const payload: Record<string, unknown> = {
      tipo: (data['tipo'] as string) ?? '',
      competencia: (data['competencia'] as string) ?? '',
      status: (data['status'] as string) ?? 'ABERTA',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
    return this.appwrite.createDocument<EscrituracaoDoc>(ESCRITURACOES, payload);
  }

  listarEscrituracoes(ano: number, mes: number): Observable<EscrituracaoDoc[]> {
    const comp = this.competencia(ano, mes);
    return this.appwrite.listDocuments<EscrituracaoDoc>(ESCRITURACOES, this.baseQueries([this.Q.equal('competencia', comp)]));
  }

  listarEscrituracoesPorTipo(tipo: string, ano: number, mes: number): Observable<EscrituracaoDoc[]> {
    const comp = this.competencia(ano, mes);
    return this.appwrite.listDocuments<EscrituracaoDoc>(ESCRITURACOES,
      this.baseQueries([this.Q.equal('tipo', tipo), this.Q.equal('competencia', comp)]));
  }

  // ============================================================
  // CIAP  (ciap)
  // ============================================================
  private mapCiap(doc: CiapDoc): Record<string, unknown> {
    return { ...doc, id: doc.$id };
  }

  listarCiap(): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<CiapDoc>(CIAP, this.baseQueries()).pipe(map(docs => docs.map(d => this.mapCiap(d))));
  }

  criarCiap(data: Record<string, unknown>): Observable<CiapDoc> {
    const payload: Record<string, unknown> = {
      descricao: (data['descricao'] as string) ?? '',
      valor: this.toNumber(data['valor']),
      parcelas: this.toNumber(data['parcelas']) || 48,
      parcelaAtual: this.toNumber(data['parcelaAtual']) || 0,
      competencia: (data['competencia'] as string) ?? '',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
    return this.appwrite.createDocument<CiapDoc>(CIAP, payload);
  }

  apropriarParcelaCiap(id: string): Observable<CiapDoc> {
    // Apropria a próxima parcela do CIAP (cálculo local, sem integração externa).
    return this.appwrite.getDocument<CiapDoc>(CIAP, id).pipe(
      switchMap(doc => {
        const proxima = Math.min(this.toNumber(doc.parcelaAtual) + 1, this.toNumber(doc.parcelas));
        return this.appwrite.updateDocument<CiapDoc>(CIAP, id, { parcelaAtual: proxima });
      }),
    );
  }

  // ============================================================
  // Guias Fiscais  (guias_fiscais)
  // ============================================================
  private mapGuia(doc: GuiaDoc): Record<string, unknown> {
    return {
      ...doc,
      id: doc.$id,
      tipoGuia: doc.tipo,
      valorTotal: doc.valor,
    };
  }

  private buildGuiaPayload(form: Record<string, unknown>): Record<string, unknown> {
    return {
      tipo: (form['tipoGuia'] as string) ?? (form['tipo'] as string) ?? 'DARF',
      competencia: (form['competencia'] as string) ?? '',
      valor: this.toNumber(form['valorPrincipal'] ?? form['valor']),
      dataVencimento: (form['dataVencimento'] as string) ?? '',
      status: 'GERADA',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  criarGuia(data: Record<string, unknown>): Observable<GuiaDoc> {
    return this.appwrite.createDocument<GuiaDoc>(GUIAS, this.buildGuiaPayload(data));
  }

  pagarGuia(id: string, data: Record<string, unknown>): Observable<GuiaDoc> {
    const dataPagamento = (data['dataPagamento'] as string) ?? new Date().toISOString().split('T')[0];
    return this.appwrite.updateDocument<GuiaDoc>(GUIAS, id, { status: 'PAGA', dataPagamento });
  }

  cancelarGuia(id: string): Observable<GuiaDoc> {
    return this.appwrite.updateDocument<GuiaDoc>(GUIAS, id, { status: 'CANCELADA' });
  }

  listarGuiasPorCompetencia(competencia: string): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<GuiaDoc>(GUIAS, this.baseQueries([this.Q.equal('competencia', competencia)])).pipe(
      map(docs => docs.map(d => this.mapGuia(d))),
    );
  }

  listarGuiasVencidas(): Observable<Record<string, unknown>[]> {
    const hoje = new Date().toISOString().split('T')[0];
    return this.appwrite.listDocuments<GuiaDoc>(GUIAS, this.baseQueries()).pipe(
      map(docs => docs
        .filter(d => d.status !== 'PAGA' && d.status !== 'CANCELADA' && (d.dataVencimento ?? '') < hoje)
        .map(d => ({ ...this.mapGuia(d), status: 'VENCIDA' }))),
    );
  }

  listarGuiasPorTipo(tipo: string): Observable<Record<string, unknown>[]> {
    return this.appwrite.listDocuments<GuiaDoc>(GUIAS, this.baseQueries([this.Q.equal('tipo', tipo)])).pipe(
      map(docs => docs.map(d => this.mapGuia(d))),
    );
  }

  // ============================================================
  // CT-e  (cte)
  // ============================================================
  private mapCte(doc: CteDoc): Record<string, unknown> {
    return {
      ...doc,
      id: doc.$id,
      serie: doc.serie,
      valorFrete: doc.valorTotalServico,
    };
  }

  private buildCtePayload(form: Record<string, unknown>): Record<string, unknown> {
    return {
      serie: this.toNumber(form['serie']) || 1,
      tipoCte: (form['tipoServico'] as string) ?? 'NORMAL',
      modal: (form['modal'] as string) ?? 'RODOVIARIO',
      naturezaOperacao: (form['naturezaOperacao'] as string) ?? '',
      remetenteNome: (form['remetenteNome'] as string) ?? '',
      remetenteCnpjCpf: (form['remetenteCnpjCpf'] as string) ?? '',
      destinatarioNome: (form['destinatarioNome'] as string) ?? '',
      destinatarioCnpjCpf: (form['destinatarioCnpjCpf'] as string) ?? '',
      valorTotalServico: this.toNumber(form['valorFrete']),
      valorCarga: this.toNumber(form['valorCarga']),
      icmsBase: this.toNumber(form['baseIcms']),
      icmsAliquota: this.toNumber(form['aliqIcms']),
      icmsValor: this.toNumber(form['baseIcms']) * (this.toNumber(form['aliqIcms']) / 100),
      dataEmissao: new Date().toISOString().split('T')[0],
      status: 'DIGITACAO',
      empresaId: this.empresaId,
      tenantId: this.tenantId,
    };
  }

  listCtes(page = 0, size = 20): Observable<Page<Record<string, unknown>>> {
    return this.appwrite.listDocuments<CteDoc>(CTE, this.baseQueries()).pipe(
      map(docs => this.paginate(docs.map(d => this.mapCte(d)), page, size)),
    );
  }

  createCte(data: Record<string, unknown>): Observable<CteDoc> {
    return this.appwrite.createDocument<CteDoc>(CTE, this.buildCtePayload(data));
  }

  autorizarCte(id: string): Observable<CteDoc> {
    // TODO(appwrite): integração externa — transmissão do CT-e à SEFAZ não disponível.
    return this.appwrite.updateDocument<CteDoc>(CTE, id, { status: 'AUTORIZADO' });
  }

  cancelarCte(id: string, _motivo: string): Observable<CteDoc> {
    // TODO(appwrite): integração externa — evento de cancelamento do CT-e não disponível.
    return this.appwrite.updateDocument<CteDoc>(CTE, id, { status: 'CANCELADO' });
  }
}
