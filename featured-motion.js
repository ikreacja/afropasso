/*
 * AfroPasso tile motion: "Wejście na parkiet".
 * Syncopated clip-path entrance, pointer tilt with photo parallax and light
 * sheen, neighbor-aware focus, subtle scroll drift. Progressive enhancement:
 * without GSAP/ScrollTrigger or with prefers-reduced-motion the grid keeps
 * its static presentation and CSS hover states.
 *
 * Drives two independent grids with the same choreography: the home hero's
 * featured-dances grid and the discovery-guide grid below it. Each grid gets
 * its own instance (own tiles, own teardown) via createTileMotion(); the two
 * never share state, so hover/neighbor-dimming in one grid can't affect the
 * other.
 */
(function () {
    'use strict';

    var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMq.matches) return;
    if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    /* Kizomba-inspired beat offsets (seconds-ish, scaled below): the grid
       enters as a musical phrase, not a uniform queue. */
    var BEATS = [0, 0.12, 0.3, 0.38, 0.62, 0.7, 0.88, 0.96];

    /* Entrance wipe direction per tile index: dancers entering from wings. */
    var WIPES = [
        'inset(0 100% 0 0)',
        'inset(100% 0 0 0)',
        'inset(0 0 0 100%)',
        'inset(0 0 100% 0)',
        'inset(0 100% 0 0)',
        'inset(0 0 0 100%)',
        'inset(100% 0 0 0)',
        'inset(0 0 100% 0)'
    ];

    var MEDIA_REST_SCALE = 1.06; /* permanent overscan: parallax headroom */

    /* Each grid follows the same "1 large tile in col 1 + rest alternating
       col 2/3" layout, so the same cycling column map applies regardless of
       how many tiles a given grid has (index % length). */
    var COLUMN_DRIFT = [-6, 0, 6];               /* px, per grid column */
    var TILE_COLUMN = [0, 1, 2, 1, 2, 0, 1, 2];  /* grid column of each tile, in DOM order */

    /**
     * Wires the full choreography onto one grid. config:
     *   gridSelector    - CSS selector for the grid element (JS gets .featured-motion-on added to it)
     *   tileSelector    - CSS selector (scoped within the grid) for each tile
     *   mediaSelector   - CSS selector for a tile's inner photo layer
     *   contentSelector - CSS selector for a tile's text-content wrapper (children are staggered in)
     */
    function createTileMotion(config) {
        var grid = null;
        var initialized = false;
        var teardownFns = [];

        function initEntrance(tiles) {
            tiles.forEach(function (tile, index) {
                var media = tile.querySelector(config.mediaSelector);
                var content = tile.querySelectorAll(config.contentSelector + ' > *');
                gsap.set(tile, { clipPath: WIPES[index % WIPES.length] });
                if (media) gsap.set(media, { scale: 1.18 });
                gsap.set(content, { y: 18, opacity: 0, filter: 'blur(6px)' });
            });

            var st = ScrollTrigger.create({
                trigger: grid,
                start: 'top 78%',
                once: true,
                onEnter: function () {
                    var tl = gsap.timeline({ defaults: { ease: 'power4.out' } });
                    tiles.forEach(function (tile, index) {
                        var media = tile.querySelector(config.mediaSelector);
                        var content = tile.querySelectorAll(config.contentSelector + ' > *');
                        var at = BEATS[index % BEATS.length] * 0.9;
                        tl.to(tile, {
                            clipPath: 'inset(0% 0% 0% 0%)',
                            duration: 1.0,
                            ease: 'power3.inOut',
                            clearProps: 'clipPath'
                        }, at);
                        if (media) {
                            tl.to(media, { scale: MEDIA_REST_SCALE, duration: 1.6, ease: 'power2.out' }, at);
                        }
                        tl.to(content, {
                            y: 0,
                            opacity: 1,
                            filter: 'blur(0px)',
                            duration: 0.7,
                            stagger: 0.06,
                            clearProps: 'all'
                        }, at + 0.35);
                    });
                }
            });
            teardownFns.push(function () { st.kill(); });
        }

        function initPointer(tiles) {
            if (!window.matchMedia('(pointer: fine)').matches) return;

            tiles.forEach(function (tile) {
                var media = tile.querySelector(config.mediaSelector);
                var siblings = tiles.filter(function (other) { return other !== tile; });

                var toRotX = gsap.quickTo(tile, 'rotationX', { duration: 0.5, ease: 'power2.out' });
                var toRotY = gsap.quickTo(tile, 'rotationY', { duration: 0.5, ease: 'power2.out' });
                var toMedX = media ? gsap.quickTo(media, 'x', { duration: 0.6, ease: 'power2.out' }) : null;
                var toMedY = media ? gsap.quickTo(media, 'y', { duration: 0.6, ease: 'power2.out' }) : null;

                gsap.set(tile, { transformPerspective: 900 });

                var onMove = function (event) {
                    var rect = tile.getBoundingClientRect();
                    if (!rect.width || !rect.height) return;
                    var px = (event.clientX - rect.left) / rect.width - 0.5;
                    var py = (event.clientY - rect.top) / rect.height - 0.5;
                    toRotX(py * -5);
                    toRotY(px * 7);
                    if (toMedX) toMedX(px * -12);
                    if (toMedY) toMedY(py * -12);
                    tile.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
                    tile.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%');
                };

                var onEnter = function () {
                    gsap.to(tile, { scale: 1.015, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
                    gsap.to(siblings, { scale: 0.985, filter: 'brightness(0.92)', duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
                };

                var onLeave = function () {
                    toRotX(0);
                    toRotY(0);
                    if (toMedX) toMedX(0);
                    if (toMedY) toMedY(0);
                    gsap.to(tiles, { scale: 1, filter: 'brightness(1)', duration: 0.6, ease: 'power3.out', overwrite: 'auto' });
                };

                tile.addEventListener('pointermove', onMove, { passive: true });
                tile.addEventListener('pointerenter', onEnter);
                tile.addEventListener('pointerleave', onLeave);
                teardownFns.push(function () {
                    tile.removeEventListener('pointermove', onMove);
                    tile.removeEventListener('pointerenter', onEnter);
                    tile.removeEventListener('pointerleave', onLeave);
                });
            });
        }

        function initDrift(tiles) {
            /* Each column drifts as one rigid unit at a slightly different speed -
               depth without spectacle. Col 1 rises gently, middle holds, col 3 sinks.
               Fixed pixels (not yPercent) so tiles of different heights in the same
               column shift by the same amount and their vertical gap stays even. */
            tiles.forEach(function (tile, index) {
                var tween = gsap.to(tile, {
                    y: COLUMN_DRIFT[TILE_COLUMN[index % TILE_COLUMN.length]],
                    ease: 'none',
                    scrollTrigger: {
                        trigger: grid,
                        start: 'top 85%',
                        end: 'bottom 10%',
                        scrub: 0.8
                    }
                });
                teardownFns.push(function () {
                    if (tween.scrollTrigger) tween.scrollTrigger.kill();
                    tween.kill();
                });
            });
        }

        function init() {
            if (initialized) return;
            grid = document.querySelector(config.gridSelector);
            if (!grid) return;
            var tiles = Array.prototype.slice.call(grid.querySelectorAll(config.tileSelector));
            if (tiles.length === 0) return;
            initialized = true;

            grid.classList.add('featured-motion-on');
            initEntrance(tiles);
            initPointer(tiles);
            initDrift(tiles);
            ScrollTrigger.refresh();
        }

        function teardown() {
            teardownFns.forEach(function (fn) { fn(); });
            teardownFns = [];
            if (grid) {
                grid.classList.remove('featured-motion-on');
                var animated = grid.querySelectorAll(
                    config.tileSelector + ', ' + config.mediaSelector + ', ' + config.contentSelector + ' > *'
                );
                gsap.set(animated, { clearProps: 'all' });
            }
            initialized = false;
        }

        /* The grid may be rendered asynchronously after this script runs (the
           featured-dances grid waits on a data fetch); the guide grid is static
           markup already present. Observing covers the async case; the immediate
           init() call covers the static one. */
        var container = document.querySelector(config.gridSelector);
        if (container) {
            new MutationObserver(function () { init(); }).observe(container, { childList: true });
        }
        init();

        return { teardown: teardown };
    }

    var instances = [
        createTileMotion({
            gridSelector: '#featured-dances-container',
            tileSelector: '.featured-tile',
            mediaSelector: '.featured-tile-media',
            contentSelector: '.featured-tile-content'
        }),
        createTileMotion({
            gridSelector: '#home-view .guide-grid',
            tileSelector: '.guide-tile',
            mediaSelector: '.guide-tile-media',
            contentSelector: '.guide-tile-content'
        })
    ];

    var onReduceChange = function (e) {
        if (!e.matches) return;
        instances.forEach(function (instance) { instance.teardown(); });
    };
    if (typeof reduceMq.addEventListener === 'function') {
        reduceMq.addEventListener('change', onReduceChange);
    } else if (typeof reduceMq.addListener === 'function') {
        reduceMq.addListener(onReduceChange);
    }
})();
