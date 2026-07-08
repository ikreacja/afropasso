# Kizomba Compendium - Plan Treści i Architektura

## Architektura Informacji

### 1. Strona Główna (SPA)
- **Siatka kart tańców**: 9 głównych stylów + tła kulturowe
- **Filtry**:
  - Kraj pochodzenia (Angola, Haiti, inne)
  - Rodzaj/epoka genezy (tradycyjny, współczesny, plemienny, kolonialny, karnawałowy)
  - Rodzina tańców (sembá lineage, zouk/kizomba lineage, etc.)
- **Wyszukiwarka**: po nazwie i słowach kluczowych
- **Nawigacja**: link do osi czasu, glosariusz, FAQ

### 2. Oś Czasu
**Kluczowe wydarzenia do uwzględnienia:**
- Okres przedkolonialny: tradycyjne tańce plemienne
- Kolonializm portugalski: wpływ europejski
- 1975: Niepodległość Angoli
- Lata 80.: powstanie kizomby
- Lata 90.: rozwój sembá
- 2000s: diaspora angolska
- 2010s: powstanie urban kizz
- Współczesność: tarraxo i fusion

### 3. Karty Tańców - Szablon

#### Pola obowiązkowe:
- **Nazwa i alternatywy**
- **Pochodzenie**: kraj/region, okres, lata
- **Klasyfikacja**: typ tańca
- **Muzyka**: opis + przykłady utworów
- **Feeling/rytm**: prosty opis
- **Ramy i kontakt**: prowadzenie, dystans, body movement
- **Kroki bazowe**: charakterystyka ruchu
- **Wpływy**: rodzina tańców
- **Różnice**: "Jak odróżnić od..."
- **Kontrowersje**: z cytatami i źródłami
- **3 wideo**: esencja, social, lekcja
- **Bibliografia**: min. 3 źródła

## Paleta Kolorów (inspirowana flagą Angoli)
```css
--sand: #f5f2ea     /* tło główne */
--red: #e7605a      /* akcenty, przyciski */
--gold: #f0c24b     /* wyróżnienia */
--charcoal: #222    /* tekst główny */
--gray: #6b7280     /* tekst pomocniczy */
```

## Technologia
- **Czysty HTML + CSS + JS** (bez frameworków)
- **SPA z hash routing**: #/dance/kizomba, #/timeline
- **Lazy loading** dla YouTube iframe
- **Dostępność**: WCAG 2.1 AA
- **SEO**: JSON-LD, Open Graph

## Struktura Plików
```
/
├── index.html          # SPA z wszystkimi widokami
├── styles.css          # style z paletą Angola
├── app.js             # router, filtry, funkcjonalność
├── data/
│   └── dances.json    # dane wszystkich tańców
└── README.md          # instrukcja użycia
```

## Kryteria Jakości
- **Performance**: Lighthouse ≥ 90
- **Accessibility**: pełna obsługa klawiatury, screen reader
- **SEO**: meta tags, structured data
- **Mobile-first**: responsive design
- **Kompatybilność**: WordPress embed ready

