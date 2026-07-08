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
    home: {
        searchInput: null,
        countryFilter: null,
        periodFilter: null,
        typeFilter: null,
        clearFilters: null,
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
    
    // Home view elements
    elements.home.searchInput = document.getElementById('search-input');
    elements.home.countryFilter = document.getElementById('country-filter');
    elements.home.periodFilter = document.getElementById('period-filter');
    elements.home.typeFilter = document.getElementById('type-filter');
    elements.home.clearFilters = document.getElementById('clear-filters');
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
    }
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

// Dance cards rendering
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
    
    container.innerHTML = filteredDances.map(dance => `
        <article class="dance-card" onclick="navigateTo('/dance/${dance.slug}')" 
                 role="button" tabindex="0" 
                 onkeydown="if(event.key==='Enter'||event.key===' ') navigateTo('/dance/${dance.slug}')">
            <header class="dance-card-header">
                <h3 class="dance-card-title">${dance.names.pl}</h3>
                <p class="dance-card-origin">
                    ${dance.origin.country}, ${dance.origin.region} • ${dance.origin.years}
                </p>
                <div class="dance-card-tags">
                    <span class="tag period">${dance.origin.period}</span>
                    ${dance.classification.map(cls => `<span class="tag classification">${cls}</span>`).join('')}
                </div>
            </header>
            <div class="dance-card-body">
                <p class="dance-card-description">
                    ${dance.character_pl.substring(0, 150)}${dance.character_pl.length > 150 ? '...' : ''}
                </p>
                <footer class="dance-card-footer">
                    <span class="btn-primary">Dowiedz się więcej</span>
                </footer>
            </div>
        </article>
    `).join('');
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
}

function clearFilters() {
    elements.home.searchInput.value = '';
    elements.home.countryFilter.value = '';
    elements.home.periodFilter.value = '';
    elements.home.typeFilter.value = '';
    filteredDances = [...dancesData];
    renderDanceCards();
}

// Dance detail view
function showDanceDetail(slug) {
    const dance = dancesData.find(d => d.slug === slug);
    if (!dance) {
        navigateTo('/');
        return;
    }
    
    elements.dance.detail.innerHTML = `
        <button class="back-button" onclick="navigateTo('/')">
            ← Powrót do listy tańców
        </button>
        
        <header class="dance-detail-header">
            <div class="dance-detail-content">
                <h2 class="dance-detail-title">${dance.names.pl}</h2>
                <p class="dance-detail-subtitle">${dance.character_pl}</p>
                <div class="dance-detail-meta">
                    <span class="meta-item">📍 ${dance.origin.country}, ${dance.origin.region}</span>
                    <span class="meta-item">📅 ${dance.origin.years}</span>
                    <span class="meta-item">🏷️ ${dance.origin.period}</span>
                </div>
            </div>
        </header>
        
        <div class="dance-detail-body">
            <section class="detail-section">
                <h3>Charakterystyka</h3>
                <div class="characteristics-grid">
                    <div class="characteristic-item">
                        <h4>Muzyka</h4>
                        <p>${dance.music.description_pl}</p>
                        ${dance.music.examples ? `<p><strong>Przykłady:</strong> ${dance.music.examples.join(', ')}</p>` : ''}
                    </div>
                    <div class="characteristic-item">
                        <h4>Uczucie</h4>
                        <p>${dance.feeling_pl}</p>
                    </div>
                    <div class="characteristic-item">
                        <h4>Ramka</h4>
                        <p>${dance.frame_pl}</p>
                    </div>
                    <div class="characteristic-item">
                        <h4>Podstawy</h4>
                        <p>${dance.basics_pl}</p>
                    </div>
                </div>
            </section>
            
            <section class="detail-section">
                <h3>Wpływy</h3>
                <p>${dance.influences.join(', ')}</p>
            </section>
            
            ${dance.differences_pl && dance.differences_pl.length > 0 ? `
            <section class="detail-section">
                <h3>Różnice względem innych stylów</h3>
                <ul class="differences-list">
                    ${dance.differences_pl.map(diff => `
                        <li><strong>vs ${diff.vs}:</strong> ${diff.text}</li>
                    `).join('')}
                </ul>
            </section>
            ` : ''}
            
            ${dance.controversies_pl && dance.controversies_pl.length > 0 ? `
            <section class="detail-section">
                <h3>Kontrowersje</h3>
                <ul>
                    ${dance.controversies_pl.map(controversy => `<li>${controversy}</li>`).join('')}
                </ul>
            </section>
            ` : ''}
            
            <section class="detail-section">
                <h3>Wideo</h3>
                <div class="videos-grid">
                    ${dance.videos.map(video => `
                        <div class="video-item">
                            <h4>${getVideoTypeLabel(video.type)}</h4>
                            <p><strong>${video.title}</strong></p>
                            <p>Autor: ${video.author} (${video.year})</p>
                            <a href="${video.url}" target="_blank" rel="noopener noreferrer" class="video-link">
                                Obejrzyj wideo
                            </a>
                        </div>
                    `).join('')}
                </div>
            </section>
            
            <section class="detail-section">
                <h3>Źródła</h3>
                <ul class="sources-list">
                    ${dance.sources.map(source => `
                        <li>
                            ${source.url ? `<a href="${source.url}" target="_blank" rel="noopener noreferrer">${source.title}</a>` : source.title}
                            ${source.note ? `<br><small>${source.note}</small>` : ''}
                        </li>
                    `).join('')}
                </ul>
            </section>
            
            <section class="detail-section">
                <h3>Słowa kluczowe</h3>
                <div class="dance-card-tags">
                    ${dance.keywords_pl.map(keyword => `<span class="tag">${keyword}</span>`).join('')}
                </div>
            </section>
        </div>
    `;
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
    
    elements.timeline.container.innerHTML = timelineData.map(period => `
        <div class="timeline-item">
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <h3 class="timeline-period">${period.period}</h3>
                <p class="timeline-years">${period.years}</p>
                <ul class="timeline-events">
                    ${period.events.map(event => `
                        <li>
                            <strong>${event.title}</strong><br>
                            ${event.description}
                            ${event.dances ? `<br><em>Tańce: ${event.dances.join(', ')}</em>` : ''}
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
        `<option value="${dance.id}">${dance.names.pl}</option>`
    ).join('');
    
    elements.compare.danceA.innerHTML = '<option value="">Wybierz taniec...</option>' + options;
    elements.compare.danceB.innerHTML = '<option value="">Wybierz taniec...</option>' + options;
}

function handleComparison() {
    const danceAId = elements.compare.danceA.value;
    const danceBId = elements.compare.danceB.value;
    
    if (!danceAId || !danceBId) {
        elements.compare.result.innerHTML = '';
        return;
    }
    
    const danceA = dancesData.find(d => d.id === danceAId);
    const danceB = dancesData.find(d => d.id === danceBId);
    
    if (!danceA || !danceB) return;
    
    elements.compare.result.innerHTML = `
        <div class="comparison-card">
            <h3>${danceA.names.pl}</h3>
            <div class="comparison-details">
                <div class="comparison-detail">
                    <strong>Pochodzenie:</strong>
                    ${danceA.origin.country}, ${danceA.origin.region} (${danceA.origin.years})
                </div>
                <div class="comparison-detail">
                    <strong>Okres:</strong>
                    ${danceA.origin.period}
                </div>
                <div class="comparison-detail">
                    <strong>Klasyfikacja:</strong>
                    ${danceA.classification.join(', ')}
                </div>
                <div class="comparison-detail">
                    <strong>Rodzina:</strong>
                    ${danceA.family.join(', ')}
                </div>
                <div class="comparison-detail">
                    <strong>Charakter:</strong>
                    ${danceA.character_pl}
                </div>
                <div class="comparison-detail">
                    <strong>Uczucie:</strong>
                    ${danceA.feeling_pl}
                </div>
                <div class="comparison-detail">
                    <strong>Wpływy:</strong>
                    ${danceA.influences.join(', ')}
                </div>
            </div>
        </div>
        
        <div class="comparison-card">
            <h3>${danceB.names.pl}</h3>
            <div class="comparison-details">
                <div class="comparison-detail">
                    <strong>Pochodzenie:</strong>
                    ${danceB.origin.country}, ${danceB.origin.region} (${danceB.origin.years})
                </div>
                <div class="comparison-detail">
                    <strong>Okres:</strong>
                    ${danceB.origin.period}
                </div>
                <div class="comparison-detail">
                    <strong>Klasyfikacja:</strong>
                    ${danceB.classification.join(', ')}
                </div>
                <div class="comparison-detail">
                    <strong>Rodzina:</strong>
                    ${danceB.family.join(', ')}
                </div>
                <div class="comparison-detail">
                    <strong>Charakter:</strong>
                    ${danceB.character_pl}
                </div>
                <div class="comparison-detail">
                    <strong>Uczucie:</strong>
                    ${danceB.feeling_pl}
                </div>
                <div class="comparison-detail">
                    <strong>Wpływy:</strong>
                    ${danceB.influences.join(', ')}
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
            <div class="comparison-card" style="grid-column: 1 / -1;">
                <h3>Kluczowe różnice</h3>
                <div class="comparison-detail">
                    ${specificDifference.text}
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
            term: "Konpa",
            definition: "Haitański gatunek muzyczny powstały w latach 50., który wpłynął na rozwój zouk i kizomby."
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
    // You could implement a toast notification system here
    alert(message);
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

