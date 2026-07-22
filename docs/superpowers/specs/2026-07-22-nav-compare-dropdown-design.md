# Nawigacja: „Porównaj" pod „Wszystkie tańce" + baner w bibliotece

Data: 2026-07-22
Status: zatwierdzony (do implementacji)

## Cel

Uprościć górne menu (obecnie 7 pozycji) przez zdjęcie osobnej pozycji **Porównaj**
i podpięcie porównywarki pod **Wszystkie tańce**. Strona Porównaj (`#/compare`)
pozostaje osobną, atrakcyjną podstroną — zmieniamy tylko sposób dojścia do niej.

To **pierwszy z dwóch etapów**. Etap drugi (poza zakresem tego specu) to podział
Społeczności na Wydarzenia + Zajęcia lokalne oraz mapa województw — dostanie własny spec.

## Zakres

W zakresie:
- markup górnego menu (`index.html`) — „Wszystkie tańce" jako pozycja z podmenu,
  usunięcie osobnej pozycji „Porównaj";
- baner „Porównaj" na stronie `#/dances` pod wyszukiwarką/filtrami;
- CSS dropdownu (desktop) i banera (`styles.css`);
- drobna korekta aktywnego stanu menu w routerze (`app.js`).

Poza zakresem:
- strona/trasa `#/compare` i jej zawartość — bez zmian;
- Społeczność, zajęcia lokalne, mapa województw — osobny spec;
- hamburger / przebudowa nawigacji mobilnej — nie wprowadzamy.

## Stan obecny (fakty z kodu)

- Menu: `<ul class="nav-menu">` w `index.html` (~w. 71–79), 7 pozycji `<li><a class="nav-link" data-route="…">`.
- Trasy w `app.js` `handleRoute()` (`dances`, `compare`, `events`, …); aktywny link ustawiany po `data-route`.
- Mobile (`@media max-width: 980px`): `.nav-menu { overflow-x: auto }` — poziomo przewijany pasek linków, **bez** hamburgera. Skutek: absolutnie pozycjonowany dropdown wewnątrz `.nav-menu` byłby przycięty.
- Filtry biblioteki (`.filters` → `.filters-container` z `#search-input` + selecty) są w widoku `#/dances` w `index.html`.

## Projekt

### 1. Menu — „Wszystkie tańce" z podmenu

Markup (zastępuje pozycje „Wszystkie tańce" i „Porównaj"; „Porównaj" jako osobne `<li>` znika):

```html
<li class="nav-item-has-sub">
    <a href="#/dances" class="nav-link" data-route="dances">
        Wszystkie tańce <span class="nav-caret" aria-hidden="true">▾</span>
    </a>
    <ul class="nav-submenu">
        <li><a href="#/dances" class="nav-sublink">Biblioteka tańców</a></li>
        <li><a href="#/compare" class="nav-sublink">Porównaj tańce</a></li>
    </ul>
</li>
```

Zachowanie:
- **Desktop (>980px):** podmenu odsłaniane czystym CSS na `:hover` i `:focus-within`
  rodzica (`.nav-item-has-sub`) — bez JS. Kliknięcie etykiety „Wszystkie tańce"
  nawiguje do `#/dances`; pozycje podmenu są w DOM za rodzicem, więc dostępne z Tab.
- **Mobile (≤980px):** podmenu ukryte (`display: none`) — byłoby przycięte przez
  przewijany pasek. „Wszystkie tańce" działa jak zwykły link do biblioteki;
  do porównywarki wchodzi się banerem (sekcja 2), zawsze obecnym na stronie biblioteki.
- `▾` (`.nav-caret`) widoczny tylko na desktopie (ukryty w tym samym media query, w którym chowamy podmenu).

Dostępność: podmenu to zwykłe linki; reveal przez `:focus-within` czyni je osiągalnym
klawiaturą bez pułapek fokusu. Bez custom JS/ARIA-expanded (nie ma przycisku-triggera —
etykieta jest linkiem nawigującym). Widoczny focus zostaje z istniejących reguł `.nav-link`.

### 2. Baner „Porównaj" w bibliotece

Statyczny markup w widoku `#/dances`, **po** bloku `.filters`, **przed** kontenerem kart:

```html
<a class="compare-banner" href="#/compare">
    <span class="compare-banner-icon" aria-hidden="true">⇄</span>
    <span class="compare-banner-text">
        <strong>Porównaj tańce obok siebie</strong>
        <span>Zobacz różnice między kizombą, sembą, urban kizz i innymi — na jednej stronie.</span>
    </span>
    <span class="compare-banner-arrow" aria-hidden="true">→</span>
</a>
```

Styl: pełna ramka `--sand-line`, ciepłe tło (delikatny akcent `--ochre` przechodzący
w `--surface`), okrągła ikona na `--clay`, tytuł serifem. Hover: ramka `--clay`,
lekki cień, `translateY(-1px)`. Zakaz bocznych pasków-akcentów (zgodnie z DESIGN.md).
Responsywnie: na wąskich ekranach treść może się zawijać; ikona/strzałka pozostają.

### 3. Router / aktywny stan (`app.js`)

- Usunięcie osobnej pozycji „Porównaj" z menu oznacza, że przy trasie `compare`
  nie ma już linku `data-route="compare"` do podświetlenia. Aby menu nie „gasło"
  na stronie Porównaj, przy trasach `dances` **i** `compare` aktywna ma być pozycja
  `data-route="dances"` („Wszystkie tańce"). Drobna korekta w logice ustawiającej `.active`.
- Nowe trasy nie powstają; `#/compare` działa jak dziś.

## Pliki do zmiany

- `index.html` — markup menu (pozycja z podmenu, usunięcie „Porównaj") + baner w widoku `#/dances`.
- `styles.css` — `.nav-item-has-sub` / `.nav-submenu` / `.nav-sublink` / `.nav-caret`
  (desktop reveal + ukrycie w `@media max-width: 980px`) oraz `.compare-banner*`.
- `app.js` — aktywny stan menu dla `compare` → „Wszystkie tańce".

## Kryteria akceptacji

1. Desktop: najechanie/fokus na „Wszystkie tańce" pokazuje podmenu Biblioteka + Porównaj; kliknięcie etykiety → biblioteka; kliknięcie „Porównaj tańce" → `#/compare`.
2. Górny pasek nie ma już osobnej pozycji „Porównaj".
3. Mobile (≤980px): brak dropdownu; „Wszystkie tańce" wiedzie do biblioteki; baner pod wyszukiwarką prowadzi do `#/compare`.
4. Na stronie `#/compare` w menu podświetlone jest „Wszystkie tańce".
5. Baner widoczny na `#/dances` pod filtrami, klikalny, na palecie, bez bocznych pasków.
6. Strona/trasa Porównaj bez zmian.
7. Nawigacja klawiaturą dociera do „Porównaj tańce" w podmenu (desktop).
