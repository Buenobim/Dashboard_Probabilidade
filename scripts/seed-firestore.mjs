/**
 * seed-firestore.mjs — carrega a base local na coleção "respostas" do Firestore.
 *
 * Usa credencial de administrador, então funciona mesmo com as regras de
 * escrita fechadas (firestore.rules). Rode uma vez, depois o painel passa a
 * ler do Firestore automaticamente.
 *
 * Pré-requisitos
 *   1. npm install firebase-admin
 *   2. No console do Firebase: Configurações do projeto → Contas de serviço →
 *      "Gerar nova chave privada". Salve como service-account.json nesta pasta
 *      (o arquivo já está no .gitignore — não versione essa chave).
 *   3. Firestore criado no console (Criar banco de dados → modo de produção).
 *
 * Execução
 *   node scripts/seed-firestore.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

let admin;
try {
  admin = require('firebase-admin');
} catch {
  console.error('Falta a dependência. Rode:  npm install firebase-admin');
  process.exit(1);
}

let credencial;
try {
  credencial = JSON.parse(readFileSync(resolve(raiz, 'service-account.json'), 'utf8'));
} catch {
  console.error('service-account.json não encontrado na raiz do projeto.');
  console.error('Gere a chave em: Console do Firebase → Configurações → Contas de serviço.');
  process.exit(1);
}

// dataset.js é um script de navegador: lemos o arquivo e extraímos o array.
const fonte = readFileSync(resolve(raiz, 'assets/js/dataset.js'), 'utf8');
const inicio = fonte.indexOf('[');
const fim = fonte.lastIndexOf(']');
if (inicio === -1 || fim === -1) {
  console.error('Não consegui localizar o array de respostas em assets/js/dataset.js.');
  process.exit(1);
}
const registros = JSON.parse(fonte.slice(inicio, fim + 1));

admin.initializeApp({ credential: admin.credential.cert(credencial) });
const db = admin.firestore();

const LOTE_MAX = 400;
let enviados = 0;

for (let i = 0; i < registros.length; i += LOTE_MAX) {
  const fatia = registros.slice(i, i + LOTE_MAX);
  const lote = db.batch();
  for (const r of fatia) {
    lote.set(db.collection('respostas').doc(r.id), r);
  }
  await lote.commit();
  enviados += fatia.length;
  console.log(`  ${enviados}/${registros.length} respostas gravadas`);
}

console.log(`\nPronto. Coleção "respostas" do projeto ${credencial.project_id} com ${enviados} documentos.`);
console.log('Recarregue o painel: o rodapé deve mostrar "Firestore".');
process.exit(0);
