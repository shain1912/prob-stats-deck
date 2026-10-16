/* 모션그래픽 그래프 모음 — 각 [data-viz] 요소가 슬라이드 진입 시 재생
   색은 전부 CSS 변수(--viz-*)에서 읽음 → 컨셉 전환 시 자동 반영 */
window.Viz = (() => {
  const A = typeof anime !== 'undefined';
  const NS = 'http://www.w3.org/2000/svg';
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const mods = {};

  // ---------- 공통 도우미 ----------
  function svgEl(tag, attrs = {}, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function ctx2d(cv) {
    const d = 2, w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== w * d || cv.height !== h * d) { cv.width = w * d; cv.height = h * d; }
    const c = cv.getContext('2d');
    c.setTransform(d, 0, 0, d, 0, 0);
    c.clearRect(0, 0, w, h);
    return { c, w, h };
  }
  const phi = (x, m = 0, s = 1) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  function binom(n, p) {
    const out = []; let lc = 0;
    for (let k = 0; k <= n; k++) {
      if (k > 0) lc += Math.log(n - k + 1) - Math.log(k);
      out.push(Math.exp(lc + k * Math.log(p) + (n - k) * Math.log(1 - p)));
    }
    return out;
  }
  function randn() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const fmt = (x, d = 3) => Number(x).toFixed(d);
  const font = (px, w = 500) => `${w} ${px}px Pretendard, "Malgun Gothic", sans-serif`;
  function drawDash(path, dur = 900, delay = 0) {
    const L = path.getTotalLength();
    path.style.strokeDasharray = L;
    path.style.strokeDashoffset = L;
    if (A) anime({ targets: path, strokeDashoffset: [L, 0], duration: dur, delay, easing: 'easeInOutSine' });
    else path.style.strokeDashoffset = 0;
  }
  function loop(st, fn) {
    cancelAnimationFrame(st.raf);
    let last = performance.now();
    const tick = now => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (fn(dt) !== false) st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
  }

  /* =========================================================
     S01 표지 — 이항 막대 위로 정규곡선 드로잉
     ========================================================= */
  mods.cover = {
    init(el) {
      const svg = svgEl('svg', { viewBox: '0 0 560 560', width: '100%', height: '100%' }, el);
      const n = 14, pmf = binom(n, 0.5), max = Math.max(...pmf);
      const x0 = 40, x1 = 520, base = 470, H = 330, bw = (x1 - x0) / (n + 1);
      el._bars = pmf.map((p, k) => {
        const h = p / max * H;
        const r = svgEl('rect', { x: x0 + k * bw + 3, y: base - h, width: bw - 6, height: h, rx: 4 }, svg);
        r.style.fill = 'var(--viz-1)'; r.style.opacity = .9;
        r.style.transformBox = 'fill-box'; r.style.transformOrigin = '50% 100%';
        return r;
      });
      const m = n / 2, s = Math.sqrt(n * .25), peak = phi(m, m, s);
      let d = '';
      for (let i = 0; i <= 200; i++) {
        const xv = -0.5 + (n + 1) * i / 200, px = x0 + (xv + .5) * bw;
        d += (i ? 'L' : 'M') + px.toFixed(1) + ',' + (base - phi(xv, m, s) / peak * H).toFixed(1);
      }
      el._curve = svgEl('path', { d, fill: 'none', 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
      el._curve.style.stroke = 'var(--viz-2)';
      const ax = svgEl('line', { x1: 20, x2: 540, y1: base + 2, y2: base + 2, 'stroke-width': 2 }, svg);
      ax.style.stroke = 'var(--viz-axis)';
    },
    enter(el) {
      if (A) anime({ targets: el._bars, scaleY: [0, 1], delay: anime.stagger(55), duration: 700, easing: 'easeOutBack' });
      drawDash(el._curve, 1400, 600);
    }
  };

  /* =========================================================
     S05 확률변수 — 표본공간 원소 → 실수 화살표
     ========================================================= */
  mods.mapping = {
    init(el) {
      el._svg = svgEl('svg', { class: 'arrows' }, el);
      const defs = svgEl('defs', {}, el._svg);
      const mk = svgEl('marker', { id: 'arrowhead', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      const tip = svgEl('path', { d: 'M0,0 L10,5 L0,10 z' }, mk);
      tip.style.fill = 'var(--accent)';
    },
    enter(el) {
      const svg = el._svg;
      svg.querySelectorAll('path.ar').forEach(p => p.remove());
      const off = (node) => { let x = 0, y = 0; while (node && node !== el) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent; } return { x, y }; };
      const paths = [];
      el.querySelectorAll('.chip').forEach(chip => {
        const target = el.querySelector(`.num[data-v="${chip.dataset.x}"]`);
        const a = off(chip), b = off(target);
        const sx = a.x + chip.offsetWidth + 6, sy = a.y + chip.offsetHeight / 2;
        const tx = b.x - 8, ty = b.y + target.offsetHeight / 2;
        const p = svgEl('path', { class: 'ar', d: `M${sx},${sy} C${sx + 80},${sy} ${tx - 80},${ty} ${tx},${ty}`, fill: 'none', 'stroke-width': 2.5, 'marker-end': 'url(#arrowhead)' }, svg);
        p.style.stroke = 'var(--accent)';
        paths.push(p);
      });
      paths.forEach((p, i) => drawDash(p, 650, 300 + i * 380));
      const bars = el.closest('.slide').querySelectorAll('.pbars div');
      bars.forEach(b => b.style.height = '0%');
      if (A) anime({ targets: bars, height: t => t.dataset.h + '%', delay: anime.stagger(160, { start: 300 + paths.length * 380 }), duration: 700, easing: 'easeOutCubic' });
      else bars.forEach(b => b.style.height = b.dataset.h + '%');
    }
  };

  /* =========================================================
     S06 갈톤 보드 — 공 낙하 → 이항분포 B(n, p)
     ========================================================= */
  mods.galton = {
    init(el) {
      const st = el._st = { n: 10, p: 0.5, balls: [], counts: [], N: 0, run: false, acc: 0, raf: 0 };
      const q = s => el.querySelector(s);
      st.cv = q('canvas');
      const pIn = q('input[name=p]'), pOut = q('output[name=p]');
      pIn.addEventListener('input', () => { st.p = +pIn.value; pOut.textContent = st.p.toFixed(2); this.reset(el); this.draw(el); });
      q('[data-act=play]').addEventListener('click', () => { st.run = !st.run; this.ui(el); if (st.run) this.start(el); });
      q('[data-act=reset]').addEventListener('click', () => { this.reset(el); this.draw(el); });
      q('[data-act=burst]').addEventListener('click', () => {
        for (let i = 0; i < 500; i++) { let k = 0; for (let r = 0; r < st.n; r++) if (Math.random() < st.p) k++; st.counts[k]++; st.N++; }
        this.draw(el); this.stats(el);
      });
      this.reset(el);
    },
    reset(el) {
      const st = el._st;
      st.balls = []; st.counts = new Array(st.n + 1).fill(0); st.N = 0;
      this.stats(el);
    },
    ui(el) { el.querySelector('[data-act=play]').textContent = el._st.run ? '일시정지' : '재생'; },
    stats(el) {
      const st = el._st, n = st.n, p = st.p;
      let s = 0, s2 = 0;
      st.counts.forEach((c, k) => { s += c * k; s2 += c * k * k; });
      const mean = st.N ? s / st.N : 0, vr = st.N ? s2 / st.N - mean * mean : 0;
      const set = (k, v) => { const e = el.querySelector(`[data-s=${k}]`); if (e) e.textContent = v; };
      set('N', st.N.toLocaleString());
      set('mean', st.N ? fmt(mean, 2) : '—');
      set('np', fmt(n * p, 2));
      set('var', st.N ? fmt(vr, 2) : '—');
      set('npq', fmt(n * p * (1 - p), 2));
    },
    geo(w) {
      return { cx: w / 2, top: 26, rowH: 21, gap: 42, binTop: 250, binBot: 420 };
    },
    start(el) {
      const st = el._st, self = this;
      loop(st, dt => {
        const { n } = st;
        if (st.run && st.N + st.balls.length < 3000) {
          st.acc += dt;
          while (st.acc > 0.06) {
            st.acc -= 0.06;
            const path = []; let k = 0;
            for (let r = 0; r < n; r++) { path.push(k); if (Math.random() < st.p) k++; }
            path.push(k);
            st.balls.push({ t: 0, path, k });
          }
        }
        st.balls.forEach(b => b.t += dt * 11);
        const done = st.balls.filter(b => b.t >= n + 1);
        done.forEach(b => { st.counts[b.k]++; st.N++; });
        if (done.length) { st.balls = st.balls.filter(b => b.t < n + 1); self.stats(el); }
        self.draw(el);
        if (!st.run && !st.balls.length) return false;
      });
    },
    draw(el) {
      const st = el._st, { c, w, h } = ctx2d(st.cv), n = st.n;
      const g = this.geo(w);
      const pegX = (r, i) => g.cx + (i - r / 2) * g.gap;
      // 못
      c.fillStyle = css('--viz-axis');
      for (let r = 0; r < n; r++) for (let i = 0; i <= r; i++) { c.beginPath(); c.arc(pegX(r, i), g.top + r * g.rowH, 3, 0, 7); c.fill(); }
      // 칸 막대 + 이론값
      const pmf = binom(n, st.p);
      const exp = pmf.map(p => p * st.N);
      const scaleMax = Math.max(1, ...st.counts, ...exp) * 1.08;
      const H = g.binBot - g.binTop;
      for (let k = 0; k <= n; k++) {
        const x = g.cx + (k - n / 2) * g.gap;
        const bh = st.counts[k] / scaleMax * H;
        c.fillStyle = css('--viz-1');
        c.beginPath();
        if (c.roundRect) c.roundRect(x - g.gap / 2 + 3, g.binBot - bh, g.gap - 6, bh, [4, 4, 0, 0]); else c.rect(x - g.gap / 2 + 3, g.binBot - bh, g.gap - 6, bh);
        c.fill();
        c.fillStyle = css('--viz-ink'); c.font = font(13); c.textAlign = 'center';
        c.fillText(k, x, g.binBot + 18);
      }
      if (st.N) {
        c.strokeStyle = css('--viz-2'); c.lineWidth = 2.5; c.setLineDash([]);
        c.beginPath();
        exp.forEach((e, k) => { const x = g.cx + (k - n / 2) * g.gap, y = g.binBot - e / scaleMax * H; k ? c.lineTo(x, y) : c.moveTo(x, y); });
        c.stroke();
        c.fillStyle = css('--viz-2');
        exp.forEach((e, k) => { const x = g.cx + (k - n / 2) * g.gap, y = g.binBot - e / scaleMax * H; c.beginPath(); c.arc(x, y, 4, 0, 7); c.fill(); });
      }
      c.strokeStyle = css('--viz-axis'); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(g.cx - (n / 2 + .5) * g.gap, g.binBot); c.lineTo(g.cx + (n / 2 + .5) * g.gap, g.binBot); c.stroke();
      // 공
      c.fillStyle = css('--viz-hi');
      st.balls.forEach(b => {
        const r = Math.min(Math.floor(b.t), n), f = b.t - r;
        const P = rr => rr < n ? [pegX(rr, b.path[rr]), g.top + rr * g.rowH - 8] : [g.cx + (b.k - n / 2) * g.gap, g.binTop - 6];
        const a = P(r), z = r < n ? P(r + 1) : [a[0], g.binBot - 6];
        const x = a[0] + (z[0] - a[0]) * f, y = a[1] + (z[1] - a[1]) * f - Math.sin(Math.PI * f) * (r < n ? 9 : 0);
        c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill();
      });
    },
    enter(el) { const st = el._st; this.reset(el); st.run = true; this.ui(el); this.start(el); },
    leave(el) { const st = el._st; st.run = false; st.balls = []; cancelAnimationFrame(st.raf); this.ui(el); },
    redraw(el) { this.draw(el); }
  };

  /* =========================================================
     S07 큰수의 법칙 — 주사위 1의 상대도수 → 1/6
     ========================================================= */
  mods.lln = {
    init(el) {
      const st = el._st = { cv: el.querySelector('canvas'), raf: 0, runs: [], N: 3000 };
      el.querySelector('[data-act=again]').addEventListener('click', () => this.enter(el));
    },
    enter(el) {
      const st = el._st;
      st.runs = [0, 1, 2].map(() => ({ n: 0, ones: 0, pts: [] }));
      loop(st, () => {
        const n = st.runs[0].n, step = Math.max(1, Math.floor(n * 0.02));
        st.runs.forEach(r => {
          for (let i = 0; i < step && r.n < st.N; i++) {
            r.n++; if (Math.random() < 1 / 6) r.ones++;
            r.pts.push([r.n, r.ones / r.n]);
          }
        });
        this.draw(el);
        const e = el.querySelector('[data-s=n]'); if (e) e.textContent = st.runs[0].n.toLocaleString();
        const f = el.querySelector('[data-s=f]'); if (f) f.textContent = fmt(st.runs[0].ones / Math.max(1, st.runs[0].n));
        return st.runs[0].n < st.N;
      });
    },
    leave(el) { cancelAnimationFrame(el._st.raf); },
    redraw(el) { this.draw(el); },
    draw(el) {
      const st = el._st, { c, w, h } = ctx2d(st.cv);
      const L = 52, R = w - 14, T = 12, B = h - 34, Y1 = 0.5;
      const X = n => L + Math.log10(n) / Math.log10(st.N) * (R - L);
      const Y = v => B - Math.min(v, Y1) / Y1 * (B - T);
      c.font = font(12); c.fillStyle = css('--viz-ink');
      c.strokeStyle = css('--viz-grid'); c.lineWidth = 1;
      [0, .1, .2, .3, .4, .5].forEach(v => { c.beginPath(); c.moveTo(L, Y(v)); c.lineTo(R, Y(v)); c.stroke(); c.textAlign = 'right'; c.fillText(v.toFixed(1), L - 8, Y(v) + 4); });
      [1, 10, 100, 1000, 3000].forEach(n => { c.textAlign = n === st.N ? 'right' : 'center'; c.fillText(n.toLocaleString(), X(n), B + 20); });
      // |X/n − 1/6| < 0.1 띠
      c.fillStyle = css('--viz-soft');
      c.fillRect(L, Y(1 / 6 + .1), R - L, Y(1 / 6 - .1) - Y(1 / 6 + .1));
      c.setLineDash([6, 5]); c.strokeStyle = css('--viz-2'); c.lineWidth = 2;
      c.beginPath(); c.moveTo(L, Y(1 / 6)); c.lineTo(R, Y(1 / 6)); c.stroke(); c.setLineDash([]);
      c.fillStyle = css('--viz-2'); c.textAlign = 'left'; c.font = font(13, 700);
      c.fillText('1/6 ≈ 0.167', L + 8, Y(1 / 6) - 8);
      c.save(); c.beginPath(); c.rect(L, T, R - L, B - T); c.clip();
      const al = [1, .55, .3];
      st.runs.forEach((r, i) => {
        c.globalAlpha = al[i]; c.strokeStyle = css('--viz-1'); c.lineWidth = 2;
        c.beginPath(); r.pts.forEach(([n, v], j) => j ? c.lineTo(X(n), Y(v)) : c.moveTo(X(n), Y(v))); c.stroke();
      });
      c.restore(); c.globalAlpha = 1;
      c.strokeStyle = css('--viz-axis'); c.beginPath(); c.moveTo(L, B); c.lineTo(R, B); c.stroke();
    }
  };

  /* =========================================================
     S08 정규분포 N(m, σ²) — 슬라이더 + 자동 재생
     ========================================================= */
  mods.normal = {
    init(el) {
      const st = el._st = { m: 0, s: 1, k: 1, tl: null };
      const svg = svgEl('svg', { viewBox: '0 0 740 340', width: '100%' }, el.querySelector('.plot'));
      const L = 30, R = 720, T = 16, B = 296, X0 = -6, X1 = 6, Y1 = 0.85;
      st.X = x => L + (x - X0) / (X1 - X0) * (R - L);
      st.Y = y => B - y / Y1 * (B - T);
      st.dom = [X0, X1];
      for (let x = -6; x <= 6; x++) {
        const t = svgEl('text', { x: st.X(x), y: B + 22, 'text-anchor': 'middle', 'font-size': 13 }, svg); t.textContent = x; t.style.fill = 'var(--viz-ink)';
        const g = svgEl('line', { x1: st.X(x), x2: st.X(x), y1: T, y2: B, 'stroke-width': 1 }, svg); g.style.stroke = 'var(--viz-grid)';
      }
      st.region = svgEl('path', {}, svg); st.region.style.fill = 'var(--viz-1)'; st.region.style.fillOpacity = .18;
      st.ghost = svgEl('path', { fill: 'none', 'stroke-width': 2, 'stroke-dasharray': '6 5' }, svg); st.ghost.style.stroke = 'var(--viz-axis)';
      st.curve = svgEl('path', { fill: 'none', 'stroke-width': 4, 'stroke-linejoin': 'round' }, svg); st.curve.style.stroke = 'var(--viz-1)';
      st.mline = svgEl('line', { 'stroke-width': 2, 'stroke-dasharray': '4 4' }, svg); st.mline.style.stroke = 'var(--viz-2)';
      st.mlab = svgEl('text', { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700 }, svg); st.mlab.style.fill = 'var(--viz-2)';
      st.pct = svgEl('text', { 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 800 }, svg); st.pct.style.fill = 'var(--viz-ink)';
      const ax = svgEl('line', { x1: L, x2: R, y1: B, y2: B, 'stroke-width': 1.5 }, svg); ax.style.stroke = 'var(--viz-axis)';
      st.ghost.setAttribute('d', this.path(st, 0, 1));
      const mIn = el.querySelector('input[name=m]'), sIn = el.querySelector('input[name=s]');
      st.inputs = { mIn, sIn };
      mIn.addEventListener('input', () => { this.stop(el); st.m = +mIn.value; this.update(el); });
      sIn.addEventListener('input', () => { this.stop(el); st.s = +sIn.value; this.update(el); });
      el.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { st.k = +b.dataset.k; this.update(el); }));
      el.querySelector('[data-act=demo]').addEventListener('click', () => this.demo(el));
      this.update(el);
    },
    path(st, m, s, a, b) {
      const lo = a ?? st.dom[0], hi = b ?? st.dom[1];
      let d = '';
      for (let i = 0; i <= 240; i++) { const x = lo + (hi - lo) * i / 240; d += (i ? 'L' : 'M') + st.X(x).toFixed(1) + ',' + st.Y(phi(x, m, s)).toFixed(1); }
      return d;
    },
    update(el) {
      const st = el._st, { m, s, k } = st;
      st.curve.setAttribute('d', this.path(st, m, s));
      const a = Math.max(st.dom[0], m - k * s), b = Math.min(st.dom[1], m + k * s);
      st.region.setAttribute('d', this.path(st, m, s, a, b) + `L${st.X(b)},${st.Y(0)}L${st.X(a)},${st.Y(0)}Z`);
      st.mline.setAttribute('x1', st.X(m)); st.mline.setAttribute('x2', st.X(m));
      st.mline.setAttribute('y1', st.Y(0)); st.mline.setAttribute('y2', st.Y(phi(m, m, s)) - 6);
      st.mlab.setAttribute('x', st.X(m)); st.mlab.setAttribute('y', st.Y(phi(m, m, s)) - 14); st.mlab.textContent = `m = ${m.toFixed(1)}`;
      st.pct.setAttribute('x', st.X(m)); st.pct.setAttribute('y', st.Y(phi(m, m, s) * 0.35));
      st.pct.textContent = { 1: '68.26%', 2: '95.44%', 3: '99.74%' }[k];
      st.inputs.mIn.value = m; st.inputs.sIn.value = s;
      el.querySelector('output[name=m]').textContent = m.toFixed(1);
      el.querySelector('output[name=s]').textContent = s.toFixed(2);
      el.querySelectorAll('[data-k]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.k === k)));
    },
    stop(el) { const st = el._st; if (st.tl) { st.tl.pause(); st.tl = null; } },
    demo(el) {
      const st = el._st; this.stop(el);
      if (!A) return;
      const upd = () => this.update(el);
      st.tl = anime.timeline({ targets: st, easing: 'easeInOutSine', duration: 1100, update: upd })
        .add({ m: 0, s: 1, duration: 500 })
        .add({ m: 2 })
        .add({ m: -2 })
        .add({ m: 0 })
        .add({ s: 1.8 })
        .add({ s: 0.6 })
        .add({ s: 1 });
    },
    enter(el) { const st = el._st; st.m = 0; st.s = 1; st.k = 1; this.update(el); drawDash(st.curve, 900); setTimeout(() => { st.curve.style.strokeDasharray = ''; this.demo(el); }, 950); },
    leave(el) { this.stop(el); }
  };

  /* =========================================================
     S09 표준화 — 곡선은 그대로, 눈금만 바뀜
     ========================================================= */
  mods.zscore = {
    init(el) {
      const svg = el._svg = svgEl('svg', { viewBox: '0 0 740 380', width: '100%' }, el.querySelector('.plot'));
      const L = 130, R = 720, T = 14, B = 210, Z0 = -3.6, Z1 = 3.6;
      const X = z => L + (z - Z0) / (Z1 - Z0) * (R - L), Y = y => B - y / 0.42 * (B - T);
      el._X = X;
      let d = '';
      for (let i = 0; i <= 200; i++) { const z = Z0 + (Z1 - Z0) * i / 200; d += (i ? 'L' : 'M') + X(z).toFixed(1) + ',' + Y(phi(z)).toFixed(1); }
      let ds = '';
      for (let i = 0; i <= 120; i++) { const z = -1 + 3 * i / 120; ds += (i ? 'L' : 'M') + X(z).toFixed(1) + ',' + Y(phi(z)).toFixed(1); }
      ds += `L${X(2)},${B}L${X(-1)},${B}Z`;
      const defs = svgEl('defs', {}, svg);
      const cp = svgEl('clipPath', { id: 'zclip' }, defs);
      el._clip = svgEl('rect', { x: X(-1), y: 0, width: 0, height: B + 2 }, cp);
      const sh = svgEl('path', { d: ds, 'clip-path': 'url(#zclip)' }, svg); sh.style.fill = 'var(--viz-1)'; sh.style.fillOpacity = .22;
      el._curve = svgEl('path', { d, fill: 'none', 'stroke-width': 4 }, svg); el._curve.style.stroke = 'var(--viz-1)';
      const ax = svgEl('line', { x1: L - 10, x2: R, y1: B, y2: B, 'stroke-width': 1.5 }, svg); ax.style.stroke = 'var(--viz-axis)';
      [-1, 2].forEach(z => { const g = svgEl('line', { x1: X(z), x2: X(z), y1: Y(phi(z)), y2: 372, 'stroke-width': 1.5, 'stroke-dasharray': '4 4' }, svg); g.style.stroke = 'var(--viz-hi)'; });
      const rows = [
        { y: 250, name: 'X', vals: [5, 20, 35, 50, 65, 80, 95], op: '' },
        { y: 305, name: 'X − 50', vals: [-45, -30, -15, 0, 15, 30, 45], op: '− 50' },
        { y: 360, name: 'Z', vals: [-3, -2, -1, 0, 1, 2, 3], op: '÷ 15' }
      ];
      el._rows = rows.map((r, ri) => {
        const g = svgEl('g', {}, svg);
        const ln = svgEl('line', { x1: X(-3.3), x2: X(3.3), y1: r.y, y2: r.y, 'stroke-width': 1.5 }, g); ln.style.stroke = 'var(--viz-axis)';
        const nm = svgEl('text', { x: 0, y: r.y + 5, 'font-size': 17, 'font-weight': 800 }, g); nm.textContent = r.name; nm.style.fill = 'var(--viz-ink)';
        if (r.op) { const op = svgEl('text', { x: 0, y: r.y - 22, 'font-size': 13, 'font-weight': 700 }, g); op.textContent = '↓ ' + r.op; op.style.fill = 'var(--viz-hi)'; }
        r.vals.forEach((v, i) => {
          const z = i - 3, hi = z === -1 || z === 2;
          const tk = svgEl('line', { x1: X(z), x2: X(z), y1: r.y - 5, y2: r.y + 5, 'stroke-width': 1.5 }, g); tk.style.stroke = 'var(--viz-axis)';
          const t = svgEl('text', { x: X(z), y: r.y - 10, 'text-anchor': 'middle', 'font-size': hi ? 17 : 14, 'font-weight': hi ? 800 : 500 }, g);
          t.textContent = v; t.style.fill = hi ? 'var(--viz-hi)' : 'var(--viz-ink)';
        });
        return g;
      });
      el.querySelector('[data-act=replay]').addEventListener('click', () => this.enter(el));
    },
    enter(el) {
      const X = el._X, prob = el.querySelector('[data-prob]'), brk = el.querySelector('[data-break]');
      el._rows.forEach(g => g.style.opacity = 0);
      el._clip.setAttribute('width', 0);
      prob.textContent = '0.0000'; brk.style.opacity = 0;
      drawDash(el._curve, 800);
      if (!A) { el._rows.forEach(g => g.style.opacity = 1); el._clip.setAttribute('width', X(2) - X(-1)); prob.textContent = '0.8185'; brk.style.opacity = 1; return; }
      const o = { p: 0 };
      anime.timeline({ easing: 'easeOutCubic' })
        .add({ targets: el._rows[0], opacity: [0, 1], translateY: [-10, 0], duration: 500, delay: 700 })
        .add({ targets: el._clip, width: [0, X(2) - X(-1)], duration: 900, easing: 'easeInOutSine' })
        .add({ targets: el._rows[1], opacity: [0, 1], translateY: [-30, 0], duration: 700, delay: 300 })
        .add({ targets: el._rows[2], opacity: [0, 1], translateY: [-30, 0], duration: 700, delay: 300 })
        .add({ targets: o, p: 0.8185, duration: 1100, easing: 'easeOutQuad', update: () => prob.textContent = o.p.toFixed(4) })
        .add({ targets: brk, opacity: [0, 1], duration: 400 });
    }
  };

  /* =========================================================
     S10 표본평균의 분포 — 치우친 모집단 → 종 모양
     모집단: 감마(k=2, θ=1) · 평균 2 · 표준편차 √2
     ========================================================= */
  mods.clt = {
    init(el) {
      const st = el._st = { cv: el.querySelector('canvas'), n: 5, means: [], bins: new Array(80).fill(0), anim: null, slow: 0, raf: 0 };
      el.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => { st.n = +b.dataset.n; this.enter(el); }));
    },
    draw1() { return -Math.log(Math.random()) - Math.log(Math.random()); },
    geo(w, h) { return { pL: 24, pR: 330, mL: 400, mR: w - 16, base: h - 40, top: 40, D: 8 }; },
    enter(el) {
      const st = el._st;
      st.means = []; st.bins.fill(0); st.anim = null; st.slow = 0;
      el.querySelectorAll('[data-n]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.n === st.n)));
      loop(st, dt => {
        if (st.slow < 3) {
          if (!st.anim) {
            const xs = Array.from({ length: st.n }, () => this.draw1());
            st.anim = { xs, t: 0, mean: xs.reduce((a, b) => a + b, 0) / xs.length };
          }
          st.anim.t += dt;
          if (st.anim.t > 1.55) { this.push(st, st.anim.mean); st.anim = null; st.slow++; }
        } else if (st.means.length < 3000) {
          for (let i = 0; i < 25; i++) { let s = 0; for (let j = 0; j < st.n; j++) s += this.draw1(); this.push(st, s / st.n); }
        }
        this.draw(el); this.stats(el);
        return st.means.length < 3000 || !!st.anim;
      });
    },
    push(st, m) { st.means.push(m); const b = Math.floor(m / 0.1); if (b >= 0 && b < 80) st.bins[b]++; },
    stats(el) {
      const st = el._st, k = st.means.length;
      const mu = k ? st.means.reduce((a, b) => a + b, 0) / k : 0;
      const sd = k > 1 ? Math.sqrt(st.means.reduce((a, b) => a + (b - mu) ** 2, 0) / (k - 1)) : 0;
      const set = (s, v) => { const e = el.querySelector(`[data-s=${s}]`); if (e) e.textContent = v; };
      set('k', k.toLocaleString()); set('mu', k ? fmt(mu, 2) : '—'); set('sd', k > 1 ? fmt(sd, 2) : '—'); set('th', fmt(Math.SQRT2 / Math.sqrt(st.n), 2));
    },
    leave(el) { cancelAnimationFrame(el._st.raf); },
    redraw(el) { this.draw(el); },
    draw(el) {
      const st = el._st, { c, w, h } = ctx2d(st.cv), g = this.geo(w, h);
      const PX = x => g.pL + x / g.D * (g.pR - g.pL), MX = x => g.mL + x / g.D * (g.mR - g.mL);
      const H = g.base - g.top;
      c.font = font(14, 700); c.fillStyle = css('--viz-ink'); c.textAlign = 'left';
      c.fillText('모집단 (치우친 분포)', g.pL, 20);
      c.fillText(`표본평균 X̄ 의 분포 (n = ${st.n})`, g.mL, 20);
      // 모집단 막대 (밀도 x·e^-x)
      c.fillStyle = css('--viz-axis'); c.globalAlpha = .55;
      for (let i = 0; i < 40; i++) {
        const x = (i + .5) * 0.2, d = x * Math.exp(-x), bh = d / 0.37 * H * 0.8;
        c.fillRect(PX(i * 0.2) + 1, g.base - bh, PX(0.2) - PX(0) - 2, bh);
      }
      c.globalAlpha = 1;
      // 축
      c.strokeStyle = css('--viz-axis'); c.lineWidth = 1.5;
      [[g.pL, g.pR], [g.mL, g.mR]].forEach(([a, b]) => { c.beginPath(); c.moveTo(a, g.base); c.lineTo(b, g.base); c.stroke(); });
      c.font = font(12); c.fillStyle = css('--viz-ink'); c.textAlign = 'center';
      for (let x = 0; x <= 8; x += 2) { c.fillText(x, PX(x), g.base + 18); c.fillText(x, MX(x), g.base + 18); }
      // m = 2 표시
      c.setLineDash([4, 4]); c.strokeStyle = css('--viz-2');
      [PX(2), MX(2)].forEach(x => { c.beginPath(); c.moveTo(x, g.top - 6); c.lineTo(x, g.base); c.stroke(); });
      c.setLineDash([]);
      // 표본평균 히스토그램
      const k = st.means.length, bw = 0.1, s = Math.SQRT2 / Math.sqrt(st.n);
      const peakExp = Math.max(k, 1) * bw * phi(2, 2, s);
      const scale = Math.max(peakExp, ...st.bins, 8) * 1.1;
      c.fillStyle = css('--viz-1');
      st.bins.forEach((v, i) => { if (!v) return; const bh = v / scale * H; c.fillRect(MX(i * bw) + .5, g.base - bh, MX(bw) - MX(0) - 1, bh); });
      if (k > 30) {
        c.strokeStyle = css('--viz-2'); c.lineWidth = 2.5; c.beginPath();
        for (let i = 0; i <= 200; i++) { const x = g.D * i / 200, y = k * bw * phi(x, 2, s); const px = MX(x), py = g.base - y / scale * H; i ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke();
      }
      // 느린 단계: 표본 n개 → 평균 → 오른쪽으로 이동
      if (st.anim) {
        const a = st.anim, t = a.t;
        c.fillStyle = css('--viz-hi');
        a.xs.forEach((x, i) => {
          const ti = Math.min(1, Math.max(0, (t - i * (0.5 / a.xs.length)) / 0.3));
          if (ti <= 0) return;
          const y = g.top + (g.base - 10 - g.top) * ti;
          c.globalAlpha = t > 0.9 ? Math.max(0, 1 - (t - 0.9) / 0.3) : 1;
          c.beginPath(); c.arc(PX(Math.min(x, g.D)), y, 5, 0, 7); c.fill();
        });
        c.globalAlpha = 1;
        if (t > 0.75) {
          const f = Math.min(1, Math.max(0, (t - 1.0) / 0.5)), e = f * f * (3 - 2 * f);
          const x = PX(a.mean) + (MX(a.mean) - PX(a.mean)) * e, y = g.base - 14 - Math.sin(Math.PI * e) * 90;
          c.fillStyle = css('--viz-2');
          c.beginPath(); c.moveTo(x, y - 9); c.lineTo(x + 9, y); c.lineTo(x, y + 9); c.lineTo(x - 9, y); c.closePath(); c.fill();
          c.font = font(13, 700); c.textAlign = 'center'; c.fillText('x̄ = ' + a.mean.toFixed(2), x, y - 14);
        }
      }
    }
  };

  /* =========================================================
     S11 신뢰구간 95% — 구간 낙하 · 빗나간 구간 강조
     m = 250, σ = 20, n = 25 → x̄ ± 1.96·20/√25 = x̄ ± 7.84
     ========================================================= */
  mods.ci = {
    init(el) {
      const st = el._st = { timers: [] };
      const svg = st.svg = svgEl('svg', { viewBox: '0 0 740 420', width: '100%' }, el.querySelector('.plot'));
      const L = 20, R = 720, B = 392, D0 = 228, D1 = 272;
      st.X = x => L + (x - D0) / (D1 - D0) * (R - L); st.B = B;
      for (let x = 230; x <= 270; x += 5) {
        const t = svgEl('text', { x: st.X(x), y: B + 22, 'text-anchor': 'middle', 'font-size': 13 }, svg); t.textContent = x; t.style.fill = 'var(--viz-ink)';
      }
      const ax = svgEl('line', { x1: L, x2: R, y1: B, y2: B, 'stroke-width': 1.5 }, svg); ax.style.stroke = 'var(--viz-axis)';
      const ml = svgEl('line', { x1: st.X(250), x2: st.X(250), y1: 0, y2: B, 'stroke-width': 2.5, 'stroke-dasharray': '6 5' }, svg); ml.style.stroke = 'var(--viz-2)';
      st.g = svgEl('g', {}, svg);
      el.querySelectorAll('[data-count]').forEach(b => b.addEventListener('click', () => this.run(el, +b.dataset.count)));
    },
    run(el, count) {
      const st = el._st, X = st.X, hw = 1.96 * 20 / 5;
      st.timers.forEach(clearTimeout); st.timers = [];
      st.g.innerHTML = '';
      el.querySelectorAll('[data-count]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.count === count)));
      let xs;
      do { xs = Array.from({ length: count }, () => 250 + 4 * randn()); } while (!xs.some(x => Math.abs(x - 250) > hw));
      const rowH = (st.B - 16) / count, lw = count > 40 ? 2 : 4;
      let hit = 0, shown = 0;
      const hitEl = el.querySelector('[data-s=hit]'), totEl = el.querySelector('[data-s=tot]');
      hitEl.textContent = 0; totEl.textContent = 0;
      xs.forEach((x, i) => {
        const y = 10 + i * rowH + rowH / 2, miss = Math.abs(x - 250) > hw;
        const gg = svgEl('g', {}, st.g); gg.style.opacity = 0;
        const ln = svgEl('line', { x1: X(x - hw), x2: X(x + hw), y1: y, y2: y, 'stroke-width': miss ? lw + 1 : lw, 'stroke-linecap': 'round' }, gg);
        ln.style.stroke = miss ? 'var(--viz-hi)' : 'var(--viz-ok)';
        const dot = svgEl('circle', { cx: X(x), cy: y, r: count > 40 ? 2 : 4 }, gg); dot.style.fill = miss ? 'var(--viz-hi)' : 'var(--viz-ok)';
        if (miss && count <= 40) { const t = svgEl('text', { x: X(x + hw) + 8, y: y + 4, 'font-size': 12, 'font-weight': 700 }, gg); t.textContent = '빗나감'; t.style.fill = 'var(--viz-hi)'; }
        st.timers.push(setTimeout(() => {
          if (A) anime({ targets: gg, opacity: [0, 1], translateY: [-14, 0], duration: 380, easing: 'easeOutCubic' }); else gg.style.opacity = 1;
          shown++; if (!miss) hit++;
          hitEl.textContent = hit; totEl.textContent = shown;
        }, 200 + i * (count > 40 ? 30 : 140)));
      });
    },
    enter(el) { this.run(el, 20); },
    leave(el) { el._st.timers.forEach(clearTimeout); }
  };

  /* =========================================================
     manim 클립 — 진입 시 처음부터 재생 (보이는 컨셉 영상만)
     ========================================================= */
  mods.video = {
    init(el) { el.querySelectorAll('video').forEach(v => { v.muted = true; v.playsInline = true; }); },
    enter(el) {
      el.querySelectorAll('video').forEach(v => {
        v.pause(); v.currentTime = 0;
        if (v.offsetParent !== null) v.play().catch(() => {});
      });
    },
    leave(el) { el.querySelectorAll('video').forEach(v => v.pause()); },
    redraw(el) { this.enter(el); }
  };

  // ---------- 레지스트리 ----------
  const each = (scope, fn) => scope.querySelectorAll('[data-viz]').forEach(el => { const m = mods[el.dataset.viz]; if (m) fn(m, el); });
  return {
    init: stage => each(stage, (m, el) => m.init && m.init(el)),
    enter: slide => each(slide, (m, el) => m.enter && m.enter(el)),
    leave: slide => each(slide, (m, el) => m.leave && m.leave(el)),
    redraw: slide => each(slide, (m, el) => m.redraw && m.redraw(el))
  };
})();
