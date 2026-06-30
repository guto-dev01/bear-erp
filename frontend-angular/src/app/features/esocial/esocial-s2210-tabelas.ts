/**
 * Tabelas de domínio do evento S-2210 (CAT) — leiaute eSocial S-1.3.
 *
 * Mantidas FORA do componente de propósito: os códigos vêm das tabelas oficiais
 * do eSocial e devem ser completados/conferidos contra os arquivos oficiais da
 * S-1.3 (Anexo I — Tabelas). O conjunto abaixo é um ponto de partida curado
 * (enums fechados completos; tabelas longas — parte do corpo, agente causador,
 * situação geradora, CID-10 — vêm com uma amostra representativa a expandir).
 *
 * Fontes oficiais (conferir antes de produção):
 *  - Tabela 13 — Situação geradora / motivo do acidente
 *  - Tabela 14 — Parte do corpo atingida
 *  - Tabela 15 — Agente causador do acidente
 *  - Tabela 16 — Natureza da lesão
 *  - CID-10 (codCID)
 */

export interface OpcaoTabela {
  cod: string;
  desc: string;
}

// ── Enums fechados do leiaute (completos) ────────────────────────────────────

/** indRetif. */
export const IND_RETIF: OpcaoTabela[] = [
  { cod: '1', desc: '1 - Original' },
  { cod: '2', desc: '2 - Retificação' },
];

/** tpAcid — tipo do acidente (código da CAT). */
export const TP_ACID: OpcaoTabela[] = [
  { cod: '0', desc: '0 - Não se aplica' },
  { cod: '1', desc: '1 - Típico' },
  { cod: '2', desc: '2 - Doença' },
  { cod: '3', desc: '3 - Trajeto' },
];

/** tpCat — tipo da CAT. */
export const TP_CAT: OpcaoTabela[] = [
  { cod: '1', desc: '1 - Inicial' },
  { cod: '2', desc: '2 - Reabertura' },
  { cod: '3', desc: '3 - Comunicação de óbito' },
];

/** iniciatCAT — iniciativa da CAT. */
export const INICIAT_CAT: OpcaoTabela[] = [
  { cod: '1', desc: '1 - Iniciativa do empregador' },
  { cod: '2', desc: '2 - Ordem judicial' },
  { cod: '3', desc: '3 - Determinação de órgão fiscalizador' },
];

/** Sim/Não usado em indComunPolicia, houveAfast, indCatObito, indInternacao, indAfast. */
export const SIM_NAO: OpcaoTabela[] = [
  { cod: 'S', desc: 'Sim' },
  { cod: 'N', desc: 'Não' },
];

/** tpLocal — tipo do logradouro/local do acidente. */
export const TP_LOCAL: OpcaoTabela[] = [
  { cod: '1', desc: '1 - Estabelecimento do empregador no Brasil' },
  { cod: '2', desc: '2 - Estabelecimento do empregador no exterior' },
  { cod: '3', desc: '3 - Estabelecimento de terceiros (empregador é tomador)' },
  { cod: '4', desc: '4 - Estabelecimento de terceiros (empregador não é tomador)' },
  { cod: '5', desc: '5 - Via pública' },
  { cod: '6', desc: '6 - Área rural' },
  { cod: '7', desc: '7 - Embarcação' },
  { cod: '9', desc: '9 - Outros' },
];

/** lateralidade da parte atingida. */
export const LATERALIDADE: OpcaoTabela[] = [
  { cod: '0', desc: '0 - Não aplicável' },
  { cod: '1', desc: '1 - Esquerda' },
  { cod: '2', desc: '2 - Direita' },
  { cod: '3', desc: '3 - Ambas' },
];

/** ideOC — órgão de classe do emitente do atestado. */
export const IDE_OC: OpcaoTabela[] = [
  { cod: '1', desc: '1 - CRM' },
  { cod: '2', desc: '2 - CRO' },
  { cod: '3', desc: '3 - RMS (Registro do Ministério da Saúde)' },
];

/** UFs (para uf do local e ufOC). */
export const UFS: string[] = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// ── Tabelas longas (AMOSTRA representativa — expandir com a oficial S-1.3) ────

/** Tabela 13 — Situação geradora do acidente (amostra; expandir). */
export const SIT_GERADORA: OpcaoTabela[] = [
  { cod: '310030500', desc: 'Queda de pessoa com diferença de nível' },
  { cod: '310035000', desc: 'Queda de pessoa em mesmo nível' },
  { cod: '300130200', desc: 'Impacto de pessoa contra objeto parado' },
  { cod: '300230400', desc: 'Impacto sofrido por pessoa (objeto em movimento)' },
  { cod: '305030500', desc: 'Aprisionamento em/sob/entre objetos' },
  { cod: '404010100', desc: 'Contato com eletricidade' },
  { cod: '101010100', desc: 'Esforço excessivo / movimento inadequado' },
  { cod: '999999999', desc: 'Outras (especificar em obsCAT)' },
];

/** Tabela 14 — Parte do corpo atingida (amostra; expandir). */
export const PARTE_CORPO: OpcaoTabela[] = [
  { cod: '751010000', desc: 'Cabeça' },
  { cod: '752030000', desc: 'Olho' },
  { cod: '753050000', desc: 'Mão' },
  { cod: '753010000', desc: 'Braço' },
  { cod: '753030000', desc: 'Dedo da mão' },
  { cod: '755010000', desc: 'Perna' },
  { cod: '755030000', desc: 'Pé' },
  { cod: '754010000', desc: 'Tórax' },
  { cod: '756010000', desc: 'Coluna vertebral' },
  { cod: '759990000', desc: 'Partes múltiplas / outras' },
];

/** Tabela 15 — Agente causador do acidente (amostra; expandir). */
export const AGENTE_CAUSADOR: OpcaoTabela[] = [
  { cod: '301010000', desc: 'Máquina ou equipamento' },
  { cod: '302010000', desc: 'Ferramenta manual' },
  { cod: '305010000', desc: 'Veículo de transporte' },
  { cod: '308010000', desc: 'Superfície / piso' },
  { cod: '310010000', desc: 'Eletricidade' },
  { cod: '312010000', desc: 'Substância química' },
  { cod: '320010000', desc: 'Animal / ser vivo' },
  { cod: '399990000', desc: 'Outros' },
];

/** Tabela 16 — Natureza da lesão (amostra; usada em dscLesao). */
export const NATUREZA_LESAO: OpcaoTabela[] = [
  { cod: '701', desc: 'Corte / laceração / ferida contusa' },
  { cod: '702', desc: 'Fratura' },
  { cod: '703', desc: 'Luxação / entorse / distensão' },
  { cod: '704', desc: 'Contusão / esmagamento' },
  { cod: '705', desc: 'Queimadura' },
  { cod: '706', desc: 'Amputação' },
  { cod: '709', desc: 'Outras / múltiplas' },
];

/** CID-10 (amostra; campo aceita texto livre do código oficial, ex.: S610). */
export const CID10: OpcaoTabela[] = [
  { cod: 'S610', desc: 'Ferimento de dedo(s) da mão' },
  { cod: 'S620', desc: 'Fratura de osso do punho/mão' },
  { cod: 'S820', desc: 'Fratura da perna' },
  { cod: 'T230', desc: 'Queimadura do punho e da mão' },
  { cod: 'S934', desc: 'Entorse/distensão do tornozelo' },
  { cod: 'M545', desc: 'Dor lombar baixa' },
];
