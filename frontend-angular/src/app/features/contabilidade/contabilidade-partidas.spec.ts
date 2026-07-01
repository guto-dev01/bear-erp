import { validarPartidas, montarPersistenciaPartidas, parsePartidas, PartidaLancamento } from './contabilidade-partidas';

const d = (valor: number, contaId = 'cd'): PartidaLancamento => ({ contaId, tipo: 'DEBITO', valor });
const c = (valor: number, contaId = 'cc'): PartidaLancamento => ({ contaId, tipo: 'CREDITO', valor });

describe('validarPartidas — trava de partida dobrada', () => {
  it('(1) balanceado: 3 débitos + 2 créditos → ok', () => {
    expect(validarPartidas([d(30), d(30), d(40), c(60), c(40)]).ok).toBe(true);
  });
  it('(2) desbalanceado → rejeita (hoje passava com "Balanço OK" falso)', () => {
    const r = validarPartidas([d(100), c(90)]);
    expect(r.ok).toBe(false);
    expect(r.erro).toContain('desbalanceadas');
  });
  it('(3) borda de centavo: 100,00 vs 99,99 (diff 0,01) → rejeita', () => {
    expect(validarPartidas([d(100.00), c(99.99)]).ok).toBe(false);
  });
  it('(3b) ruído sub-centavo: 33,33+33,33+33,34 vs 100,00 → aceita', () => {
    expect(validarPartidas([d(33.33), d(33.33), d(33.34), c(100.00)]).ok).toBe(true);
  });
  it('exige ao menos um débito e um crédito', () => {
    expect(validarPartidas([d(50), d(50)]).ok).toBe(false);
  });
});

describe('montarPersistenciaPartidas — não trunca', () => {
  it('preserva as 5 partidas no JSON + par primário + total', () => {
    const ps = [d(30, 'a'), d(30, 'b'), d(40, 'cc'), c(60, 'x'), c(40, 'y')];
    const p = montarPersistenciaPartidas(ps);
    expect(parsePartidas(p.partidas).length).toBe(5);   // round-trip sem truncar
    expect(p.contaDebitoId).toBe('a');                  // 1º débito (exibição)
    expect(p.contaCreditoId).toBe('x');                 // 1º crédito
    expect(p.valor).toBe(100);                          // total
  });
});

describe('parsePartidas', () => {
  it('parseia JSON string e tolera lixo/ausência', () => {
    expect(parsePartidas('[{"contaId":"a","tipo":"DEBITO","valor":10}]').length).toBe(1);
    expect(parsePartidas('nao-json')).toEqual([]);
    expect(parsePartidas(undefined)).toEqual([]);
  });
});
