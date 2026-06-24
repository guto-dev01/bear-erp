// Provisiona o cofre do certificado A1:
//   1. Bucket privado `certificados-a1` no Storage (guarda os arquivos .pfx).
//   2. Atributos `storageFileId` e `senhaCert` na coleção `certificados`.
// Idempotente: ignora "already exists". Usa a APPWRITE_API_KEY (admin) do .env.
const { Client, Databases, Storage, Permission, Role } = require('node-appwrite');
const fs = require('fs');
const path = require('path');
for (const l of fs.readFileSync(path.resolve(__dirname, '..', '.env'), 'utf8').split('\n')) {
  const t = l.trim(); if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('='); if (i < 0) continue;
  const k = t.slice(0, i).trim(); if (!(k in process.env)) process.env[k] = t.slice(i + 1).trim();
}
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT).setProject(process.env.APPWRITE_PROJECT_ID).setKey(process.env.APPWRITE_API_KEY);
const db = new Databases(client);
const storage = new Storage(client);
const DB = process.env.APPWRITE_DB_ID;

const BUCKET_ID = 'certificados-a1';
const ignoraExiste = (e) => { if (/already exists/i.test(e.message)) { console.log('  (já existe, ok)'); return; } throw e; };

(async () => {
  // 1) Bucket privado dos .pfx — só usuários logados criam; leitura por arquivo
  //    (definida no upload) + sempre a API key do servidor (cofre/Functions).
  console.log(`Bucket ${BUCKET_ID}...`);
  try {
    await storage.createBucket(
      BUCKET_ID,
      'Certificados A1',
      [Permission.create(Role.users())],   // permissions
      true,                                  // fileSecurity (permissão por arquivo)
      true,                                  // enabled
      5 * 1024 * 1024,                       // maximumFileSize (5 MB)
      ['pfx', 'p12'],                        // allowedFileExtensions
      'none',                                // compression
      true,                                  // encryption (em repouso)
      false,                                 // antivirus
    );
    console.log('  criado.');
  } catch (e) { ignoraExiste(e); }

  // 2) Atributos faltantes na coleção certificados.
  const attrs = [
    { key: 'storageFileId', size: 100 },   // id do .pfx no bucket
    { key: 'senhaCert', size: 4096 },      // senha cifrada (AES-GCM, iv:cipher base64)
  ];
  for (const a of attrs) {
    console.log(`Atributo certificados.${a.key}...`);
    try {
      await db.createStringAttribute(DB, 'certificados', a.key, a.size, false, '', false);
      console.log('  criado.');
    } catch (e) { ignoraExiste(e); }
  }
  console.log('\nCofre provisionado.');
})().catch((e) => { console.error('FALHOU:', e.message); process.exit(1); });
