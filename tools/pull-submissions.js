#!/usr/bin/env node
// AfroPasso curator: review Firestore `submissions` and publish approved ones
// into data/events.json. Needs firebase-admin + tools/service-account.json.
// Usage:
//   node tools/pull-submissions.js --list
//   node tools/pull-submissions.js --json
//   node tools/pull-submissions.js --approve <id>
//   node tools/pull-submissions.js --reject <id> [reason]
'use strict';

const fs = require('fs');
const path = require('path');
const { validateSubmission, mapSubmissionToEvent } = require('./submission-core.js');
const { insertEventSorted } = require('./add-event.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const KEY_PATH = path.join(__dirname, 'service-account.json');

function usage() {
    console.log('Użycie: node tools/pull-submissions.js --list | --json | --approve <id> | --reject <id> [powód]');
}

function getDb() {
    if (!fs.existsSync(KEY_PATH)) {
        console.error(`Brak ${KEY_PATH}. Pobierz klucz konta serwisowego z konsoli Firebase.`);
        process.exit(1);
    }
    const admin = require('firebase-admin');
    admin.initializeApp({ credential: admin.credential.cert(require(KEY_PATH)) });
    return admin.firestore();
}

async function getPending(db) {
    const snap = await db.collection('submissions').where('status', '==', 'pending').orderBy('submittedAt').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function main() {
    const [flag, arg, ...rest] = process.argv.slice(2);
    if (!flag) { usage(); process.exit(1); }

    if (flag === '--list' || flag === '--json') {
        const pending = await getPending(getDb());
        if (flag === '--json') { console.log(JSON.stringify(pending, null, 2)); return; }
        if (pending.length === 0) { console.log('Brak oczekujących zgłoszeń.'); return; }
        for (const s of pending) {
            console.log(`\n[${s.id}] ${s.title} — ${s.city}, ${s.date_start} (${s.type})`);
            console.log(`  style: ${(s.styles || []).join(', ')} | url: ${s.url} | kontakt: ${s.contactEmail}`);
            if (s.notes) console.log(`  notatka: ${s.notes}`);
        }
        return;
    }

    if (flag === '--approve') {
        if (!arg) { usage(); process.exit(1); }
        const db = getDb();
        const ref = db.collection('submissions').doc(arg);
        const doc = await ref.get();
        if (!doc.exists) { console.error(`Nie ma zgłoszenia ${arg}.`); process.exit(1); }
        const sub = doc.data();

        const dances = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'dances.json'), 'utf8')).dances;
        const knownSlugs = dances.map(d => d.slug);
        const errors = validateSubmission(sub, knownSlugs);
        if (errors.length > 0) {
            console.error('Zgłoszenie nie przechodzi walidacji — nic nie zapisano:');
            errors.forEach(e => console.error(`  - ${e}`));
            process.exit(1);
        }
        const eventsFile = path.join(DATA_DIR, 'events.json');
        const eventsJson = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
        const event = mapSubmissionToEvent(sub);
        if (eventsJson.events.some(e => e.id === event.id)) {
            console.error(`Wydarzenie o id "${event.id}" już istnieje w events.json.`); process.exit(1);
        }
        eventsJson.events = insertEventSorted(eventsJson.events, event);
        fs.writeFileSync(eventsFile, JSON.stringify(eventsJson, null, 4) + '\n');
        await ref.update({ status: 'approved' });
        console.log(`Dodano "${event.title}" do data/events.json i oznaczono jako approved.`);
        console.log('Następnie: git add data/events.json && git commit && git push');
        return;
    }

    if (flag === '--reject') {
        if (!arg) { usage(); process.exit(1); }
        await getDb().collection('submissions').doc(arg).update({ status: 'rejected', rejectReason: rest.join(' ') || '' });
        console.log(`Oznaczono ${arg} jako rejected.`);
        return;
    }

    usage();
    process.exit(1);
}

main().catch(err => { console.error(err); process.exit(1); });
