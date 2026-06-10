'use strict';

/**
 * Parser de documentos de cadastro - v3.
 * Correções: RG (extração robusta), MAE/PAI (labels com dois-pontos), CPF (OCR noise $→1).
 */

const soDigitos = (v) => (v == null ? '' : String(v).replace(/\D/g, ''));

const mascararCpf = (v) => {
  const d = soDigitos(v);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : d;
};
const mascararCnpj = (v) => {
  const d = soDigitos(v);
  return d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : d;
};
const mascararCep = (v) => {
  const d = soDigitos(v);
  return d.length === 8 ? d.replace(/(\d{5})(\d{3})/, '$1-$2') : d;
};

function isValidCpf(cpf) {
  cpf = soDigitos(cpf);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let d1 = 11 - (soma % 11); if (d1 >= 10) d1 = 0;
  if (d1 !== Number(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  let d2 = 11 - (soma % 11); if (d2 >= 10) d2 = 0;
  return d2 === Number(cpf[10]);
}

function isValidCnpj(cnpj) {
  cnpj = soDigitos(cnpj);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base, pesos) => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) soma += Number(base[i]) * pesos[i];
    const r = 11 - (soma % 11);
    return r >= 10 ? 0 : r;
  };
  const p1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const p2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  if (calc(cnpj, p1) !== Number(cnpj[12])) return false;
  return calc(cnpj, p2) === Number(cnpj[13]);
}

const RE = {
  cpf: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g,
  cnpj: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g,
  cep: /\d{5}-?\d{3}/,
  data: /\d{2}\/\d{2}\/\d{4}/,
  cnae: /\d{2}\.?\d{2}-?\d-?\d{2}/,
  valor: /R\$\s*([\d.]+,\d{2})/,
  // RG: X.XXX.XXX-X ou XX.XXX.XXX-X ou nnn.nnn.nnn-X (com ou sem pontos/traço)
  rgPattern: /\b(\d{1,2}\.?\d{3}\.?\d{3}[-]?[\dX])\b|\b(\d{7,9}[-]?[\dX])\b/,
};

const UFS = new Set(['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB',
  'PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']);

function normalizar(s) {
  if (s == null) return '';
  return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
}

function limparNome(bruto) {
  if (bruto == null) return null;
  const limpo = String(bruto)
    .replace(/[0-9]/g, ' ')
    .replace(/[^\p{L}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return limpo ? limpo.toUpperCase() : null;
}

/** Normaliza confusões OCR comuns em números */
function normalizarOcr(texto) {
  return texto
    .replace(/\$/g, '1')
    .replace(/[|]/g, '1');
}

const LABELS_CONHECIDOS = [
  'CPF', 'RG', 'FILIACAO', 'FILIAÇÃO', 'MAE', 'MÃE', 'PAI',
  'NASCIMENTO', 'DATA DE NASCIMENTO', 'DATA NASCIMENTO', 'NATURALIDADE', 'SEXO',
  'ESTADO', 'UF', 'REGISTRO', 'REGISTRO GERAL', 'DOC IDENTIDADE', 'ORG EMISSOR',
  'VALIDADE', 'CNH', 'HABILITACAO', 'CATEGORIA', 'MUNICIPIO', 'CIDADE',
  'LOGRADOURO', 'ENDERECO', 'BAIRRO', 'CEP', 'NUMERO',
  'CNPJ', 'RAZAO SOCIAL', 'NOME EMPRESARIAL', 'ABERTURA',
  'NATUREZA JURIDICA', 'ATIVIDADE ECONOMICA', 'CAPITAL SOCIAL',
  'NOME DA MAE', 'NOME DO PAI',
  'REPUBLICA FEDERATIVA DO BRASIL', 'CARTEIRA DE IDENTIDADE',
  'CARTEIRA NACIONAL DE HABILITACAO', 'NOME',
];

function ehLabel(texto) {
  if (!texto) return false;
  const norm = normalizar(texto.trim());
  if (norm.length <= 3) return true;
  for (const lbl of LABELS_CONHECIDOS) {
    const lN = normalizar(lbl);
    if (norm === lN || norm.startsWith(lN + ' ') || norm.startsWith(lN + ':')) return true;
  }
  return false;
}

function valorAposLabel(orig, norm, labels) {
  for (let i = 0; i < norm.length; i++) {
    for (const label of labels) {
      const idx = norm[i].indexOf(normalizar(label));
      if (idx >= 0) {
        const resto = orig[i].substring(Math.min(idx + label.length, orig[i].length))
          .replace(/^[\s:\-\/]+/, '').trim();
        if (resto && !ehLabel(resto)) return resto;
        for (let j = i + 1; j < orig.length; j++) {
          const linha = orig[j].trim();
          if (linha && !ehLabel(linha)) return linha;
        }
      }
    }
  }
  return null;
}

function primeiraDataLabel(orig, norm, labels) {
  for (let i = 0; i < norm.length; i++) {
    for (const label of labels) {
      const idx = norm[i].indexOf(normalizar(label));
      if (idx >= 0) {
        const resto = orig[i].substring(idx + label.length);
        const mLinha = resto.match(RE.data);
        if (mLinha) return mLinha[0];
        for (let j = i + 1; j < Math.min(i + 4, orig.length); j++) {
          const m = orig[j].match(RE.data);
          if (m) return m[0];
        }
      }
    }
  }
  return null;
}

function extrairCpf(texto, r) {
  const textoNorm = normalizarOcr(texto);
  const matches = textoNorm.match(RE.cpf) || [];
  for (const m of matches) {
    if (isValidCpf(m)) return mascararCpf(m);
  }
  if (matches.length) {
    marcar(r, 'cpf');
    addAviso(r, 'CPF extraído não passou na validação dos dígitos verificadores.');
    return mascararCpf(matches[0]);
  }
  return null;
}

function extrairCnpj(texto, r) {
  const matches = texto.match(RE.cnpj) || [];
  for (const m of matches) {
    if (isValidCnpj(m)) return mascararCnpj(m);
  }
  if (matches.length) {
    marcar(r, 'cnpj');
    addAviso(r, 'CNPJ extraído não passou na validação dos dígitos verificadores.');
    return mascararCnpj(matches[0]);
  }
  return null;
}

/**
 * Extrai número de RG/DOC IDENTIDADE.
 * Estratégia: busca na linha do label RG (ou nas próximas) por padrão numérico de RG.
 * Para CNH, limita ao que vem antes de "/" para não capturar ORG EMISSOR.
 */
function extrairRg(orig, norm, ehCnh) {
  for (let i = 0; i < norm.length; i++) {
    const n = norm[i];
    const temRgLabel = n === 'RG' || n.startsWith('RG ') || n.startsWith('RG:') ||
      n.includes(' RG') || n.includes(':RG') ||
      n.startsWith('REGISTRO GERAL') || n.startsWith('DOC IDENTIDADE');
    
    if (!temRgLabel) continue;
    
    // Para CNH: busca na mesma linha após o label
    const labelEnd = (() => {
      for (const lbl of ['DOC IDENTIDADE', 'REGISTRO GERAL', 'RG']) {
        const idx = n.indexOf(normalizar(lbl));
        if (idx >= 0) return idx + lbl.length;
      }
      return 0;
    })();
    
    const resto = orig[i].substring(labelEnd).replace(/^[\s:\-]+/, '').trim();
    if (resto) {
      // Para CNH: pega só até o primeiro "/"
      const restoCNH = ehCnh ? resto.split(/\s*\/\s*/)[0].trim() : resto;
      // Extrai número tipo RG
      const rgM = restoCNH.match(/\d[\d.\-\s]{2,}[\dX]/);
      if (rgM) {
        const candidate = rgM[0].replace(/\s+/g, '').trim();
        // Não é uma data
        if (!candidate.match(/^\d{2}\/\d{2}\/\d{4}$/) && candidate.length >= 5) {
          return candidate;
        }
      }
    }
    
    // Busca nas próximas linhas
    for (let j = i + 1; j < Math.min(i + 4, orig.length); j++) {
      const linha = orig[j].trim();
      if (!linha) continue;
      // Tenta extrair padrão de RG (XXX.XXX.XXX-X ou sem formatação)
      const rgM = linha.match(/\b\d[\d.\-]{4,}[\dX]\b/);
      if (rgM) {
        const candidate = rgM[0].trim();
        if (!candidate.match(/^\d{2}\/\d{2}\/\d{4}$/) && candidate.length >= 5) {
          return candidate;
        }
      }
      // Verifica se linha é outro campo (para de buscar)
      if (ehLabel(linha)) break;
    }
  }
  return null;
}

function extrairCnae(orig, norm) {
  for (let i = 0; i < norm.length; i++) {
    if (norm[i].includes('ATIVIDADE ECONOMICA PRINCIPAL')) {
      for (let j = i; j < Math.min(i + 2, orig.length); j++) {
        const m = orig[j].match(RE.cnae);
        if (m) {
          const desc = orig[j].substring(orig[j].indexOf(m[0]) + m[0].length).replace(/^[\s\-]+/, '').trim();
          return desc ? `${m[0]} - ${desc}` : m[0];
        }
      }
    }
  }
  return null;
}

function extrairCapitalSocial(texto) {
  const idx = normalizar(texto).indexOf('CAPITAL SOCIAL');
  if (idx < 0) return null;
  const m = texto.substring(idx).match(RE.valor);
  return m ? `R$ ${m[1]}` : null;
}

function extrairSocios(orig, norm) {
  const socios = [];
  for (let i = 0; i < norm.length; i++) {
    const linhaSocio = norm[i].includes('SOCIO') || norm[i].includes('ADMINISTRADOR');
    const cpfM = orig[i].match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
    if (linhaSocio && cpfM) {
      if (!isValidCpf(cpfM[0])) continue;
      let nome = limparNome(orig[i].substring(0, orig[i].indexOf(cpfM[0])));
      if (!nome && i > 0) nome = limparNome(orig[i - 1]);
      const partM = orig[i].match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
      socios.push({ nome, cpf: mascararCpf(cpfM[0]), participacao: partM ? `${partM[1]}%` : null });
    }
  }
  return socios;
}

function extrairUf(orig, norm) {
  const porLabel = valorAposLabel(orig, norm, ['UF', 'ESTADO']);
  if (porLabel) {
    const cand = porLabel.trim().toUpperCase().substring(0, 2);
    if (UFS.has(cand)) return cand;
  }
  for (const linha of orig) {
    const re = /\b([A-Z]{2})\b/g;
    let m;
    while ((m = re.exec(linha.toUpperCase()))) {
      if (UFS.has(m[1])) return m[1];
    }
  }
  return null;
}

function extrairFiliacao(orig, norm) {
  let mae = null, pai = null;
  
  // Primeira passagem: procura labels explícitos MAE:/PAI: em qualquer linha
  for (let i = 0; i < norm.length; i++) {
    const n = norm[i];
    
    // Linha começa com MAE (normalizado: "MAE", "MAE:", "MAE ", "MÃE:", etc.)
    if ((n.startsWith('MAE') || n.includes('NOME DA MAE')) && mae === null) {
      const labelMatch = orig[i].match(/M[AÃ]E\s*[:\-]?\s*/i) || orig[i].match(/NOME\s+DA\s+M[AÃ]E\s*[:\-]?\s*/i);
      const labelLen = labelMatch ? labelMatch[0].length : 0;
      let valor = orig[i].substring(labelLen).trim();
      if (!valor) {
        // Próxima linha
        for (let j = i + 1; j < orig.length; j++) {
          if (orig[j].trim()) { valor = orig[j].trim(); break; }
        }
      }
      const nome = limparNome(valor);
      if (nome && nome.split(/\s+/).length >= 2) mae = nome;
    }
    
    // Linha começa com PAI (normalizado)
    if ((n.startsWith('PAI') || n.includes('NOME DO PAI')) && pai === null) {
      const labelMatch = orig[i].match(/PAI\s*[:\-]?\s*/i) || orig[i].match(/NOME\s+DO\s+PAI\s*[:\-]?\s*/i);
      const labelLen = labelMatch ? labelMatch[0].length : 0;
      let valor = orig[i].substring(labelLen).trim();
      // Remove número de RG que pode estar no final da linha
      valor = valor.replace(/\s*\d[\d.\-]{3,}[\dX]\s*$/, '').trim();
      if (!valor) {
        for (let j = i + 1; j < orig.length; j++) {
          if (orig[j].trim()) { valor = orig[j].trim(); break; }
        }
      }
      const nome = limparNome(valor);
      if (nome && nome.split(/\s+/).length >= 2) pai = nome;
    }
  }
  
  // Segunda passagem: bloco FILIAÇÃO (quando não há labels MAE/PAI explícitos)
  if (mae === null && pai === null) {
    for (let i = 0; i < norm.length; i++) {
      if (norm[i].includes('FILIACAO') || norm[i].includes('FILIAÇÃO')) {
        const nomes = [];
        for (let j = i + 1; j < orig.length && nomes.length < 2; j++) {
          const linha = orig[j].trim();
          if (!linha) continue;
          const paiM = linha.match(/^PAI\s*[:\-]?\s*(.+)/i);
          const maeM = linha.match(/^M[AÃ]E\s*[:\-]?\s*(.+)/i);
          if (paiM) {
            const nomeLimpo = paiM[1].replace(/\s*\d[\d.\-]{3,}[\dX]\s*$/, '').trim();
            pai = limparNome(nomeLimpo);
            nomes.push('_pai_');
            continue;
          }
          if (maeM) {
            mae = limparNome(maeM[1]);
            nomes.push('_mae_');
            continue;
          }
          const nome = limparNome(linha.replace(/\s*\d[\d.\-]{3,}[\dX]\s*$/, '').trim());
          if (nome && nome.split(/\s+/).length >= 2) nomes.push(nome);
          else if (nomes.length) break;
        }
        // Convenção RG brasileiro: primeiro nome = MÃE, segundo = PAI
        if (mae === null && pai === null) {
          if (nomes.length === 1) mae = nomes[0];
          else if (nomes.length >= 2) { mae = nomes[0]; pai = nomes[1]; }
        }
        break;
      }
    }
  }
  
  return [mae, pai];
}

function preencherEndereco(texto, orig, norm, r) {
  const cepM = texto.match(RE.cep);
  if (cepM) r.cep = mascararCep(cepM[0]);
  const logradouro = valorAposLabel(orig, norm, ['LOGRADOURO', 'ENDERECO', 'RUA', 'AVENIDA']);
  r.logradouro = logradouro;
  r.numero = valorAposLabel(orig, norm, ['NUMERO']);
  r.bairro = valorAposLabel(orig, norm, ['BAIRRO', 'DISTRITO']);
  r.cidade = valorAposLabel(orig, norm, ['MUNICIPIO', 'CIDADE']);
  r.estado = extrairUf(orig, norm);
  if (!r.numero && logradouro) {
    const numM = logradouro.match(/,\s*(\d{1,6})/);
    if (numM) r.numero = numM[1];
  }
}

function verificarValidadeCnh(orig, norm, r) {
  const validade = primeiraDataLabel(orig, norm, ['VALIDADE', 'VAL']);
  if (!validade) return;
  const [d, m, y] = validade.split('/').map(Number);
  const venc = new Date(y, m - 1, d);
  if (!isNaN(venc) && venc < new Date()) {
    addAviso(r, `CNH vencida em ${validade}.`);
    marcar(r, 'cnhValidade');
  }
}

function marcar(r, campo) {
  if (campo && !r.camposComBaixaConfianca.includes(campo)) r.camposComBaixaConfianca.push(campo);
}
function addAviso(r, aviso) {
  if (aviso && !r.avisos.includes(aviso)) r.avisos.push(aviso);
}

const CAMPOS_ESPERADOS = {
  CNH: ['nomeCompleto', 'cpf', 'dataNascimento', 'nomeMae', 'rg'],
  RG: ['nomeCompleto', 'rg', 'dataNascimento', 'nomeMae', 'nomePai'],
  COMPROVANTE_ENDERECO: ['cep', 'logradouro', 'bairro', 'cidade', 'estado'],
  CNPJ: ['cnpj', 'razaoSocial', 'nomeFantasia', 'dataAbertura', 'naturezaJuridica', 'cnaePrincipal'],
  CONTRATO_SOCIAL: ['razaoSocial', 'cnpj', 'capitalSocial'],
};

function preenchido(r, campo) {
  const filled = (s) => s != null && String(s).trim() !== '';
  if (campo === 'cpf') return filled(r.cpf) && !r.camposComBaixaConfianca.includes('cpf');
  if (campo === 'cnpj') return filled(r.cnpj) && !r.camposComBaixaConfianca.includes('cnpj');
  return filled(r[campo]);
}

function calcularConfianca(r, tipoDocumento) {
  const esperados = CAMPOS_ESPERADOS[tipoDocumento] || [];
  let ok = 0;
  for (const campo of esperados) {
    if (preenchido(r, campo)) ok++;
    else marcar(r, campo);
  }
  const conf = esperados.length ? Math.round((100 * ok) / esperados.length) : 0;
  r.confidence = Math.max(0, Math.min(100, conf));
}

function parseCadastro(texto, tipoPessoa, tipoDocumento) {
  const orig = String(texto || '').split(/\r?\n/);
  const norm = orig.map(normalizar);

  const r = {
    nomeCompleto: null, cpf: null, rg: null, dataNascimento: null, nomeMae: null, nomePai: null,
    cep: null, logradouro: null, numero: null, bairro: null, cidade: null, estado: null,
    cnpj: null, razaoSocial: null, nomeFantasia: null, dataAbertura: null,
    naturezaJuridica: null, cnaePrincipal: null, capitalSocial: null,
    socios: [], confidence: 0, camposComBaixaConfianca: [], avisos: [],
  };

  switch (tipoDocumento) {
    case 'CNH':
      r.nomeCompleto = limparNome(valorAposLabel(orig, norm, ['NOME', 'DOC IDENTIDADE']));
      r.cpf = extrairCpf(texto, r);
      r.rg = extrairRg(orig, norm, true) || valorAposLabel(orig, norm, ['DOC IDENTIDADE', 'REGISTRO GERAL']);
      if (r.rg) r.rg = r.rg.split(/\s*\/\s*/)[0].trim();
      r.dataNascimento = primeiraDataLabel(orig, norm, ['NASCIMENTO', 'DATA NASCIMENTO', 'DATA DE NASCIMENTO']);
      [r.nomeMae, r.nomePai] = extrairFiliacao(orig, norm);
      verificarValidadeCnh(orig, norm, r);
      break;
    case 'RG':
      r.nomeCompleto = limparNome(valorAposLabel(orig, norm, ['NOME']));
      r.rg = extrairRg(orig, norm, false);
      if (!r.rg) r.rg = valorAposLabel(orig, norm, ['REGISTRO GERAL', 'REGISTRO']);
      r.cpf = extrairCpf(texto, r);
      r.dataNascimento = primeiraDataLabel(orig, norm, ['NASCIMENTO', 'DATA DE NASCIMENTO']);
      [r.nomeMae, r.nomePai] = extrairFiliacao(orig, norm);
      break;
    case 'COMPROVANTE_ENDERECO':
      preencherEndereco(texto, orig, norm, r);
      break;
    case 'CNPJ':
      r.cnpj = extrairCnpj(texto, r);
      r.razaoSocial = limparNome(valorAposLabel(orig, norm, ['NOME EMPRESARIAL', 'RAZAO SOCIAL']));
      r.nomeFantasia = limparNome(valorAposLabel(orig, norm, ['NOME DE FANTASIA', 'TITULO DO ESTABELECIMENTO']));
      r.dataAbertura = primeiraDataLabel(orig, norm, ['DATA DE ABERTURA', 'ABERTURA']);
      r.naturezaJuridica = valorAposLabel(orig, norm, ['NATUREZA JURIDICA']);
      r.cnaePrincipal = extrairCnae(orig, norm);
      preencherEndereco(texto, orig, norm, r);
      break;
    case 'CONTRATO_SOCIAL':
      r.cnpj = extrairCnpj(texto, r);
      r.razaoSocial = limparNome(valorAposLabel(orig, norm, ['RAZAO SOCIAL', 'DENOMINACAO', 'NOME EMPRESARIAL']));
      r.capitalSocial = extrairCapitalSocial(texto);
      r.socios = extrairSocios(orig, norm);
      preencherEndereco(texto, orig, norm, r);
      break;
    default:
      break;
  }

  calcularConfianca(r, tipoDocumento);
  return r;
}

module.exports = { parseCadastro, isValidCpf, isValidCnpj, mascararCpf, mascararCnpj, mascararCep };
