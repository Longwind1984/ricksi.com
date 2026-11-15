let abort = null;

function setSelected(buttons, active) {
  buttons.forEach((button) => {
    const on = button === active;
    button.classList.toggle('is-on', on);
    button.setAttribute('aria-selected', on ? 'true' : 'false');
  });
}

function renderHero(mode) {
  const kicker = document.getElementById('tr-hero-kicker');
  const title = document.getElementById('tr-hero-title');
  const deck = document.getElementById('tr-hero-deck');
  const quote = document.getElementById('tr-hero-quote');
  const metrics = document.getElementById('tr-hero-metrics');
  if (!kicker || !title || !deck || !quote || !metrics) return;

  kicker.textContent = mode.kicker;
  title.textContent = mode.title;
  deck.textContent = mode.deck;
  quote.textContent = mode.quote;
  metrics.innerHTML = mode.metrics.map((metric) => `
    <div class="tr-meter">
      <div class="tr-meter-head">
        <span>${metric.k}</span>
        <span class="mono">${metric.v}</span>
      </div>
      <div class="tr-meter-bar"><span style="width:${metric.v}%"></span></div>
    </div>
  `).join('');
}

function renderMechanism(card) {
  const title = document.getElementById('tr-mech-title');
  const body = document.getElementById('tr-mech-body');
  const verdict = document.getElementById('tr-mech-verdict');
  const eyebrow = document.querySelector('#tr-mech-panel .tr-mini');
  if (!title || !body || !verdict || !eyebrow) return;

  eyebrow.textContent = card.eyebrow;
  title.textContent = card.title;
  body.textContent = card.body;
  verdict.textContent = card.verdict;
}

function renderAudit(moatBars, horizon) {
  const rows = document.querySelectorAll('[data-audit-row]');
  rows.forEach((row) => {
    const value = row.dataset[horizon];
    const fill = row.querySelector('.tr-audit-bar span');
    const label = row.querySelector('.tr-audit-bar em');
    if (!fill || !label || !value) return;
    fill.style.width = `${value}%`;
    label.textContent = value;
  });
}

function renderEconomics(mode) {
  const kicker = document.getElementById('tr-econ-kicker');
  const title = document.getElementById('tr-econ-title');
  const deck = document.getElementById('tr-econ-deck');
  const stats = document.getElementById('tr-econ-stats');
  if (!kicker || !title || !deck || !stats) return;

  kicker.textContent = mode.kicker;
  title.textContent = mode.title;
  deck.textContent = mode.deck;
  stats.innerHTML = mode.stats.map((stat) => `
    <div class="tr-stat">
      <span class="mono tr-stat-k">${stat.k}</span>
      <span class="tr-stat-v">${stat.v}</span>
    </div>
  `).join('');
}

function renderRisk(risk) {
  const title = document.getElementById('tr-risk-title');
  const detail = document.getElementById('tr-risk-detail');
  const mini = document.querySelector('#tr-risk-panel .tr-mini');
  if (!title || !detail || !mini) return;

  mini.textContent = `风险 ${risk.rank}`;
  title.textContent = risk.label;
  detail.textContent = risk.detail;
}

function initReveal(signal) {
  const reveals = document.querySelectorAll('.tr-reveal');
  if (!reveals.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const show = (element) => element.classList.add('tr-in');

  if (reduced) {
    reveals.forEach(show);
    return;
  }

  try {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        show(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.14 });
    reveals.forEach((element) => io.observe(element));
    signal.addEventListener('abort', () => io.disconnect(), { once: true });
    setTimeout(() => reveals.forEach(show), 1500);
  } catch {
    reveals.forEach(show);
  }
}

function initTraeSoloPage(signal) {
  const payload = document.getElementById('tr-data');
  if (!payload?.textContent) return;

  let data = null;
  try {
    data = JSON.parse(payload.textContent);
  } catch (error) {
    console.error('[trae-solo] invalid payload', error);
    return;
  }

  initReveal(signal);

  const heroButtons = [...document.querySelectorAll('[data-hero-tab]')];
  heroButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mode = data.heroModes.find((item) => item.id === button.dataset.heroTab);
      if (!mode) return;
      setSelected(heroButtons, button);
      renderHero(mode);
    }, { signal });
  });

  const mechButtons = [...document.querySelectorAll('[data-mech-tab]')];
  mechButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const card = data.mechanismCards.find((item) => item.id === button.dataset.mechTab);
      if (!card) return;
      setSelected(mechButtons, button);
      renderMechanism(card);
    }, { signal });
  });

  const horizonButtons = [...document.querySelectorAll('[data-horizon]')];
  horizonButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const horizon = button.dataset.horizon;
      if (!horizon) return;
      setSelected(horizonButtons, button);
      renderAudit(data.moatBars, horizon);
    }, { signal });
  });

  const econButtons = [...document.querySelectorAll('[data-econ-tab]')];
  econButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const mode = data.econModes.find((item) => item.id === button.dataset.econTab);
      if (!mode) return;
      setSelected(econButtons, button);
      renderEconomics(mode);
    }, { signal });
  });

  const riskButtons = [...document.querySelectorAll('[data-risk-tab]')];
  riskButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const risk = data.risks.find((item) => item.id === button.dataset.riskTab);
      if (!risk) return;
      setSelected(riskButtons, button);
      renderRisk(risk);
    }, { signal });
  });
}

document.addEventListener('astro:page-load', () => {
  abort?.abort();
  abort = new AbortController();
  initTraeSoloPage(abort.signal);
});
