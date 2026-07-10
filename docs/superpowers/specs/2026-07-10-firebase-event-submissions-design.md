# Firebase Event Submissions — Design Spec

**Status:** Approved design (brainstorm), pending implementation plan.
**Date:** 2026-07-10

## Goal

Let visitors submit dance events through an **on-site form** on the Społeczność (`#/events`) page, backed by **Firebase Firestore** as an intake channel. Zero running cost, zero server.

## Core principle: intake-only

Firebase is **only the inbox**. The public events list stays `data/events.json`, rendered exactly as today. Nothing appears on the site without the curator's `git push`. This keeps the site static, free to host on GitHub Pages, and moderated by construction.

```
Visitor → on-site form (modal) → Firestore `submissions` (status: pending)
                                        │
Curator / AI agent ── tools/pull-submissions.js ──┘  (list / review)
        │ approve
        ▼
   validate → insert into data/events.json → mark doc approved → git commit && push
        ▼
   Static events page renders it (unchanged rendering path)
```

## Decisions locked

- **Role of Firebase:** intake channel only (public list stays static). 
- **Credentials for the admin script:** service-account key file (`tools/service-account.json`, gitignored). 
- **Anti-spam:** Firestore security rules (create-only + field validation) + a honeypot field. App Check / reCAPTCHA is **deferred** (add later if spam appears). 
- **Cost:** Firebase **Spark (free)** plan — no credit card. Firestore free tier (≈1 GiB storage, 20k writes/day, 50k reads/day) dwarfs this use.

## Components

### 1. `event-submit.js` (new, browser ES module)
- Loaded on the events page via `<script type="module" src="event-submit.js"></script>`. Classic `app.js` stays unchanged (no module conversion).
- On load, attaches click handlers to the existing `.submit-event-cta` buttons (the two "Zgłoś wydarzenie" anchors become `<button type="button">`), opening a native `<dialog>` modal with the form.
- **Lazy-loads the Firebase Web SDK from CDN on first open** (`firebase-app.js` + `firebase-firestore.js`, pinned version) — the rest of the site stays dependency-free until a user actually opens the form.
- Holds the **public** Firebase web config (apiKey/projectId/etc. — not a secret; safe to commit) as a constant with a clear placeholder to fill after creating the project.
- Basic **inline UX validation** (required fields present, email format, honeypot empty), builds the Firestore payload, writes via `addDoc(collection(db,'submissions'), payload)`, shows success/error states.
- **Test seam:** if `window.__submitOverride` is set, the submit path calls it instead of Firestore — lets e2e drive the whole UI without a real project.

**Form fields** (mirror the event model + submitter contact):
`title*`, `type*` (social/warsztaty/festiwal), `city*`, `date_start*`, `date_end`, `time`, `venue`, `price`, `styles*` (multi-select of known dance slugs), `url*`, `organizer`, `contactEmail*` (submitter, not published), `notes` (free text), `_hp` (honeypot, hidden, must stay empty). `*` = required client-side.

### 2. Firestore `submissions` collection
Each document:
- Event fields as above (`title, type, city, date_start, date_end?, time?, venue?, price?, styles[], url, organizer?`)
- `contactEmail`, `notes?` (curator-only, never published)
- `status`: `'pending'` on create → `'approved'` / `'rejected'` (admin only)
- `submittedAt`: `serverTimestamp()`
- `_hp`: honeypot (rule rejects if non-empty)

### 3. Firestore security rules (`firestore.rules`, deployed via Firebase CLI)
```
match /databases/{db}/documents {
  match /submissions/{id} {
    allow create: if isValidSubmission(request.resource.data);
    allow read, update, delete: if false;   // only Admin SDK (pull script) bypasses rules
  }
}
```
`isValidSubmission` checks: required fields present and typed; string length caps; `status == 'pending'`; `_hp == ''`; `styles` is a list; `submittedAt == request.time`. Public write-only, no public read.

### 4. `tools/pull-submissions.js` (new, Node, agent-friendly)
- Uses **firebase-admin** + `tools/service-account.json` to read/update `submissions` with admin privileges.
- Flags:
  - `--list` — human-readable table of `pending` submissions.
  - `--json` — pending submissions as JSON (for the AI agent to summarize/handle).
  - `--approve <id>` — map submission → event, validate, insert into `data/events.json`, set doc `status: 'approved'`; prints the `git add/commit` next step.
  - `--reject <id> [reason]` — set doc `status: 'rejected'` (+ optional reason).
- Reuses pure functions from `tools/add-event.js`: `validateEvent`, `insertEventSorted`, `slugifyEvent`.

### 5. Pure functions (unit-tested, no Firebase)
`mapSubmissionToEvent(doc)` (strip `contactEmail`/`notes`/`_hp`/`status`/`submittedAt`; set `source:'zgloszenie'`, `featured:false`, `id: slugifyEvent(...)`) and a `validateSubmission(doc, knownStyleSlugs)` — placed in a CommonJS module under `tools/`, exercised with `node --test`. Client-side form validation is UX-only and covered by e2e.

## Dependencies (scoped deviation)
- **Served site:** unchanged — Firebase Web SDK from CDN (ES module, lazy). No build step.
- **`tools/`:** gains `package.json` + `firebase-admin` (`tools/node_modules/` gitignored) and `tools/service-account.json` (gitignored secret).
- **Global (ops):** `firebase-tools` CLI for deploying rules / project config.
- **`.gitignore` additions:** `tools/node_modules/`, `tools/service-account.json`.

## Testing
- **Unit (`node --test`, no Firebase):** `mapSubmissionToEvent`, `validateSubmission`, and reuse of `validateEvent`/`insertEventSorted`/`slugifyEvent`.
- **e2e (Playwright):** open modal from "Zgłoś wydarzenie"; invalid input → inline errors; honeypot filled → blocked; valid input → success state, asserting the payload passed to `window.__submitOverride` (no real Firebase). 
- The admin I/O in `pull-submissions.js` is thin; its pure mapping/validation is unit-tested, the Firestore calls verified manually (like the existing interactive CLI).

## Owner setup — configuring Firebase (your steps)
1. **Create project** at console.firebase.google.com (Spark/free; no card).
2. **Firestore Database → Create** (production mode, region e.g. `europe-central2`).
3. **Register a Web App** (</> icon) → copy the `firebaseConfig` object → paste into `event-submit.js` (public config).
4. Install CLI: `npm i -g firebase-tools`; `firebase login`; `firebase init firestore` (or just add `firestore.rules`) → deploy rules: `firebase deploy --only firestore:rules`.
5. **Service account** for the pull script: Project settings → Service accounts → *Generate new private key* → save as `tools/service-account.json` (gitignored).
6. `cd tools && npm install` (pulls `firebase-admin`).

## Cost
$0. Spark plan, no billing. A submission form stays far inside the free tier; nothing sleeps or pauses.

## Out of scope (future, own specs)
- App Check / reCAPTCHA v3 hardening (if spam appears).
- Reading events live from Firestore (would replace the static list).
- Auth / on-site admin panel / organizer accounts.
- Email notification to the curator on new submission (could be a Firestore-triggered Cloud Function — but that needs the Blaze plan; deferred).

## Changes to existing code
- Remove the dead `EVENT_SUBMIT_FORM_URL` constant and the `submitLinks.forEach(link => link.href = …)` wiring from `app.js` (submission is now the modal, not an external link).
- The two `.submit-event-cta` anchors in `index.html` become `<button type="button">`.
- `AGENTS.md`: document `event-submit.js`, the `submissions` intake flow, `tools/pull-submissions.js`, and the new `tools/` dependencies.
