# Prompty grafik — nowe karty tańców + kafelek „Do obejrzenia”

Brakujące grafiki dla treści dodanej z przewodnika o angolskich tańcach. Prompty w stylu
zgodnym z istniejącymi `assets/dances/*.webp` i `assets/guide/*.webp`: **fotografia
dokumentalna (candid), ciepłe złociste/ambientowe światło, prawdziwe odcienie skóry,
współczesne swobodne ubrania, drewniana podłoga studia lub nasłoneczniony dziedziniec,
stonowana ziemista kolorystyka (clay / ochre / ciepły brąz), bez tekstu i logo w kadrze**.
Zakaz z DESIGN.md: żadnej stylistyki klubowej/neonowej ani egzotyzującej.

Generowanie po stronie właściciela (OpenAI/ChatGPT image). Po wygenerowaniu: zapisać jako
**WebP** (`cwebp -q 92 -m 6`, zgodnie z konwencją repo) pod wskazaną ścieżką.

---

## Karty tańców — `assets/dances/`

Format zbliżony do pozostałych kart (kadr poziomy, „cover”; detal i kafelek używają
`background-size: cover`, więc proporcje są elastyczne — 16:9 lub 3:2).

### 1. `tchianda.webp`
> *"Warm documentary photograph of a traditional Angolan community dance from the
> Lunda-Tchokwe culture: a group of people dancing together in a sunlit outdoor courtyard
> with weathered ochre earth walls, a musician playing a traditional hand drum, expressive
> communal movement evoking heritage and connection to ancestors, candid style, warm earthy
> color grading, real skin tones, contemporary and traditional mixed clothing, 16:9, no text."*

### 2. `tance-karnawalowe.webp`
> *"Warm documentary photograph of a joyful Angolan carnival street dance: a lively group
> of dancers moving together in a sunlit street celebration, colourful but earthy costumes,
> hand drums and percussion, festive communal energy, candid photojournalistic style, golden
> warm color grading, real skin tones, 16:9, no text."*

### 3. `afro-house.webp`
> *"Warm documentary photograph of an energetic Angolan afro house dancer mid-move on a
> polished wooden studio floor, strong grounded footwork, focused expression, other young
> dancers watching at the edges, daytime ambient light through large windows, candid style,
> warm earthy color grading (clay and ochre), contemporary casual streetwear, 16:9, no text,
> no nightclub or neon lighting."*

### 4. `kizomba.webp` *(opcjonalnie — obecnie używa zdjęcia hero)*
> *"Warm intimate documentary photograph of a couple dancing kizomba in a close, connected
> embrace on a warm-lit wooden floor, gentle romantic mood, eyes soft, other dancers softly
> blurred in the background, golden ambient lighting, warm earthy color grading, contemporary
> casual clothing, real skin tones, 16:9, no text."*

---

## Kafelek discovery „Do obejrzenia” — `assets/guide/`

Format **16:9**, banner pełnej szerokości; jasny motyw pod ciemnym gradientem (biały tekst
kafelka nakłada się od lewej).

### 5. `do-obejrzenia.webp`
> *"Warm documentary photograph: a small group of people gathered in a cozy, warm-lit room
> watching archival dance footage projected softly on a wall, silhouettes against the warm
> glow of the projection, relaxed attentive mood, earthy warm color grading, candid style,
> 16:9, no text, no logos."*

---

## Podpięcie po wygenerowaniu (dokładne zmiany)

**Kafelek „Do obejrzenia”** — nic nie trzeba dopinać: CSS już wskazuje
`--guide-image: url("assets/guide/do-obejrzenia.webp")` (`styles.css`, `.guide-tile--filmy
.guide-tile-media`). Wystarczy wrzucić plik — kafelek automatycznie pokaże grafikę zamiast
ciemnego fallbacku.

**Karty tańców** — w `app.js`, funkcja `getDanceImage(slug)`, dodać do mapy `images`
(dopiero gdy pliki istnieją — inaczej nagłówek karty pokazałby pusty ciemny pas zamiast
czystego nagłówka bez zdjęcia):

```js
'tchianda': 'assets/dances/tchianda.webp',
'tance-karnawalowe': 'assets/dances/tance-karnawalowe.webp',
'afro-house': 'assets/dances/afro-house.webp',
// opcjonalnie dedykowana kizomba zamiast hero:
'kizomba': 'assets/dances/kizomba.webp',
```

To samo należy dopisać w `getFeaturedImage`/mapie w pobliżu (jeśli któryś z tych tańców ma
trafić do kafelków home) — obecnie zestaw „featured” jest statyczny (8 kart) i nowych tańców
nie zawiera, więc dla samych kart detalu wystarczy `getDanceImage`.
