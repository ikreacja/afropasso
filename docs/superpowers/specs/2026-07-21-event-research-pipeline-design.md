# Procedura researchu i publikacji eventów — projekt

Data: 2026-07-21
Status: zatwierdzony do implementacji

## 1. Cel

Zbudować powtarzalną, cykliczną procedurę, w której agent researchowy odnajduje
taneczne eventy (rodzina kizomby: kizomba, semba, tarraxo, urban-kizz, kompa,
kuduro…) w Polsce — ze szczególnym uwzględnieniem Trójmiasta — oraz najważniejsze
festiwale w Europie, weryfikuje je i przygotowuje do publikacji w `data/events.json`.

Tryb pracy: **agent proponuje → człowiek zatwierdza**. Agent nigdy nie publikuje
sam na produkcję (to faza 2, patrz §12). Poczekalnia oddziela research od tego, co
widzi strona.

Zakres pierwszego uruchomienia: eventy od dziś do końca 2026 (Polska + kluczowe
festiwale europejskie).

## 2. Dowód, że metoda działa (próbka z 2026-07-21)

Realny research na próbie „Trójmiasto + festiwale". Próg roboczy: data i miejsce
potwierdzone niezależnie + żywy link. Wynik:

Gotowe do publikacji (`verified` — 2+ niezależne źródła):
- **VAMOS Festival Warsaw** — 2026-07-31–08-03, Novotel Airport, Warszawa. kizomba/urban-kizz.
  Źródła: kizombakatxupa.com, where-to-dance-salsa.com, allevents.in, FB event, iwencik.pl.
- **elSol Festival Fall Edition** — 2026-11-12–16, Warszawa. Źródła: elsolfestival.pl (oficjalne) + latindancecalendar.com.
- **Paris Kizomba Congress** — 2026-11-19–23, Hilton Paris CDG, Tremblay/Paryż. Źródła: danceplace.com, allevents.in, weezevent (bilety), latindancecalendar.com.
- **Tukina Lisboa – Kizomba & Semba** — 2026-12-11 (`date_end` do potwierdzenia: część źródeł podaje 11–14), Lizbona. Źródła: FB OsTukina (oficjalne), instagram, latindancecalendar, kizomba-world, kizombakatxupa, Eventbrite.
- **Nantes Kizomba Festival** — 2026-12-03–07, Sure Hotel Beaujoire, Nantes. Źródła: placetodance.com + agregatory (oficjalny FB/strona do domknięcia przy promocji).

Wnioski, które kształtują projekt:
1. **Duże festiwale są łatwe** — żyją w 3–4 agregatorach kizomby + własnych stronach + biletowniach. Podwójna weryfikacja to minuty.
2. **Lokalne Trójmiasto jest trudne** — sociale i część szkół żyją na FB. Trzeba osobnego near-term lokalnego sweepu i ludzkiej pętli (paste-link).
3. **Agregatory to złoto** — jedno miejsce, wiele zweryfikowanych eventów z linkami.
4. **Rozjazdy dat są realne** (Tukina) — po to jest podwójna weryfikacja: łapie je, zamiast przepuścić.
5. **Recurring kursy ≠ eventy** — „kizomba w każdą środę" (np. Turska Dance Academy) to dane do `schools.json`, nie do kalendarza eventów.

## 3. Architektura (Wariant B)

Przepływ:

```
źródła → [research agenta] → data/candidates.json → [przegląd człowieka] → tools/promote-candidate.js → data/events.json → git push → live
```

Strona czyta **wyłącznie** `data/events.json`. `data/candidates.json` to poczekalnia,
nigdy nie serwowana. Trzy nowe artefakty; reszta reużywa istniejącego kodu.

## 4. Rejestr źródeł — `tools/research-sources.json`

Lista miejsc, po które procedura wraca. Każde źródło:

```json
{
  "name": "Latin Dance Calendar",
  "url": "https://latindancecalendar.com/",
  "type": "aggregator",          // aggregator | festival-site | school | ticketing | social | pl-calendar
  "access": "agent",             // agent (publiczny HTML) | human (za loginem/apka)
  "role": "both",                // discovery | verify | both
  "quality": "high",             // high | medium
  "scope": "kizomba, worldwide",
  "notes": "Filtruje po stylu i kraju; podaje daty i linki oficjalne."
}
```

Startowa zawartość (z próbki):

- **agent · discovery+verify · high:** latindancecalendar.com, placetodance.com, danceplace.com, kizomba-world.com, where-to-dance-salsa.com, goandance.com, kizombaembassy.com, kizzcalendar.com, kizombakatxupa.com, **wydarzeniataneczne.pl** (PL), trojmiasto.pl/imprezy (Trójmiasto), oficjalne strony festiwali.
- **agent · verify · high:** biletownie — iwencik.pl, eventbrite, dizizid.com (strony biletowe konkretnych eventów; brak publicznej przeglądarki, więc tylko potwierdzanie), weezevent.
- **human · discovery · high:** Facebook (grupy, np. „Kizomba, Semba, UrbanKiz – Trójmiasto"; profile organizatorów/szkół), Instagram, **OnlyDance app** (onlydanceapp.com — tylko apka, bez publicznego webu).

Facebook i Instagram mają `quality: high` — oficjalny profil/event organizatora bywa
bardziej autorytatywny niż agregator. Ich `access` jest `human`, ale agent i tak
dosięga ich pośrednio (patrz §10).

## 5. Poczekalnia — `data/candidates.json`

Schemat = pola eventu (jak w `events.json`) + metadane weryfikacji:

```json
{
  "id": "vamos-festival-warsaw-2026-07-31",
  "title": "VAMOS Festival Warsaw",
  "type": "festiwal",
  "styles": ["kizomba", "urban-kizz"],
  "city": "Warszawa",
  "date_start": "2026-07-31",
  "date_end": "2026-08-03",
  "venue": "Novotel Airport",
  "url": "https://iwencik.pl/registrations/VAMOS2025/EN",
  "image_src": "https://…/cover.jpg",
  "organizer": "VAMOS Festival",
  "sources": ["https://kizombakatxupa.com/…", "https://where-to-dance-salsa.com/…"],
  "link_ok": true,
  "confidence": "verified",
  "status": "ready",
  "notes": "date_end zgodny na 3 źródłach."
}
```

- `sources` — lista URL-i, na których potwierdzono datę i miasto (min. 2 dla `verified`).
- `link_ok` — wynik sprawdzenia HTTP pola `url` (true/false/null).
- `confidence` — patrz §6.
- `status` — `ready` | `needs_second_source` | `needs_manual` | `rejected`.
- `image_src` — źródłowy URL grafiki (pobierana i przerabiana dopiero przy promocji, §9).

`candidates.json` jest trzymany w repo (przegląd przez `git diff`), ale strona go nie
czyta.

## 6. Weryfikacja — kryterium nieblokujące (etykieta pewności)

Weryfikacja to **etykieta**, nie bramka. Jedno źródło czasem wystarcza — event trafia
na stronę, ale niesie znacznik „do potwierdzenia".

| `confidence`      | Warunek                                             | Zachowanie |
|-------------------|-----------------------------------------------------|------------|
| `verified`        | ≥2 niezależne źródła zgodne co do daty i miasta + żywy link | publikacja normalna |
| `single-source`   | 1 wiarygodne źródło + żywy link                      | **publikowalne**, oznaczone „do potwierdzenia" |
| `unverified`      | martwy link lub sprzeczne dane                       | nie publikować — najpierw popraw |

„Niezależne" = różne domeny i nie dwa lustra tego samego wydarzenia FB. Źródło
**oficjalne** (własna strona LUB własny FB/IG event organizatora) liczy się jako
mocne i może być jednym z dwóch (preferowane: 1 oficjalne + 1 agregator/biletownia).

Znacznik `single-source` przenosi się na opublikowany event jako opcjonalne,
**nierenderowane** pole `confidence` w `events.json` (pełny ślad zostaje w
`candidates.json`), by dało się go później domknąć. `status: needs_manual` jest tylko
dla przypadków, których agent naprawdę nie dosięga **i** search ich nie pokazuje —
nie dlatego, że źródło jest na FB.

## 7. Procedura researchu agenta (każdy przebieg)

1. Wczytaj `tools/research-sources.json`; przejdź źródła `access: agent` dla okna czasu i geografii.
2. **Osobny przebieg „near-term lokalny"** — najbliższe 30–45 dni w PL (zwłaszcza Trójmiasto/Warszawa), bo lokalne eventy giną w zapytaniach ogólnoeuropejskich (lekcja z VAMOS).
3. Dla każdego kandydata: zbierz źródła zgodne co do `date_start` + `city`, sprawdź żywość `url`, ustal `confidence` (§6).
4. **Dedup** względem `events.json` i `candidates.json` (po slug/dacie/mieście).
5. Odfiltruj recurring kursy → sugestia do `schools.json`, nie do eventów.
6. Zapisz/scal do `candidates.json`. **Nigdy nie dotykaj `events.json`.**
7. Raport: ile `ready`, ile `needs_second_source`, ile `needs_manual` (do wklejenia linku przez człowieka).

## 8. CLI promocji — `tools/promote-candidate.js`

Dependency-free Node, spójny ze stylem `tools/`. Reużywa `validateEvent`,
`insertEventSorted`, `slugifyEvent` z `add-event.js` (już eksportowane).

Komendy:
- `--list` — kandydaci pogrupowani wg `status`/`confidence`.
- `--promote <id>` — ponownie sprawdza żywość linku, pobiera i przerabia grafikę (§9),
  waliduje, wstawia chronologicznie do `events.json`, usuwa kandydata z poczekalni.
- `--reject <id>` — oznacza `status: rejected` (lub usuwa).

Zasady:
- **Nie blokuje** na `single-source` — publikuje z ostrzeżeniem i zapisuje `confidence` na evencie.
- Blokuje tylko `unverified` (martwy link / sprzeczne dane), chyba że `--force`.
- Czyste funkcje testowane: `node --test tools/promote-candidate.test.js`.

Publikacja = `git add data/events.json assets/events && git commit && push`.

## 9. Obsługa grafik (cover)

Decyzja: zaciągaj + przerabiaj + fallback.

- Przy promocji pobierz `image_src` (grafika organizatora danego eventu — nie galeria).
- **Konwersja do WebP** (`cwebp -q 92 -m 6`, zgodnie z konwencją projektu) + kadr do
  proporcji kafla wyróżnionego. Zapis do `assets/events/<id>.webp`, pole `image` w evencie.
- Delikatny brand-overlay (CSS na kaflu) dla spójności z ciepłą, dokumentalną paletą —
  chroni przed rozjazdem z DESIGN.md (zakaz neon/nightclub, exoticizing imagery).
- **Brak dobrej grafiki → markowy typograficzny kafel** (wzorzec jak `guide-tile`),
  nie pusty/rozjechany placeholder.
- Grafika ma znaczenie wizualne tylko na **kaflach wyróżnionych (max 3)**; lista
  miesięczna pozostaje czysto tekstowa (`eventRowHTML`) — świadomy podział „nieliczne
  atrakcyjne / spójna reszta".

Uwaga o prawach: plakat to własność organizatora; użycie jako cover linkowanego,
promowanego eventu jest akceptowalne — trzymamy się „grafika = ten konkretny event".

## 10. Dostęp do Facebooka — stan faktyczny

- **Graph Search** (wyszukiwanie po FB) Meta wyłączyła w 2019 — nie istnieje.
- **Graph API do eventów** — publiczne wyszukiwanie (`/search?type=event`) usunięte w
  2018. Przez API czyta się tylko eventy **własnej Strony**, nie cudze publiczne.
  Do odkrywania/weryfikacji cudzych eventów API się nie nadaje.
- **Zalogowany scraper** łamie regulamin FB i dostaje bana — nie budujemy.

Co realnie działa i wystarcza:
1. **Search indeksuje publiczne eventy FB** — WebSearch je wyciąga (Tukina, Champions).
2. **Agregatory zasysają FB** — kizombakatxupa, allevents, where-to-dance = „dane z FB
   w czytelnym HTML"; większość „FB-only" festiwali tam jednak jest (VAMOS to pokazał).
3. **Biletownie** (iwencik, Eventbrite, dizizid) — publiczna strona zapisów potwierdza.
4. **Fetch OG-tagów** przez `add-event.js` (server-side, browser UA) — dla części
   publicznych stron/eventów FB zwraca `og:title`/`og:image` (zawodne, bo FB coraz
   częściej stawia login wall — traktować jako bonus, nie fundament).
5. **Human paste-link** — Ty jesteś w grupach FB; wklejasz to, czego search nie widzi.
   Ścieżka bez zmian w kodzie: `node tools/add-event.js <link>`.

## 11. Sprzątanie zaślepek

Obecne 8 eventów w `events.json` to dane fikcyjne (prawie wszystkie linkują do
`facebook.com/afropasso`; „Vamos Wrocław 30.10" wręcz podpina realny FB event ID pod
błędne miasto i datę). **Usunąć przed pierwszą realną publikacją**, by nie mieszać
zmyślonych z prawdziwymi.

## 12. Poza zakresem tej specyfikacji (przyszłe fazy)

- **Faza 2 — cron (Wariant C):** scheduled cloud agent uruchamia research co tydzień,
  zapisuje `candidates.json` / otwiera PR; człowiek tylko przegląda. Dokładamy, gdy
  pętla B się sprawdzi jakościowo.
- **Monetyzacja „płatne wyróżnienie / promowane eventy" + bogatsze karty:** osobna
  spec, gdy będzie ruch. Teraz `featured` = wyłącznie wybór redakcyjny wg jakości i
  trafności; zaufanie (główny kapitał marki) chronione. `buycoffee.to` zostaje jako
  dobrowolne wsparcie.

## 13. Testowanie / weryfikacja

- `node --test tools/promote-candidate.test.js` (czyste funkcje; katalogowa forma
  `node --test tools/` jest zepsuta na Node v26 — uruchamiać per-plik).
- `node --check tools/promote-candidate.js`.
- Walidacja JSON: `data/candidates.json` i `data/events.json`.
- `node --test tools/add-event.test.js` — po ewentualnej zmianie eksportów.
- Serw lokalny na porcie 8123 (`python3 -m http.server 8123`), wgląd w `#/events`
  desktop + mobile.

## 14. Podsumowanie artefaktów

Nowe:
- `tools/research-sources.json` — rejestr źródeł.
- `data/candidates.json` — poczekalnia.
- `tools/promote-candidate.js` (+ `tools/promote-candidate.test.js`) — CLI promocji.

Zmieniane:
- `add-event.js` — konwersja pobranej grafiki do WebP (współdzielona z promocją);
  ewentualne dodatkowe eksporty pod reużycie.
- `data/events.json` — usunięcie zaślepek; opcjonalne pole `confidence`.
- Front (drobne): markowy typograficzny fallback dla eventów bez grafiki + brand-overlay
  na kaflu wyróżnionym (styles.css / renderFeaturedEvents).
