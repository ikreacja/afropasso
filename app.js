// Global state
let dancesData = null;
let timelineData = null;
let filteredDances = [];
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
        featuredSection: null,
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
    glossary: {
        container: null
    }
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    initializeElements();
    setupEventListeners();
    await loadData();
    initializeRouter();
    showLoading(false);
});

// Initialize DOM element references
function initializeElements() {
    elements.loading = document.getElementById('loading');
    
    // Views
    elements.views.home = document.getElementById('home-view');
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
    elements.home.featuredSection = document.querySelector('.featured-dances');
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
    
    // Browser back/forward
    window.addEventListener('popstate', handlePopState);

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

function handlePopState() {
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
            renderDanceCards();
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
    const matchingSlugs = new Set(filteredDances.map(dance => dance.slug));
    const featured = featuredSlugs
        .map(slug => dancesData.find(dance => dance.slug === slug))
        .filter(Boolean)
        .filter(dance => matchingSlugs.has(dance.slug));

    if (elements.home.featuredSection) {
        elements.home.featuredSection.classList.toggle('hidden', featured.length === 0);
    }

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
    renderFeaturedDances();
    updateFilterStatus();
}

function clearFilters() {
    elements.home.searchInput.value = '';
    elements.home.countryFilter.value = '';
    elements.home.periodFilter.value = '';
    elements.home.typeFilter.value = '';
    filteredDances = [...dancesData];
    renderDanceCards();
    renderFeaturedDances();
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
