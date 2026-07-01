import { gerarEcd, EcdDados } from './ecd-sped.generator';

function dados(codCtaRef?: string): EcdDados {
  return {
    empresa: { nome: 'Empresa X', cnpj: '12345678000199', uf: 'SP', codMun: '3550308', dtIni: '2026-01-01', dtFim: '2026-12-31' },
    contas: [
      { codigo: '1', descricao: 'ATIVO', classificacao: 'ATIVO', tipo: 'SINTETICA', nivel: 1 },
      { codigo: '1.1.01', descricao: 'Caixa', classificacao: 'ATIVO', tipo: 'ANALITICA', nivel: 3, codSuperior: '1', codCtaRef },
    ],
    saldosPeriodicos: [],
    lancamentos: [],
  };
}

describe('gerarEcd — I051 (mapeamento p/ plano referencial RFB)', () => {
  it('emite I051 com o COD_CTA_REF quando a conta o tem', () => {
    const r = gerarEcd(dados('1.01.01.01'));
    expect(r.arquivo).toContain('|I051|||1.01.01.01|');
  });
  it('não emite I051 quando a conta não tem referencial', () => {
    expect(gerarEcd(dados(undefined)).arquivo).not.toContain('|I051|');
  });
});
