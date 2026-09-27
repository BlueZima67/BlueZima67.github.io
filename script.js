document.documentElement.classList.add('js');

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fmt = (n, d = 0) => n.toLocaleString('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- nav ---------- */
const nav = $('[data-nav]');
const burger = $('[data-burger]');
const menu = $('[data-menu]');
const onScroll = () => nav.classList.toggle('is-solid', scrollY > 40 || !menu.hidden);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const setMenu = (open) => {
  menu.hidden = !open;
  nav.classList.toggle('is-menu-open', open);
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  document.body.style.overflow = open ? 'hidden' : '';
  onScroll();
};
burger.addEventListener('click', () => setMenu(menu.hidden));
$$('a', menu).forEach(a => a.addEventListener('click', () => setMenu(false)));
addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) setMenu(false); });

/* ---------- reveal + counters ---------- */
const countUp = (el) => {
  const target = parseFloat(el.dataset.count);
  const dec = +(el.dataset.decimals || 0);
  if (reduced || target === 0) { el.textContent = fmt(target, dec); return; }
  const t0 = performance.now(), dur = 1600;
  const tick = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 4);
    el.textContent = fmt(target * e, dec);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const io = new IntersectionObserver((entries) => {
  entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;
    target.classList.add('is-in');
    if (!target.closest('.gauge-sec')) {  /* счётчики спидометра стартуют вместе со стрелкой */
      $$('[data-count]', target).forEach(countUp);
      if (target.matches('[data-count]')) countUp(target);
    }
    io.unobserve(target);
  });
}, { threshold: .2, rootMargin: '0px 0px -8% 0px' });
$$('[data-reveal]').forEach((el, i) => { el.style.transitionDelay = `${(i % 3) * 70}ms`; io.observe(el); });

/* ---------- gauge ---------- */
const gauge = $('[data-gauge]');
if (gauge) {
  const g = $('[data-ticks]', gauge);
  const NS = 'http://www.w3.org/2000/svg';
  const total = 40, cx = 200, cy = 200;
  for (let i = 0; i <= total; i++) {
    const a = (-135 + (270 / total) * i) * Math.PI / 180;
    const major = i % 5 === 0;
    const r1 = 172, r2 = major ? 150 : 160;
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('x1', cx + r1 * Math.sin(a)); line.setAttribute('y1', cy - r1 * Math.cos(a));
    line.setAttribute('x2', cx + r2 * Math.sin(a)); line.setAttribute('y2', cy - r2 * Math.cos(a));
    if (major) line.classList.add('major');
    if (i >= 34) line.classList.add('red');
    g.appendChild(line);
    if (major) {
      const t = document.createElementNS(NS, 'text');
      t.setAttribute('x', cx + 130 * Math.sin(a)); t.setAttribute('y', cy - 130 * Math.cos(a));
      t.textContent = i / 5;
      g.appendChild(t);
    }
  }
  /* запуск, когда середина блока доходит до середины экрана — анимация видна целиком */
  const sec = gauge.closest('.gauge-sec');
  const start = () => {
    const r = sec.getBoundingClientRect();
    if (r.top + r.height / 2 > innerHeight / 2) return;
    removeEventListener('scroll', start);
    gauge.classList.add('is-on');
    $$('[data-count]', sec).forEach(countUp);
  };
  addEventListener('scroll', start, { passive: true });
  start();
}

/* ---------- scan: parallax + hotspots pinned to photo coords ---------- */
const scan = $('.scan');
const scanMedia = $('[data-scan-media]');
const scanImg = $('[data-scan-img]');
if (scan && scanImg) {
  // Переводит координаты на фото (0–1) в пиксели блока с учётом object-fit: cover и object-position
  const place = () => {
    const W = scanMedia.clientWidth, H = scanMedia.clientHeight;
    const iw = scanImg.naturalWidth || 2200, ih = scanImg.naturalHeight || 1228;
    const k = Math.max(W / iw, H / ih);
    const rw = iw * k, rh = ih * k;
    const ox = parseFloat(getComputedStyle(scanMedia).getPropertyValue('--ox')) / 100 || .5;
    const dx = (W - rw) * ox, dy = (H - rh) * .5;
    $$('.hotspot', scanMedia).forEach(h => {
      const x = dx + h.dataset.ix * rw, y = dy + h.dataset.iy * rh;
      h.style.setProperty('--x', `${x}px`);
      h.style.setProperty('--y', `${y}px`);
      h.classList.toggle('is-off', x < 12 || x > W - 12);
    });
  };
  scanImg.complete ? place() : scanImg.addEventListener('load', place);
  addEventListener('resize', place);
  place();

  if (!reduced) {
    const par = () => {
      const r = scan.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
      scanMedia.style.transform = `translate3d(0, ${p * 5}%, 0)`;
    };
    addEventListener('scroll', par, { passive: true }); par();
  }
}
$$('.hotspot').forEach(h => {
  const btn = $('button', h);
  btn.addEventListener('click', () => {
    const open = !h.classList.contains('is-open');
    $$('.hotspot').forEach(o => { o.classList.remove('is-open'); $('button', o).setAttribute('aria-expanded', 'false'); });
    h.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
});

/* ---------- process rail ---------- */
const steps = $('[data-steps]');
if (steps) {
  const rail = $('[data-rail]', steps);
  const items = $$('.step', steps);
  const upd = () => {
    const r = steps.getBoundingClientRect();
    const mid = innerHeight * .6;
    const p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
    rail.style.height = `${p * 100}%`;
    items.forEach(s => s.classList.toggle('is-lit', s.getBoundingClientRect().top < mid));
  };
  addEventListener('scroll', upd, { passive: true }); upd();
}

/* ---------- calculator ---------- */
const calc = $('[data-calc]');
if (calc) {
  const sumEl = $('[data-sum]', calc), timeEl = $('[data-time]', calc), cta = $('[data-calc-cta]', calc);
  let shown = 0;
  const run = () => {
    const k = parseFloat($('input[name=cls]:checked', calc).value);
    const picked = $$('.calc__svc input:checked', calc);
    const sum = Math.round(picked.reduce((s, i) => s + +i.value, 0) * k / 100) * 100;
    const hrs = picked.reduce((s, i) => s + +i.dataset.h, 0);
    cta.classList.toggle('is-disabled', !picked.length);
    timeEl.textContent = fmt(hrs, 1);
    const from = shown, t0 = performance.now();
    const anim = (t) => {
      const p = reduced ? 1 : Math.min(1, (t - t0) / 500);
      const e = 1 - Math.pow(1 - p, 3);
      sumEl.textContent = fmt(Math.round(from + (sum - from) * e));
      if (p < 1) requestAnimationFrame(anim); else shown = sum;
    };
    requestAnimationFrame(anim);
  };
  calc.addEventListener('change', run);
  run();
}

/* ---------- reviews drag ---------- */
const drag = $('[data-drag]');
if (drag) {
  let down = false, sx = 0, sl = 0, moved = false;
  drag.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = drag.scrollLeft; });
  addEventListener('pointermove', e => {
    if (!down) return;
    const dx = e.clientX - sx;
    if (Math.abs(dx) > 4) { moved = true; drag.classList.add('is-dragging'); }
    drag.scrollLeft = sl - dx;
  });
  addEventListener('pointerup', () => { down = false; drag.classList.remove('is-dragging'); });
  drag.addEventListener('click', e => { if (moved) e.preventDefault(); }, true);
}

/* ---------- phone mask + form ---------- */
const phone = $('[data-phone]');
const digits = v => v.replace(/\D/g, '').replace(/^[78]/, '').slice(0, 10);
phone.addEventListener('input', () => {
  const d = digits(phone.value);
  let out = '+7';
  if (d.length) out += ' ' + d.slice(0, 3);
  if (d.length > 3) out += ' ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  phone.value = d.length ? out : '';
  phone.closest('.field').classList.remove('is-error');
});

const form = $('[data-form]');
const consent = $('[data-consent]', form);
consent.addEventListener('change', () => {
  consent.closest('.consent').classList.toggle('is-error', !consent.checked && consent.hasAttribute('aria-invalid'));
  if (consent.checked) consent.removeAttribute('aria-invalid');
});
form.addEventListener('submit', e => {
  e.preventDefault();
  const field = phone.closest('.field');
  if (digits(phone.value).length !== 10) {
    field.classList.add('is-error');
    phone.setAttribute('aria-invalid', 'true');
    phone.focus();
    return;
  }
  phone.removeAttribute('aria-invalid');
  if (!consent.checked) {
    consent.closest('.consent').classList.add('is-error');
    consent.setAttribute('aria-invalid', 'true');
    consent.focus();
    return;
  }
  const btn = $('button[type=submit]', form);
  btn.classList.add('is-loading');
  btn.firstChild.textContent = 'Отправляем… ';
  setTimeout(() => {
    btn.classList.remove('is-loading');
    btn.firstChild.textContent = 'Отправить заявку ';
    $('.form__ok', form).hidden = false;
    form.reset();
  }, 900);
});

/* услуга из калькулятора → в форму */
$('[data-calc-cta]')?.addEventListener('click', () => {
  const first = $('.calc__svc input:checked + span');
  const sel = $('#f-svc');
  if (first) [...sel.options].forEach(o => { if (first.textContent.includes(o.text.split(' ')[0])) sel.value = o.text; });
});

/* карточка услуги → услуга в форме записи */
$$('.tile[data-svc]').forEach(t => t.addEventListener('click', () => { $('#f-svc').value = t.dataset.svc; }));
