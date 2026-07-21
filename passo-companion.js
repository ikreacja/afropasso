/*
 * AfroPasso companion: "Passo", a friendly drum mascot in the bottom-left corner.
 * Progressive enhancement, dependency-free (no GSAP). It greets once per visitor,
 * offers context-aware quick links per route, can be dismissed permanently
 * (remembered in localStorage), and fully respects prefers-reduced-motion.
 * If this script never runs, the page is exactly as rendered by styles.css.
 *
 * Placed bottom-left so it never collides with the bottom-right scroll-top button.
 */
(function () {
    'use strict';

    var HIDE_KEY = 'passo-hidden';   // set once the user chooses "Nie pokazuj Passo"
    var GREET_KEY = 'passo-greeted'; // set after the first-visit auto-greeting

    // Honour a permanent dismissal before building anything.
    try { if (localStorage.getItem(HIDE_KEY) === '1') return; } catch (e) {}

    var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');

    // One short, warm line per view. Detail pages route as "dance".
    var MESSAGES = {
        home:     'Cześć! Jestem Passo. Oprowadzę Cię po tańcach afrykańskich — od czego zaczniemy?',
        dances:   'Filtruj tańce po rodzinie, pochodzeniu i muzyce. Zaciekawi Cię któryś? Wejdź w jego kartę.',
        events:   'Zobacz, co dzieje się na parkietach. Organizujesz wydarzenie? Śmiało je zgłoś!',
        etykieta: 'Wchodzisz na parkiet? Poznaj zasady dobrego tańca w parze i savoir-vivre socialu.',
        timeline: 'Prześledź korzenie — jak tańce wędrowały przez lata, kraje i kontynenty.',
        compare:  'Postaw dwa style obok siebie i zobacz, czym naprawdę się różnią.',
        glossary: 'Nie znasz jakiegoś terminu? Zajrzyj do glosariusza — rozwinę pełną definicję.',
        dance:    'Poznajesz konkretny taniec — sprawdź jego korzenie, muzykę i filmy.'
    };

    function routeName() {
        var hash = (location.hash || '').slice(1) || '/';
        var seg = hash.split('/').filter(Boolean)[0];
        return seg || 'home';
    }
    function messageFor(route) {
        return MESSAGES[route] || MESSAGES.home;
    }

    /* -- build the widget (kept out of index.html so there is no dead markup) -- */

    var root = document.createElement('div');
    root.className = 'passo-companion';
    root.setAttribute('data-open', 'false');
    root.innerHTML =
        '<div class="passo-bubble" role="dialog" aria-label="Passo — przewodnik po stronie" aria-hidden="true">' +
            '<button type="button" class="passo-bubble-close" aria-label="Zamknij powitanie">×</button>' +
            '<p class="passo-bubble-text"></p>' +
            '<div class="passo-bubble-links">' +
                '<a href="#/dances">Wszystkie tańce</a>' +
                '<a href="#/events">Społeczność</a>' +
                '<a href="#/etykieta">Etykieta</a>' +
                '<a href="#/timeline">Korzenie</a>' +
                '<a href="#/compare">Porównaj</a>' +
                '<a href="#/glossary">Glosariusz</a>' +
            '</div>' +
            '<button type="button" class="passo-hide">Nie pokazuj Passo</button>' +
        '</div>' +
        '<span class="passo-hint" aria-hidden="true">Zgubiłeś rytm? Kliknij mnie!</span>' +
        '<button type="button" class="passo-avatar" aria-expanded="false" ' +
                'aria-label="Passo — przewodnik po stronie. Otwórz powitanie.">' +
            '<picture>' +
                '<source srcset="assets/avatar/passo-companion.webp" type="image/webp">' +
                '<img src="assets/avatar/passo-companion.webp" alt="" width="76" height="76" draggable="false">' +
            '</picture>' +
        '</button>';
    document.body.appendChild(root);

    var avatar = root.querySelector('.passo-avatar');
    var bubble = root.querySelector('.passo-bubble');
    var bubbleText = root.querySelector('.passo-bubble-text');
    var closeBtn = root.querySelector('.passo-bubble-close');
    var hideBtn = root.querySelector('.passo-hide');
    var links = root.querySelectorAll('.passo-bubble-links a');

    function isOpen() { return root.getAttribute('data-open') === 'true'; }
    function refreshText() { bubbleText.textContent = messageFor(routeName()); }

    function openBubble(focusInside) {
        refreshText();
        root.setAttribute('data-open', 'true');
        bubble.setAttribute('aria-hidden', 'false');
        avatar.setAttribute('aria-expanded', 'true');
        if (focusInside) closeBtn.focus();
    }
    function closeBubble(returnFocus) {
        root.setAttribute('data-open', 'false');
        bubble.setAttribute('aria-hidden', 'true');
        avatar.setAttribute('aria-expanded', 'false');
        if (returnFocus) avatar.focus();
    }
    function toggleBubble() { isOpen() ? closeBubble(true) : openBubble(true); }

    avatar.addEventListener('click', toggleBubble);
    closeBtn.addEventListener('click', function () { closeBubble(true); });

    hideBtn.addEventListener('click', function () {
        try { localStorage.setItem(HIDE_KEY, '1'); } catch (e) {}
        if (root.parentNode) root.parentNode.removeChild(root);
    });

    // Quick links: let the hash router navigate, then tuck the bubble away.
    Array.prototype.forEach.call(links, function (a) {
        a.addEventListener('click', function () { closeBubble(false); });
    });

    // The "click me" hint is a mouse affordance; opening also hides it (CSS).
    var hint = root.querySelector('.passo-hint');
    if (hint) hint.addEventListener('click', function () { openBubble(true); });

    // Esc closes (returning focus); a click anywhere outside closes quietly.
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen()) closeBubble(true);
    });
    document.addEventListener('click', function (e) {
        if (isOpen() && !root.contains(e.target)) closeBubble(false);
    });

    // Keep the line in sync with the route while the bubble is open.
    window.addEventListener('hashchange', function () {
        if (isOpen()) refreshText();
    });

    /* -- entrance + first-visit greeting -- */

    var alreadyGreeted;
    try { alreadyGreeted = localStorage.getItem(GREET_KEY) === '1'; }
    catch (e) { alreadyGreeted = true; }

    function enter() {
        root.classList.add('is-in');
        if (!alreadyGreeted) {
            openBubble(false);
            try { localStorage.setItem(GREET_KEY, '1'); } catch (e) {}
        }
    }

    if (reduceMq.matches) {
        enter(); // no slide-in, no wiggle — just appear
    } else {
        window.setTimeout(enter, 900);
    }
})();
