/* 슬라이드 엔진 — ←→/Space 이동 · #N 링크 · N 노트 · T 컨셉 전환 · F 전체화면 */
(() => {
  const root = document.documentElement;
  const stage = document.querySelector('.stage');
  const slides = [...stage.querySelectorAll('.slide')];
  const foot = stage.querySelector('.foot');
  const notes = document.querySelector('.notes');
  const TITLE = stage.dataset.title || '';
  const hasAnime = typeof anime !== 'undefined';
  let cur = -1;

  // 컨셉: ?theme= → 저장값 → 기본(ppt)
  const qs = new URLSearchParams(location.search).get('theme');
  let saved = null;
  try { saved = localStorage.getItem('deck-concept'); } catch (e) {}
  setConcept(qs || saved || 'ppt', false);

  function setConcept(c, persist = true) {
    if (c !== 'ppt' && c !== 'discord') c = 'ppt';
    root.dataset.concept = c;
    if (persist) { try { localStorage.setItem('deck-concept', c); } catch (e) {} }
    document.querySelectorAll('[data-set-concept]').forEach(b =>
      b.setAttribute('aria-pressed', String(b.dataset.setConcept === c)));
    document.dispatchEvent(new CustomEvent('conceptchange'));
  }

  function fit() {
    const s = Math.min(innerWidth / 1280, innerHeight / 720);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  }

  function entrance(slide) {
    const items = slide.querySelectorAll('.anim');
    if (!hasAnime || !items.length) { items.forEach(el => el.style.opacity = 1); return; }
    anime.remove(items);
    anime({
      targets: items, opacity: [0, 1], translateY: [18, 0],
      delay: anime.stagger(70, { start: 80 }), duration: 520, easing: 'easeOutCubic'
    });
  }

  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    if (i === cur) return;
    if (cur >= 0) { slides[cur].classList.remove('active'); window.Viz && Viz.leave(slides[cur]); }
    cur = i;
    const s = slides[i];
    s.classList.add('active');
    const nn = String(i + 1).padStart(2, '0'), tt = String(slides.length).padStart(2, '0');
    foot.innerHTML = `<span>${TITLE}${s.dataset.part ? ' | ' + s.dataset.part : ''}</span><b>${nn} / ${tt}</b>`;
    notes.innerHTML = `<b>S${nn}</b>${s.dataset.notes || '—'}`;
    history.replaceState(null, '', location.pathname + location.search + '#' + (i + 1));
    entrance(s);
    window.Viz && Viz.enter(s);
  }

  function fromHash() {
    const n = parseInt(location.hash.slice(1), 10);
    return Number.isFinite(n) ? n - 1 : 0;
  }

  addEventListener('keydown', e => {
    if (e.target.closest('input, textarea, select')) return;
    const k = e.key;
    if (['ArrowRight', 'PageDown', ' '].includes(k)) { e.preventDefault(); go(cur + 1); }
    else if (['ArrowLeft', 'PageUp'].includes(k)) { e.preventDefault(); go(cur - 1); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(slides.length - 1);
    else if (k === 'n' || k === 'N') notes.hidden = !notes.hidden;
    else if (k === 't' || k === 'T') setConcept(root.dataset.concept === 'ppt' ? 'discord' : 'ppt');
    else if (k === 'f' || k === 'F') {
      if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
    }
  });
  addEventListener('resize', fit);
  // 발표 도구: 마우스 움직일 때만 2.5초 표시
  let hudTimer = 0;
  addEventListener('mousemove', () => {
    document.body.classList.add('show-hud');
    clearTimeout(hudTimer);
    hudTimer = setTimeout(() => document.body.classList.remove('show-hud'), 2500);
  });
  addEventListener('hashchange', () => go(fromHash()));
  document.querySelectorAll('[data-set-concept]').forEach(b =>
    b.addEventListener('click', () => setConcept(b.dataset.setConcept)));
  document.querySelector('[data-toggle-notes]')?.addEventListener('click', () => notes.hidden = !notes.hidden);
  document.querySelector('[data-prev]')?.addEventListener('click', () => go(cur - 1));
  document.querySelector('[data-next]')?.addEventListener('click', () => go(cur + 1));
  document.addEventListener('conceptchange', () => { if (cur >= 0 && window.Viz) Viz.redraw(slides[cur]); });

  // 수식
  if (window.renderMathInElement) {
    renderMathInElement(stage, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }], throwOnError: false });
  }

  fit();
  window.Viz && Viz.init(stage);
  go(fromHash());
})();
