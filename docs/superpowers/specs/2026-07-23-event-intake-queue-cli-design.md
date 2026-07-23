# Wspólna kolejka zgłoszeń + publiczne CLI (Opcja 3) — P1

Data: 2026-07-23
Status: zatwierdzony kierunek (do implementacji); wymaga prerekwizytu Firebase (P0)

## Cel

Umożliwić dodawanie eventów tańca do AfroPasso z wielu kanałów (formularz na stronie,
agent researchu, **cudzy agent Claude/ChatGPT przez opublikowany skill**) przez **jedną
wspólną kolejkę** w Firestore, z **akceptacją człowieka** i publikacją do statycznych
plików `data/*.json`. Wszystko w ramach **darmowego planu Firebase (Spark)** — bez Cloud
Functions.

Decyzje z brainstormu (zatwierdzone):
- Źródło prawdy: **hybryda** — Firestore = kolejka/intake, git-JSON = publikacja (strona zostaje statyczna).
- **Jedna** kolejka dla wszystkich kanałów (`source` + `trust`), jedno narzędzie promocji.
- Transport publicznego dodawania: **Opcja 3** — zapis wprost do Firestore przez REST API wg opublikowanego skilla. MCP to późniejsza nakładka (P4).

## Zakres P1

W zakresie:
- Kolekcja Firestore **`queue`** (uogólnienie istniejącego `submissions`) + reguły.
- **`docs/afropasso-submit.md`** — skill/prompt dla cudzego agenta (schemat + REST endpoint + zasady).
- **`tools/queue.js`** — kuratorskie CLI (`--list` / `--promote <id>` / `--reject <id>`), scala `pull-submissions.js` + `promote-candidate.js`.
- Przepięcie formularza (`event-submit.js`) z `submissions` na `queue` (nowy schemat: `kind`/`source`/`trust`).
- Testy jednostkowe czystych funkcji (jak dotąd `node --test tools/`).

Poza zakresem (osobne speki):
- **P2** research agent → `queue` (wygaszenie `candidates.json`).
- **P3** pole `voivodeship` + regionalny UI/mapa województw.
- **P4** MCP connector.
- Cloud Functions / własny endpoint / rate-limit serwerowy (dopiero gdy spam stanie się realny → wymaga planu Blaze).

## Prerekwizyt P0 — postawienie Firebase (akcja właściciela)

Projekt Firebase i `tools/service-account.json` **nie istnieją**. Zanim P1 zadziała
end-to-end, Irek wykonuje w konsoli Firebase (~10 min; ja przygotowuję cały kod pod to):

1. Utwórz projekt Firebase (np. `afropasso`) na swoim koncie Google (plan **Spark/darmowy**).
2. Firestore Database → utwórz (production mode, region EU np. `europe-central2`).
3. Web app → skopiuj `firebaseConfig` → wklej w miejsce placeholdera `FIREBASE_CONFIG` (strona/`event-submit.js`). Klucz API jest publiczny (to normalne dla Firebase — bramką są reguły).
4. Ustawienia projektu → Service accounts → **Generate new private key** → zapisz jako `tools/service-account.json` (gitignored; potrzebne tylko kuratorowi lokalnie).
5. `cd tools && npm install` (firebase-admin już w `tools/package.json`).
6. Deploy reguł: `firebase deploy --only firestore:rules`.

Bez p. 1–4 kod jest kompletny, ale promocja/CLI nie połączy się z bazą.

## Model danych

### Publikowane (git-JSON) — bez zmian w P1
`data/events.json` / `data/schools.json` pozostają źródłem dla statycznej strony.
(Pole `voivodeship` dochodzi dopiero w P3.)

### Kolejka — Firestore `queue` (jeden dokument = jedno zgłoszenie)
```
{
  kind:   "event" | "school" | "class",   // co zgłaszamy (P1: głównie "event")
  source: "form" | "cli" | "research",
  trust:  "public" | "single-source" | "verified",
  status: "pending",                        // tylko pending przy tworzeniu
  payload: { …pola docelowego rekordu… },   // dla event: pola jak w submissions/add-event
  sourceUrl: string,
  submittedBy: string?,                     // opcjonalny podpis/handle
  submittedAt: <server timestamp == request.time>,
  _hp: ""                                    // honeypot, musi być puste
}
```
`payload` dla `kind:"event"` używa **tego samego kształtu i walidacji** co dziś
(`tools/submission-core.js` → `validateEvent` z `add-event.js`).

### Reguły `firestore.rules` (uogólnienie obecnych)
- `match /queue/{id}`: **`allow create`** tylko gdy walidne; **`read, update, delete: false`**.
- Walidacja (rozszerzenie `isValidSubmission`): dozwolone klucze = powyższe pola; `status=='pending'`; `_hp==''`; `submittedAt==request.time`; `kind in [...]`; `source in [...]`; `trust in [...]`; limity rozmiaru; walidacja `payload` (title/city/date_start regex/url/styles jak dziś).
- Zostaje na **Spark** (darmowe). Klient (przeglądarka lub agent) pisze bezpośrednio; bramką są reguły + honeypot + **akceptacja człowieka**.

## Kanały wejścia (wszystkie → `queue`)

1. **Formularz na stronie** — `event-submit.js` pisze do `queue` (dziś: `submissions`), dokładając `kind:"event"`, `source:"form"`, `trust:"public"`. Seam `window.__submitOverride` zostaje (e2e bez Firebase).
2. **Cudzy agent (Opcja 3)** — czyta `docs/afropasso-submit.md`, formatuje event i robi **REST `create`**:
   `POST https://firestore.googleapis.com/v1/projects/<PROJECT>/databases/(default)/documents/queue?key=<PUBLIC_API_KEY>`
   z ciałem w formacie Firestore REST (`{ "fields": { … } }`), `source:"cli"`. Reguły walidują.
3. **Research** (P2) — admin SDK, `source:"research"`, `trust:"verified"/"single-source"`.

## `docs/afropasso-submit.md` (skill/prompt)

Samodzielny dokument do rozdania. Zawiera: cel; **schemat eventu** (pola wymagane/opcjonalne, dozwolone `styles` = slugi z `data/dances.json`, `type` ∈ social/warsztaty/festiwal, `date_start` = `YYYY-MM-DD`); **URL REST + publiczny klucz**; format ciała Firestore REST + **przykład**; zasady (`status:"pending"`, `_hp:""`, jeden event = jeden `create`); informację, że wszystko trafia do weryfikacji i publikuje się dopiero po akceptacji. Wersja dla Claude Code może być też zainstalowalnym skillem (opcjonalnie).

## `tools/queue.js` — kuratorskie CLI

Scala `pull-submissions.js` + `promote-candidate.js`. `firebase-admin` + `tools/service-account.json`.
- `--list` / `--json` — pending z `queue` (czytelnie: kind, source, trust, tytuł, data, link).
- `--promote <id>` — re-check że link żyje; pobranie coveru → WebP (`tools/cover-image.js`); walidacja (`validateSubmission`/`validateEvent`); insert do `data/events.json` (lub `schools.json` dla `kind:"school"/"class"`) przez `insertEventSorted`; oznaczenie doc `status:"approved"`. Publikacja = `git commit && push` (git = bramka).
- `--reject <id> [powód]` — `status:"rejected"`.
- Blokuje promocję `trust:"public"`/martwy link chyba że `--force` (wzór z `promote-candidate.js`).
- `submission-core.js`/`add-event.js`/`cover-image.js` reużyte; `pull-submissions.js` i `promote-candidate.js` wygaszone (lub cienkie aliasy).

## Testy / weryfikacja
- `node --test tools/queue.test.js` (czyste funkcje: mapowanie payloadu, walidacja, wybór pliku po `kind`).
- `node --check` na zmienionych JS; `JSON.parse` danych.
- Reguły: ręczny test `create` (poprawny → OK; zły honeypot/pole → odrzucony) po deployu.
- E2E formularza przez `__submitOverride` bez Firebase.

## Kryteria akceptacji (P1)
1. Po P0: agent (lub `curl`) robi REST `create` do `queue` z poprawnym eventem → dokument `pending` powstaje; zły (honeypot/braki) → odrzucony przez reguły.
2. `node tools/queue.js --list` pokazuje pending ze wszystkich źródeł.
3. `--promote <id>` wstawia event do `data/events.json`, pobiera cover→WebP, oznacza doc; po `git push` event jest na stronie.
4. `--reject` oznacza odrzucony; nie trafia do publikacji.
5. Formularz na stronie pisze do `queue` (nie `submissions`) z `source:"form"`.
6. `docs/afropasso-submit.md` wystarcza, by nieznający projektu agent sformatował i wysłał poprawny event.
7. Wszystko działa na **darmowym planie** (żadnego Cloud Functions).

## Ryzyka / uwagi
- **Brak serwerowego rate-limitu** na darmowym planie — mitygacja: honeypot + walidacja + bramka człowieka; eskalacja do Cloud Function (Blaze) dopiero przy realnym spamie.
- Publiczny klucz API w skillu — standard Firebase; nie jest sekretem, bramką są reguły.
- Migracja `submissions` → `queue`: jeśli w `submissions` są realne dane, przenieść/przepromować przed przełączeniem formularza.
