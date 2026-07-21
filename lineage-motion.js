/*
 * AfroPasso lineage motion: scroll choreography for the "Korzenie" page.
 * The map routes draw themselves as you scroll, the lineage thread is drawn
 * along the era spine, chapters and dance-birth branches reveal on entry.
 * Progressive enhancement: without GSAP/ScrollTrigger (CDN down), without JS,
 * or with prefers-reduced-motion the page stays complete and static.
 */
(function () {
    'use strict';

    var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMq.matches) return;
    if (typeof window.gsap === 'undefined' || typeof window.ScrollTrigger === 'undefined') return;

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    var initialized = false;
    var teardownFns = [];
    var threadPath = null;
    var threadLength = 0;
    var threadProgress = 0;

    function onTimelineRoute() {
        return location.hash === '#/timeline';
    }

    /* ---------------------------------------------------------------- */
    /* Map prologue: routes draw in narrative order while the map is    */
    /* held sticky.                                                     */
    /* ---------------------------------------------------------------- */

    function initMap() {
        var section = document.querySelector('#timeline-view .lineage-map');
        var svg = section && section.querySelector('.africa-map');
        if (!section || !svg) return;

        section.classList.add('lineage-map--scrub');

        var routes = ['.route-primary', '.route-secondary', '.route-tertiary', '.route-quaternary', '.route-brazil']
            .map(function (sel) { return svg.querySelector(sel); })
            .filter(Boolean);
        routes.forEach(function (route) {
            var length = route.getTotalLength();
            route.style.strokeDasharray = length;
            route.style.strokeDashoffset = length;
        });

        var point = function (sel) { return svg.querySelector('.map-point.' + sel); };
        var label = function (sel) { return svg.querySelector('.map-label.' + sel); };
        var allPoints = [point('angola'), point('portugal'), point('france'), point('haiti'), point('diaspora'), point('brazil')].filter(Boolean);
        var allLabels = [label('label-angola'), label('label-europe'), label('label-haiti'), label('label-diaspora'), label('label-brazil')].filter(Boolean);

        gsap.set(allPoints, { scale: 0, transformOrigin: '50% 50%' });
        gsap.set(allLabels, { opacity: 0, y: 10 });

        var tl = gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
                trigger: section,
                start: 'top 60%',
                end: 'bottom bottom',
                scrub: 0.6
            }
        });

        var pop = { scale: 1, transformOrigin: '50% 50%', duration: 0.25, ease: 'back.out(2.5)' };
        var rise = { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' };

        tl.to(point('angola'), pop, 0)
            .to(label('label-angola'), rise, 0.05);
        if (routes[4]) {
            tl.to(routes[4], { strokeDashoffset: 0, duration: 1 }, 0.7)
                .to(point('brazil'), pop, 1.6)
                .to(label('label-brazil'), rise, 1.7);
        }
        if (routes[0]) {
            tl.to(routes[0], { strokeDashoffset: 0, duration: 1 }, 0.3)
                .to([point('portugal'), point('france')], pop, 1.2)
                .to(label('label-europe'), rise, 1.3);
        }
        if (routes[1]) {
            tl.to(routes[1], { strokeDashoffset: 0, duration: 1 }, 1.55)
                .to(point('haiti'), pop, 2.45)
                .to(label('label-haiti'), rise, 2.55);
        }
        if (routes[3]) {
            tl.to(routes[3], { strokeDashoffset: 0, duration: 1 }, 1.55);
        }
        if (routes[2]) {
            tl.to(routes[2], { strokeDashoffset: 0, duration: 1 }, 2.8)
                .to(point('diaspora'), pop, 3.7)
                .to(label('label-diaspora'), rise, 3.8);
        }

        teardownFns.push(function () {
            if (tl.scrollTrigger) tl.scrollTrigger.kill();
            tl.kill();
            section.classList.remove('lineage-map--scrub');
            routes.forEach(function (route) { route.style.strokeDashoffset = 0; });
            gsap.set(allPoints.concat(allLabels), { clearProps: 'all' });
        });
    }

    /* ---------------------------------------------------------------- */
    /* The thread: one SVG path through all era nodes, drawn by scroll. */
    /* ---------------------------------------------------------------- */

    function buildThreadGeometry(lineage, svg, path) {
        var nodes = lineage.querySelectorAll('.lineage-node');
        if (!nodes.length) return;
        var box = lineage.getBoundingClientRect();
        var points = Array.prototype.map.call(nodes, function (node) {
            var rect = node.getBoundingClientRect();
            return {
                x: rect.left - box.left + rect.width / 2,
                y: rect.top - box.top + rect.height / 2
            };
        });

        svg.setAttribute('viewBox', '0 0 ' + Math.round(box.width) + ' ' + Math.round(box.height));
        svg.setAttribute('preserveAspectRatio', 'none');

        var d = 'M ' + points[0].x + ' ' + Math.max(0, points[0].y - 48) +
            ' L ' + points[0].x + ' ' + points[0].y;
        for (var i = 1; i < points.length; i++) {
            var a = points[i - 1];
            var b = points[i];
            var sway = (i % 2 ? 1 : -1) * Math.min(56, (b.y - a.y) * 0.16);
            d += ' C ' + (a.x + sway) + ' ' + (a.y + (b.y - a.y) * 0.38) +
                ', ' + (b.x - sway) + ' ' + (b.y - (b.y - a.y) * 0.38) +
                ', ' + b.x + ' ' + b.y;
        }
        path.setAttribute('d', d);
        threadLength = path.getTotalLength();
        path.style.strokeDasharray = threadLength;
        path.style.strokeDashoffset = threadLength * (1 - threadProgress);
    }

    function initThread() {
        var lineage = document.querySelector('#timeline-view .lineage');
        if (!lineage) return;

        var svgNS = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('class', 'lineage-thread');
        svg.setAttribute('aria-hidden', 'true');
        threadPath = document.createElementNS(svgNS, 'path');
        threadPath.setAttribute('class', 'lineage-thread-path');
        svg.appendChild(threadPath);
        lineage.insertBefore(svg, lineage.firstChild);
        lineage.classList.add('lineage--drawn');

        buildThreadGeometry(lineage, svg, threadPath);

        var st = ScrollTrigger.create({
            trigger: lineage,
            start: 'top 78%',
            /* Finish when the last node crosses ~62% of the viewport, but never
               beyond the page's maximum scroll — otherwise the thread could
               never reach the final era dot. */
            end: function () {
                var nodes = lineage.querySelectorAll('.lineage-node');
                var last = nodes[nodes.length - 1];
                if (!last) return 'bottom 60%';
                var target = last.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.62;
                return Math.min(target, ScrollTrigger.maxScroll(window) - 2);
            },
            scrub: 0.5,
            onUpdate: function (self) {
                threadProgress = self.progress > 0.985 ? 1 : self.progress;
                threadPath.style.strokeDashoffset = threadLength * (1 - threadProgress);
            }
        });

        var rebuild = function () { buildThreadGeometry(lineage, svg, threadPath); };
        ScrollTrigger.addEventListener('refreshInit', rebuild);

        teardownFns.push(function () {
            ScrollTrigger.removeEventListener('refreshInit', rebuild);
            st.kill();
            if (svg.parentNode) svg.parentNode.removeChild(svg);
            lineage.classList.remove('lineage--drawn');
        });
    }

    /* ---------------------------------------------------------------- */
    /* Chapters: node lights up, content reveals once, rail follows.    */
    /* ---------------------------------------------------------------- */

    function initChapters() {
        var chapters = document.querySelectorAll('#timeline-view .lineage-chapter');
        var railButtons = document.querySelectorAll('#lineage-rail button');
        if (!chapters.length) return;

        function setRail(index) {
            railButtons.forEach(function (button, i) {
                button.classList.toggle('is-active', i === index);
            });
        }

        Array.prototype.forEach.call(chapters, function (chapter, index) {
            var node = chapter.querySelector('.lineage-node');
            var revealed = false;

            var st = ScrollTrigger.create({
                trigger: chapter,
                start: 'top 68%',
                onEnter: function () {
                    if (node) node.classList.add('is-active');
                    setRail(index);
                    if (!revealed) {
                        revealed = true;
                        var parts = chapter.querySelectorAll('.lineage-era, .lineage-event, .lineage-birth');
                        gsap.from(parts, {
                            y: 26,
                            opacity: 0,
                            duration: 0.8,
                            ease: 'power3.out',
                            stagger: 0.08,
                            clearProps: 'transform,opacity'
                        });
                    }
                },
                onEnterBack: function () { setRail(index); },
                onLeaveBack: function () {
                    if (node) node.classList.remove('is-active');
                    if (index > 0) setRail(index - 1);
                }
            });
            teardownFns.push(function () {
                st.kill();
                if (node) node.classList.remove('is-active');
            });
        });

        teardownFns.push(function () { setRail(-1); });
    }

    /* ---------------------------------------------------------------- */
    /* Lifecycle: the timeline view renders async and starts hidden, so */
    /* initialize only once it is routed to and populated.              */
    /* ---------------------------------------------------------------- */

    function tryInit() {
        if (initialized || !onTimelineRoute()) return;
        var view = document.getElementById('timeline-view');
        if (!view || !view.classList.contains('active')) return;
        if (!view.querySelector('.lineage')) return;
        initialized = true;
        initMap();
        initThread();
        initChapters();
        ScrollTrigger.refresh();
    }

    window.addEventListener('hashchange', function () {
        setTimeout(function () {
            tryInit();
            if (initialized && onTimelineRoute()) ScrollTrigger.refresh();
        }, 60);
    });

    var container = document.getElementById('timeline-container');
    if (container) {
        new MutationObserver(function () { tryInit(); }).observe(container, { childList: true });
    }
    tryInit();

    function teardown() {
        teardownFns.forEach(function (fn) { fn(); });
        teardownFns = [];
        initialized = false;
    }

    var onReduceChange = function (e) {
        if (e.matches) teardown();
    };
    if (typeof reduceMq.addEventListener === 'function') {
        reduceMq.addEventListener('change', onReduceChange);
    } else if (typeof reduceMq.addListener === 'function') {
        reduceMq.addListener(onReduceChange);
    }
})();
