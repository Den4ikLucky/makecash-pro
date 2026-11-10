
(function () {
  'use strict';
  const rawId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const viewerUserId = Number.isSafeInteger(rawId) && rawId > 0 ? String(rawId) : 'DEMO';
  const nonceWords = crypto.getRandomValues(new Uint32Array(2));
  const sessionNonce = (BigInt(nonceWords[0]) << 32n) | BigInt(nonceWords[1]);
  const symbols = ['\u200B', '\u200C'];
  const watermarkText = `TG_ID: ${viewerUserId} · SESSION LOCKED (1/1 DEVICE) · CANARY ACTIVE`;
  let fallbackCopy = false;
  const privacyReasons = new Set();

  function checksum(text) {
    let value = 2166136261;
    for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    return value >>> 0;
  }
  function encode(value, length) {
    let output = '';
    for (let i = length - 1; i >= 0; i--) output += symbols[Number((value >> BigInt(i)) & 1n)];
    return output;
  }
  function crc8(value) {
    let crc = 0;
    for (let byte = 7; byte >= 0; byte--) {
      crc ^= Number((value >> BigInt(byte * 8)) & 255n);
      for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ ((crc & 128) ? 7 : 0)) & 255;
    }
    return crc;
  }
  function stripCanary(text) { return String(text).replace(/\u200B|\u200C|\u200D|\uFEFF/g, ''); }
  function marker() {
    const user = BigInt(viewerUserId === 'DEMO' ? 0 : viewerUserId);
    // R7 wire format: SOF + 64 user bits + CRC8/0x07 + EOF = 74 codepoints.
    return '\u200D' + encode(user, 64) + encode(BigInt(crc8(user)), 8) + '\uFEFF';
  }
  function decodeCanary(text) {
    const found = String(text).match(/\u200D[\u200B\u200C]{72}\uFEFF$/u)?.[0];
    if (!found) return null;
    const decode = value => [...value].reduce((result, char) => (result << 1n) | BigInt(symbols.indexOf(char)), 0n);
    const user = decode(found.slice(1, 65));
    if (decode(found.slice(65, 73)) !== BigInt(crc8(user))) return null;
    return { viewerUserId: String(user) };
  }
  function canaryText(text, jitterPrices = false) {
    let clean = stripCanary(text);
    if (jitterPrices) clean = clean.replace(/\$(\d+(?:\.\d+)?)(?![\d.,KMB])/gi, (full, number) => {
      const price = Number(number);
      if (!Number.isFinite(price) || price <= 0) return full;
      const direction = checksum(viewerUserId + String(sessionNonce) + number) % 2 ? 1 : -1;
      const decimals = Math.min(12, Math.max(6, (number.split('.')[1]?.length || 0) + 4));
      return '$' + (price * (1 + direction * 0.00002)).toFixed(decimals);
    });
    return clean + marker();
  }
  async function copyWithCanary(text, options = {}) {
    const tagged = canaryText(text, options.setup === true);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(tagged);
    } catch (clipboardError) {
      const area = document.createElement('textarea');
      area.value = tagged;
      area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      // A modal dialog is in the top layer: its clipboard fallback must live there too.
      const parent = document.querySelector('dialog[open]') || document.body;
      parent.append(area);
      fallbackCopy = true;
      try {
        area.select();
        if (!document.execCommand('copy')) throw clipboardError;
      } catch (error) {
        window.showToast?.('Копирование недоступно. Разрешите буфер обмена в браузере.', 'crimson');
        throw error;
      } finally { fallbackCopy = false; area.remove(); }
    }
    return tagged;
  }
  function privacy(reason, active) {
    if (active) privacyReasons.add(reason); else privacyReasons.delete(reason);
    const hidden = privacyReasons.size > 0;
    document.documentElement.classList.toggle('privacy-blurred', hidden);
    const curtain = document.getElementById('privacyCurtain');
    curtain.hidden = !hidden;
    if (hidden && !curtain.open) curtain.showModal();
    if (!hidden && curtain.open) curtain.close();
    // Native dialogs live above ordinary fixed elements. Hide their content too.
    document.querySelectorAll('.vip-dialog').forEach(dialog => { dialog.style.filter = hidden ? 'blur(16px)' : ''; dialog.inert = hidden; });
  }
  function resume() {
    if (document.hidden || !document.hasFocus()) return;
    privacyReasons.clear();
    privacy('manual', false);
  }

  let corpus = null;
  let loading = null;
  async function openMacroContext() {
    const drawer = document.getElementById('macroContextDrawer');
    if (!drawer.open) drawer.showModal();
    const status = document.getElementById('macroContextStatus');
    if (!corpus && !loading) {
      status.textContent = 'Загрузка архива…';
      loading = Promise.all(['news.json', 'kafedra_zashchita_nakoplenij.json', 'updates.json'].map(async name => {
        const response = await fetch(new URL('data/' + name, document.baseURI));
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })).then(([articles, lessons, updates]) => {
        for (const [rows, expected, field, body] of [[articles, 48, 'title', 'contentHtml'], [lessons, 14, 'heading', 'contentMarkdown'], [updates, 31, 'title', 'description']]) {
          if (!Array.isArray(rows) || rows.length !== expected || rows.some(row => !row || typeof row[field] !== 'string' || typeof row[body] !== 'string')) throw new Error('Неполный снимок источника');
        }
        corpus = { articles, lessons, updates };
      }).catch(() => { status.textContent = 'Архив недоступен. Закройте и откройте панель для повторной загрузки; данные не подменяются.'; }).finally(() => { loading = null; });
    }
    if (loading) await loading;
    if (corpus) renderMacroContext('articles');
  }
  function articleText(html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    parsed.querySelectorAll('script,style,iframe,form,nav').forEach(node => node.remove());
    const roots = [...parsed.querySelectorAll('.prose-content')];
    if (!roots.length) roots.push(parsed.querySelector('article') || parsed.body);
    return roots.map(prose => {
      const blocks = [...prose.querySelectorAll('h2,h3,h4,p,li,summary,figcaption')];
      return blocks.length ? blocks.map(node => node.textContent.trim()).filter(Boolean).join('\n\n') : prose.textContent.trim();
    }).join('\n\n');
  }
  function renderMacroContext(kind) {
    if (!corpus || !Object.prototype.hasOwnProperty.call(corpus, kind)) return;
    document.querySelectorAll('[data-macro-kind]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.macroKind === kind)));
    const list = document.getElementById('macroContextList');
    const reader = document.getElementById('macroContextReader');
    list.replaceChildren(); reader.replaceChildren();
    document.getElementById('macroContextStatus').textContent = `Материалов: ${corpus[kind].length}`;
    corpus[kind].forEach(row => {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'vip-control';
      button.textContent = row.title || row.heading;
      button.addEventListener('click', () => {
        const text = kind === 'articles' ? articleText(row.contentHtml) : kind === 'lessons' ? row.contentMarkdown : row.description;
        const title = document.createElement('h3'); title.textContent = row.title || row.heading;
        const content = document.createElement('div'); content.textContent = text;
        reader.replaceChildren(title, content);
        reader.scrollIntoView({ block: 'start' });
      });
      list.append(button);
    });
  }

  function initialize() {
    document.getElementById('privacyCurtain').addEventListener('cancel', event => { event.preventDefault(); resume(); });
    privacy('hidden', document.hidden);
    privacy('focus', !document.hasFocus());
    document.getElementById('antiLeakIdentity').textContent = `SIMULATOR · TG_ID: ${viewerUserId} · Session: ${String(sessionNonce).slice(-8)}`;
    document.getElementById('macroReaderLicense').textContent = `LICENSE TO: ${viewerUserId} · SESSION ${String(sessionNonce).slice(-8)} · SOURCE SNAPSHOT (RU)`;
    const decorateLevels = () => document.querySelectorAll('.step-target').forEach(level => {
      level.tabIndex = 0; level.setAttribute('role', 'button'); level.setAttribute('title', 'Копировать учебный уровень с canary-меткой и микросдвигом');
    });
    decorateLevels();
    new MutationObserver(decorateLevels).observe(document.getElementById('signalRadarSection'), { childList: true, subtree: true });
    const copyLevel = event => {
      const level = event.target.closest?.('.step-target');
      if (!level || (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault();
      void copyWithCanary(level.textContent, { setup: true }).then(() => window.showToast?.('Уровень скопирован с canary-меткой · только для обучения', 'cyan')).catch(() => {});
    };
    document.addEventListener('click', copyLevel);
    document.addEventListener('keydown', copyLevel);
    document.addEventListener('copy', event => {
      if (fallbackCopy || !event.clipboardData) return;
      const selection = window.getSelection();
      const anchor = selection?.anchorNode?.parentElement;
      if (!anchor?.closest('.signal-card, #chartModal, #macroContextDrawer, .positions-table')) return;
      event.preventDefault();
      event.clipboardData.setData('text/plain', canaryText(selection.toString(), !!anchor.closest('.step-target')));
    });
    document.getElementById('macroContextReader').addEventListener('contextmenu', event => event.preventDefault());
    document.addEventListener('visibilitychange', () => privacy('hidden', document.hidden));
    window.addEventListener('blur', () => privacy('focus', true));
    window.addEventListener('focus', () => privacy('focus', false));
    const screenshotKey = event => { if (event.key === 'PrintScreen') privacy('screenshot', true); };
    document.addEventListener('keydown', screenshotKey);
    document.addEventListener('keyup', screenshotKey);
    window.addEventListener('beforeprint', () => privacy('print', true));
    window.addEventListener('afterprint', () => privacy('print', false));

    const canvas = document.getElementById('antiLeakWatermark');
    const context = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    function draw(time = 0) {
      if (!context) return;
      const width = window.innerWidth, height = window.innerHeight, ratio = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0); context.clearRect(0, 0, width, height);
      context.save(); context.translate(width / 2 + Math.sin(time / 14000) * 24, height / 2 + Math.cos(time / 17000) * 24); context.rotate(-Math.PI / 7);
      context.font = '12px "JetBrains Mono", monospace'; context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-main').trim() || '#F8FAFC'; context.globalAlpha = 0.12;
      for (let y = -height; y < height; y += 160) for (let x = -width * 1.5; x < width * 1.5; x += 720) context.fillText('SIMULATOR · ' + watermarkText, x, y);
      context.restore();
    }
    function tick(time) { draw(time); if (!document.hidden && !reduced.matches) frame = requestAnimationFrame(tick); }
    function start() { cancelAnimationFrame(frame); if (!document.hidden) frame = requestAnimationFrame(reduced.matches ? () => draw(0) : tick); }
    window.addEventListener('resize', () => draw(reduced.matches ? 0 : performance.now()));
    document.addEventListener('visibilitychange', start);
    reduced.addEventListener('change', start);
    window.renderAntiLeakAtTime = draw;
    Promise.resolve(document.fonts?.ready).then(start);
  }
  window.copyWithCanary = copyWithCanary;
  window.openMacroContext = openMacroContext;
  window.renderMacroContext = renderMacroContext;
  window.VipShield = Object.freeze({ mode: 'SIMULATOR', viewerUserId, watermarkText, stripCanary, canaryText, decodeCanary, privacy, resume });
  document.addEventListener('DOMContentLoaded', initialize, { once: true });
})();
