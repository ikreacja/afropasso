// Global state
let dancesData = null;
let timelineData = null;
let filteredDances = [];
let eventsData = null;
let schoolsData = null;
let filteredEvents = [];
let currentRoute = 'home';

const EVENT_SUBMIT_FORM_URL = 'https://forms.gle/REPLACE-WITH-REAL-FORM';

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
        noResults: null,
        previewContainer: null
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
        submitLinks: null,
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
    elements.views.dance = document.getElementById('dance-view');
    elements.views.timeline = document.getElementById('timeline-view');
    elements.views.compare = document.getElementById('compare-view');
    elements.views.glossary = document.getElementById('glossary-view');
    
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
    elements.home.previewContainer = document.getElementById('library-preview-container');
    
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
    elements.events.cityFilter = document.getElementById('event-city-filter');
    elements.events.styleFilter = document.getElementById('event-style-filter');
    elements.events.typeFilter = document.getElementById('event-type-filter');
    elements.events.clearFilters = document.getElementById('event-clear-filters');
    elements.events.filterStatus = document.getElementById('event-filter-status');
    elements.events.featuredContainer = document.getElementById('featured-events-container');
    elements.events.listContainer = document.getElementById('events-list-container');
    elements.events.emptyState = document.getElementById('events-empty');
    elements.events.submitLinks = document.querySelectorAll('.submit-event-cta');
    elements.events.schoolsContainer = document.getElementById('schools-container');
    elements.views.events = document.getElementById('events-view');
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
    elements.events.cityFilter.addEventListener('change', handleEventFilters);
    elements.events.styleFilter.addEventListener('change', handleEventFilters);
    elements.events.typeFilter.addEventListener('change', handleEventFilters);
    elements.events.clearFilters.addEventListener('click', clearEventFilters);
    elements.events.submitLinks.forEach(link => { link.href = EVENT_SUBMIT_FORM_URL; });
    
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
        renderLibraryPreview();
        
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
            renderLibraryPreview();
            break;
        case 'dances':
            renderDanceCards();
            break;
        case 'events':
            renderEventsPage();
            break;
        case 'dance':
            if (params[0]) {
                showDanceDetail(params[0]);
            } else {
                navigateTo('/');
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
        view.classList.remove('active');
    });
    
    if (elements.views[viewName]) {
        elements.views[viewName].classList.add('active');
    }
}

function renderFeaturedDances() {
    if (!dancesData || !elements.home.featuredContainer) return;

    const featuredSlugs = ['kizomba', 'semba', 'tarraxinha', 'tarraxo', 'kizomba-fusion', 'urban-kizz', 'kuduro', 'kompa'];
    const featured = featuredSlugs
        .map(slug => dancesData.find(dance => dance.slug === slug))
        .filter(Boolean);

    elements.home.featuredContainer.innerHTML = featured.map((dance, index) => `
        <article class="featured-tile ${index === 0 ? 'featured-large' : ''}" style="--tile-position: ${getFeaturedPosition(dance.slug)}; --tile-image: url('${escapeAttribute(getFeaturedImage(dance.slug))}')" onclick="navigateTo('/dance/${escapeAttribute(dance.slug)}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' ') navigateTo('/dance/${escapeAttribute(dance.slug)}')">
            <div class="featured-tile-content">
                <h4>${escapeHTML(dance.names.pl)}</h4>
                <p class="featured-country">${escapeHTML(formatOrigin(dance))}</p>
                <p class="featured-character">${escapeHTML(formatClassification(dance))}</p>
                <p class="featured-description">${escapeHTML(getFeaturedDescription(dance))}</p>
                <span>Przejdź do karty</span>
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
        'kompa': 'Haitański groove, luźniejsza rama i karaibski puls.'
    };
    return overrides[dance.slug] || truncateText(dance.character_pl, 96);
}

function getFeaturedImage(slug) {
    return getDanceImage(slug) || 'assets/hero-dance-workshop.png';
}

function getDanceImage(slug) {
    const images = {
        'massemba': 'assets/dances/massemba.png',
        'kizomba': 'assets/hero-dance-workshop.png',
        'semba': 'assets/dances/semba.png',
        'tarraxinha': 'assets/dances/tarraxinha.png',
        'tarraxo': 'assets/dances/tarraxo.png',
        'kizomba-fusion': 'assets/dances/kizomba-fusion.png',
        'urban-kizz': 'assets/dances/urban-kizz.png',
        'kuduro': 'assets/dances/kuduro.png',
        'kompa': 'assets/dances/kompa.png'
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

function renderLibraryPreview() {
    if (!dancesData || !elements.home.previewContainer) return;
    elements.home.previewContainer.innerHTML = dancesData
        .slice(0, 6)
        .map((dance, index) => danceCardHTML(dance, index))
        .join('');
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
                        <h4>Ramka</h4>
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

// Timeline rendering
function renderTimeline() {
    if (!timelineData) return;
    
    elements.timeline.container.innerHTML = timelineData.map((period, index) => `
        <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <p class="timeline-index">${String(index + 1).padStart(2, '0')}</p>
                <h3 class="timeline-period">${escapeHTML(period.period)}</h3>
                <p class="timeline-years">${escapeHTML(period.years)}</p>
                <ul class="timeline-events">
                    ${period.events.map(event => `
                        <li>
                            <strong>${escapeHTML(event.title)}</strong>
                            <span>${escapeHTML(event.description)}</span>
                            ${event.dances ? `<em>Tańce: ${event.dances.map(escapeHTML).join(', ')}</em>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </div>
        </div>
    `).join('');
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

// Glossary generation
function generateGlossary() {
    if (!dancesData) return;
    
    const glossaryTerms = [
        {
            term: "Massemba",
            definition: "Tradycyjny angolski taniec, poprzednik semby. Nazwa pochodzi z języka kimbundu i oznacza 'dotyk brzuchów'."
        },
        {
            term: "Semba",
            definition: "Energiczny taniec z Angoli, podstawa dla kizomby. Charakteryzuje się szybkim tempem i żywym rytmem."
        },
        {
            term: "Kizomba",
            definition: "Romantyczny taniec powstały z fuzji angolskiej semby i antylskiego zouk. Nazwa oznacza 'imprezę' w języku kimbundu."
        },
        {
            term: "Kuduro",
            definition: "Energiczny gatunek muzyczno-taneczny z Angoli, mieszanka afrykańskich perkusji z europejską muzyką elektroniczną."
        },
        {
            term: "Tarraxinha",
            definition: "Intymny taniec z Angoli, powstały jako spowolniona wersja kuduro. Nazwa oznacza 'małą śrubę' w portugalskim."
        },
        {
            term: "Tarraxo",
            definition: "Europejska adaptacja tarraxinhy, powstała w Lizbonie. Ostrzejsza i mroczniejsza wersja oryginalnego tańca."
        },
        {
            term: "Urban Kizz",
            definition: "Nowoczesny styl powstały we Francji, łączący kizombę z elementami hip-hopu, tango i innych stylów tanecznych."
        },
        {
            term: "Kizomba Fusion",
            definition: "Styl pośredni między tradycyjną kizombą a urban kizz, zachowujący podstawowy charakter kizomby z subtelnymi elementami innych stylów."
        },
        {
            term: "Kompa",
            definition: "Haitański gatunek muzyczny i taniec społeczny znany też jako compas. Ma luźniejsze objęcie i karaibski groove, który wpłynął na rozwój zouk."
        },
        {
            term: "Zouk",
            definition: "Gatunek muzyczny z Antyli Francuskich, który wpłynął na powstanie kizomby w latach 80."
        },
        {
            term: "Ghetto Zouk",
            definition: "Styl muzyczny będący mieszanką zouk z elementami R&B i hip-hopu, często używany w urban kizz."
        },
        {
            term: "Rebita",
            definition: "Inna nazwa dla massemby, tradycyjnego angolskiego tańca miejskiego."
        },
        {
            term: "Kimbundu",
            definition: "Język bantu używany w Angoli, z którego pochodzą nazwy wielu tańców (kizomba, massemba)."
        },
        {
            term: "Ngola Ritmos",
            definition: "Legendarny angolski zespół założony w 1947 roku, który odegrał kluczową rolę w rozwoju semby."
        },
        {
            term: "Eduardo Paím",
            definition: "Angolski muzyk uznawany za jednego z ojców kizomby, założyciel zespołu SOS."
        }
    ];
    
    elements.glossary.container.innerHTML = glossaryTerms.map(item => `
        <div class="glossary-item">
            <h3 class="glossary-term">${item.term}</h3>
            <p class="glossary-definition">${item.definition}</p>
        </div>
    `).join('');
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
    const city = elements.events.cityFilter.value;
    const style = elements.events.styleFilter.value;
    const type = elements.events.typeFilter.value;

    filteredEvents = getUpcomingEvents().filter(event =>
        (!city || event.city === city) &&
        (!style || event.styles.includes(style)) &&
        (!type || event.type === type)
    );

    renderFeaturedEvents();
    renderEventsList();
    updateEventFilterStatus(Boolean(city || style || type));
}

function clearEventFilters() {
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
    const selectedCity = elements.events.cityFilter.value;
    const selectedStyle = elements.events.styleFilter.value;

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
        <a class="featured-tile featured-event-tile" href="${escapeAttribute(event.url)}" target="_blank" rel="noopener"
           ${event.image ? `style="--tile-image: url('${escapeAttribute(event.image)}')"` : ''}>
            <div class="featured-tile-content">
                <p class="featured-country">${escapeHTML(formatEventDateLabel(event))} · ${escapeHTML(event.city)}</p>
                <h4>${escapeHTML(event.title)}</h4>
                <p class="featured-character">${escapeHTML(EVENT_TYPE_LABELS[event.type] || event.type)}</p>
                <span>Zobacz wydarzenie</span>
            </div>
        </a>
    `).join('');
}

function renderEventsList() {
    const container = elements.events.listContainer;
    if (filteredEvents.length === 0) {
        container.innerHTML = '';
        const hasFilters = Boolean(
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
        <article class="event-row">
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
            <a class="event-link" href="${escapeAttribute(event.url)}" target="_blank" rel="noopener">Szczegóły</a>
        </article>
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
