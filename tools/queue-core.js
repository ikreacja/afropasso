'use strict';
// Pure helpers for the unified intake queue. No Firebase here so it stays unit-testable.
// P1 keeps queue docs FLAT (event-shaped) to reuse submission-core + firestore.rules.
const { validateSubmission, mapSubmissionToEvent } = require('./submission-core');

const KINDS = ['event', 'school', 'class'];
const SOURCES = ['form', 'cli', 'research'];
const TRUSTS = ['public', 'single-source', 'verified'];

function targetFileForKind(kind) {
  if (kind === 'event') return 'data/events.json';
  if (kind === 'school' || kind === 'class') return 'data/schools.json';
  throw new Error(`Unknown kind: ${kind}`);
}

// Returns an array of error strings ([] === valid).
function validateQueueDoc(doc, knownStyleSlugs) {
  if (!doc || typeof doc !== 'object') return ['doc is not an object'];
  const errors = [];
  if (!KINDS.includes(doc.kind)) errors.push(`kind must be one of: ${KINDS.join(', ')}`);
  if (!SOURCES.includes(doc.source)) errors.push(`source must be one of: ${SOURCES.join(', ')}`);
  if (!TRUSTS.includes(doc.trust)) errors.push(`trust must be one of: ${TRUSTS.join(', ')}`);
  if (doc.kind === 'event') errors.push(...validateSubmission(doc, knownStyleSlugs));
  return errors;
}

// Maps a flat event-shaped queue doc into the record we publish to events.json.
function mapQueueDocToRecord(doc) {
  if (doc.kind === 'event') return mapSubmissionToEvent(doc);
  throw new Error(`Promotion for kind "${doc.kind}" is not supported in P1 (events only)`);
}

module.exports = { KINDS, SOURCES, TRUSTS, targetFileForKind, validateQueueDoc, mapQueueDocToRecord };
