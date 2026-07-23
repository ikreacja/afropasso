'use strict';
// AfroPasso curator: review the Firestore `queue` and publish approved items.
// Needs firebase-admin + tools/service-account.json (gitignored).
//   node tools/queue.js --list
//   node tools/queue.js --json
//   node tools/queue.js --promote <id> [--force]
//   node tools/queue.js --reject <id> [powód]
const fs = require('fs');
const path = require('path');
const { validateEvent, insertEventSorted } = require('./add-event');
const { downloadAndConvertCover } = require('./cover-image');
const { targetFileForKind, validateQueueDoc, mapQueueDocToRecord } = require('./queue-core');

const ROOT = path.join(__dirname, '..');
const KEY_PATH = path.join(__dirname, 'service-account.json');
const IMAGES_DIR = path.join(ROOT, 'assets', 'events');

function db() {
  const admin = require('firebase-admin');
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.cert(require(KEY_PATH)) });
  }
  return admin.firestore();
}

async function pending() {
  const snap = await db().collection('queue').where('status', '==', 'pending').get();
  return snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
}

function knownStyleSlugs() {
  const dances = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'dances.json')));
  return (dances.dances || dances).map(d => d.slug);
}

async function isLive(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
    return res.ok || res.status === 405; // some hosts reject HEAD
  } catch (_) { return false; }
}

async function list(asJson) {
  const rows = await pending();
  if (asJson) { console.log(JSON.stringify(rows, null, 2)); return; }
  if (!rows.length) { console.log('Kolejka pusta.'); return; }
  for (const r of rows) {
    console.log(`${r.id}  [${r.kind}/${r.source}/${r.trust}]  ${r.title}  ${r.date_start}  ${r.city}\n   ${r.url}`);
  }
}

async function promote(id, force) {
  const rows = await pending();
  const doc = rows.find(r => r.id === id);
  if (!doc) throw new Error(`Nie ma pending o id ${id}`);
  if (doc.kind !== 'event') throw new Error(`P1 promuje tylko kind:"event" (dostałem ${doc.kind}).`);
  if (doc.trust === 'public' && !force && !(await isLive(doc.url))) {
    throw new Error(`Link nieżywy lub niepewny (trust=public). Użyj --force, jeśli świadomie.`);
  }
  const styles = knownStyleSlugs();
  const verrs = validateQueueDoc(doc, styles);
  if (verrs.length) throw new Error('Walidacja: ' + verrs.join('; '));

  const eventsPath = path.join(ROOT, 'data', 'events.json');
  const eventsJson = JSON.parse(fs.readFileSync(eventsPath));
  const record = mapQueueDocToRecord(doc);

  const errors = validateEvent(record, styles, eventsJson.events.map(e => e.id));
  if (errors.length) throw new Error('validateEvent: ' + errors.join('; '));

  if (doc.image || record.image) {
    try { record.image = await downloadAndConvertCover(doc.image || record.image, record.id, IMAGES_DIR); }
    catch (e) { console.warn('Cover pominięty:', e.message); }
  }

  eventsJson.events = insertEventSorted(eventsJson.events, record);
  fs.writeFileSync(eventsPath, JSON.stringify(eventsJson, null, 4) + '\n');
  await db().collection('queue').doc(id).update({ status: 'approved' });
  console.log(`Promowano ${id} → data/events.json. Teraz: przejrzyj diff i \`git commit && push\`.`);
}

async function reject(id, reason) {
  await db().collection('queue').doc(id).update({ status: 'rejected', rejectReason: reason || '' });
  console.log(`Odrzucono ${id}.`);
}

(async function main() {
  const a = process.argv.slice(2);
  try {
    if (a.includes('--list')) return await list(false);
    if (a.includes('--json')) return await list(true);
    const pi = a.indexOf('--promote');
    if (pi !== -1 && a[pi + 1]) return await promote(a[pi + 1], a.includes('--force'));
    const ri = a.indexOf('--reject');
    if (ri !== -1 && a[ri + 1]) return await reject(a[ri + 1], a[ri + 2]);
    console.log('Użycie: node tools/queue.js --list | --json | --promote <id> [--force] | --reject <id> [powód]');
  } catch (e) { console.error('Błąd:', e.message); process.exit(1); }
})();
