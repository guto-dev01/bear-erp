/**
 * Cria usuários no Appwrite Authentication (Account) a partir dos documentos
 * já existentes na collection `usuarios`, copiando tenant/roles/permissões
 * para as prefs do usuário Auth.
 *
 * Necessário porque a collection `usuarios` NÃO é o sistema de Auth nativo do
 * Appwrite — o login do frontend usa account.createEmailPasswordSession().
 *
 * Idempotente: se o usuário Auth já existe, apenas atualiza as prefs.
 *
 * Uso:  node scripts/appwrite-create-auth-user.js
 */
const fs = require('fs');
const path = require('path');

// Carrega o .env (mesmo parsing dos outros scripts). Segredos ficam SÓ no .env.
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const linha of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { Client, Databases, Users, Query, ID } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const PROJECT = process.env.APPWRITE_PROJECT_ID || '69b52c570036d92459ce';
const API_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = process.env.APPWRITE_DB_ID || '69b52c820006ab36b33a';

if (!API_KEY) {
  console.error('Falta APPWRITE_API_KEY no .env');
  process.exit(1);
}

// Não conseguimos recuperar a senha em texto a partir do hash bcrypt guardado.
// Senhas conhecidas do seed (dev); demais usuários recebem a senha padrão.
const KNOWN_PASSWORDS = { 'admin@bearerp.com.br': 'Bear@2024!' };
const DEFAULT_PASSWORD = 'Bear@2024!';

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT).setKey(API_KEY);
const db = new Databases(client);
const users = new Users(client);

async function buildPrefs(usuarioDoc) {
  const roleNames = [];
  const permissoes = [];
  for (const roleId of usuarioDoc.roleIds || []) {
    try {
      const role = await db.getDocument(DB_ID, 'roles', roleId);
      roleNames.push(role.nome);
      permissoes.push(...(role.permissoes || []));
    } catch (e) {
      console.warn(`  ! role ${roleId} não encontrada: ${e.message}`);
    }
  }
  return {
    nome: usuarioDoc.nome || '',
    tenantId: usuarioDoc.tenantId || 'default',
    empresaAtualId: (usuarioDoc.empresaIds && usuarioDoc.empresaIds[0]) || usuarioDoc.empresaAtualId || '',
    roles: [...new Set(roleNames)],
    permissoes: [...new Set(permissoes)],
  };
}

async function findAuthUserByEmail(email) {
  const res = await users.list([], email);
  return res.users.find(u => u.email === email);
}

async function main() {
  const res = await db.listDocuments(DB_ID, 'usuarios', [Query.limit(100)]);
  console.log(`Encontrados ${res.documents.length} usuário(s) na collection.\n`);

  for (const u of res.documents) {
    const password = KNOWN_PASSWORDS[u.email] || DEFAULT_PASSWORD;
    const prefs = await buildPrefs(u);
    const existing = await findAuthUserByEmail(u.email);

    if (existing) {
      await users.updatePrefs(existing.$id, prefs);
      console.log(`~ Já existia no Auth: ${u.email} (prefs atualizadas)`);
    } else {
      const created = await users.create(ID.unique(), u.email, undefined, password, u.nome);
      await users.updatePrefs(created.$id, prefs);
      console.log(`✓ Auth user criado: ${u.email} / ${password}`);
    }
  }

  console.log('\nPronto! Faça login com: admin@bearerp.com.br / Bear@2024!');
}

main().catch(e => console.error('ERRO:', e.message));
