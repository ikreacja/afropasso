/*
 * AfroPasso hero motion: GSAP entrance choreography + WebGL "living photo".
 * Progressive enhancement only. Without GSAP (CDN down), without WebGL, or with
 * prefers-reduced-motion the page stays exactly as rendered by styles.css.
 */
(function () {
    'use strict';

    var reduceMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduceMq.matches) return;
    if (typeof window.gsap === 'undefined') return;

    var gsap = window.gsap;
    var hero = document.querySelector('#home-view .hero');
    if (!hero) return;

    var kicker = hero.querySelector('.hero-kicker');
    var title = hero.querySelector('#hero-title');
    var subtitle = hero.querySelector('.hero-subtitle');
    var buttons = hero.querySelectorAll('.hero-actions > *');
    var onHome = !location.hash || location.hash === '#' || location.hash === '#/';

    var HERO_IMAGE = 'assets/hero/afropasso-hero-background.png';
    var ZOOM_START = 1.16;
    var ZOOM_REST = 1.05; /* permanent slight overscan: safety margin for displacement + parallax */

    var glState = {
        reveal: onHome ? 0 : 1,
        zoom: onHome ? ZOOM_START : ZOOM_REST,
        parallax: 0
    };

    /* ---------------------------------------------------------------- */
    /* Typographic entrance                                             */
    /* ---------------------------------------------------------------- */

    function splitTitleWords() {
        if (!title) return [];
        var text = title.textContent.trim().replace(/\s+/g, ' ');
        title.setAttribute('aria-label', text);
        var wrap = document.createElement('span');
        wrap.setAttribute('aria-hidden', 'true');
        var words = text.split(' ');
        words.forEach(function (word, i) {
            var w = document.createElement('span');
            w.className = 'hw';
            w.textContent = word;
            wrap.appendChild(w);
            if (i < words.length - 1) wrap.appendChild(document.createTextNode(' '));
        });
        title.textContent = '';
        title.appendChild(wrap);
        return wrap.querySelectorAll('.hw');
    }

    var words = [];
    if (onHome) {
        words = splitTitleWords();
        if (kicker) gsap.set(kicker, { opacity: 0, y: 18 });
        if (words.length) gsap.set(words, { opacity: 0, y: '0.85em', filter: 'blur(8px)' });
        if (subtitle) gsap.set(subtitle, { opacity: 0, y: 22 });
        if (buttons.length) gsap.set(buttons, { opacity: 0, y: 16 });
    }

    var entranceTl = null;

    function playEntrance(withReveal) {
        if (entranceTl || !onHome) {
            glState.reveal = 1;
            glState.zoom = ZOOM_REST;
            return;
        }
        entranceTl = gsap.timeline({ defaults: { ease: 'power4.out' } });
        if (withReveal) {
            entranceTl.to(glState, { reveal: 1, duration: 2.0, ease: 'power2.inOut' }, 0);
        } else {
            glState.reveal = 1;
        }
        entranceTl.to(glState, { zoom: ZOOM_REST, duration: 3.2, ease: 'power2.out' }, 0);
        if (kicker) {
            entranceTl.to(kicker, { opacity: 1, y: 0, duration: 0.7, clearProps: 'all' }, 0.35);
        }
        if (words.length) {
            entranceTl.to(words, {
                opacity: 1,
                y: 0,
                filter: 'blur(0px)',
                duration: 1.05,
                stagger: 0.085,
                clearProps: 'all'
            }, 0.5);
        }
        if (subtitle) {
            entranceTl.to(subtitle, { opacity: 1, y: 0, duration: 0.9, clearProps: 'all' }, '-=0.55');
        }
        if (buttons.length) {
            entranceTl.to(buttons, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, clearProps: 'all' }, '-=0.6');
        }
    }

    function showEverythingNow() {
        if (entranceTl) entranceTl.kill();
        var all = [kicker, subtitle].concat(Array.prototype.slice.call(buttons), Array.prototype.slice.call(words));
        gsap.set(all.filter(Boolean), { clearProps: 'all' });
        glState.reveal = 1;
        glState.zoom = ZOOM_REST;
    }

    /* ---------------------------------------------------------------- */
    /* WebGL living photo                                               */
    /* ---------------------------------------------------------------- */

    var VERT = [
        'attribute vec2 aPos;',
        'varying vec2 vUv;',
        'void main() {',
        '  vUv = aPos * 0.5 + 0.5;',
        '  gl_Position = vec4(aPos, 0.0, 1.0);',
        '}'
    ].join('\n');

    var FRAG = [
        'precision highp float;',
        'varying vec2 vUv;',
        'uniform sampler2D uTex;',
        'uniform vec2 uRes;',
        'uniform vec2 uTexRes;',
        'uniform vec2 uFocal;',
        'uniform vec2 uCenter;',
        'uniform vec2 uMouse;',
        'uniform float uTime;',
        'uniform float uReveal;',
        'uniform float uZoom;',
        'uniform float uPar;',
        'uniform float uEnergy;',
        '',
        'vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }',
        '',
        'float snoise(vec2 v) {',
        '  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);',
        '  vec2 i = floor(v + dot(v, C.yy));',
        '  vec2 x0 = v - i + dot(i, C.xx);',
        '  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);',
        '  vec4 x12 = x0.xyxy + C.xxzz;',
        '  x12.xy -= i1;',
        '  i = mod(i, 289.0);',
        '  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));',
        '  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);',
        '  m = m * m;',
        '  m = m * m;',
        '  vec3 x = 2.0 * fract(p * C.www) - 1.0;',
        '  vec3 h = abs(x) - 0.5;',
        '  vec3 ox = floor(x + 0.5);',
        '  vec3 a0 = x - ox;',
        '  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);',
        '  vec3 g;',
        '  g.x = a0.x * x0.x + h.x * x0.y;',
        '  g.yz = a0.yz * x12.xz + h.yz * x12.yw;',
        '  return 130.0 * dot(m, g);',
        '}',
        '',
        'void main() {',
        '  vec2 suv = vec2(vUv.x, 1.0 - vUv.y);',
        '  float ca = uRes.x / uRes.y;',
        '  float ta = uTexRes.x / uTexRes.y;',
        '  vec2 scale = ca > ta ? vec2(1.0, ta / ca) : vec2(ca / ta, 1.0);',
        '  vec2 offset = (1.0 - scale) * uFocal;',
        '  vec2 uv = offset + suv * scale;',
        '  vec2 c = offset + scale * 0.5;',
        '  uv = c + (uv - c) / uZoom;',
        '  uv.y += uPar * 0.028;',
        '',
        '  float t = uTime;',
        '  float n1 = snoise(uv * 3.4 + vec2(t * 0.05, t * 0.038));',
        '  float n2 = snoise(uv * 7.0 - vec2(t * 0.043, t * 0.06));',
        '  vec2 disp = vec2(n1, n2) * 0.0028;',
        '',
        '  vec2 d = suv - uMouse;',
        '  d.x *= ca;',
        '  float dist = length(d);',
        '  float wave = sin(dist * 30.0 - t * 3.6);',
        '  float fall = exp(-dist * dist * 16.0);',
        '  disp += normalize(d + 0.0001) * wave * fall * 0.0065 * uEnergy;',
        '',
        '  uv = clamp(uv + disp, 0.002, 0.998);',
        '  vec3 col = texture2D(uTex, uv).rgb;',
        '',
        '  vec2 rc = suv - uCenter;',
        '  rc.x *= ca;',
        '  float rd = length(rc);',
        '  float en = snoise(suv * 4.5 + 3.7) * 0.09;',
        '  float r = uReveal * 2.05 - 0.12;',
        '  float m = smoothstep(r - 0.24 + en, r + 0.02 + en, rd);',
        '  col = mix(col, vec3(0.978, 0.953, 0.902), m);',
        '  gl_FragColor = vec4(col, 1.0);',
        '}'
    ].join('\n');

    function focalX() {
        var w = window.innerWidth;
        if (w <= 720) return 0.62;
        if (w <= 980) return 0.58;
        return 1.0;
    }

    /* Where the dancing couple sits on screen: origin of the radial reveal. */
    function revealCenter() {
        var w = window.innerWidth;
        if (w <= 720) return [0.6, 0.45];
        if (w <= 980) return [0.58, 0.48];
        return [0.72, 0.45];
    }

    function createGL(img) {
        var canvas = document.createElement('canvas');
        canvas.className = 'hero-canvas';
        var gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'low-power' });
        if (!gl) return null;

        function compile(type, src) {
            var sh = gl.createShader(type);
            gl.shaderSource(sh, src);
            gl.compileShader(sh);
            if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) return null;
            return sh;
        }

        var vs = compile(gl.VERTEX_SHADER, VERT);
        var fs = compile(gl.FRAGMENT_SHADER, FRAG);
        if (!vs || !fs) return null;

        var prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
        gl.useProgram(prog);

        var buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);

        var u = {};
        ['uTex', 'uRes', 'uTexRes', 'uFocal', 'uCenter', 'uMouse', 'uTime', 'uReveal', 'uZoom', 'uPar', 'uEnergy']
            .forEach(function (name) { u[name] = gl.getUniformLocation(prog, name); });
        gl.uniform1i(u.uTex, 0);
        gl.uniform2f(u.uTexRes, img.naturalWidth, img.naturalHeight);

        return { canvas: canvas, gl: gl, u: u };
    }

    var ctx = null;
    var running = false;
    var rafId = 0;
    var lastT = 0;
    var time = 0;
    var heroVisible = true;
    var mouse = { x: 0.72, y: 0.5, sx: 0.72, sy: 0.5, energy: 0 };

    function resizeCanvas() {
        if (!ctx) return;
        var dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth <= 720 ? 1.5 : 1.75);
        var w = Math.max(1, Math.round(hero.clientWidth * dpr));
        var h = Math.max(1, Math.round(hero.clientHeight * dpr));
        if (ctx.canvas.width !== w || ctx.canvas.height !== h) {
            ctx.canvas.width = w;
            ctx.canvas.height = h;
            ctx.gl.viewport(0, 0, w, h);
        }
    }

    function frame(now) {
        if (!running || !ctx) return;
        rafId = requestAnimationFrame(frame);
        var dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
        lastT = now;
        time += dt;

        mouse.sx += (mouse.x - mouse.sx) * 0.09;
        mouse.sy += (mouse.y - mouse.sy) * 0.09;
        mouse.energy *= 0.955;

        var gl = ctx.gl;
        gl.uniform2f(ctx.u.uRes, ctx.canvas.width, ctx.canvas.height);
        gl.uniform2f(ctx.u.uFocal, focalX(), 0.5);
        var rc = revealCenter();
        gl.uniform2f(ctx.u.uCenter, rc[0], rc[1]);
        gl.uniform2f(ctx.u.uMouse, mouse.sx, mouse.sy);
        gl.uniform1f(ctx.u.uTime, time);
        gl.uniform1f(ctx.u.uReveal, glState.reveal);
        gl.uniform1f(ctx.u.uZoom, glState.zoom);
        gl.uniform1f(ctx.u.uPar, glState.parallax);
        gl.uniform1f(ctx.u.uEnergy, mouse.energy);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function updateRunning() {
        var shouldRun = !!ctx && heroVisible && !document.hidden;
        if (shouldRun && !running) {
            running = true;
            lastT = performance.now();
            rafId = requestAnimationFrame(frame);
        } else if (!shouldRun && running) {
            running = false;
            cancelAnimationFrame(rafId);
        }
    }

    function teardownGL() {
        if (!ctx) return;
        running = false;
        cancelAnimationFrame(rafId);
        if (ctx.canvas.parentNode) ctx.canvas.parentNode.removeChild(ctx.canvas);
        hero.classList.remove('hero--gl');
        ctx = null;
    }

    function startGL(img) {
        try {
            ctx = createGL(img);
        } catch (err) {
            ctx = null;
        }
        if (!ctx) return false;

        ctx.canvas.addEventListener('webglcontextlost', function (e) {
            e.preventDefault();
            teardownGL();
        });

        hero.insertBefore(ctx.canvas, hero.firstChild);
        hero.classList.add('hero--gl');
        resizeCanvas();

        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(resizeCanvas).observe(hero);
        } else {
            window.addEventListener('resize', resizeCanvas, { passive: true });
        }

        if (typeof IntersectionObserver !== 'undefined') {
            new IntersectionObserver(function (entries) {
                heroVisible = entries[0].isIntersecting;
                updateRunning();
            }).observe(hero);
        }
        document.addEventListener('visibilitychange', updateRunning);

        var lastMx = null;
        var lastMy = null;
        hero.addEventListener('pointermove', function (e) {
            var rect = hero.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            mouse.x = (e.clientX - rect.left) / rect.width;
            mouse.y = (e.clientY - rect.top) / rect.height;
            if (lastMx !== null) {
                var moved = Math.hypot(e.clientX - lastMx, e.clientY - lastMy);
                mouse.energy = Math.min(1.15, mouse.energy + Math.min(1, moved / 24) * 0.22);
            } else {
                mouse.sx = mouse.x;
                mouse.sy = mouse.y;
            }
            lastMx = e.clientX;
            lastMy = e.clientY;
        }, { passive: true });

        window.addEventListener('scroll', function () {
            var h = hero.offsetHeight || 1;
            glState.parallax = Math.max(0, Math.min(1, window.scrollY / h));
        }, { passive: true });

        updateRunning();
        return true;
    }

    /* Entrance waits briefly for the photo so the canvas reveal starts from
       paper, never covering an already-visible photo. The image is shared
       with the CSS background, so it is normally cached and instant. */
    var entranceStarted = false;
    var img = new Image();
    img.onload = function () {
        if (entranceStarted) {
            if (startGL(img)) {
                glState.reveal = 1;
                glState.zoom = ZOOM_REST;
            }
            return;
        }
        entranceStarted = true;
        playEntrance(startGL(img));
    };
    img.onerror = function () {
        if (!entranceStarted) {
            entranceStarted = true;
            playEntrance(false);
        }
    };
    img.src = HERO_IMAGE;
    setTimeout(function () {
        if (!entranceStarted) {
            entranceStarted = true;
            playEntrance(false);
        }
    }, 450);

    /* ---------------------------------------------------------------- */
    /* Gentle scroll reveals for the home sections                      */
    /* ---------------------------------------------------------------- */

    var revealIO = null;

    function setupReveals() {
        if (typeof IntersectionObserver === 'undefined') return;
        var groups = [
            {
                root: document.querySelector('#home-view .library-panel'),
                targets: function (el) {
                    return [el.querySelector('.section-heading')];
                }
            },
            {
                root: document.querySelector('#home-view .dance-pillars'),
                targets: function (el) {
                    return [el.firstElementChild]
                        .concat(Array.prototype.slice.call(el.querySelectorAll('.pillar-card')));
                }
            },
            {
                root: document.querySelector('#home-view .guide-panel'),
                targets: function (el) {
                    return [el.querySelector('.section-heading')]
                        .concat(Array.prototype.slice.call(el.querySelectorAll('.guide-grid > *')));
                }
            }
        ];
        var byRoot = new Map();
        revealIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                revealIO.unobserve(entry.target);
                var group = byRoot.get(entry.target);
                if (!group) return;
                var targets = group.targets(entry.target).filter(Boolean);
                if (!targets.length) return;
                gsap.from(targets, {
                    y: 26,
                    opacity: 0,
                    duration: 0.9,
                    ease: 'power3.out',
                    stagger: 0.07,
                    clearProps: 'transform,opacity'
                });
            });
        }, { rootMargin: '0px 0px -8%', threshold: 0.05 });
        groups.forEach(function (group) {
            if (!group.root) return;
            byRoot.set(group.root, group);
            revealIO.observe(group.root);
        });
    }

    setupReveals();

    /* Live switch to reduced motion: stop everything, restore static page. */
    var onReduceChange = function (e) {
        if (!e.matches) return;
        teardownGL();
        if (revealIO) revealIO.disconnect();
        showEverythingNow();
    };
    if (typeof reduceMq.addEventListener === 'function') {
        reduceMq.addEventListener('change', onReduceChange);
    } else if (typeof reduceMq.addListener === 'function') {
        reduceMq.addListener(onReduceChange);
    }
})();
