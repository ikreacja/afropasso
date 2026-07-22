// Global state
let dancesData = null;
let timelineData = null;
let filteredDances = [];
let eventsData = null;
let schoolsData = null;
let filteredEvents = [];
let currentRoute = 'home';

// DOM elements
const elements = {
    loading: null,
    views: {},
    nav: {
        links: null
    },
    scrollTopButton: null,
    home: {
        searchInput: null,
        countryFilter: null,
        periodFilter: null,
        typeFilter: null,
        clearFilters: null,
        filterStatus: null,
        featuredContainer: null,
        dancesContainer: null,
        noResults: null
    },
    dance: {
        detail: null
    },
    timeline: {
        container: null
    },
    compare: {
        danceA: null,
        danceB: null,
        result: null
    },
    events: {
        cityFilter: null,
        styleFilter: null,
        typeFilter: null,
        clearFilters: null,
        filterStatus: null,
        featuredContainer: null,
        listContainer: null,
        emptyState: null,
        schoolsContainer: null
    },
    glossary: {
        container: null
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    initializeElements();
    setupEventListeners();
    await loadData();
    await loadEventsData();
    initializeRouter();
    showLoading(false);
});

// Initialize DOM element references
function initializeElements() {
    elements.loading = document.getElementById('loading');
    
    // Views
    elements.views.home = document.getElementById('home-view');
    elements.views.dances = document.getElementById('dances-view');
    elements.views.etykieta = document.getElementById('etykieta-view');
    elements.views.dance = document.getElementById('dance-view');
    elements.views.timeline = document.getElementById('timeline-view');
    elements.views.compare = document.getElementById('compare-view');
    elements.views.glossary = document.getElementById('glossary-view');
    elements.views.filmy = document.getElementById('filmy-view');

    // Navigation
    elements.nav.links = document.querySelectorAll('.nav-link');
    elements.scrollTopButton = document.getElementById('scroll-top-button');
    
    // Home view elements
    elements.home.searchInput = document.getElementById('search-input');
    elements.home.countryFilter = document.getElementById('country-filter');
    elements.home.periodFilter = document.getElementById('period-filter');
    elements.home.typeFilter = document.getElementById('type-filter');
    elements.home.clearFilters = document.getElementById('clear-filters');
    elements.home.filterStatus = document.getElementById('filter-status');
    elements.home.featuredContainer = document.getElementById('featured-dances-container');
    elements.home.dancesContainer = document.getElementById('dances-container');
    elements.home.noResults = document.getElementById('no-results');

    // Dance detail
    elements.dance.detail = document.getElementById('dance-detail');
    
    // Timeline
    elements.timeline.container = document.getElementById('timeline-container');
    
    // Compare
    elements.compare.danceA = document.getElementById('compare-dance-a');
    elements.compare.danceB = document.getElementById('compare-dance-b');
    elements.compare.result = document.getElementById('comparison-result');
    
    // Glossary
    elements.glossary.container = document.getElementById('glossary-container');

    // Events view
    elements.events.countryFilter = document.getElementById('event-country-filter');
    elements.events.cityFilter = document.getElementById('event-city-filter');
    elements.events.styleFilter = document.getElementById('event-style-filter');
    elements.events.typeFilter = document.getElementById('event-type-filter');
    elements.events.clearFilters = document.getElementById('event-clear-filters');
    elements.events.filterStatus = document.getElementById('event-filter-status');
    elements.events.featuredContainer = document.getElementById('featured-events-container');
    elements.events.listContainer = document.getElementById('events-list-container');
    elements.events.emptyState = document.getElementById('events-empty');
    elements.events.schoolsContainer = document.getElementById('schools-container');
    elements.views.events = document.getElementById('events-view');
    elements.views.event = document.getElementById('event-detail-view');
    elements.eventDetail = document.getElementById('event-detail');
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    elements.nav.links.forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Search and filters
    elements.home.searchInput.addEventListener('input', debounce(handleFilters, 300));
    elements.home.countryFilter.addEventListener('change', handleFilters);
    elements.home.periodFilter.addEventListener('change', handleFilters);
    elements.home.typeFilter.addEventListener('change', handleFilters);
    elements.home.clearFilters.addEventListener('click', clearFilters);
    
    // Compare selectors
    elements.compare.danceA.addEventListener('change', handleComparison);
    elements.compare.danceB.addEventListener('change', handleComparison);

    // Event filters
    elements.events.countryFilter.addEventListener('change', handleEventFilters);
    elements.events.cityFilter.addEventListener('change', handleEventFilters);
    elements.events.styleFilter.addEventListener('change', handleEventFilters);
    elements.events.typeFilter.addEventListener('change', handleEventFilters);
    elements.events.clearFilters.addEventListener('click', clearEventFilters);

    // Fragment navigation (link clicks + browser back/forward) — hashchange fires
    // in all browsers for both, unlike popstate which is not guaranteed on hash links.
    window.addEventListener('hashchange', handleHashChange);

    if (elements.scrollTopButton) {
        elements.scrollTopButton.addEventListener('click', scrollToTop);
        window.addEventListener('scroll', handleScrollTopVisibility, { passive: true });
        handleScrollTopVisibility();
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
}

function handleScrollTopVisibility() {
    if (!elements.scrollTopButton) return;

    if (handleScrollTopVisibility.queued) return;
    handleScrollTopVisibility.queued = true;

    requestAnimationFrame(() => {
        handleScrollTopVisibility.queued = false;
        const shouldShow = window.scrollY > Math.max(520, window.innerHeight * 0.72);
        elements.scrollTopButton.classList.toggle('is-visible', shouldShow);
    });
}

// Load data from JSON file
async function loadData() {
    try {
        showLoading(true);
        const response = await fetch('./data/dances.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        dancesData = data.dances;
        timelineData = data.timeline;
        filteredDances = [...dancesData];
        
        // Initialize compare selectors
        populateCompareSelectors();
        handleComparison();
        renderFeaturedDances();

        // Initialize glossary
        generateGlossary();
        
    } catch (error) {
        console.error('Error loading data:', error);
        showError('Błąd podczas ładowania danych. Spróbuj odświeżyć stronę.');
    }
}

async function loadEventsData() {
    try {
        const [eventsResponse, schoolsResponse] = await Promise.all([
            fetch('./data/events.json'),
            fetch('./data/schools.json')
        ]);
        if (!eventsResponse.ok || !schoolsResponse.ok) {
            throw new Error(`HTTP ${eventsResponse.status}/${schoolsResponse.status}`);
        }
        eventsData = (await eventsResponse.json()).events;
        schoolsData = (await schoolsResponse.json()).schools;
    } catch (error) {
        console.error('Error loading events:', error);
        eventsData = null;
        schoolsData = null;
    }
}

// Router functionality
function initializeRouter() {
    const hash = window.location.hash.slice(1) || '/';
    handleRoute(hash);
}

function handleNavigation(event) {
    event.preventDefault();
    const route = event.target.getAttribute('data-route');
    const path = route === 'home' ? '/' : `/${route}`;
    navigateTo(path);
}

function navigateTo(path) {
    window.history.pushState({}, '', `#${path}`);
    handleRoute(path);
}

function handleHashChange() {
    const hash = window.location.hash.slice(1) || '/';
    handleRoute(hash);
}

function handleRoute(path) {
    // Parse route
    const [route, ...params] = path.split('/').filter(Boolean);
    currentRoute = route || 'home';
    
    // Update navigation
    updateNavigation();
    
    // Show appropriate view
    showView(currentRoute);
    
    // Handle specific routes
    switch (currentRoute) {
        case 'home':
            // Featured tiles and the guide panel are static/rendered once in loadData()
            break;
        case 'dances':
            renderDanceCards();
            break;
        case 'events':
            renderEventsPage();
            break;
        case 'etykieta':
            // Static editorial content — nothing to render
            break;
        case 'dance':
            if (params[0]) {
                showDanceDetail(params[0]);
            } else {
                navigateTo('/');
            }
            break;
        case 'event':
            if (params[0]) {
                showEventDetail(params[0]);
            } else {
                navigateTo('/events');
            }
            break;
        case 'timeline':
            renderTimeline();
            break;
        case 'compare':
            // Compare view is already initialized
            break;
        case 'glossary':
            // Glossary is already generated
            break;
        case 'filmy':
            renderFilms();
            break;
        default:
            navigateTo('/');
            return;
    }

    requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
}

function updateNavigation() {
    elements.nav.links.forEach(link => {
        const route = link.getAttribute('data-route');
        if ((route === 'home' && currentRoute === 'home') || 
            (route !== 'home' && route === currentRoute)) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

function showView(viewName) {
    Object.values(elements.views).forEach(view => {
        if (view) view.classList.remove('active');
    });
    
    if (elements.views[viewName]) {
        elements.views[viewName].classList.add('active');
    }
}

const TILE_ARROW_ICON = ' <span class="tile-arrow" aria-hidden="true">&rarr;</span>';

function renderFeaturedDances() {
    if (!dancesData || !elements.home.featuredContainer) return;

    const featuredSlugs = ['kizomba', 'semba', 'tarraxinha', 'tarraxo', 'kizomba-fusion', 'urban-kizz', 'kuduro', 'kompa'];
    const featured = featuredSlugs
        .map(slug => dancesData.find(dance => dance.slug === slug))
        .filter(Boolean);

    elements.home.featuredContainer.innerHTML = featured.map((dance, index) => `
        <article class="featured-tile ${index === 0 ? 'featured-large' : ''}" style="--tile-position: ${getFeaturedPosition(dance.slug)}; --tile-image: url('${escapeAttribute(getFeaturedImage(dance.slug))}')" onclick="navigateTo('/dance/${escapeAttribute(dance.slug)}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ') navigateTo('/dance/${escapeAttribute(dance.slug)}')">
            <span class="featured-tile-media" aria-hidden="true"></span>
            <div class="featured-tile-content">
                <h4>${escapeHTML(dance.names.pl)}</h4>
                <p class="featured-country">${escapeHTML(formatOrigin(dance))}</p>
                <p class="featured-character">${escapeHTML(formatClassification(dance))}</p>
                <p class="featured-description">${escapeHTML(getFeaturedDescription(dance))}</p>
                <span>Przejdź do karty${TILE_ARROW_ICON}</span>
            </div>
        </article>
    `).join('');
}

function getFeaturedDescription(dance) {
    const overrides = {
        'kizomba': 'Bliskość, dialog i historia semby spotykająca zouk.',
        'semba': 'Radość, energia i angolska tradycja w szybkim rytmie.',
        'tarraxinha': 'Bardzo bliski kontakt, izolacje i mikro-ruch.',
        'tarraxo': 'Współczesny puls Lizbony, izolacje i niskie prowadzenie.',
        'kizomba-fusion': 'Kizomba z subtelnymi wpływami innych stylów.',
        'urban-kizz': 'Współczesna interpretacja kizomby w miejskim stylu.',
        'kuduro': 'Energia, opór i elektroniczny puls Luandy.',
        'kompa': 'Haitański groove, luźniejsze objęcie i karaibski puls.'
    };
    return overrides[dance.slug] || truncateText(dance.character_pl, 96);
}

function getFeaturedImage(slug) {
    return getDanceImage(slug) || 'assets/hero-dance-workshop.webp';
}

function getDanceImage(slug) {
    const images = {
        'massemba': 'assets/dances/massemba.webp',
        'kizomba': 'assets/dances/kizomba.webp',
        'semba': 'assets/dances/semba.webp',
        'tarraxinha': 'assets/dances/tarraxinha.webp',
        'tarraxo': 'assets/dances/tarraxo.webp',
        'kizomba-fusion': 'assets/dances/kizomba-fusion.webp',
        'urban-kizz': 'assets/dances/urban-kizz.webp',
        'kuduro': 'assets/dances/kuduro.webp',
        'kompa': 'assets/dances/kompa.webp',
        'tchianda': 'assets/dances/tchianda.webp',
        'tance-karnawalowe': 'assets/dances/tance-karnawalowe.webp',
        'afro-house': 'assets/dances/afro-house.webp'
    };
    return images[slug] || null;
}

function getFeaturedPosition(slug) {
    const positions = {
        'massemba': '58% 50%',
        'kizomba': '58% 50%',
        'semba': '48% 50%',
        'tarraxinha': '62% 50%',
        'tarraxo': '68% 50%',
        'kizomba-fusion': '67% 48%',
        'urban-kizz': '42% 45%',
        'kuduro': '55% 60%',
        'kompa': '62% 52%'
    };
    return positions[slug] || '50% 50%';
}

// Dance cards rendering
function danceCardHTML(dance, index) {
    return `
        <article class="dance-card" onclick="navigateTo('/dance/${escapeAttribute(dance.slug)}')"
                 role="button" tabindex="0" style="--i: ${index}"
                 onkeydown="if(event.key==='Enter'||event.key===' ') navigateTo('/dance/${escapeAttribute(dance.slug)}')">
            <header class="dance-card-header">
                <p class="dance-card-number">${String(index + 1).padStart(2, '0')}</p>
                <h3 class="dance-card-title">${escapeHTML(dance.names.pl)}</h3>
                <p class="dance-card-origin">${escapeHTML(formatOrigin(dance))}</p>
                <p class="dance-card-region">${escapeHTML(dance.origin.years)}</p>
            </header>
            <div class="dance-card-body">
                <p class="dance-card-character">
                    <strong>Charakter</strong>
                    <span>${escapeHTML(formatClassification(dance))}</span>
                </p>
                <p class="dance-card-description">
                    ${escapeHTML(truncateText(dance.character_pl, 170))}
                </p>
                <footer class="dance-card-footer">
                    <span class="card-link">Poznaj historię</span>
                </footer>
            </div>
        </article>
    `;
}

function renderDanceCards() {
    if (!dancesData) return;

    const container = elements.home.dancesContainer;
    const noResults = elements.home.noResults;

    if (filteredDances.length === 0) {
        container.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }

    noResults.classList.add('hidden');

    container.innerHTML = filteredDances.map((dance, index) => danceCardHTML(dance, index)).join('');
}

function formatOrigin(dance) {
    return `${dance.origin.country}, ${dance.origin.region}`;
}

function formatClassification(dance) {
    return dance.classification.join(' · ');
}

// Filtering functionality
function handleFilters() {
    const searchTerm = elements.home.searchInput.value.toLowerCase();
    const countryFilter = elements.home.countryFilter.value;
    const periodFilter = elements.home.periodFilter.value;
    const typeFilter = elements.home.typeFilter.value;
    
    filteredDances = dancesData.filter(dance => {
        // Search filter
        const matchesSearch = !searchTerm || 
            dance.names.pl.toLowerCase().includes(searchTerm) ||
            dance.character_pl.toLowerCase().includes(searchTerm) ||
            dance.keywords_pl.some(keyword => keyword.toLowerCase().includes(searchTerm));
        
        // Country filter
        const matchesCountry = !countryFilter || dance.origin.country === countryFilter;
        
        // Period filter
        const matchesPeriod = !periodFilter || dance.origin.period === periodFilter;
        
        // Type filter
        const matchesType = !typeFilter || dance.classification.includes(typeFilter);
        
        return matchesSearch && matchesCountry && matchesPeriod && matchesType;
    });

    renderDanceCards();
    updateFilterStatus();
}

function clearFilters() {
    elements.home.searchInput.value = '';
    elements.home.countryFilter.value = '';
    elements.home.periodFilter.value = '';
    elements.home.typeFilter.value = '';
    filteredDances = [...dancesData];
    renderDanceCards();
    updateFilterStatus();
}

function hasActiveFilters() {
    return Boolean(
        elements.home.searchInput.value.trim() ||
        elements.home.countryFilter.value ||
        elements.home.periodFilter.value ||
        elements.home.typeFilter.value
    );
}

function updateFilterStatus() {
    const status = elements.home.filterStatus;
    if (!status) return;

    if (!hasActiveFilters()) {
        status.textContent = '';
        status.classList.add('hidden');
        return;
    }

    status.textContent = formatFilterStatus(filteredDances.length);
    status.classList.remove('hidden');
}

function formatFilterStatus(count) {
    if (count === 0) {
        return 'Żaden styl nie pasuje do filtrów.';
    }
    if (count === 1) {
        return '1 styl pasuje do filtrów.';
    }
    const few = count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14);
    return few ? `${count} style pasują do filtrów.` : `${count} stylów pasuje do filtrów.`;
}

// Dance detail view
function showDanceDetail(slug) {
    const dance = dancesData.find(d => d.slug === slug);
    if (!dance) {
        navigateTo('/');
        return;
    }
    const detailImage = getDanceImage(dance.slug);
    const detailPosition = getFeaturedPosition(dance.slug);
    
    elements.dance.detail.innerHTML = `
        <header class="dance-detail-header ${detailImage ? 'has-detail-image' : ''}" ${detailImage ? `style="--detail-image: url('${escapeAttribute(detailImage)}'); --detail-position: ${escapeAttribute(detailPosition)}"` : ''}>
            <div class="dance-detail-content">
                <button class="detail-back-link" onclick="navigateTo('/')" type="button">
                    Wróć do biblioteki
                </button>
                <p class="section-kicker">Notatka AfroPasso</p>
                <h2 class="dance-detail-title">${escapeHTML(dance.names.pl)}</h2>
                <p class="dance-detail-subtitle">${escapeHTML(dance.character_pl)}</p>
                <div class="dance-detail-meta">
                    <span class="meta-item">${escapeHTML(dance.origin.country)}, ${escapeHTML(dance.origin.region)}</span>
                    <span class="meta-item">${escapeHTML(dance.origin.years)}</span>
                    <span class="meta-item">${escapeHTML(dance.origin.period)}</span>
                </div>
            </div>
        </header>
        
        <div class="dance-detail-body">
            <section class="detail-section">
                <h3>Charakterystyka</h3>
                <div class="characteristics-grid">
                    <div class="characteristic-item">
                        <h4>Muzyka</h4>
                        <p>${escapeHTML(dance.music.description_pl)}</p>
                        ${dance.music.examples ? `<p><strong>Przykłady:</strong> ${dance.music.examples.map(escapeHTML).join(', ')}</p>` : ''}
                    </div>
                    <div class="characteristic-item">
                        <h4>Uczucie</h4>
                        <p>${escapeHTML(dance.feeling_pl)}</p>
                    </div>
                    <div class="characteristic-item">
                        <h4>Objęcie</h4>
                        <p>${escapeHTML(dance.frame_pl)}</p>
                    </div>
                    <div class="characteristic-item">
                        <h4>Podstawy</h4>
                        <p>${escapeHTML(dance.basics_pl)}</p>
                    </div>
                </div>
            </section>
            
            <section class="detail-section">
                <h3>Wpływy</h3>
                <div class="dance-card-tags">
                    ${dance.influences.map(influence => `<span class="tag">${escapeHTML(influence)}</span>`).join('')}
                </div>
            </section>
            
            ${dance.differences_pl && dance.differences_pl.length > 0 ? `
            <section class="detail-section">
                <h3>Różnice względem innych stylów</h3>
                <ul class="differences-list">
                    ${dance.differences_pl.map(diff => `
                        <li>
                            <span class="detail-list-content">
                                <strong>vs ${escapeHTML(diff.vs)}:</strong>
                                <span>${escapeHTML(diff.text)}</span>
                            </span>
                        </li>
                    `).join('')}
                </ul>
            </section>
            ` : ''}
            
            ${dance.controversies_pl && dance.controversies_pl.length > 0 ? `
            <section class="detail-section">
                <h3>Kontrowersje</h3>
                <ul>
                    ${dance.controversies_pl.map(controversy => `<li>${escapeHTML(controversy)}</li>`).join('')}
                </ul>
            </section>
            ` : ''}
            
            <section class="detail-section">
                <h3>Wideo</h3>
                <div class="videos-grid">
                    ${dance.videos.map(video => `
                        <div class="video-item">
                            ${renderVideoThumb(video)}
                            <div class="video-item-content">
                                <p class="video-type">${escapeHTML(getVideoTypeLabel(video.type))}</p>
                                <h4>${escapeHTML(video.title)}</h4>
                                <p class="video-author">Autor: ${escapeHTML(video.author)} (${escapeHTML(String(video.year))})</p>
                                <a href="${escapeAttribute(video.url)}" target="_blank" rel="noopener noreferrer" class="video-link">
                                    Obejrzyj wideo
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>
            
            <section class="detail-section">
                <h3>Źródła</h3>
                <ul class="sources-list">
                    ${dance.sources.map(source => `
                        <li>
                            <span class="detail-list-content">
                                ${source.url ? `<a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.title)}</a>` : `<span class="source-title">${escapeHTML(source.title)}</span>`}
                                ${source.note ? `<small>${escapeHTML(source.note)}</small>` : ''}
                            </span>
                        </li>
                    `).join('')}
                </ul>
            </section>
            
            <section class="detail-section">
                <h3>Słowa kluczowe</h3>
                <div class="dance-card-tags">
                    ${dance.keywords_pl.map(keyword => `<span class="tag">${escapeHTML(keyword)}</span>`).join('')}
                </div>
            </section>
        </div>
    `;
}

function renderVideoThumb(video) {
    const thumbnail = getYouTubeThumbnail(video.url);
    if (!thumbnail) {
        return `
            <a href="${escapeAttribute(video.url)}" target="_blank" rel="noopener noreferrer" class="video-thumb video-thumb-fallback" aria-label="Otwórz wideo: ${escapeAttribute(video.title)}">
                <span>${escapeHTML(getVideoTypeLabel(video.type))}</span>
            </a>
        `;
    }

    return `
        <a href="${escapeAttribute(video.url)}" target="_blank" rel="noopener noreferrer" class="video-thumb" aria-label="Otwórz wideo: ${escapeAttribute(video.title)}">
            <img src="${escapeAttribute(thumbnail)}" alt="">
            <span class="video-play">Odtwórz</span>
        </a>
    `;
}

function getYouTubeThumbnail(url) {
    const videoId = getYouTubeId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : '';
}

function getYouTubeId(url) {
    if (!url) return '';

    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') {
            return parsed.pathname.split('/').filter(Boolean)[0] || '';
        }
        if (host.endsWith('youtube.com')) {
            if (parsed.pathname === '/watch') return parsed.searchParams.get('v') || '';
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1] || '';
        }
    } catch (error) {
        return '';
    }

    return '';
}

function getVideoTypeLabel(type) {
    const labels = {
        'essence': 'Esencja tańca',
        'social': 'Taniec towarzyski',
        'lesson': 'Lekcja'
    };
    return labels[type] || type;
}

// "Do obejrzenia" — verified documentaries from the research guide. Static
// data rendered into the #/filmy view; each card links out to a source.
const documentaryFilms = [
    {
        title: "O Ritmo do N'gola Ritmos",
        year: 1978,
        director: 'reż. António Ole',
        meta: 'portugalski · wysoka wartość historyczna',
        description: 'Walka o niepodległość Angoli widziana przez pryzmat zespołu Ngola Ritmos i roli kultury popularnej w mobilizacji politycznej lat 40. i 50.',
        url: 'https://www.youtube.com/watch?v=ifI9Zv34RtE'
    },
    {
        title: 'Bonga: au nom de la liberté',
        year: 2000,
        director: 'reż. Dom Pedro',
        meta: '52 min · francuski/portugalski',
        description: 'Portret Bongi — głosu semby i symbolu oporu, kultury oraz wolności Angoli.',
        url: 'https://www.imdb.com/title/tt0353253/'
    },
    {
        title: 'I Love Kuduro',
        year: 2014,
        director: 'reż. Mário Patrocínio',
        meta: '93 min · Angola/Portugalia',
        description: 'Miejski ruch kulturowy kuduro, który narodził się w Luandzie w ostatniej dekadzie wojny domowej i wpłynął na młodzież na całym świecie.',
        url: 'https://africanfilmny.org/films/i-love-kuduro/'
    },
    {
        title: "KizCast: A Dance's Journey",
        year: 2024,
        director: '',
        meta: '48 min · angielski',
        description: 'Dziewięć znanych postaci świata kizomby opowiada o swoim wejściu w taniec, indywidualnym stylu i wizji.',
        url: 'https://www.youtube.com/watch?v=tzXVjDclSag'
    },
    {
        title: 'Escape from Luanda',
        year: 2007,
        director: 'reż. Phil Grabsky',
        meta: 'nagroda Royal Television Society',
        description: 'Rok z życia uczniów jedynej szkoły muzycznej w Angoli, na tle kryzysu humanitarnego po 27-letniej wojnie domowej.',
        url: 'https://www.documentary.org/feature/music-proves-lifeline-escape-luanda'
    },
    {
        title: 'Death Metal Angola',
        year: 2012,
        director: 'reż. Jeremy Xido',
        meta: 'IMDb 7.5 · nagroda festiwalowa',
        description: 'Angolska para, Sonia i Wilker, i ich miłość do death metalu jako sposób radzenia sobie z dziedzictwem wojny — nieoczywista strona angolskiej sceny.',
        url: 'https://www.imdb.com/title/tt2118609/'
    },
    {
        title: 'Kizomba without Boundaries',
        year: null,
        director: '',
        meta: '60 min · portugalski · Hiszpania',
        description: 'Rozwój angolskiej kizomby w Europie — Portugalia, Hiszpania i Francja jako centra jej rozprzestrzeniania.',
        url: 'https://festhome.com/ondemand_films/view_film/98121'
    },
    {
        title: 'O Lendário Tio Liceu e os Ngola Ritmos',
        year: 2010,
        director: '',
        meta: '55 min · IMDb 7.5',
        description: 'Legendarny „wujek” Liceu i zespół Ngola Ritmos — kluczowa postać w historii angolskiej muzyki i tożsamości narodowej.',
        url: 'https://www.imdb.com/title/tt1981672/'
    }
];

function renderFilms() {
    const container = document.getElementById('films-container');
    if (!container) return;

    container.innerHTML = documentaryFilms.map(film => {
        const metaLine = [film.director, film.meta].filter(Boolean).join(' · ');
        return `
        <article class="film-card">
            <div class="film-card-body">
                <p class="film-card-year">${film.year ? escapeHTML(String(film.year)) : 'film dokumentalny'}</p>
                <h3 class="film-card-title">${escapeHTML(film.title)}</h3>
                ${metaLine ? `<p class="film-card-meta">${escapeHTML(metaLine)}</p>` : ''}
                <p class="film-card-desc">${escapeHTML(film.description)}</p>
            </div>
            <a class="film-card-link video-link" href="${escapeAttribute(film.url)}" target="_blank" rel="noopener noreferrer">
                Zobacz źródło <span aria-hidden="true">&rarr;</span>
            </a>
        </article>
        `;
    }).join('');

    renderReadings();
}

// Academic sources from the research guide — the "Do poczytania" reading list.
const academicReadings = [
    {
        title: 'Kizomba Dance: From Market Success to Controversial National Brand',
        authors: 'Livia Jiménez Sedano',
        venue: 'Revue européenne des migrations internationales',
        year: 2019,
        url: 'https://journals.openedition.org/remi/13584'
    },
    {
        title: 'Desiring Connection: Affect in the Embodied Experience of Kizomba Dance',
        authors: 'Tiffany Pollock',
        venue: 'Capacious: Journal for Emerging Affect Inquiry',
        year: 2018,
        url: 'https://capaciousjournal.com/cms/wp-content/uploads/2018/03/capacious-pollock-desiring-connection.pdf'
    },
    {
        title: 'The SAGE International Encyclopedia of Music and Culture — hasła „Kizomba Music and Dance” i „Semba Music and Dance”',
        authors: '',
        venue: 'SAGE Reference',
        year: 2019,
        url: 'https://sk.sagepub.com/ency/edvol/the-sage-international-encyclopedia-of-music-and-culture/chpt/semba-music-dance'
    },
    {
        title: '„Semba Dilema”: On Transatlantic Musical Flows between Angola and Brazil',
        authors: '',
        venue: 'ATeM — Archiv für Textmusikforschung',
        year: null,
        url: 'https://atem-journal.com/ATeM/article/download/4065/3291/9291'
    },
    {
        title: 'Tradition and Modernity in the History of Pop-Rock and Semba',
        authors: '',
        venue: 'Brill — European Journal of Portuguese History',
        year: null,
        url: 'https://brill.com/view/journals/ejph/22/2/article-p206_4.pdf'
    }
];

function renderReadings() {
    const container = document.getElementById('readings-container');
    if (!container) return;

    container.innerHTML = academicReadings.map(reading => {
        const metaLine = [reading.authors, reading.venue, reading.year].filter(Boolean).join(' · ');
        return `
        <li class="reading-item">
            <a class="reading-title" href="${escapeAttribute(reading.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(reading.title)}</a>
            ${metaLine ? `<span class="reading-meta">${escapeHTML(metaLine)}</span>` : ''}
        </li>
        `;
    }).join('');
}

// Timeline rendering: the "lineage thread". Chapters alternate around a
// center spine; the first appearance of each dance grows a "birth" branch
// tile linking to its card. The page is complete without JS motion —
// lineage-motion.js only adds the scroll choreography on top.
function renderTimeline() {
    if (!timelineData) return;

    const danceById = new Map((dancesData || []).map(dance => [dance.id, dance]));
    const bornDances = new Set();

    const chaptersHTML = timelineData.map((period, index) => {
        const births = [];
        const eventsHTML = period.events.map(event => {
            (event.dances || []).forEach(ref => {
                const dance = danceById.get(ref);
                if (dance && !bornDances.has(dance.id)) {
                    bornDances.add(dance.id);
                    births.push(dance);
                }
            });
            return `
                <article class="lineage-event">
                    <h4>${escapeHTML(event.title)}</h4>
                    <p>${escapeHTML(event.description)}</p>
                </article>
            `;
        }).join('');

        const birthsHTML = births.length ? `
            <div class="lineage-births">
                ${births.map(dance => `
                    <a class="lineage-birth" href="#/dance/${escapeAttribute(dance.slug)}">
                        <span class="lineage-birth-img" style="background-image: url('${escapeAttribute(getFeaturedImage(dance.slug))}')" aria-hidden="true"></span>
                        <span class="lineage-birth-label">
                            <em>Nowy styl</em>
                            <strong>${escapeHTML(dance.names.pl)}</strong>
                        </span>
                    </a>
                `).join('')}
            </div>
        ` : '';

        return `
            <li class="lineage-chapter" id="lineage-era-${escapeAttribute(period.id)}" data-era-index="${index}">
                <span class="lineage-node" aria-hidden="true"></span>
                <header class="lineage-era">
                    <p class="lineage-era-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</p>
                    <h3>${escapeHTML(period.period)}</h3>
                    <p class="lineage-era-years">${escapeHTML(period.years)}</p>
                </header>
                <div class="lineage-body">
                    ${eventsHTML}
                    ${birthsHTML}
                </div>
            </li>
        `;
    }).join('');

    elements.timeline.container.innerHTML = `
        <div class="lineage">
            <ol class="lineage-chapters">
                ${chaptersHTML}
            </ol>
        </div>
    `;

    const rail = document.getElementById('lineage-rail');
    if (rail) {
        rail.innerHTML = timelineData.map((period, index) => `
            <button type="button" data-era-target="lineage-era-${escapeAttribute(period.id)}"
                aria-label="Przejdź do epoki: ${escapeAttribute(period.period)}">
                <span></span>
            </button>
        `).join('');
        rail.addEventListener('click', event => {
            const button = event.target.closest('[data-era-target]');
            const target = button && document.getElementById(button.dataset.eraTarget);
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }
}

// Compare functionality
function populateCompareSelectors() {
    if (!dancesData) return;
    
    const options = dancesData.map(dance => 
        `<option value="${escapeAttribute(dance.id)}">${escapeHTML(dance.names.pl)}</option>`
    ).join('');
    
    elements.compare.danceA.innerHTML = '<option value="">Wybierz taniec...</option>' + options;
    elements.compare.danceB.innerHTML = '<option value="">Wybierz taniec...</option>' + options;
}

function handleComparison() {
    const danceAId = elements.compare.danceA.value;
    const danceBId = elements.compare.danceB.value;
    
    if (!danceAId || !danceBId) {
        elements.compare.result.innerHTML = `
            <div class="empty-panel">
                <h3>Wybierz dwa style</h3>
                <p>Porównanie pokaże pochodzenie, charakter, rodzinę tańca i najważniejsze wpływy.</p>
            </div>
        `;
        return;
    }
    
    const danceA = dancesData.find(d => d.id === danceAId);
    const danceB = dancesData.find(d => d.id === danceBId);
    
    if (!danceA || !danceB) return;
    
    elements.compare.result.innerHTML = `
        <div class="comparison-card">
            <h3>${escapeHTML(danceA.names.pl)}</h3>
            <div class="comparison-details">
                <div class="comparison-detail">
                    <strong>Pochodzenie:</strong>
                    ${escapeHTML(danceA.origin.country)}, ${escapeHTML(danceA.origin.region)} (${escapeHTML(danceA.origin.years)})
                </div>
                <div class="comparison-detail">
                    <strong>Okres:</strong>
                    ${escapeHTML(danceA.origin.period)}
                </div>
                <div class="comparison-detail">
                    <strong>Klasyfikacja:</strong>
                    ${danceA.classification.map(escapeHTML).join(', ')}
                </div>
                <div class="comparison-detail">
                    <strong>Rodzina:</strong>
                    ${danceA.family.map(escapeHTML).join(', ')}
                </div>
                <div class="comparison-detail">
                    <strong>Charakter:</strong>
                    ${escapeHTML(danceA.character_pl)}
                </div>
                <div class="comparison-detail">
                    <strong>Uczucie:</strong>
                    ${escapeHTML(danceA.feeling_pl)}
                </div>
                <div class="comparison-detail">
                    <strong>Wpływy:</strong>
                    ${danceA.influences.map(escapeHTML).join(', ')}
                </div>
            </div>
        </div>
        
        <div class="comparison-card">
            <h3>${escapeHTML(danceB.names.pl)}</h3>
            <div class="comparison-details">
                <div class="comparison-detail">
                    <strong>Pochodzenie:</strong>
                    ${escapeHTML(danceB.origin.country)}, ${escapeHTML(danceB.origin.region)} (${escapeHTML(danceB.origin.years)})
                </div>
                <div class="comparison-detail">
                    <strong>Okres:</strong>
                    ${escapeHTML(danceB.origin.period)}
                </div>
                <div class="comparison-detail">
                    <strong>Klasyfikacja:</strong>
                    ${danceB.classification.map(escapeHTML).join(', ')}
                </div>
                <div class="comparison-detail">
                    <strong>Rodzina:</strong>
                    ${danceB.family.map(escapeHTML).join(', ')}
                </div>
                <div class="comparison-detail">
                    <strong>Charakter:</strong>
                    ${escapeHTML(danceB.character_pl)}
                </div>
                <div class="comparison-detail">
                    <strong>Uczucie:</strong>
                    ${escapeHTML(danceB.feeling_pl)}
                </div>
                <div class="comparison-detail">
                    <strong>Wpływy:</strong>
                    ${danceB.influences.map(escapeHTML).join(', ')}
                </div>
            </div>
        </div>
    `;
    
    // Check if there are specific differences between these dances
    const specificDifference = danceA.differences_pl?.find(diff => 
        diff.vs.toLowerCase().includes(danceB.names.pl.toLowerCase()) ||
        danceB.names.pl.toLowerCase().includes(diff.vs.toLowerCase())
    ) || danceB.differences_pl?.find(diff => 
        diff.vs.toLowerCase().includes(danceA.names.pl.toLowerCase()) ||
        danceA.names.pl.toLowerCase().includes(diff.vs.toLowerCase())
    );
    
    if (specificDifference) {
        elements.compare.result.innerHTML += `
            <div class="comparison-card comparison-wide">
                <h3>Kluczowe różnice</h3>
                <div class="comparison-detail">
                    ${escapeHTML(specificDifference.text)}
                </div>
            </div>
        `;
    }
}

// Glossary: expandable bento grid. Tiles show only the term (plus a category
// chip); clicking morphs the tile into a centered <dialog> with the full
// definition. Falls back to instant open/close under prefers-reduced-motion.

const GLOSSARY_CATEGORIES = {
    taniec: 'Taniec',
    muzyka: 'Muzyka',
    instrument: 'Instrument',
    historia: 'Ludzie i historia',
    kultura: 'Kultura',
    jezyk: 'Język'
};

const glossaryTerms = [
    {
        id: 'kizomba',
        term: 'Kizomba',
        category: 'taniec',
        featured: true,
        definition: "Romantyczny taniec powstały z fuzji angolskiej semby i antylskiego zouk. Nazwa oznacza 'imprezę' w języku kimbundu.",
        danceSlug: 'kizomba'
    },
    {
        id: 'semba',
        term: 'Semba',
        category: 'taniec',
        featured: true,
        definition: 'Energiczny taniec z Angoli, podstawa dla kizomby. Charakteryzuje się szybkim tempem i żywym rytmem.',
        danceSlug: 'semba'
    },
    {
        id: 'massemba',
        term: 'Massemba',
        category: 'taniec',
        definition: "Tradycyjny angolski taniec, poprzednik semby. Nazwa pochodzi z języka kimbundu i oznacza 'dotyk brzuchów'.",
        danceSlug: 'massemba'
    },
    {
        id: 'kuduro',
        term: 'Kuduro',
        category: 'taniec',
        definition: 'Energiczny gatunek muzyczno-taneczny z Angoli, mieszanka afrykańskich perkusji z europejską muzyką elektroniczną.',
        danceSlug: 'kuduro'
    },
    {
        id: 'tarraxinha',
        term: 'Tarraxinha',
        category: 'taniec',
        definition: "Intymny taniec z Angoli, powstały jako spowolniona wersja kuduro. Nazwa oznacza 'małą śrubę' w portugalskim.",
        danceSlug: 'tarraxinha'
    },
    {
        id: 'tarraxo',
        term: 'Tarraxo',
        category: 'taniec',
        definition: 'Europejska adaptacja tarraxinhy, powstała w Lizbonie. Ostrzejsza i mroczniejsza wersja oryginalnego tańca.',
        danceSlug: 'tarraxo'
    },
    {
        id: 'urban-kizz',
        term: 'Urban Kizz',
        category: 'taniec',
        definition: 'Nowoczesny styl powstały we Francji, łączący kizombę z elementami hip-hopu, tango i innych stylów tanecznych.',
        danceSlug: 'urban-kizz'
    },
    {
        id: 'kizomba-fusion',
        term: 'Kizomba Fusion',
        category: 'taniec',
        definition: 'Styl pośredni między tradycyjną kizombą a urban kizz, zachowujący podstawowy charakter kizomby z subtelnymi elementami innych stylów.',
        danceSlug: 'kizomba-fusion'
    },
    {
        id: 'kompa',
        term: 'Kompa',
        category: 'taniec',
        featured: true,
        definition: 'Haitański gatunek muzyczny i taniec społeczny znany też jako compas. Ma luźniejsze objęcie i karaibski groove, który wpłynął na rozwój zouk.',
        danceSlug: 'kompa'
    },
    {
        id: 'zouk',
        term: 'Zouk',
        category: 'muzyka',
        definition: 'Gatunek muzyczny z Antyli Francuskich, który wpłynął na powstanie kizomby w latach 80.'
    },
    {
        id: 'ghetto-zouk',
        term: 'Ghetto Zouk',
        category: 'muzyka',
        definition: 'Styl muzyczny będący mieszanką zouk z elementami R&B i hip-hopu, często używany w urban kizz.'
    },
    {
        id: 'rebita',
        term: 'Rebita',
        category: 'taniec',
        definition: 'Inna nazwa dla massemby, tradycyjnego angolskiego tańca miejskiego.',
        danceSlug: 'massemba'
    },
    {
        id: 'kimbundu',
        term: 'Kimbundu',
        category: 'jezyk',
        definition: 'Język bantu używany w Angoli, z którego pochodzą nazwy wielu tańców (kizomba, massemba).'
    },
    {
        id: 'ngola-ritmos',
        term: 'Ngola Ritmos',
        category: 'historia',
        definition: 'Legendarny angolski zespół założony w 1947 roku, który odegrał kluczową rolę w rozwoju semby.'
    },
    {
        id: 'eduardo-paim',
        term: 'Eduardo Paím',
        category: 'historia',
        definition: 'Angolski muzyk uznawany za jednego z ojców kizomby, założyciel zespołu SOS.'
    },

    // — Tańce i formy pokrewne —
    {
        id: 'afro-house',
        term: 'Afro House',
        category: 'taniec',
        definition: 'Angolska forma muzyczno-taneczna, która zyskała popularność ok. 2006 roku, u szczytu ery kuduro classico. Łączy tradycyjne rytmy z house’em.'
    },
    {
        id: 'tchianda',
        term: 'Tchianda',
        category: 'taniec',
        definition: 'Styl muzyczno-taneczny kultury Lunda-Tchokwe ze wschodniej Angoli (prowincje Moxico, Lunda Sul i Norte); obecny także w DR Konga i Zambii.'
    },
    {
        id: 'tance-karnawalowe',
        term: 'Tańce karnawałowe',
        category: 'taniec',
        definition: 'Zestaw tradycyjnych angolskich tańców karnawałowych: kabetula, kasukuta, maringa, caduque, dizanda i cidralia — tańczone grupowo podczas dorocznego karnawału.'
    },
    {
        id: 'lundu',
        term: 'Lundu',
        category: 'taniec',
        definition: 'Afro-brazylijski styl tańca i muzyki zawierający ruch semby (umbigada); uznawany za pierwszą czarną muzykę zaakceptowaną przez brazylijskie społeczeństwo pod koniec XVIII wieku.'
    },
    {
        id: 'umbigada',
        term: 'Umbigada',
        category: 'taniec',
        definition: 'Ruch „dotyku brzuchów” przeniesiony przez zniewolonych Angolczyków do Brazylii — ogniwo łączące massembę i sembę z narodzinami samby.'
    },
    {
        id: 'batuque',
        term: 'Batuque',
        category: 'taniec',
        definition: 'Ogólna portugalska nazwa afro-brazylijskich tańców z perkusją, klaskaniem i śpiewem, wywodzących się z tradycji regionu Kongo-Angola.'
    },
    {
        id: 'samba',
        term: 'Samba',
        category: 'taniec',
        definition: 'Brazylijski taniec, którego nazwa według wielu badaczy pochodzi od kimbundijskiego „semba” — zaproszenia do tańca przez zetknięcie brzuchów.'
    },

    // — Muzyka —
    {
        id: 'zouk-beton',
        term: 'Zouk béton',
        category: 'muzyka',
        definition: 'Szybka, „betonowa” odmiana zouk z Antyli Francuskich, wykorzystująca technologię MIDI; jeden ze składników muzyki kuduro.'
    },
    {
        id: 'compasso',
        term: 'Compasso',
        category: 'muzyka',
        definition: 'Metryczno-rytmiczne „serce” semby — akcentowanie kroków i praca nóg zgodne z pulsem muzyki w takcie 2/4.'
    },
    {
        id: 'nova-semba',
        term: 'Nowa Semba',
        category: 'muzyka',
        definition: 'Odnowienie semby na przełomie XX i XXI wieku, którego głównymi nazwiskami byli m.in. Carlos Burity, Carlitos Vieira Dias i Bonga.'
    },

    // — Instrumenty —
    {
        id: 'dikanza',
        term: 'Dikanza',
        category: 'instrument',
        definition: 'Angolski idiofon zdrapywany, podobny do brazylijskiego reco-reco; jeden z rytmicznych filarów semby.'
    },
    {
        id: 'ngoma',
        term: 'Ngoma',
        category: 'instrument',
        definition: 'Afrykańskie bębny ngoma — podstawa tradycyjnej perkusji Angoli.'
    },
    {
        id: 'sanza',
        term: 'Sanza (kissanje)',
        category: 'instrument',
        definition: 'Lamelofon typu kalimba ludu Mbundu; obok marimby jeden z melodycznych instrumentów tradycyjnej semby.'
    },
    {
        id: 'berimbau',
        term: 'Berimbau',
        category: 'instrument',
        definition: 'Jednostrunny łuk muzyczny pełniący też rolę instrumentu perkusyjnego; znany również z brazylijskiej capoeiry.'
    },
    {
        id: 'hungu',
        term: 'Hungú',
        category: 'instrument',
        definition: 'Angolski łuk muzyczny pokrewny berimbau, używany m.in. w tradycyjnej perkusji show „Raiz da alma” Paulo Floresa.'
    },
    {
        id: 'marimba',
        term: 'Marimba',
        category: 'instrument',
        definition: 'Tradycyjny ksylofon; obok sanzy jeden z melodycznych instrumentów ludu Mbundu obecnych w sembie.'
    },
    {
        id: 'dilongas',
        term: 'Dilongas',
        category: 'instrument',
        definition: 'Bębny basowe używane w tradycyjnej perkusji semby.'
    },
    {
        id: 'puita',
        term: 'Puita',
        category: 'instrument',
        definition: 'Bęben tarciowy (typu cuíca) dający charakterystyczny „mówiący” dźwięk; element tradycyjnej perkusji semby.'
    },
    {
        id: 'mukindo',
        term: 'Mukindo',
        category: 'instrument',
        definition: 'Tradycyjny angolski instrument perkusyjny, wykorzystywany m.in. w show „Raiz da alma” Paulo Floresa.'
    },
    {
        id: 'pandeiro',
        term: 'Pandeiro',
        category: 'instrument',
        definition: 'Ręczny bębenek obręczowy z brzękadłami (typu tamburyn), perkusjonalium obecne w sembie.'
    },

    // — Ludzie i zespoły —
    {
        id: 'liceu-vieira-dias',
        term: 'Liceu Vieira Dias',
        category: 'historia',
        definition: '„Wujek Liceu” — gitarzysta i lider zespołu Ngola Ritmos, współzałożyciel MPLA. Połączył instrumenty europejskie z angolskimi rytmami; więziony dziesięć lat w Tarrafal.'
    },
    {
        id: 'bonga',
        term: 'Bonga',
        category: 'historia',
        definition: 'Bonga (Barceló de Carvalho, ur. 1942) — „głos semby”, artysta world music i symbol oporu, kultury oraz wolności Angoli.'
    },
    {
        id: 'paulo-flores',
        term: 'Paulo Flores',
        category: 'historia',
        definition: '„Ojciec nowoczesnej semby” i „poeta ludu”; łączy klasykę semby z żywą, tradycyjną perkusją.'
    },
    {
        id: 'carlos-burity',
        term: 'Carlos Burity',
        category: 'historia',
        definition: 'Angolski muzyk (1952–2020), jedno z głównych nazwisk „Nowej Semby”.'
    },
    {
        id: 'kassav',
        term: 'Kassav',
        category: 'historia',
        definition: 'Zespół z Martyniki i Gwadelupy, który spopularyzował zouk; jego trasy po Afryce luzofońskiej wzmocniły wpływ zouk na sembę i kizombę.'
    },

    // — Kultura, miejsca, pojęcia —
    {
        id: 'luanda',
        term: 'Luanda',
        category: 'kultura',
        definition: 'Stolica Angoli — wielokulturowe centrum, w którym narodziły się semba, kizomba i kuduro.'
    },
    {
        id: 'benguela',
        term: 'Benguela',
        category: 'kultura',
        definition: 'Nadmorski port z czasów kolonialnych; obok Luandy jeden z obszarów wczesnego rozwoju semby w XVII wieku.'
    },
    {
        id: 'musseques',
        term: 'Musseques',
        category: 'kultura',
        definition: 'Dzielnice slumsowe Luandy — środowisko, w którym w czasie wojny domowej narodziło się kuduro.'
    },
    {
        id: 'angolanidade',
        term: 'Angolanidade',
        category: 'kultura',
        definition: 'Angolska tożsamość narodowa, którą współtworzyły semba i kizomba jako formy oporu kulturowego w czasach kolonialnych i postkolonialnych.'
    },
    {
        id: 'palop',
        term: 'PALOP',
        category: 'kultura',
        definition: 'Kraje afrykańskie języka portugalskiego — wspólna przestrzeń rozwoju i rozprzestrzeniania kizomby.'
    },
    {
        id: 'folkloryzacja',
        term: 'Folkloryzacja',
        category: 'kultura',
        definition: 'Kolonialny proces kategoryzowania i kontrolowania muzyki nie-Europejczyków — np. opisywanie semby jako „angolskiego merengue”.'
    },
    {
        id: 'trzy-generacje-kuduro',
        term: 'Trzy generacje kuduro',
        category: 'kultura',
        definition: 'Periodyzacja kuduro: I generacja (lata 90., młodzież klasy średniej, tempo 128–135 BPM, rzadkie wokale), II (faza eksperymentu muzycznego) i III (współczesna różnorodność stylów i międzynarodowy zasięg).'
    }
];

function generateGlossary() {
    const container = elements.glossary.container;
    if (!container) return;

    container.innerHTML = glossaryTerms.map(item => `
        <li class="glossary-cell${item.featured ? ' glossary-cell--featured' : ''}">
            <button type="button"
                class="glossary-tile glossary-tile--${item.category}"
                data-glossary-id="${item.id}"
                aria-haspopup="dialog">
                <span class="glossary-tile-cat">${GLOSSARY_CATEGORIES[item.category]}</span>
                <span class="glossary-tile-term">${item.term}</span>
                <span class="glossary-tile-more" aria-hidden="true">+</span>
            </button>
        </li>
    `).join('');

    container.addEventListener('click', event => {
        const tile = event.target.closest('.glossary-tile');
        if (tile) openGlossaryEntry(tile);
    });

    setupGlossaryDialog();
}

const glossaryDialogState = { tile: null, animating: false };

function glossaryReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function setupGlossaryDialog() {
    const dialog = document.getElementById('glossary-dialog');
    if (!dialog) return;

    dialog.addEventListener('cancel', event => {
        event.preventDefault();
        closeGlossaryEntry();
    });
    dialog.addEventListener('click', event => {
        if (event.target.closest('a')) {
            // Navigating to a dance card: close instantly, let the hash change route.
            dialog.close();
            if (glossaryDialogState.tile) {
                glossaryDialogState.tile.classList.remove('is-open');
                glossaryDialogState.tile = null;
            }
            return;
        }
        if (event.target === dialog) closeGlossaryEntry();
    });
    dialog.querySelector('.glossary-dialog-close').addEventListener('click', () => {
        closeGlossaryEntry();
    });
}

function openGlossaryEntry(tile) {
    const dialog = document.getElementById('glossary-dialog');
    const item = glossaryTerms.find(entry => entry.id === tile.dataset.glossaryId);
    if (!dialog || !item || glossaryDialogState.animating || dialog.open) return;

    dialog.querySelector('#glossary-dialog-cat').textContent = GLOSSARY_CATEGORIES[item.category];
    dialog.querySelector('#glossary-dialog-term').textContent = item.term;
    dialog.querySelector('#glossary-dialog-definition').textContent = item.definition;
    const links = dialog.querySelector('#glossary-dialog-links');
    if (item.danceSlug) {
        links.innerHTML = `<a class="video-link" href="#/dance/${item.danceSlug}">Zobacz kartę tańca <span aria-hidden="true">→</span></a>`;
        links.hidden = false;
    } else {
        links.innerHTML = '';
        links.hidden = true;
    }

    glossaryDialogState.tile = tile;
    tile.classList.add('is-open');
    dialog.showModal();

    if (glossaryReducedMotion() || typeof dialog.animate !== 'function') return;

    // FLIP morph: start from the tile's rect, settle into the dialog's rect.
    const card = dialog.querySelector('.glossary-dialog-card');
    const from = tile.getBoundingClientRect();
    const to = card.getBoundingClientRect();
    if (!to.width || !to.height) return;
    glossaryDialogState.animating = true;
    card.animate([
        {
            transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`
        },
        { transform: 'none' }
    ], { duration: 380, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }).finished.finally(() => {
        glossaryDialogState.animating = false;
    });
    card.querySelectorAll('.glossary-dialog-head, #glossary-dialog-term, #glossary-dialog-definition, .glossary-dialog-links').forEach((el, index) => {
        el.animate(
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: 300, delay: 120 + index * 40, fill: 'backwards', easing: 'ease-out' }
        );
    });
}

function closeGlossaryEntry() {
    const dialog = document.getElementById('glossary-dialog');
    if (!dialog || !dialog.open || glossaryDialogState.animating) return;
    const tile = glossaryDialogState.tile;

    const finish = () => {
        dialog.close();
        if (tile) {
            tile.classList.remove('is-open');
            tile.focus({ preventScroll: true });
        }
        glossaryDialogState.tile = null;
    };

    if (glossaryReducedMotion() || typeof dialog.animate !== 'function' || !tile) {
        finish();
        return;
    }

    const card = dialog.querySelector('.glossary-dialog-card');
    const from = card.getBoundingClientRect();
    const to = tile.getBoundingClientRect();
    glossaryDialogState.animating = true;
    const morph = card.animate([
        { transform: 'none', opacity: 1 },
        {
            transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})`,
            opacity: 0.35
        }
    ], { duration: 300, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    dialog.classList.add('is-closing');
    morph.finished.finally(() => {
        glossaryDialogState.animating = false;
        dialog.classList.remove('is-closing');
        finish();
    });
}

// ===== Events hub =====

const EVENT_TYPE_LABELS = { social: 'potańcówka', warsztaty: 'warsztaty', festiwal: 'festiwal' };
const eventMonthFormatter = new Intl.DateTimeFormat('pl-PL', { month: 'long', year: 'numeric' });
const eventWeekdayFormatter = new Intl.DateTimeFormat('pl-PL', { weekday: 'short' });
const eventFullDateFormatter = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });

function parseEventDate(value) {
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
}

function getUpcomingEvents() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventsData
        .filter(event => {
            const end = parseEventDate(event.date_end || event.date_start);
            if (!end || !parseEventDate(event.date_start)) {
                console.warn(`Pomijam wydarzenie z niepoprawną datą: ${event.id}`);
                return false;
            }
            return end >= today;
        })
        .sort((a, b) => a.date_start.localeCompare(b.date_start));
}

function handleEventFilters() {
    const country = elements.events.countryFilter.value;
    const city = elements.events.cityFilter.value;
    const style = elements.events.styleFilter.value;
    const type = elements.events.typeFilter.value;

    filteredEvents = getUpcomingEvents().filter(event =>
        (!country || event.country === country) &&
        (!city || event.city === city) &&
        (!style || event.styles.includes(style)) &&
        (!type || event.type === type)
    );

    renderFeaturedEvents();
    renderEventsList();
    updateEventFilterStatus(Boolean(country || city || style || type));
}

function clearEventFilters() {
    elements.events.countryFilter.value = '';
    elements.events.cityFilter.value = '';
    elements.events.styleFilter.value = '';
    elements.events.typeFilter.value = '';
    handleEventFilters();
}

function renderEventsPage() {
    if (!eventsData) {
        elements.events.listContainer.innerHTML =
            '<p class="events-error">Błąd podczas ładowania wydarzeń. Spróbuj odświeżyć stronę.</p>';
        return;
    }
    populateEventFilterOptions();
    handleEventFilters();
    renderSchools();
}

function populateEventFilterOptions() {
    const upcoming = getUpcomingEvents();
    const selectedCountry = elements.events.countryFilter.value;
    const selectedCity = elements.events.cityFilter.value;
    const selectedStyle = elements.events.styleFilter.value;

    const countries = [...new Set(upcoming.map(event => event.country).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pl'));
    elements.events.countryFilter.innerHTML = '<option value="">Wszystkie</option>' +
        countries.map(country => `<option value="${escapeAttribute(country)}">${escapeHTML(country)}</option>`).join('');
    elements.events.countryFilter.value = countries.includes(selectedCountry) ? selectedCountry : '';

    const cities = [...new Set(upcoming.map(event => event.city))].sort((a, b) => a.localeCompare(b, 'pl'));
    elements.events.cityFilter.innerHTML = '<option value="">Wszystkie</option>' +
        cities.map(city => `<option value="${escapeAttribute(city)}">${escapeHTML(city)}</option>`).join('');
    elements.events.cityFilter.value = cities.includes(selectedCity) ? selectedCity : '';

    const styleSlugs = [...new Set(upcoming.flatMap(event => event.styles))];
    const styles = styleSlugs
        .map(slug => ({ slug, name: (dancesData.find(dance => dance.slug === slug) || {}).names?.pl || slug }))
        .sort((a, b) => a.name.localeCompare(b.name, 'pl'));
    elements.events.styleFilter.innerHTML = '<option value="">Wszystkie</option>' +
        styles.map(style => `<option value="${escapeAttribute(style.slug)}">${escapeHTML(style.name)}</option>`).join('');
    elements.events.styleFilter.value = styleSlugs.includes(selectedStyle) ? selectedStyle : '';
}

function renderFeaturedEvents() {
    const featured = filteredEvents.filter(event => event.featured).slice(0, 3);
    elements.events.featuredContainer.innerHTML = featured.map(event => `
        <a class="featured-tile featured-event-tile" href="#/event/${escapeAttribute(event.id)}"
           ${event.image ? `style="--tile-image: url('${escapeAttribute(event.image)}')"` : ''}>
            <div class="featured-tile-content">
                <p class="featured-country">${escapeHTML(formatEventDateLabel(event))} · ${escapeHTML(event.city)}</p>
                <h4>${escapeHTML(event.title)}</h4>
                <p class="featured-character">${escapeHTML(EVENT_TYPE_LABELS[event.type] || event.type)}</p>
                <span>Zobacz wydarzenie${TILE_ARROW_ICON}</span>
            </div>
        </a>
    `).join('');
}

function renderEventsList() {
    const container = elements.events.listContainer;
    if (filteredEvents.length === 0) {
        container.innerHTML = '';
        const hasFilters = Boolean(
            elements.events.countryFilter.value ||
            elements.events.cityFilter.value ||
            elements.events.styleFilter.value ||
            elements.events.typeFilter.value
        );
        const paragraph = elements.events.emptyState.querySelector('p');
        if (paragraph) {
            paragraph.textContent = hasFilters
                ? 'Nie znamy nadchodzących wydarzeń pasujących do tych filtrów.'
                : 'Nie mamy jeszcze żadnych nadchodzących wydarzeń. Zajrzyj wkrótce albo zgłoś swoje poniżej.';
        }
        elements.events.emptyState.classList.remove('hidden');
        return;
    }
    elements.events.emptyState.classList.add('hidden');

    let currentMonth = '';
    let html = '';
    for (const event of filteredEvents) {
        const monthKey = event.date_start.slice(0, 7);
        if (monthKey !== currentMonth) {
            currentMonth = monthKey;
            const label = eventMonthFormatter.format(parseEventDate(event.date_start));
            html += `<h3 class="month-heading">${escapeHTML(label.charAt(0).toUpperCase() + label.slice(1))}</h3>`;
        }
        html += eventRowHTML(event);
    }
    container.innerHTML = html;
}

function eventRowHTML(event) {
    const start = parseEventDate(event.date_start);
    const end = event.date_end && event.date_end !== event.date_start ? parseEventDate(event.date_end) : null;
    const crossMonth = end && (end.getMonth() !== start.getMonth() || end.getFullYear() !== start.getFullYear());
    const dayLabel = end
        ? (crossMonth
            ? `${start.getDate()}.${String(start.getMonth() + 1).padStart(2, '0')}–${end.getDate()}.${String(end.getMonth() + 1).padStart(2, '0')}`
            : `${start.getDate()}–${end.getDate()}`)
        : String(start.getDate());
    const weekday = end
        ? `${eventWeekdayFormatter.format(start)}–${eventWeekdayFormatter.format(end)}`
        : eventWeekdayFormatter.format(start);
    const fullDate = end
        ? `${eventFullDateFormatter.format(start)} – ${eventFullDateFormatter.format(end)}`
        : eventFullDateFormatter.format(start);
    const styleNames = (event.styles || [])
        .map(slug => (dancesData.find(dance => dance.slug === slug) || {}).names?.pl || slug)
        .join(', ');
    const meta = [event.city, EVENT_TYPE_LABELS[event.type] || event.type, styleNames].filter(Boolean).join(' · ');
    const details = [event.time, event.venue, event.price].filter(Boolean).join(' · ');

    return `
        <a class="event-row" href="#/event/${escapeAttribute(event.id)}">
            <div class="event-date-block" aria-hidden="true">
                <span class="event-day">${escapeHTML(dayLabel)}</span>
                <span class="event-weekday">${escapeHTML(weekday)}</span>
            </div>
            <div class="event-row-body">
                <span class="sr-only">${escapeHTML(fullDate)}</span>
                <h4 class="event-title">${escapeHTML(event.title)}</h4>
                <p class="event-meta">${escapeHTML(meta)}</p>
                ${details ? `<p class="event-details">${escapeHTML(details)}</p>` : ''}
            </div>
            <span class="event-row-arrow" aria-hidden="true">→</span>
        </a>
    `;
}

function eventMapsUrl(event) {
    const query = [event.venue, event.city].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function similarEvents(event) {
    return getUpcomingEvents()
        .filter(e => e.id !== event.id &&
            (e.city === event.city || (e.styles || []).some(s => (event.styles || []).includes(s))))
        .slice(0, 3);
}

function showEventDetail(id) {
    const event = (eventsData || []).find(e => e.id === id);
    if (!event) {
        navigateTo('/events');
        return;
    }

    const start = parseEventDate(event.date_start);
    const end = event.date_end && event.date_end !== event.date_start ? parseEventDate(event.date_end) : null;
    const fullDate = end
        ? `${eventFullDateFormatter.format(start)} – ${eventFullDateFormatter.format(end)}`
        : eventFullDateFormatter.format(start);
    const typeLabel = EVENT_TYPE_LABELS[event.type] || event.type;
    const placeLabel = event.country ? `${event.city}, ${event.country}` : event.city;

    const styleChips = (event.styles || []).map(slug => {
        const dance = dancesData.find(d => d.slug === slug);
        const name = dance ? dance.names.pl : slug;
        return dance
            ? `<a class="event-style-chip" href="#/dance/${escapeAttribute(slug)}">${escapeHTML(name)}</a>`
            : `<span class="event-style-chip">${escapeHTML(name)}</span>`;
    }).join('');

    const facts = [
        event.time ? `🕘 ${escapeHTML(event.time)}` : '',
        event.price ? `💶 ${escapeHTML(event.price)}` : ''
    ].filter(Boolean).join('  ·  ');

    const venueLine = event.venue
        ? `<p class="event-detail-venue">📍 ${escapeHTML(event.venue)} · <a href="${escapeAttribute(eventMapsUrl(event))}" target="_blank" rel="noopener">otwórz w mapach ↗</a></p>`
        : `<p class="event-detail-venue">📍 <a href="${escapeAttribute(eventMapsUrl(event))}" target="_blank" rel="noopener">${escapeHTML(placeLabel)} w mapach ↗</a></p>`;

    const similar = similarEvents(event);
    const similarHTML = similar.length
        ? `<section class="detail-section event-similar">
                <h3>Podobne wydarzenia</h3>
                <div class="events-list">${similar.map(eventRowHTML).join('')}</div>
            </section>`
        : '';

    elements.eventDetail.innerHTML = `
        <header class="event-detail-header featured-event-tile ${event.image ? 'has-detail-image' : ''}"
                ${event.image ? `style="--tile-image: url('${escapeAttribute(event.image)}')"` : ''}>
            <div class="event-detail-head-content">
                <button class="detail-back-link" onclick="navigateTo('/events')" type="button">Wróć do wydarzeń</button>
                <p class="event-detail-kicker">${escapeHTML(typeLabel)} · ${escapeHTML(fullDate)} · ${escapeHTML(placeLabel)}</p>
                <h2 class="event-detail-title">${escapeHTML(event.title)}</h2>
            </div>
        </header>
        <div class="event-detail-body">
            <section class="detail-section event-facts">
                <p class="event-detail-dateline">📅 ${escapeHTML(fullDate)}${facts ? '  ·  ' + facts : ''}</p>
                ${venueLine}
                ${styleChips ? `<p class="event-detail-styles">Style: ${styleChips}</p>` : ''}
                ${event.organizer ? `<p class="event-detail-organizer">Organizator: ${escapeHTML(event.organizer)}</p>` : ''}
            </section>
            ${event.summary_pl ? `
            <section class="detail-section">
                <h3>O wydarzeniu</h3>
                <p class="event-detail-summary">${escapeHTML(event.summary_pl)}</p>
            </section>` : ''}
            <section class="detail-section event-cta-section">
                <a class="event-cta" href="${escapeAttribute(event.url)}" target="_blank" rel="noopener">Kup bilet / Zapisz się ↗</a>
                ${event.confidence === 'single-source' ? `<p class="event-confidence-note">⚠ Termin do potwierdzenia — sprawdź u organizatora.</p>` : ''}
            </section>
            ${similarHTML}
        </div>
    `;
}

function formatEventDateLabel(event) {
    const start = parseEventDate(event.date_start);
    const day = String(start.getDate());
    const month = String(start.getMonth() + 1).padStart(2, '0');
    if (event.date_end && event.date_end !== event.date_start) {
        const end = parseEventDate(event.date_end);
        const endMonth = String(end.getMonth() + 1).padStart(2, '0');
        if (end.getMonth() !== start.getMonth() || end.getFullYear() !== start.getFullYear()) {
            return `${day}.${month}–${end.getDate()}.${endMonth}`;
        }
        return `${day}–${end.getDate()}.${month}`;
    }
    return `${day}.${month}`;
}

function updateEventFilterStatus(hasFilters) {
    const status = elements.events.filterStatus;
    if (!hasFilters) {
        status.textContent = '';
        status.classList.add('hidden');
        return;
    }
    status.textContent = formatEventFilterStatus(filteredEvents.length);
    status.classList.remove('hidden');
}

function formatEventFilterStatus(count) {
    if (count === 0) return 'Żadne wydarzenie nie pasuje do filtrów.';
    if (count === 1) return '1 wydarzenie pasuje do filtrów.';
    const few = count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 12 || count % 100 > 14);
    return few ? `${count} wydarzenia pasują do filtrów.` : `${count} wydarzeń pasuje do filtrów.`;
}

function renderSchools() {
    if (!schoolsData || !elements.events.schoolsContainer) return;
    if (schoolsData.length === 0) {
        elements.events.schoolsContainer.innerHTML =
            '<p class="schools-empty">Wkrótce dodamy szkoły i regularne zajęcia. Prowadzisz takie? Zgłoś się!</p>';
        return;
    }
    elements.events.schoolsContainer.innerHTML = schoolsData.map(school => `
        <article class="school-card">
            <h4>${escapeHTML(school.name)}</h4>
            <p class="school-meta">${escapeHTML(school.city)} · ${escapeHTML(school.schedule_pl)}</p>
            <p class="school-styles">${escapeHTML(school.styles.map(slug => (dancesData.find(dance => dance.slug === slug) || {}).names?.pl || slug).join(', '))}</p>
            <a class="card-link" href="${escapeAttribute(school.url)}" target="_blank" rel="noopener">Zapisy i informacje</a>
        </article>
    `).join('');
}

// Utility functions
function showLoading(show) {
    if (elements.loading) {
        elements.loading.classList.toggle('hidden', !show);
    }
}

function showError(message) {
    console.error(message);
    const main = document.querySelector('main');
    const error = document.createElement('div');
    error.className = 'error-panel';
    error.setAttribute('role', 'alert');
    error.innerHTML = `<strong>Nie udało się załadować danych.</strong><span>${escapeHTML(message)}</span>`;
    main.prepend(error);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make navigateTo available globally for onclick handlers
window.navigateTo = navigateTo;

function truncateText(value, maxLength) {
    if (!value || value.length <= maxLength) {
        return value || '';
    }
    return `${value.slice(0, maxLength).trim()}...`;
}

function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[character]));
}

function escapeAttribute(value) {
    return escapeHTML(value).replace(/`/g, '&#096;');
}
