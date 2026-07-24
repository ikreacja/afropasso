# Zgłaszanie wydarzeń do AfroPasso (dla agentów AI)

Ten dokument opisuje, jak sformatować i zgłosić jedno wydarzenie taneczne do AfroPasso — serwisu-przewodnika po tańcach afrykańskich i afro-diasporyjskich (rodzina kizomby: kizomba, semba, urban kiz, tarraxo i pokrewne).

## 1. Cel

Sformatuj jedno wydarzenie taneczne jako dokument Firestore i zapisz je w kolejce zgłoszeń AfroPasso — trafia ono do ręcznej weryfikacji przez człowieka i zostaje opublikowane dopiero po akceptacji.

## 2. Schemat

### Pola wymagane

| Pole | Typ | Opis |
|---|---|---|
| `title` | string, ≤200 znaków | Nazwa wydarzenia |
| `type` | string, enum | Jedno z: `social`, `warsztaty`, `festiwal` |
| `city` | string | Miasto, w którym odbywa się wydarzenie |
| `date_start` | string, `YYYY-MM-DD` | Data rozpoczęcia, np. `2026-09-12` |
| `styles` | lista stringów, niepusta | Style tańca, wyłącznie z listy dozwolonej poniżej |
| `url` | string | Żywy (aktywny) link do wydarzenia |
| `contactEmail` | string | Adres kontaktowy do organizatora lub zgłaszającego |

**Dozwolone wartości `styles`** (nie wolno wymyślać własnych — tylko te sloty):

`kizomba`, `semba`, `urban-kizz`, `kizomba-fusion`, `tarraxo`, `tarraxinha`, `kompa`, `kuduro`, `massemba`

### Pola opcjonalne

| Pole | Typ | Opis |
|---|---|---|
| `date_end` | string, `YYYY-MM-DD` | Data zakończenia (dla wydarzeń wielodniowych) |
| `time` | string | Godzina rozpoczęcia |
| `venue` | string | Nazwa lub adres miejsca |
| `price` | string | Cena / zakres cenowy |
| `organizer` | string | Organizator |
| `notes` | string | Dodatkowe uwagi |
| `sourceUrl` | string | Link do źródła, z którego pochodzi informacja (jeśli inny niż `url`) |
| `submittedBy` | string | Kto/co zgłasza (np. nazwa agenta) |

Pomiń w dokumencie te pola opcjonalne, których nie masz — nie wysyłaj pustych stringów zamiast nich (wyjątkiem jest `_hp`, patrz sekcja 4).

## 3. Endpoint

Zgłoszenie to utworzenie (`POST`) nowego dokumentu w kolekcji `queue` przez Firestore REST API:

```
https://firestore.googleapis.com/v1/projects/afropasso/databases/(default)/documents/queue?key=AIzaSyBX-M3QCafT1kZYs64ICHgk1-G3Vp_3VZA
```

`projectId` to `afropasso`, a klucz powyżej to publiczny klucz web AfroPasso. Klucz API jest publiczny z założenia — bramą bezpieczeństwa są reguły Firestore (walidacja pól, brak odczytu publicznego), nie tajność klucza.

## 4. Meta do dołączenia

Każdy dokument musi zawierać, oprócz pól z sekcji 2, następujące pola meta:

| Pole | Wartość | Uwagi |
|---|---|---|
| `kind` | `"event"` | Stały tekst |
| `source` | `"cli"` | Stały tekst — oznacza zgłoszenie programowe |
| `trust` | `"public"` | Stały tekst |
| `status` | `"pending"` | Stały tekst — każde nowe zgłoszenie czeka na review |
| `_hp` | `""` | Honeypot przeciw botom — musi być pustym stringiem |
| `submittedAt` | znacznik czasu ISO 8601 | Ustawiany po stronie klienta na bieżący czas, np. `2026-09-01T18:00:00Z`; w REST API to `timestampValue` |

## 5. Kompletny przykład ciała (Firestore REST format)

```json
{
  "fields": {
    "kind":        {"stringValue": "event"},
    "source":      {"stringValue": "cli"},
    "trust":       {"stringValue": "public"},
    "status":      {"stringValue": "pending"},
    "_hp":         {"stringValue": ""},
    "title":       {"stringValue": "Kizomba Night Gdańsk"},
    "type":        {"stringValue": "social"},
    "city":        {"stringValue": "Gdańsk"},
    "date_start":  {"stringValue": "2026-09-12"},
    "url":         {"stringValue": "https://example.com/event"},
    "contactEmail":{"stringValue": "org@example.com"},
    "styles":      {"arrayValue": {"values": [{"stringValue": "kizomba"}]}},
    "submittedAt": {"timestampValue": "2026-09-01T18:00:00Z"}
  }
}
```

Wyślij ten JSON jako ciało żądania `POST` pod adres z sekcji 3, z nagłówkiem `Content-Type: application/json`.

## 6. Zasady

- Jedno wydarzenie = jedno utworzenie dokumentu (jedno wywołanie `POST`).
- Używaj wyłącznie dozwolonych slugów stylów z sekcji 2 — nie wymyślaj nowych.
- Pomijaj pola opcjonalne, których nie masz; nie wypełniaj ich domysłami.
- Pole `_hp` zawsze musi zostać puste (`""`).
- Każde zgłoszenie jest weryfikowane przez człowieka przed publikacją na AfroPasso — brak natychmiastowej widoczności to normalny, oczekiwany krok procesu.
