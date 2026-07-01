// Encargos PATRONAIS (do empregador) — INSS patronal 20% (SEM teto), RAT×FAP e
// terceiros (Sistema S). Módulo PURO (sem Angular). Separado de folha-calc.ts de
// propósito: o INSS do EMPREGADO tem teto + faixas progressivas; o patronal NÃO.
// Alimenta a DCTFWeb e o S-1200/totalizadores — entra como encargo, não desconto.

import { round2 } from './folha-calc';

/** Alíquota do INSS patronal (cota da empresa) sobre a folha. */
export const ALIQ_INSS_PATRONAL = 0.20;

/**
 * INSS patronal: 20% sobre o TOTAL da remuneração, **SEM teto** (≠ INSS do empregado,
 * que é progressivo e limitado ao teto do segurado). NÃO reaproveitar `calcularInss`.
 */
export function calcularInssPatronal(baseTotal: number): number {
  return round2(baseTotal * ALIQ_INSS_PATRONAL);
}

/**
 * RAT efetivo (%) = RAT × FAP.
 *  - RAT (1, 2 ou 3%) vem do CNAE preponderante;
 *  - FAP (0,5 a 2,0) é individual da empresa (carta da Receita).
 * Ex.: RAT 2% × FAP 1,5 = 3%.
 */
export function ratEfetivo(rat: number, fap: number): number {
  return round2(rat * fap);
}

/** Configuração patronal por empresa (parametrizável, por vigência — nada chumbado). */
export interface ConfigPatronal {
  /** RAT do CNAE: 1, 2 ou 3 (%). */
  rat: number;
  /** FAP individual: 0,5 a 2,0. */
  fap: number;
  /** Alíquota de terceiros (Sistema S) do enquadramento FPAS (%). */
  aliqTerceiros: number;
  /**
   * Recolhe a cota patronal própria? Default true. `false` para Simples Nacional
   * Anexos I–III/V (a patronal já está no DAS) — evita cobrar em duplicidade.
   */
  recolhePatronal?: boolean;
}

export interface EncargosPatronais {
  inssPatronal: number;
  ratEfetivo: number;
  valorRat: number;
  terceiros: number;
  total: number;
}

/**
 * Calcula os encargos patronais sobre a base (total da remuneração do mês, sem teto).
 * total = INSS patronal (20%) + RAT efetivo (RAT×FAP) + terceiros.
 */
export function calcularEncargosPatronais(baseTotal: number, cfg: ConfigPatronal): EncargosPatronais {
  if (cfg.recolhePatronal === false) {
    return { inssPatronal: 0, ratEfetivo: 0, valorRat: 0, terceiros: 0, total: 0 };
  }
  const rEf = ratEfetivo(cfg.rat, cfg.fap);
  const inssPatronal = calcularInssPatronal(baseTotal);
  const valorRat = round2(baseTotal * rEf / 100);
  const terceiros = round2(baseTotal * cfg.aliqTerceiros / 100);
  return {
    inssPatronal,
    ratEfetivo: rEf,
    valorRat,
    terceiros,
    total: round2(inssPatronal + valorRat + terceiros),
  };
}

/**
 * Tabela de referência (conveniência) dos códigos FPAS/terceiros mais comuns → alíquota (%).
 * NÃO é exaustiva (há 100+ combinações); o valor efetivo vem do enquadramento da empresa
 * (`ConfigPatronal.aliqTerceiros`). Serve só para preencher/validar o cadastro.
 */
export const TABELA_TERCEIROS_REF: Record<string, number> = {
  '515': 5.8,  // comércio (FPAS 515): SESC 1,5 + SENAC 1,0 + INCRA 0,2 + Sal-Educ 2,5 + Sebrae 0,6
  '507': 5.8,  // indústria (FPAS 507): SESI 1,5 + SENAI 1,0 + INCRA 0,2 + Sal-Educ 2,5 + Sebrae 0,6
  '583': 5.8,  // serviços/transporte
};
