import {
  calcularItem, calcularDocumento, ALIQUOTAS_REFORMA_2026,
  ContextoFiscal, ItemFiscal,
} from './motor-tributario';

const ctx: ContextoFiscal = {
  regime: 'PRESUMIDO', operacao: 'SAIDA',
  ufOrigem: 'SP', ufDestino: 'SP',          // intraestadual → sem DIFAL/interestadual
  consumidorFinal: false, contribuinteIcms: true,
};

// Item de R$1.000 (10 × R$100), ICMS CST 00 a 18%.
const item = (over: Partial<ItemFiscal['config']> = {}): ItemFiscal => ({
  quantidade: 10, valorUnitario: 100,
  config: { origem: '0', cstIcms: '00', aliqIcms: 18, ...over },
});

describe('Reforma 2026 — IBS/CBS/IS no motor', () => {
  it('fase-teste: IBS 0,1% + CBS 0,9% = 1% da base de R$1.000', () => {
    const r = calcularItem(ctx, item());
    expect(r.baseIbsCbs).toBe(1000);
    expect(r.valorIbsUf).toBe(1);     // 1000 × 0,1%
    expect(r.valorIbsMun).toBe(0);
    expect(r.valorIbs).toBe(1);
    expect(r.valorCbs).toBe(9);       // 1000 × 0,9%
    expect(r.valorIbs + r.valorCbs).toBe(10);  // = 1% (alíquota-teste)
    expect(r.valorIs).toBe(0);
  });

  it('híbrido: IBS/CBS NÃO entram no valorTotalItem (VL_DOC sem IBS/CBS)', () => {
    expect(calcularItem(ctx, item()).valorTotalItem).toBe(1000);
  });

  it('não quebra o ICMS existente (regressão): 18% de 1.000 = 180', () => {
    expect(calcularItem(ctx, item()).valorIcms).toBe(180);
  });

  it('config sobrepõe a alíquota default da CBS', () => {
    expect(calcularItem(ctx, item({ aliqCbs: 5 })).valorCbs).toBe(50);
  });

  it('Imposto Seletivo só incide quando alíquota > 0', () => {
    const r = calcularItem(ctx, item({ aliqIs: 2 }));
    expect(r.valorIs).toBe(20);
    expect(r.baseIs).toBe(1000);
  });

  it('IBS/CBS também incidem em item de serviço (reforma unifica bens e serviços)', () => {
    const r = calcularItem(ctx, { quantidade: 10, valorUnitario: 100, servico: true,
      config: { origem: '0', aliqIss: 5 } });
    expect(r.valorIss).toBe(50);
    expect(r.valorIbs).toBe(1);
    expect(r.valorCbs).toBe(9);
  });

  it('totais do documento somam IBS/CBS/IS sem alterar o valorTotalNota', () => {
    const { totais } = calcularDocumento(ctx, [item()]);
    expect(totais.valorIbs).toBe(1);
    expect(totais.valorCbs).toBe(9);
    expect(totais.valorIs).toBe(0);
    expect(totais.baseIbsCbs).toBe(1000);
    expect(totais.valorTotalNota).toBe(1000);  // híbrido: sem IBS/CBS no total
  });

  it('alíquotas-teste expostas como constante versionável', () => {
    expect(ALIQUOTAS_REFORMA_2026.ibsUf + ALIQUOTAS_REFORMA_2026.ibsMun + ALIQUOTAS_REFORMA_2026.cbs).toBe(1);
  });
});
