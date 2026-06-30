/**
 * Geração do XML da NF-e (modelo 55, layout 4.00) — módulo PURO.
 *
 * Produz o XML do grupo `<NFe><infNFe>…</infNFe></NFe>` a partir de uma nota
 * estruturada (cabeçalho + emitente/destinatário + itens com tributos já
 * calculados pelo motor). Também calcula a **chave de acesso** de 44 dígitos e
 * seu dígito verificador (módulo 11).
 *
 * O que NÃO está aqui (é ambiente-bound, fora deste módulo):
 *  - Assinatura digital XML-DSig com o certificado A1 (precisa da chave privada);
 *  - Transmissão à SEFAZ (webservice de autorização).
 * Ambos rodam numa Appwrite Function que lê o A1 do cofre (Storage) — ver a nota
 * de arquitetura de integrações gov. Este módulo entrega o XML pronto p/ assinar.
 *
 * Sem dependência de Angular nem de runtime externo: roda no front e em Node.
 */

// ────────────────────────────────────────────────────────────
// Tipos de entrada
// ────────────────────────────────────────────────────────────

export interface EnderecoNFe {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  codMunicipio?: string;
  municipio?: string;
  uf: string;
  cep?: string;
  fone?: string;
}

export interface EmitenteNFe {
  cnpj: string;
  nome: string;
  fantasia?: string;
  ie?: string;
  /** Código de Regime Tributário: 1 Simples, 2 Simples excesso, 3 Normal. */
  crt: string;
  endereco: EnderecoNFe;
}

export interface DestinatarioNFe {
  cnpjCpf: string;
  nome: string;
  ie?: string;
  /** Indicador da IE do destinatário: 1 contribuinte, 2 isento, 9 não contribuinte. */
  indIEDest: string;
  email?: string;
  endereco?: EnderecoNFe;
}

export interface ItemNFe {
  numeroItem: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cest?: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorProdutos: number;
  desconto?: number;
  frete?: number;
  seguro?: number;
  outras?: number;
  origem: string;
  cstIcms?: string;
  csosn?: string;
  modBC?: string;
  baseIcms?: number;
  aliqIcms?: number;
  valorIcms?: number;
  baseIcmsSt?: number;
  aliqIcmsSt?: number;
  valorIcmsSt?: number;
  cstIpi?: string;
  baseIpi?: number;
  aliqIpi?: number;
  valorIpi?: number;
  cstPis?: string;
  basePis?: number;
  aliqPis?: number;
  valorPis?: number;
  cstCofins?: string;
  baseCofins?: number;
  aliqCofins?: number;
  valorCofins?: number;
}

export interface IdentificacaoNFe {
  natOp: string;
  serie: number;
  numero: number;
  /** Data/hora de emissão em ISO (YYYY-MM-DDTHH:mm:ssTZD) ou YYYY-MM-DD. */
  dataEmissao: string;
  /** 0 entrada, 1 saída. */
  tipoOperacao: '0' | '1';
  /** Identificador de destino: 1 interna, 2 interestadual, 3 exterior. */
  idDest?: string;
  /** Tipo de impressão do DANFE (1 retrato). */
  tpImp?: string;
  /** Forma de emissão (1 normal). */
  tpEmis?: string;
  /** Finalidade: 1 normal, 2 complementar, 3 ajuste, 4 devolução. */
  finNFe?: string;
  /** Operação com consumidor final: 0 não, 1 sim. */
  indFinal?: string;
  /** Presença do comprador: 0..9. */
  indPres?: string;
  /** Ambiente: 1 produção, 2 homologação. */
  tpAmb?: string;
  /** Código do município do fato gerador (IBGE). */
  cMunFG?: string;
  /** Código numérico (cNF, 8 dígitos). Derivado do número quando ausente. */
  codigoNumerico?: string;
}

export interface NotaNFe {
  ide: IdentificacaoNFe;
  emit: EmitenteNFe;
  dest: DestinatarioNFe;
  itens: ItemNFe[];
  /** Informações complementares (infCpl). */
  infComplementar?: string;
}

// ────────────────────────────────────────────────────────────
// Tabelas / helpers
// ────────────────────────────────────────────────────────────

/** UF → código IBGE (cUF, 2 dígitos). */
const CUF: Record<string, string> = {
  RO: '11', AC: '12', AM: '13', RR: '14', PA: '15', AP: '16', TO: '17',
  MA: '21', PI: '22', CE: '23', RN: '24', PB: '25', PE: '26', AL: '27', SE: '28', BA: '29',
  MG: '31', ES: '32', RJ: '33', SP: '35',
  PR: '41', SC: '42', RS: '43',
  MS: '50', MT: '51', GO: '52', DF: '53',
};

function so(digits: string | undefined): string {
  return (digits ?? '').replace(/\D/g, '');
}

function pad(v: string | number, len: number): string {
  return String(v).padStart(len, '0').slice(-len);
}

/** Formata número com ponto decimal e N casas (padrão NF-e). */
function vl(n: number | undefined, casas = 2): string {
  const v = typeof n === 'number' && !isNaN(n) ? n : 0;
  return v.toFixed(casas);
}

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Tag com conteúdo; string vazia/undefined → omitida. */
function tag(name: string, value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') return '';
  return `<${name}>${esc(value)}</${name}>`;
}

/** Tag sempre emitida (campo obrigatório), mesmo vazia. */
function tagR(name: string, value: string | number): string {
  return `<${name}>${esc(value)}</${name}>`;
}

// ────────────────────────────────────────────────────────────
// Chave de acesso + dígito verificador
// ────────────────────────────────────────────────────────────

/** Dígito verificador da chave (módulo 11, pesos 2..9 da direita p/ esquerda). */
export function calcularDV(chave43: string): number {
  let peso = 2;
  let soma = 0;
  for (let i = chave43.length - 1; i >= 0; i--) {
    soma += parseInt(chave43[i], 10) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }
  const resto = soma % 11;
  const dv = 11 - resto;
  return dv >= 10 ? 0 : dv;
}

export interface ChaveParams {
  uf: string;
  dataEmissao: string; // YYYY-MM-DD...
  cnpj: string;
  modelo: string | number;
  serie: string | number;
  numero: string | number;
  tpEmis?: string | number;
  codigoNumerico?: string | number;
}

/** Monta a chave de acesso de 44 dígitos (43 + DV). */
export function gerarChaveAcesso(p: ChaveParams): string {
  const cUF = CUF[p.uf] ?? '00';
  const aamm = p.dataEmissao.slice(2, 4) + p.dataEmissao.slice(5, 7);
  const cnpj = pad(so(p.cnpj), 14);
  const mod = pad(p.modelo, 2);
  const serie = pad(p.serie, 3);
  const nNF = pad(p.numero, 9);
  const tpEmis = pad(p.tpEmis ?? 1, 1);
  const cNF = pad(p.codigoNumerico ?? codigoNumericoPadrao(p.numero), 8);
  const chave43 = `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
  return chave43 + String(calcularDV(chave43));
}

/** Código numérico (cNF) determinístico a partir do número (offline/reproduzível). */
function codigoNumericoPadrao(numero: string | number): string {
  const n = Math.abs(parseInt(String(numero), 10) || 0);
  return pad((n * 7 + 13) % 100000000, 8);
}

// ────────────────────────────────────────────────────────────
// Grupos de imposto por item
// ────────────────────────────────────────────────────────────

/** Grupo ICMS (regime normal por CST ou Simples por CSOSN). */
function grupoIcms(it: ItemNFe): string {
  const orig = it.origem ?? '0';
  // Simples Nacional (CSOSN).
  if (it.csosn) {
    const base =
      tagR('orig', orig) +
      tagR('CSOSN', it.csosn);
    if (it.csosn === '101' || it.csosn === '201') {
      return `<ICMSSN101>${base}${tag('pCredSN', vl(it.aliqIcms))}${tag('vCredICMSSN', vl(it.valorIcms))}</ICMSSN101>`;
    }
    if (it.csosn === '500') return `<ICMSSN500>${base}</ICMSSN500>`;
    if (it.csosn === '900') {
      return `<ICMSSN900>${base}${tag('modBC', it.modBC ?? '3')}${tag('vBC', vl(it.baseIcms))}${tag('pICMS', vl(it.aliqIcms))}${tag('vICMS', vl(it.valorIcms))}</ICMSSN900>`;
    }
    return `<ICMSSN102>${base}</ICMSSN102>`;
  }
  // Regime normal (CST).
  const cst = it.cstIcms ?? '00';
  const origCst = tagR('orig', orig) + tagR('CST', cst);
  if (cst === '00') {
    return `<ICMS00>${origCst}${tagR('modBC', it.modBC ?? '3')}${tagR('vBC', vl(it.baseIcms))}${tagR('pICMS', vl(it.aliqIcms))}${tagR('vICMS', vl(it.valorIcms))}</ICMS00>`;
  }
  if (cst === '10' || cst === '70') {
    const tagName = cst === '10' ? 'ICMS10' : 'ICMS70';
    return `<${tagName}>${origCst}${tagR('modBC', it.modBC ?? '3')}${tagR('vBC', vl(it.baseIcms))}${tagR('pICMS', vl(it.aliqIcms))}${tagR('vICMS', vl(it.valorIcms))}` +
      `${tagR('modBCST', '4')}${tagR('vBCST', vl(it.baseIcmsSt))}${tagR('pICMSST', vl(it.aliqIcmsSt))}${tagR('vICMSST', vl(it.valorIcmsSt))}</${tagName}>`;
  }
  if (cst === '20') {
    return `<ICMS20>${origCst}${tagR('modBC', it.modBC ?? '3')}${tagR('vBC', vl(it.baseIcms))}${tagR('pICMS', vl(it.aliqIcms))}${tagR('vICMS', vl(it.valorIcms))}</ICMS20>`;
  }
  if (cst === '40' || cst === '41' || cst === '50') {
    return `<ICMS40>${origCst}</ICMS40>`;
  }
  if (cst === '60') {
    return `<ICMS60>${origCst}${tag('vBCSTRet', vl(it.baseIcmsSt))}${tag('vICMSSTRet', vl(it.valorIcmsSt))}</ICMS60>`;
  }
  // Demais CST → ICMS90 (genérico).
  return `<ICMS90>${origCst}${tagR('modBC', it.modBC ?? '3')}${tagR('vBC', vl(it.baseIcms))}${tagR('pICMS', vl(it.aliqIcms))}${tagR('vICMS', vl(it.valorIcms))}</ICMS90>`;
}

function grupoIpi(it: ItemNFe): string {
  if (!it.cstIpi && !it.valorIpi) return '';
  const cst = it.cstIpi ?? (it.valorIpi ? '50' : '53');
  const trib = it.valorIpi || it.aliqIpi
    ? `<IPITrib>${tagR('CST', cst)}${tagR('vBC', vl(it.baseIpi))}${tagR('pIPI', vl(it.aliqIpi))}${tagR('vIPI', vl(it.valorIpi))}</IPITrib>`
    : `<IPINT>${tagR('CST', cst)}</IPINT>`;
  return `<IPI>${tag('cEnq', '999')}${trib}</IPI>`;
}

function grupoPis(it: ItemNFe): string {
  const cst = it.cstPis ?? '01';
  if (cst === '01' || cst === '02') {
    return `<PIS><PISAliq>${tagR('CST', cst)}${tagR('vBC', vl(it.basePis ?? it.valorProdutos))}${tagR('pPIS', vl(it.aliqPis))}${tagR('vPIS', vl(it.valorPis))}</PISAliq></PIS>`;
  }
  return `<PIS><PISNT>${tagR('CST', cst)}</PISNT></PIS>`;
}

function grupoCofins(it: ItemNFe): string {
  const cst = it.cstCofins ?? '01';
  if (cst === '01' || cst === '02') {
    return `<COFINS><COFINSAliq>${tagR('CST', cst)}${tagR('vBC', vl(it.baseCofins ?? it.valorProdutos))}${tagR('pCOFINS', vl(it.aliqCofins))}${tagR('vCOFINS', vl(it.valorCofins))}</COFINSAliq></COFINS>`;
  }
  return `<COFINS><COFINSNT>${tagR('CST', cst)}</COFINSNT></COFINS>`;
}

function endereco(e: EnderecoNFe | undefined, grupo: string): string {
  if (!e) return '';
  return `<${grupo}>` +
    tag('xLgr', e.logradouro) + tag('nro', e.numero) + tag('xCpl', e.complemento) +
    tag('xBairro', e.bairro) + tag('cMun', e.codMunicipio) + tag('xMun', e.municipio) +
    tagR('UF', e.uf) + tag('CEP', so(e.cep)) + tag('fone', so(e.fone)) +
    `</${grupo}>`;
}

// ────────────────────────────────────────────────────────────
// Totais (ICMSTot)
// ────────────────────────────────────────────────────────────

function soma(itens: ItemNFe[], sel: (it: ItemNFe) => number | undefined): number {
  return Math.round(itens.reduce((s, it) => s + (sel(it) ?? 0), 0) * 100) / 100;
}

function totais(itens: ItemNFe[]): string {
  const vProd = soma(itens, i => i.valorProdutos);
  const vBC = soma(itens, i => i.baseIcms);
  const vICMS = soma(itens, i => i.valorIcms);
  const vBCST = soma(itens, i => i.baseIcmsSt);
  const vST = soma(itens, i => i.valorIcmsSt);
  const vIPI = soma(itens, i => i.valorIpi);
  const vPIS = soma(itens, i => i.valorPis);
  const vCOFINS = soma(itens, i => i.valorCofins);
  const vFrete = soma(itens, i => i.frete);
  const vSeg = soma(itens, i => i.seguro);
  const vDesc = soma(itens, i => i.desconto);
  const vOutro = soma(itens, i => i.outras);
  const vNF = Math.round((vProd + vST + vIPI + vFrete + vSeg + vOutro - vDesc) * 100) / 100;
  return '<ICMSTot>' +
    tagR('vBC', vl(vBC)) + tagR('vICMS', vl(vICMS)) + tagR('vICMSDeson', vl(0)) +
    tagR('vFCP', vl(0)) + tagR('vBCST', vl(vBCST)) + tagR('vST', vl(vST)) +
    tagR('vFCPST', vl(0)) + tagR('vFCPSTRet', vl(0)) +
    tagR('vProd', vl(vProd)) + tagR('vFrete', vl(vFrete)) + tagR('vSeg', vl(vSeg)) +
    tagR('vDesc', vl(vDesc)) + tagR('vII', vl(0)) + tagR('vIPI', vl(vIPI)) +
    tagR('vIPIDevol', vl(0)) + tagR('vPIS', vl(vPIS)) + tagR('vCOFINS', vl(vCOFINS)) +
    tagR('vOutro', vl(vOutro)) + tagR('vNF', vl(vNF)) +
    '</ICMSTot>';
}

// ────────────────────────────────────────────────────────────
// Documento
// ────────────────────────────────────────────────────────────

function itemXml(it: ItemNFe): string {
  const prod = '<prod>' +
    tagR('cProd', it.codigo) + tagR('cEAN', 'SEM GTIN') + tagR('xProd', it.descricao) +
    tagR('NCM', it.ncm) + tag('CEST', it.cest) + tagR('CFOP', it.cfop) +
    tagR('uCom', it.unidade) + tagR('qCom', vl(it.quantidade, 4)) + tagR('vUnCom', vl(it.valorUnitario, 4)) +
    tagR('vProd', vl(it.valorProdutos)) + tagR('cEANTrib', 'SEM GTIN') +
    tagR('uTrib', it.unidade) + tagR('qTrib', vl(it.quantidade, 4)) + tagR('vUnTrib', vl(it.valorUnitario, 4)) +
    tag('vFrete', it.frete ? vl(it.frete) : '') + tag('vSeg', it.seguro ? vl(it.seguro) : '') +
    tag('vDesc', it.desconto ? vl(it.desconto) : '') + tag('vOutro', it.outras ? vl(it.outras) : '') +
    tagR('indTot', '1') +
    '</prod>';
  const imposto = '<imposto>' + `<ICMS>${grupoIcms(it)}</ICMS>` + grupoIpi(it) + grupoPis(it) + grupoCofins(it) + '</imposto>';
  return `<det nItem="${it.numeroItem}">${prod}${imposto}</det>`;
}

/**
 * Literal exigida pela SEFAZ (MOC/Anexo I) na descrição do PRIMEIRO item quando
 * a NF-e é emitida em homologação (tpAmb=2). Sem ela a nota é rejeitada.
 */
export const XPROD_HOMOLOGACAO = 'NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL';

/** Gera o XML da NF-e (não assinado) e devolve a chave de acesso. */
export function gerarXmlNFe(nota: NotaNFe): { chave: string; xml: string } {
  const { ide, emit, dest, itens } = nota;
  const tpAmb = ide.tpAmb ?? '2';
  const modelo = '55';
  const cUF = CUF[emit.endereco.uf] ?? '00';
  const cNF = pad(ide.codigoNumerico ?? codigoNumericoPadrao(ide.numero), 8);

  const chave = gerarChaveAcesso({
    uf: emit.endereco.uf, dataEmissao: ide.dataEmissao, cnpj: emit.cnpj,
    modelo, serie: ide.serie, numero: ide.numero, tpEmis: ide.tpEmis ?? 1, codigoNumerico: cNF,
  });

  const dataEmi = ide.dataEmissao.length <= 10 ? `${ide.dataEmissao}T00:00:00-03:00` : ide.dataEmissao;
  const cnpjEmit = pad(so(emit.cnpj), 14);
  const docDest = so(dest.cnpjCpf);

  const ideXml = '<ide>' +
    tagR('cUF', cUF) + tagR('cNF', cNF) + tagR('natOp', ide.natOp) + tagR('mod', modelo) +
    tagR('serie', ide.serie) + tagR('nNF', ide.numero) + tagR('dhEmi', dataEmi) +
    tagR('tpNF', ide.tipoOperacao) + tagR('idDest', ide.idDest ?? '1') +
    tagR('cMunFG', ide.cMunFG ?? emit.endereco.codMunicipio ?? '') + tagR('tpImp', ide.tpImp ?? '1') +
    tagR('tpEmis', ide.tpEmis ?? '1') + tagR('cDV', chave.slice(-1)) + tagR('tpAmb', tpAmb) +
    tagR('finNFe', ide.finNFe ?? '1') + tagR('indFinal', ide.indFinal ?? '0') + tagR('indPres', ide.indPres ?? '1') +
    tagR('procEmi', '0') + tagR('verProc', 'BearERP-1.0') +
    '</ide>';

  const emitXml = '<emit>' +
    tagR('CNPJ', cnpjEmit) + tagR('xNome', emit.nome) + tag('xFant', emit.fantasia) +
    endereco(emit.endereco, 'enderEmit') + tag('IE', so(emit.ie)) + tagR('CRT', emit.crt) +
    '</emit>';

  const destDocTag = docDest.length > 11 ? tagR('CNPJ', docDest) : tagR('CPF', docDest);
  const destXml = '<dest>' +
    destDocTag + tagR('xNome', dest.nome) +
    endereco(dest.endereco, 'enderDest') + tagR('indIEDest', dest.indIEDest) + tag('IE', so(dest.ie)) +
    tag('email', dest.email) +
    '</dest>';

  // Homologação (tpAmb=2): a SEFAZ exige a literal de "sem valor fiscal" na
  // descrição (xProd) do PRIMEIRO item — senão rejeita. Não muta a entrada.
  const itensEmissao = tpAmb === '2' && itens.length
    ? itens.map((it, i) => (i === 0 ? { ...it, descricao: XPROD_HOMOLOGACAO } : it))
    : itens;
  const detXml = itensEmissao.map(itemXml).join('');
  const totalXml = `<total>${totais(itens)}</total>`;
  const transpXml = `<transp>${tagR('modFrete', '9')}</transp>`;
  const pagXml = `<pag><detPag>${tagR('tPag', '90')}${tagR('vPag', vl(soma(itens, i => i.valorProdutos)))}</detPag></pag>`;
  const infAdicXml = nota.infComplementar ? `<infAdic>${tag('infCpl', nota.infComplementar)}</infAdic>` : '';

  const infNFe = `<infNFe Id="NFe${chave}" versao="4.00">${ideXml}${emitXml}${destXml}${detXml}${totalXml}${transpXml}${pagXml}${infAdicXml}</infNFe>`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe">${infNFe}</NFe>`;
  return { chave, xml };
}
