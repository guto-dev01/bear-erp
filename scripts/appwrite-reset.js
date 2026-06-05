const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('69b52c570036d92459ce')
  .setKey('standard_e04260ebac4f36c6d310aa4cf59c95a7a36fb75ff4960912cf2e0a492e82dde2e7d515b7da5cd401ede97665d987ab95ca0780ccff2b2b71a5b00ba48e1adc570ea5327d1977d173d800a8e51828f5fe584c2f9abe011760ae066fb9b27d0b809cfba0f047fbbadc14957ea1b1b1b9f7e0d2b1864df1ad6218e3544a0a871ee6');

const db = new Databases(client);
const DB_ID = '69b52c820006ab36b33a';

async function main() {
  const cols = await db.listCollections(DB_ID);
  console.log(`Deletando ${cols.collections.length} collections...`);
  for (const c of cols.collections) {
    await db.deleteCollection(DB_ID, c.$id);
    console.log(`  ✗ ${c.name}`);
  }
  console.log('Limpo!');
}
main().catch(e => console.error(e.message));
