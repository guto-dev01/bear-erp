'use strict';

const { ID } = require('node-appwrite');
const { lerPkcs12 } = require('./pkcs12');
const { montarMetadados } = require('./certificado-service');
const { cifrar } = require('../cripto/segredo');
const { permissoesDoTenant } = require('../tenant/permissoes');

/**
 * Orquestração do UPLOAD seguro do certificado A1 de uma empresa.
 *
 * Roda SOMENTE server-side (Appwrite Function). Recebe o .pfx + a senha, valida
 * tudo e persiste de forma segura:
 *   1. abre o PKCS#12 com a senha → se abrir, a senha confere (não a guardamos
 *      em claro em lugar nenhum);
 *   2. confere que o CNPJ do certificado bate com o CNPJ da empresa;
 *   3. recusa certificado já vencido;
 *   4. grava o .pfx no bucket privado `certificados-a1` (sem role pública);
 *   5. CIFRA a senha com AES-256-GCM (chave mestra do ambiente) e grava só o
 *      ciphertext (`senhaCofre`) no documento `certificados`;
 *   6. grava metadados seguros (titular, CNPJ, validade) e vincula
 *      `empresa.certificadoDigitalId`; documento escopado por Role.team(tenantId);
 *   7. registra a ação em `audit_logs` (sem vazar senha/chave).
 *
 * Tudo que toca SDK/rede é injetável (databases, storage, idGen, criarInputFile)
 * para o fluxo ser testável offline com fakes + .pfx autoassinado em memória.
 */

function soDigitos(v) {
  return String(v ?? '').replace(/\D/g, '');
}

/**
 * @param {object} deps
 * @param {object} deps.databases            node-appwrite Databases (ou fake)
 * @param {object} deps.storage              node-appwrite Storage (ou fake)
 * @param {string} deps.dbId
 * @param {string} deps.bucketId
 * @param {NodeJS.ProcessEnv} deps.env       precisa de CERT_MASTER_KEY
 * @param {object} [deps.logger]
 * @param {(buf:Buffer,nome:string)=>any} [deps.criarInputFile]  default: InputFile.fromBuffer
 * @param {()=>string} [deps.idGen]          default: ID.unique()
 * @param {()=>Date} [deps.agora]            default: () => new Date()
 * @param {string} [deps.empresasCollection='empresas']
 * @param {string} [deps.certificadosCollection='certificados']
 * @param {string} [deps.auditCollection='audit_logs']
 *
 * @param {object} entrada
 * @param {string} entrada.empresaId
 * @param {string} entrada.tenantId
 * @param {Buffer} entrada.pfxBuffer
 * @param {string} entrada.senha
 * @param {string} [entrada.usuario]         e-mail/id de quem subiu (auditoria)
 * @param {string} [entrada.nomeArquivo]
 * @returns {Promise<{ ok: true, certificadoId: string, storageFileId: string, metadados: object }>}
 */
async function processarUpload(deps, entrada) {
  const {
    databases,
    storage,
    dbId,
    bucketId,
    env,
    logger = silencioso(),
    criarInputFile = inputFilePadrao,
    idGen = () => ID.unique(),
    agora = () => new Date(),
    empresasCollection = 'empresas',
    certificadosCollection = 'certificados',
    auditCollection = 'audit_logs',
  } = deps;

  const { empresaId, tenantId, pfxBuffer, senha, usuario, nomeArquivo } = entrada;

  // ── 0) Multi-tenant + entrada obrigatória (falhar fechado) ──────────────────
  if (!tenantId) throw erro('tenantId é obrigatório', 'TENANT_AUSENTE');
  if (!empresaId) throw erro('empresaId é obrigatório', 'EMPRESA_AUSENTE');
  if (!Buffer.isBuffer(pfxBuffer) || pfxBuffer.length === 0) throw erro('arquivo .pfx ausente ou vazio', 'PFX_AUSENTE');
  if (!senha) throw erro('senha do certificado é obrigatória', 'SENHA_AUSENTE');
  if (!dbId || !bucketId) throw erro('configuração de banco/bucket ausente', 'CONFIG_AUSENTE');

  // ── 1) Abre o PKCS#12 — se abrir, a senha confere ───────────────────────────
  let p12;
  try {
    p12 = lerPkcs12(pfxBuffer, senha);
  } catch (e) {
    // Senha incorreta ou arquivo inválido — sem vazar a senha.
    throw erro(`Não foi possível abrir o certificado (senha incorreta ou arquivo inválido)`, 'PFX_INVALIDO');
  }

  // ── 2) CNPJ do certificado × CNPJ da empresa ────────────────────────────────
  const empresa = await databases.getDocument(dbId, empresasCollection, empresaId);
  if (empresa.tenantId && empresa.tenantId !== tenantId) {
    throw erro('empresa não pertence ao tenant informado', 'TENANT_DIVERGENTE');
  }
  const cnpjEmpresa = soDigitos(empresa.cnpj);
  const cnpjCert = soDigitos(p12.cnpjCpf);
  if (!cnpjCert) throw erro('certificado sem CNPJ/CPF no titular (CN fora do padrão ICP-Brasil)', 'CERT_SEM_CNPJ');
  if (!cnpjEmpresa) throw erro('empresa sem CNPJ cadastrado', 'EMPRESA_SEM_CNPJ');
  if (cnpjEmpresa !== cnpjCert) {
    throw erro(`CNPJ do certificado (${cnpjCert}) não confere com o da empresa (${cnpjEmpresa})`, 'CNPJ_DIVERGENTE');
  }

  // ── 3) Recusa certificado vencido ───────────────────────────────────────────
  const metadados = montarMetadados(p12, { agora: agora() });
  if (metadados.vencido) {
    throw erro(`certificado vencido em ${metadados.validoAte}`, 'CERT_VENCIDO');
  }

  // ── 4) Grava o .pfx no bucket privado ───────────────────────────────────────
  const storageFileId = idGen();
  const inputFile = criarInputFile(pfxBuffer, nomeArquivo || `${empresaId}.pfx`);
  // Sem permissions → herda o bucket privado (acesso só pela API key do servidor).
  await storage.createFile({ bucketId, fileId: storageFileId, file: inputFile });

  // ── 5) Cifra a senha (só o ciphertext vai ao banco) ─────────────────────────
  const senhaCofre = cifrar(senha, env);

  // ── 6) Documento `certificados` (escopado por Team) + vínculo na empresa ─────
  const perms = permissoesDoTenant(tenantId);
  const nowIso = agora().toISOString();
  const certData = {
    tipo: 'A1',
    nome: metadados.titular || 'Certificado A1',
    cnpjCpf: cnpjCert,
    emissor: metadados.emissor || '',
    serialNumber: metadados.serialNumber || '',
    dataValidade: isoData(metadados.validoAte), // YYYY-MM-DD
    status: 'ATIVO',
    storageFileId,
    titular: metadados.titular || '',
    validoDe: metadados.validoDe,
    senhaCofre,
    alertaVencimento: !!metadados.alerta,
    empresaId,
    tenantId,
    createdAt: nowIso,
  };
  const certId = idGen();
  await databases.createDocument(dbId, certificadosCollection, certId, certData, perms);

  // Repoint da empresa para o novo certificado; remove o anterior (best-effort).
  const certAnterior = empresa.certificadoDigitalId;
  await databases.updateDocument(dbId, empresasCollection, empresaId, { certificadoDigitalId: certId });
  if (certAnterior && certAnterior !== certId) {
    await removerAnterior(deps, { dbId, certificadosCollection, bucketId, certAnterior, logger });
  }

  // ── 7) Auditoria (sem senha/chave) ──────────────────────────────────────────
  await registrarAuditoria(deps, {
    dbId,
    auditCollection,
    perms,
    nowIso,
    usuario: usuario || 'sistema',
    tenantId,
    descricao: `Upload de certificado A1 para empresa ${empresaId} (titular ${metadados.titular || '?'})`,
    detalhes: {
      empresaId,
      certificadoId: certId,
      cnpj: cnpjCert,
      validoAte: metadados.validoAte,
      diasParaVencer: metadados.diasParaVencer,
      substituiu: certAnterior || null,
    },
  });

  logger.info('Certificado A1 enviado ao cofre', {
    empresaId,
    tenantId,
    certificadoId: certId,
    validoAte: metadados.validoAte,
    diasParaVencer: metadados.diasParaVencer,
  });

  return { ok: true, certificadoId: certId, storageFileId, metadados };
}

/** Remoção best-effort do certificado anterior (doc + arquivo). Nunca derruba o upload. */
async function removerAnterior(deps, { dbId, certificadosCollection, bucketId, certAnterior, logger }) {
  const { databases, storage } = deps;
  try {
    const doc = await databases.getDocument(dbId, certificadosCollection, certAnterior);
    if (doc?.storageFileId) {
      await storage.deleteFile({ bucketId, fileId: doc.storageFileId });
    }
    await databases.deleteDocument(dbId, certificadosCollection, certAnterior);
  } catch (e) {
    logger.warn('Falha ao remover certificado anterior (ignorado)', { certAnterior, erro: e.message });
  }
}

/** Registra a auditoria; falha de auditoria não derruba o upload já concluído. */
async function registrarAuditoria(deps, { dbId, auditCollection, perms, nowIso, usuario, tenantId, descricao, detalhes }) {
  const { databases, idGen = () => ID.unique(), logger = silencioso() } = deps;
  try {
    await databases.createDocument(
      dbId,
      auditCollection,
      idGen(),
      {
        usuario,
        acao: 'UPLOAD',
        modulo: 'certificados',
        descricao,
        detalhes: JSON.stringify(detalhes),
        timestamp: nowIso,
        tenantId,
        createdAt: nowIso,
      },
      perms,
    );
  } catch (e) {
    logger.warn('Falha ao gravar audit_log (ignorado)', { erro: e.message });
  }
}

function inputFilePadrao(buf, nome) {
  // Carregado sob demanda — node-appwrite expõe InputFile em subpath dedicado.
  const { InputFile } = require('node-appwrite/file');
  return InputFile.fromBuffer(buf, nome);
}

function isoData(iso) {
  return String(iso || '').slice(0, 10);
}

function erro(msg, codigo) {
  const e = new Error(msg);
  e.codigo = codigo;
  return e;
}

function silencioso() {
  return { info() {}, warn() {}, error() {}, debug() {} };
}

module.exports = { processarUpload };
