import { selecionarRegra, montarEmissaoNfe, montarContexto, montarItemFiscal, RegraTributariaDoc, NfeFormValue } from './fiscal.types';
import { calcularDocumento } from './engine/motor-tributario';

const regra = (over: Partial<RegraTributariaDoc>): RegraTributariaDoc => ({ nome: 'r', empresaId: 'e', tenantId: 't', ...over });

describe('selecionarRegra — específico ganha, vigência, prefixo NCM', () => {
  const especifica = regra({ ncm: '1234', aliqIcms: 12, cstIcms: '00' });
  const generica = regra({ aliqIcms: 18, cstIcms: '00' });

  it('regra mais específica (por NCM) ganha da genérica', () => {
    expect(selecionarRegra([generica, especifica], { ncm: '12345678', regime: 'PRESUMIDO' })?.aliqIcms).toBe(12);
  });
  it('NCM casa por prefixo; sem match → null', () => {
    expect(selecionarRegra([especifica], { ncm: '12349999' })?.aliqIcms).toBe(12);
    expect(selecionarRegra([especifica], { ncm: '99990000' })).toBeNull();
  });
  it('fora da vigência não aplica', () => {
    const vencida = regra({ ncm: '1234', aliqIcms: 5, vigenciaFim: '2025-12-31' });
    expect(selecionarRegra([vencida], { ncm: '1234', data: '2026-06-01' })).toBeNull();
    expect(selecionarRegra([vencida], { ncm: '1234', data: '2025-06-01' })?.aliqIcms).toBe(5);
  });
  it('regra inativa não aplica', () => {
    expect(selecionarRegra([regra({ ncm: '1234', ativo: false })], { ncm: '1234' })).toBeNull();
  });
});

describe('montarEmissaoNfe — regra sobrepõe CST/alíquota digitados (P1.5)', () => {
  const form: NfeFormValue = {
    tipo: 'SAIDA', destinatario: { inscricaoEstadual: '1', uf: 'SP' },
    itens: [{ ncm: '12345678', quantidade: 10, valorUnitario: 100, cstIcms: '00', aliquotaIcms: 18 }],
  };
  it('com regra (aliq 12) o motor usa 12, não os 18 digitados', () => {
    const r = regra({ ncm: '1234', regime: 'PRESUMIDO', cstIcms: '00', aliqIcms: 12 });
    const { cab, linhas } = montarEmissaoNfe(form, { uf: 'SP', regimeTributario: 'Presumido' }, [r]);
    expect(linhas[0].config.aliqIcms).toBe(12);
    const { totais } = calcularDocumento(montarContexto(cab), linhas.map(montarItemFiscal));
    expect(totais.valorIcms).toBe(120);   // 1000 × 12% (regra), NÃO 180
  });
  it('sem regra → usa os 18 digitados (sem regressão)', () => {
    const { cab, linhas } = montarEmissaoNfe(form, { uf: 'SP', regimeTributario: 'Presumido' });
    const { totais } = calcularDocumento(montarContexto(cab), linhas.map(montarItemFiscal));
    expect(totais.valorIcms).toBe(180);
  });
});
