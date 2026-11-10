
  // STATE — INSTITUTIONAL PRO V2 LEDGER (HYPERLIQUID / GMGN / CORNIX ARCHITECTURE)
  const INITIAL_CAPITAL_USD = 5000.00;
  let userBalance = 3500.00; // Free Cash (Свободный кэш после аллокации $1,500 в базовые демо-сделки)
  let realizedPnlTotal = 412.50; // Накопленный зафиксированный профит (Trade Journal)
  let autoTpSlEnabled = true; // Авто-фиксация TP1 (50% + Стоп в БУ) и TP2 (25%)
  let audioEnabled = true;
  let audioCtx = null;
  let currentStrategy = 'classic';
  let activeSwapCoin = { name: 'FARTCOIN', ticker: '$FART', chain: 'solana', price: 0.3420, ca: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump' };
  let currentChartCoin = { name: 'FARTCOIN', ticker: '$FART', price: 0.3420, change: '+28.4%' };
  let demoPositions = [
    {
      id: 1,
      token: '$FART (FARTCOIN)',
      chain: 'Solana',
      entry: 0.3150,
      current: 0.3420,
      initialAmountUsd: 500,
      amountUsd: 500,
      pnlUsd: 42.85,
      pnlPercent: 8.57,
      slPrice: 0.2678,
      tp1Price: 0.4725,
      tp2Price: 0.6300,
      tp3Price: 1.2600,
      tp1Hit: false,
      tp2Hit: false,
      breakevenLocked: false,
      entryAt: Date.now() - 42 * 60000,
      signalNo: 184,
      bridgeSource: 'GERMAN',
      jevAssessment: { model: 'jev-1.14.0', confidence: 0.96, choice: 'admit_vip_signal', requestId: 'demo-fart-184' }
    },
    {
      id: 2,
      token: '$VIRTUAL (Virtual)',
      chain: 'Base',
      entry: 1.5200,
      current: 1.8450,
      initialAmountUsd: 1000,
      amountUsd: 1000,
      pnlUsd: 213.80,
      pnlPercent: 21.38,
      slPrice: 1.2920,
      tp1Price: 2.2800,
      tp2Price: 3.0400,
      tp3Price: 6.0800,
      tp1Hit: false,
      tp2Hit: false,
      breakevenLocked: false,
      entryAt: Date.now() - 126 * 60000,
      signalNo: 183,
      bridgeSource: 'GERMAN',
      jevAssessment: { model: 'jev-1.14.0', confidence: 0.96, choice: 'admit_vip_signal', requestId: 'demo-virtual-183' }
    }
  ];
  let tradeJournal = [
    {
      id: 'fill-init-1',
      closedAt: Date.now() - 38 * 60000,
      token: '$AERO (Aerodrome)',
      signalNo: 182,
      source: 'MAKECASHTRADE',
      actionType: '🎯 TP1 (50% + SL→БУ)',
      entryPrice: 0.8400,
      exitPrice: 1.2950,
      closedUsd: 500.00,
      realizedPnlUsd: 270.83,
      realizedRoiPct: 54.17,
      stopStatus: '🛡️ Стоп в БУ ($0.8400)',
      jevAssessment: { model: 'jev-1.14.0', confidence: 0.99, choice: 'admit_vip_signal', requestId: 'jev-hist-aero-182' }
    },
    {
      id: 'fill-init-2',
      closedAt: Date.now() - 95 * 60000,
      token: '$SOL-CALL-210 (Deribit)',
      signalNo: 181,
      source: 'MAKECASHTRADE',
      actionType: '✅ Полный выход (TP2)',
      entryPrice: 14.2000,
      exitPrice: 22.2500,
      closedUsd: 250.00,
      realizedPnlUsd: 141.67,
      realizedRoiPct: 56.67,
      stopStatus: '✓ Закрыто в кэш',
      jevAssessment: { model: 'jev-1.14.0', confidence: 0.99, choice: 'admit_vip_signal', requestId: 'jev-hist-sol-181' }
    }
  ];

  // WEB AUDIO SYNTHESIZER FOR HAPTIC SOUND FX
  function initAudio() {
    if (!audioCtx) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContext();
      } catch (e) {
        console.warn('Web Audio not supported', e);
      }
    }
  }

  function playSound(type) {
    if (!audioEnabled) return;
    initAudio();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'copy') {
        // Crisp high-tech chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (type === 'buy') {
        // Cyber success power-up
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.start(now);
        osc.stop(now + 0.28);
      } else if (type === 'click') {
        // Subtle haptic tick
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
      }
    } catch (err) {
      console.warn('Audio play error:', err);
    }
  }

  function toggleAudio() {
    audioEnabled = !audioEnabled;
    const btn = document.getElementById('audioToggle');
    if (audioEnabled) {
      btn.classList.add('active');
      showToast('🔊 Звуковые эффекты включены', 'cyan');
      playSound('click');
    } else {
      btn.classList.remove('active');
      showToast('🔇 Звуковые эффекты выключены', 'gold');
    }
  }

  // TOAST SYSTEM
  function showToast(message, theme = 'emerald') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = '✓';
    let borderColor = 'var(--border-emerald)';
    if (theme === 'cyan') {
      icon = '⚡';
      borderColor = 'var(--border-cyan)';
    } else if (theme === 'gold') {
      icon = '💎';
      borderColor = 'var(--border-gold)';
    } else if (theme === 'red') {
      icon = '⚠️';
      borderColor = 'var(--border-crimson)';
    }

    toast.style.borderColor = borderColor;
    toast.innerHTML = `<span style="font-size:16px;">${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = 'opacity 0.3s, transform 0.3s';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 1800);
  }

  // 1-CLICK COPY CONTRACT ADDRESS (CA)
  function copyCA(elementId, btnElement) {
    playSound('copy');
    const caText = document.getElementById(elementId).innerText.trim();
    copyWithCanary(caText).then(() => {
      btnElement.classList.add('copied');
      const origHtml = btnElement.innerHTML;
      btnElement.innerHTML = `✓ Скопировано!`;
      showToast(`Контракт токена скопирован в буфер: ${caText.substring(0, 8)}...`, 'emerald');

      setTimeout(() => {
        btnElement.classList.remove('copied');
        btnElement.innerHTML = origHtml;
      }, 2000);
    }).catch(() => {});
  }

  // COPY FORMATTED TELEGRAM / X SIGNAL POST
  function copySignalPost(coinType) {
    playSound('copy');
    let postText = '';
    if (coinType === 'sol') {
      postText = `🚨 VIP DEX ALPHA SIGNAL #185 · SOLANA\n\n🪙 Токен: FARTCOIN ($FART)\n🔗 Сеть: Solana (Raydium / Pump.fun)\n📑 CA: 9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump\n\n🟢 ЗОНА ВХОДА: $0.3200 - $0.3500\n🎯 TP1 (+50%): $0.5130 (Забираем тело 50%)\n🎯 TP2 (+100% / 2X): $0.6840 (Фикс 25%)\n🚀 TP3 (+300% / 4X): $1.3680 (Moonbag 25%)\n🛑 Stop-Loss: $0.2900 (-15%)\n\n⚡ Купить в Photon: https://photon-sol.tiny/fart\n🤖 Telegram Bot: Trojan on Solana\n📊 Risk/Reward: 1:5.8 | Audit: 0/0 Tax, LP Locked`;
    } else if (coinType === 'base') {
      postText = `🚨 VIP DEX ALPHA SIGNAL #186 · BASE CHAIN\n\n🪙 Токен: VIRTUAL ($VIRTUAL)\n🔗 Сеть: Base (Aerodrome / Uniswap v3)\n📑 CA: 0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b\n\n🟢 ЗОНА ВХОДА: $1.7500 - $1.9000\n🎯 TP1 (+50%): $2.7670 (Возврат 50% вложений)\n🎯 TP2 (+100% / 2X): $3.6900 (Фикс 25% прибыли)\n🚀 TP3 (+300% / 4X): $7.3800 (Moonbag 25%)\n🛑 Stop-Loss: $1.5800 (-14%)\n\n🤖 Купить через Maestro / Telegram: /buy 0x0b3e... 0.5 ETH\n📊 Risk/Reward: 1:6.2 | Smart Inflow: +$840K`;
    } else if (coinType === 'eth') {
      postText = `🚨 VIP DEX ALPHA SIGNAL #187 · ETHEREUM WHALE FLOW\n\n🪙 Токен: SPX6900 ($SPX)\n🔗 Сеть: Ethereum Mainnet\n📑 CA: 0xE0f63A424a4439cBE457D80E4f4b51aD25b2c56C\n\n🟢 ЗОНА ВХОДА: $0.7200 - $0.8000\n🎯 TP1 (+50%): $1.1770 (Забираем тело)\n🎯 TP2 (+100% / 2X): $1.5700 (Фикс профита)\n🚀 TP3 (+300% / 4X): $3.1400 (Moonbag)\n🛑 Stop-Loss: $0.6500 (-15%)\n\n🤖 Бот Banana Gun / Uniswap V2/V3\n📊 Risk/Reward: 1:5.2 | Whale Flow: 42 Smart Wallets`;
    }

    copyWithCanary(postText, { setup: true }).then(() => {
      showToast('📤 Учебный сетап скопирован с canary-меткой и микросдвигом; не для исполнения.', 'gold');
    }).catch(() => {});
  }

  // ACCORDION TOGGLE
  function toggleWalkthrough(id, toggleHeader) {
    playSound('click');
    const el = document.getElementById(id);
    const arrow = toggleHeader.querySelector('.arrow');
    if (el.classList.contains('open')) {
      el.classList.remove('open');
      arrow.textContent = '▼';
    } else {
      el.classList.add('open');
      arrow.textContent = '▲';
    }
  }

  // FILTER SIGNALS
  function filterSignals(chain, btn) {
    playSound('click');
    if (btn) {
      const tabs = document.querySelectorAll('#filterTabs .tab-btn');
      tabs.forEach(t => t.classList.remove('active', 'active-cyan'));
      btn.classList.add('active');
    }

    const cards = document.querySelectorAll('.signal-card');
    cards.forEach(card => {
      const cardChain = (card.getAttribute('data-chain') || '').toLowerCase();
      const cardDesk = (card.getAttribute('data-desk') || '').toLowerCase();
      if (
        chain === 'all' ||
        cardChain === chain ||
        cardDesk === chain ||
        (chain === 'solana' && (cardChain === 'solana' || cardChain === 'robinhood' || cardDesk === 'dex'))
      ) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  }

  function scrollToSection(sectionId) {
    playSound('click');
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // TAKE PROFIT CALCULATOR
  function updateCalculator() {
    const deposit = parseFloat(document.getElementById('depositSlider').value);
    document.getElementById('displayDeposit').innerText = `$${deposit.toLocaleString()}`;

    let tp1Share = 0.50;
    let tp2Share = 0.25;
    let tp3Share = 0.25;

    if (currentStrategy === 'aggressive') {
      tp1Share = 0.30;
      tp2Share = 0.40;
      tp3Share = 0.30;
    } else if (currentStrategy === 'moonbag') {
      tp1Share = 0.30;
      tp2Share = 0.20;
      tp3Share = 0.50;
    }

    // TP Multipliers:
    // TP1 is +50% (1.5x)
    // TP2 is +100% (2.0x)
    // TP3 is +300% (4.0x)
    const tp1Return = (deposit * tp1Share) * 1.5;
    const tp2Return = (deposit * tp2Share) * 2.0;
    const tp3Return = (deposit * tp3Share) * 4.0;

    const totalReturn = tp1Return + tp2Return + tp3Return;
    const netProfit = totalReturn - deposit;
    const roi = (netProfit / deposit) * 100;

    document.getElementById('calcTP1').innerText = `$${tp1Return.toFixed(2)} (${(tp1Share * 100).toFixed(0)}% позиции)`;
    document.getElementById('calcTP2').innerText = `$${tp2Return.toFixed(2)} (${(tp2Share * 100).toFixed(0)}% позиции)`;
    document.getElementById('calcTP3').innerText = `$${tp3Return.toFixed(2)} (${(tp3Share * 100).toFixed(0)}% Moonbag)`;
    
    document.getElementById('calcTotalReturn').innerText = `$${totalReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('calcNetProfit').innerText = `+ $${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (+${roi.toFixed(0)}% Чистый ROI)`;

    // Check safe status
    if (tp1Return >= deposit) {
      document.getElementById('calcPrincipalSafe').innerText = `✓ 100% Тела ($${tp1Return.toFixed(0)}) Возвращено на TP1!`;
    } else {
      document.getElementById('calcPrincipalSafe').innerText = `✓ ${(tp1Return/deposit*100).toFixed(0)}% тела возвращено на TP1, остаток в профите`;
    }
  }

  function setCalcDeposit(amount) {
    playSound('click');
    document.getElementById('depositSlider').value = amount;
    const chips = document.querySelectorAll('.quick-amount-chips .amount-chip');
    chips.forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
    updateCalculator();
  }

  function setCalcStrategy(strat) {
    playSound('click');
    currentStrategy = strat;
    document.querySelectorAll('.strategy-pill').forEach(p => p.classList.remove('active'));
    document.getElementById(`strat-${strat}`).classList.add('active');

    const nameMap = {
      'classic': 'Классический VIP (50/25/25)',
      'aggressive': 'Агрессивный фикс (30/40/30)',
      'moonbag': 'Degen Moonbag (30/20/50)'
    };
    document.getElementById('strategyName').innerText = nameMap[strat];
    updateCalculator();
  }

  // MODAL HANDLERS
  function openSwapModal(coinName, ticker, chain, price, ca) {
    playSound('click');
    activeSwapCoin = { name: coinName, ticker, chain, price, ca };
    document.getElementById('swapModalCoinName').innerText = `${ticker} (${coinName})`;
    document.getElementById('modalUserBalance').innerText = `$${userBalance.toFixed(2)}`;
    document.getElementById('swapModalNetworkBadge').innerText = `${chain.toUpperCase()} Fast Route`;
    updateSwapEstimate();
    document.getElementById('swapModal').classList.add('open');
  }

  function openTgBotModal(coinName, ticker, botName, ca) {
    playSound('click');
    document.getElementById('tgBotModalName').innerText = `${botName} (${ticker})`;
    document.getElementById('tgBotCommandBox').innerText = `/buy ${ca} 0.5`;
    document.getElementById('tgBotModal').classList.add('open');
  }

  function openChartModal(coinName, ticker, price, change) {
    playSound('click');
    currentChartCoin = { name: coinName, ticker, price, change };
    document.getElementById('chartModalTitle').innerText = `${ticker} · $${price.toFixed(4)}`;
    document.getElementById('chartPriceChange').innerText = `${change} (5m Momentum Breakout)`;
    document.getElementById('chartModal').classList.add('open');
  }

  function openWalletModal() {
    playSound('click');
    document.getElementById('walletModalBalance').innerText = `$${userBalance.toFixed(2)}`;
    document.getElementById('walletModal').classList.add('open');
  }

  function closeModal(modalId) {
    playSound('click');
    document.getElementById(modalId).classList.remove('open');
  }

  // CLOSE ON BACKDROP CLICK
  window.onclick = function(event) {
    if (event.target.classList.contains('modal-overlay')) {
      event.target.classList.remove('open');
    }
  };

  // SWAP EXECUTION SIMULATION
  function updateSwapEstimate() {
    const usdAmount = parseFloat(document.getElementById('swapAmountInput').value) || 0;
    const tokens = (usdAmount / activeSwapCoin.price).toFixed(2);
    document.getElementById('swapReceiveAmount').innerText = `${tokens} ${activeSwapCoin.ticker}`;
  }

  function setSwapAmount(amt) {
    playSound('click');
    document.getElementById('swapAmountInput').value = amt;
    updateSwapEstimate();
  }

  function executeSimulatedSwap() {
    const usdAmount = parseFloat(document.getElementById('swapAmountInput').value) || 0;
    if (usdAmount <= 0) {
      showToast('Введите корректную сумму', 'red');
      return;
    }
    if (usdAmount > userBalance) {
      showToast('Недостаточно свободного кэша (Free Cash) в кошельке', 'red');
      return;
    }

    playSound('buy');
    userBalance -= usdAmount;

    const entryPx = activeSwapCoin.price;
    const newPos = {
      id: Date.now(),
      token: `${activeSwapCoin.ticker} (${activeSwapCoin.name})`,
      chain: normalizeChainLabel(activeSwapCoin.chain),
      entry: entryPx,
      current: entryPx,
      initialAmountUsd: usdAmount,
      amountUsd: usdAmount,
      pnlUsd: 0.00,
      pnlPercent: 0.00,
      slPrice: +(entryPx * 0.85).toFixed(6),
      tp1Price: +(entryPx * 1.50).toFixed(6),
      tp2Price: +(entryPx * 2.00).toFixed(6),
      tp3Price: +(entryPx * 4.00).toFixed(6),
      tp1Hit: false,
      tp2Hit: false,
      breakevenLocked: false,
      entryAt: Date.now(),
      signalNo: nextSignalNo(),
      bridgeSource: activeSwapCoin.source || 'VIP',
      jevAssessment: activeSwapCoin.jevAssessment || { model: 'jev-1.14.0', confidence: 0.96, choice: 'admit_vip_signal', requestId: 'demo-swap-' + Date.now() }
    };
    demoPositions.unshift(newPos);
    renderPositions();
    updateWalletDisplays();

    closeModal('swapModal');
    showToast(`🚀 Сделка открыта: ${activeSwapCoin.ticker} на $${usdAmount.toFixed(0)} (выставлены TP1/TP2/TP3 и SL)!`, 'emerald');
    scrollToSection('portfolioSection');
  }

  function copyTgCommand() {
    playSound('copy');
    const cmd = document.getElementById('tgBotCommandBox').innerText.trim();
    copyWithCanary(cmd).then(() => {
      showToast('🤖 Учебная команда скопирована с canary-меткой; очистите перед использованием.', 'cyan');
    }).catch(() => {});
  }

  function openTgBotDirect() {
    showToast('🚀 Переход в Telegram-бота (симуляция)', 'cyan');
  }

  // POSITIONS & PORTFOLIO LOGIC
  const pad2 = n => String(n).padStart(2, '0');
  function fmtDateTime(d) {
    return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}, ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }
  function fmtDuration(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return `${h} ч ${pad2(m)} мин`;
    if (m > 0) return `${m} мин ${pad2(s)} сек`;
    return `${s} сек`;
  }
  function fmtPrice(px) {
    const n = Number(px);
    if (!Number.isFinite(n)) return '—';
    if (n >= 100) return '$' + n.toFixed(2);
    if (n >= 1) return '$' + n.toFixed(4);
    return '$' + n.toFixed(5);
  }
  function updatePortfolioClock() {
    const clock = document.getElementById('portfolioClock');
    if (clock) clock.innerText = `🕒 ${fmtDateTime(new Date())}`;
  }
  setInterval(updatePortfolioClock, 1000);

  let signalCounter = 184;
  function nextSignalNo() {
    return ++signalCounter;
  }

  function toggleAutoTpSlEngine() {
    playSound('click');
    autoTpSlEnabled = !autoTpSlEnabled;
    const btn = document.getElementById('autoTpSlToggle');
    if (!btn) return;
    if (autoTpSlEnabled) {
      btn.classList.remove('is-paused');
      btn.innerText = '⚡ Авто-TP/SL + БУ: ВКЛ';
      showToast('⚡ Автоматическое исполнение TP1 (50% + Стоп в БУ) и TP2 включено!', 'emerald');
    } else {
      btn.classList.add('is-paused');
      btn.innerText = '⏸ Авто-TP/SL: ПАУЗА';
      showToast('⏸ Авто-исполнение TP/SL поставлено на паузу (ручной режим)', 'gold');
    }
  }

  // =========================================================================
  // VIP SIGNAL BRIDGE (signal_ingestion_engine.py -> vip_signal_bridge.py)
  // =========================================================================
  const BRIDGE_STATE_URLS = [
    'http://127.0.0.1:8787/vip_signals_state.json',
    'vip_signals_state.json'
  ];
  const bridgeIngestedIds = new Set();
  const renderedBridgeCardIds = new Set();
  let bridgePollingStarted = false;
  let bridgeActiveUrl = null;

  function setBridgeChip(state, signalCount, jevStatus) {
    const chip = document.getElementById('bridgeStatus');
    if (!chip) return;
    if (state === 'live') {
      chip.classList.remove('is-off');
      chip.classList.add('is-live');
      let jevBadge = 'Jev 1.14';
      if (jevStatus) {
        if (typeof jevStatus === 'string') {
          jevBadge = jevStatus.replace(/^jev-([0-9]+\.[0-9]+)(\..*)?$/i, 'Jev $1');
        } else if (jevStatus.model) {
          jevBadge = jevStatus.model.replace(/^jev-([0-9]+\.[0-9]+)(\..*)?$/i, 'Jev $1');
        }
      }
      chip.innerText = signalCount != null
        ? `🧭 ${jevBadge} + 🌉 VIP Bridge: live · ${signalCount} сигн.`
        : `🧭 ${jevBadge} + 🌉 VIP Bridge: live`;
      const modelFullName = (jevStatus && jevStatus.model) || (typeof jevStatus === 'string' ? jevStatus : 'jev-1.14.0');
      chip.title = `Jev System-1 (${modelFullName}) Verified · Локальный мост signal_ingestion_engine.py → vip_signal_bridge.py → симулятор (${signalCount || 0} сигн.)`;
    } else {
      chip.classList.remove('is-live');
      chip.classList.add('is-off');
      chip.innerText = '🌉 VIP Bridge: offline';
      chip.title = 'Локальный мост offline. Запустите ./run_monitor.sh в scripts/';
    }
  }

  function normalizeChainLabel(network) {
    const net = String(network || '').trim();
    const lower = net.toLowerCase();
    if (lower === 'solana' || lower === 'sol') return 'Solana';
    if (lower === 'base') return 'Base';
    if (lower === 'bsc' || lower === 'bnb' || lower.includes('binance smart chain')) return 'BSC';
    if (lower === 'ethereum' || lower === 'eth') return 'Ethereum';
    if (lower === 'arbitrum' || lower === 'arb' || lower.includes('arbitrum')) return 'Arbitrum';
    if (lower.includes('binance alpha') || lower.includes('binance-alpha') || lower.includes('binance_alpha') || lower === 'binance') return 'Binance Alpha';
    if (lower.includes('deribit') || lower.includes('options')) return 'Deribit Options';
    if (lower.includes('polymarket') || lower.includes('prediction')) return 'Polymarket';
    if (lower.includes('robinhood')) return 'Robinhood';
    if (lower.includes('hyperliquid')) return 'Hyperliquid';
    if (lower === 'sui') return 'Sui';
    return net || 'DEX';
  }

  function renderSourceBadge(source) {
    const s = String(source || '').trim().toUpperCase();
    if (!s) return '';
    if (s.includes('MAKECASHTRADE') || s.includes('2TOP')) {
      return `<span class="source-badge badge-makecashtrade" style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:0.3px;background:rgba(245,158,11,0.12);color:#FBBF24;border:1px solid rgba(245,158,11,0.3);margin-left:6px;" title="MakeCash Syndicate Desk (Smart-Filtered S/A-Tier)">SYNDICATE</span>`;
    }
    if (s.includes('GERMAN') || s.includes('BLOCKCHAIN')) {
      return `<span class="source-badge badge-german" style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:0.3px;background:rgba(16,185,129,0.12);color:#34D399;border:1px solid rgba(16,185,129,0.3);margin-left:6px;" title="MakeCash Early DEX Radar">DEX ALPHA</span>`;
    }
    if (s.includes('ANTIX') || s.includes('IKSY')) {
      return `<span class="source-badge badge-antix" style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:0.3px;background:rgba(56,189,248,0.12);color:#38BDF8;border:1px solid rgba(56,189,248,0.3);margin-left:6px;" title="MakeCash Perp & Liquidity Desk">PERP DESK</span>`;
    }
    if (s === 'VIP') {
      return `<span class="source-badge badge-vip" style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:0.3px;background:rgba(255,255,255,0.08);color:var(--text-sub);border:1px solid rgba(255,255,255,0.12);margin-left:6px;" title="Источник: VIP Desk">VIP</span>`;
    }
    return `<span class="source-badge" style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:0.3px;background:rgba(255,255,255,0.06);color:var(--text-sub);border:1px solid rgba(255,255,255,0.1);margin-left:6px;" title="Источник: ${source}">${source}</span>`;
  }

  function renderJevBadge(jevAssessment) {
    const jev = jevAssessment || {
      model: 'jev-1.14.0',
      confidence: 0.95,
      choice: 'admit_vip_signal',
      requestId: 'verified'
    };
    const conf = typeof jev.confidence === 'number' ? jev.confidence : 0.95;
    const title = `Jev System-1 (${jev.model}): ${jev.choice} · conf=${Math.round(conf * 100)}% · req=${jev.requestId || 'verified'}`;
    return `<span class="jev-badge" style="display:inline-flex;align-items:center;font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;letter-spacing:0.3px;background:linear-gradient(135deg, rgba(16,185,129,0.14), rgba(245,158,11,0.10));color:#34D399;border:1px solid rgba(245,158,11,0.45);box-shadow:0 0 6px rgba(16,185,129,0.15);margin-left:4px;" title="${title}">🧭 JEV ${Math.round(conf * 100)}%</span>`;
  }

  function getChainBadgeStyle(chain) {
    const c = String(chain || '').toLowerCase();
    if (c === 'solana') return 'background:rgba(153,69,255,0.12);color:#C084FC;border:1px solid rgba(153,69,255,0.3);';
    if (c === 'base') return 'background:rgba(0,82,255,0.12);color:#60A5FA;border:1px solid rgba(0,82,255,0.3);';
    if (c === 'ethereum') return 'background:rgba(98,126,234,0.12);color:#93C5FD;border:1px solid rgba(98,126,234,0.3);';
    if (c === 'arbitrum') return 'background:rgba(40,160,240,0.12);color:#38BDF8;border:1px solid rgba(40,160,240,0.3);';
    if (c === 'binance alpha') return 'background:rgba(245,158,11,0.12);color:#FBBF24;border:1px solid rgba(245,158,11,0.3);';
    if (c === 'deribit options') return 'background:rgba(168,85,247,0.12);color:#C084FC;border:1px solid rgba(168,85,247,0.3);';
    if (c === 'polymarket') return 'background:rgba(99,102,241,0.12);color:#818CF8;border:1px solid rgba(99,102,241,0.3);';
    if (c === 'robinhood') return 'background:rgba(0,230,118,0.12);color:#34D399;border:1px solid rgba(0,230,118,0.3);';
    if (c === 'hyperliquid') return 'background:rgba(0,240,255,0.12);color:#22D3EE;border:1px solid rgba(0,240,255,0.3);';
    if (c === 'bsc') return 'background:rgba(234,179,8,0.12);color:#FACC15;border:1px solid rgba(234,179,8,0.3);';
    return 'background:rgba(255,255,255,0.06);color:var(--text-sub);border:1px solid rgba(255,255,255,0.08);';
  }

  function formatDonorSubtitle(source) {
    if (!source) return '';
    const s = String(source).toUpperCase();
    if (s.includes('MAKECASHTRADE') || s.includes('2TOP')) return ' · Syndicate Desk';
    if (s.includes('GERMAN') || s.includes('BLOCKCHAIN')) return ' · Early DEX';
    if (s.includes('ANTIX') || s.includes('IKSY')) return ' · Perp Desk';
    if (s === 'VIP') return ' · VIP';
    return ' · ' + source;
  }

  // DYNAMIC BRIDGE SIGNAL CARDS IN TOP GRID
  function renderBridgeSignalCards(signals) {
    const container = document.getElementById('signalsContainer');
    if (!container || !Array.isArray(signals)) return;

    signals.forEach(sig => {
      if (!sig || !sig.id || renderedBridgeCardIds.has(sig.id)) return;
      renderedBridgeCardIds.add(sig.id);

      const ticker = sig.ticker || '$ALPHA';
      const name = sig.assetName || ticker.replace('$', '');
      const chainLabel = normalizeChainLabel(sig.network);
      const chainStyle = getChainBadgeStyle(chainLabel);
      const srcUpper = String(sig.source || '').toUpperCase();
      const deskKey = srcUpper.includes('MAKECASHTRADE') ? 'syndicate' : (srcUpper.includes('IKSY') || chainLabel.includes('Deribit') ? 'perp' : 'dex');
      const chainKey = chainLabel.toLowerCase().includes('base') ? 'base' : (chainLabel.toLowerCase().includes('solana') || chainLabel.toLowerCase().includes('robinhood') ? 'solana' : deskKey);

      const entryPx = Number(sig.entryPrice) || 1;
      const curPx = Number(sig.currentPrice) || entryPx;
      const slPx = Number(sig.invalidationSlUsd) || +(entryPx * 0.82).toFixed(5);
      const tp1Px = Number(sig.tp1PriceUsd) || +(entryPx * 1.50).toFixed(5);
      const tp2Px = Number(sig.tp2PriceUsd) || +(entryPx * 2.00).toFixed(5);
      const tp3Px = Number(sig.tp3PriceUsd) || +(entryPx * 4.00).toFixed(5);
      const changePct = (((curPx - entryPx) / entryPx) * 100).toFixed(1);
      const changeSign = Number(changePct) >= 0 ? '+' : '';
      const ca = sig.contractAddress || `SYNDICATE_${sig.signalNo || 189}_${ticker.replace('$', '')}`;
      const caElemId = `ca-bridge-${sig.id}`;

      const card = document.createElement('div');
      card.className = 'signal-card featured-sol';
      card.setAttribute('data-chain', chainKey);
      card.setAttribute('data-desk', deskKey);
      card.id = `card-bridge-${sig.id}`;

      card.innerHTML = `
        <div class="card-top">
          <div class="coin-profile">
            <div class="coin-avatar-wrap">⚡</div>
            <div class="coin-info">
              <h3 style="display:flex;align-items:center;flex-wrap:wrap;gap:4px;">
                <span>${name}</span>
                <span class="ticker">${ticker}</span>
                ${renderSourceBadge(sig.source)}
                ${renderJevBadge(sig.jevAssessment)}
              </h3>
              <span class="narrative-tag" style="${chainStyle}">${chainLabel} · Сигнал #${sig.signalNo || 'VIP'}</span>
            </div>
          </div>
          <div class="signal-status-pill status-active">
            <span class="pulse-dot"></span> LIVE BRIDGE
          </div>
        </div>

        <div class="metrics-bar">
          <div class="metric-item">
            <div class="metric-label">Вход (Entry)</div>
            <div class="price-value mono text-main">${fmtPrice(entryPx)}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Текущая (Mark)</div>
            <div class="metric-value mono text-cyan">${fmtPrice(curPx)}</div>
          </div>
          <div class="metric-item">
            <div class="metric-label">Динамика к входу</div>
            <div class="metric-value mono ${Number(changePct) >= 0 ? 'text-emerald' : 'text-crimson'}">${changeSign}${changePct}%</div>
          </div>
        </div>

        <div class="ca-box">
          <div class="ca-text-wrap">
            <div class="ca-label">Идентификатор / Контракт (${chainLabel})</div>
            <span class="ca-address mono" id="${caElemId}">${ca}</span>
          </div>
          <button class="btn-copy-ca" onclick="copyCA('${caElemId}', this)">Копировать</button>
        </div>

        <div class="ladder-section">
          <div class="ladder-header">
            <span>🎯 Лесенка Фиксации (Cornix / VIP 50/25/25)</span>
            <span class="text-emerald font-mono">Safety: ${sig.safetyScore || 92}/100</span>
          </div>
          <div class="ladder-step buy-zone">
            <span class="step-name text-cyan">🟢 Точка входа:</span>
            <span class="step-target">${fmtPrice(entryPx)}</span>
            <span class="step-action">АЛЛОКАЦИЯ $500</span>
          </div>
          <div class="ladder-step tp1">
            <span class="step-name text-emerald">🎯 TP1 (+50%):</span>
            <span class="step-target">${fmtPrice(tp1Px)}</span>
            <span class="step-action">Фикс 50% + Стоп в БУ</span>
          </div>
          <div class="ladder-step tp2">
            <span class="step-name text-gold">🎯 TP2 (+100%):</span>
            <span class="step-target">${fmtPrice(tp2Px)}</span>
            <span class="step-action">Фикс 25% объема</span>
          </div>
          <div class="ladder-step tp3">
            <span class="step-name text-purple">🚀 TP3 (Moonbag):</span>
            <span class="step-target">${fmtPrice(tp3Px)}</span>
            <span class="step-action">Остаток 25%</span>
          </div>
          <div class="ladder-step sl">
            <span class="step-name text-crimson">🛑 Stop-Loss:</span>
            <span class="step-target">${fmtPrice(slPx)}</span>
            <span class="step-action">Защита капитала</span>
          </div>
        </div>

        <div class="action-buttons-grid">
          <button class="btn-action btn-photon" onclick="openSwapModal('${name.replace(/'/g, '')}', '${ticker}', '${chainLabel}', ${curPx}, '${ca}')">
            🚀 Войти в сделку
          </button>
          <button class="btn-action btn-dexscreener" onclick="openChartModal('${name.replace(/'/g, '')}', '${ticker}', ${curPx}, '${changeSign}${changePct}%')">
            🔍 График и Поток
          </button>
        </div>
      `;
      container.insertBefore(card, container.firstChild);
    });

    const totalCards = document.querySelectorAll('#signalsContainer .signal-card').length;
    const countEl = document.getElementById('signalCountValue');
    if (countEl) countEl.innerText = totalCards;
  }

  function ingestBridgeSignals(signals) {
    let added = 0;
    renderBridgeSignalCards(signals);
    (signals || []).forEach(sig => {
      if (!sig || !sig.id || bridgeIngestedIds.has(sig.id)) return;
      if (typeof sig.entryPrice !== 'number' || !(sig.entryPrice > 0)) return;

      const ticker = sig.ticker || '$ALPHA';
      const network = normalizeChainLabel(sig.network);
      const entryAtMs = Number.isFinite(sig.entryAtMs)
        ? sig.entryAtMs
        : (sig.entryAt ? new Date(sig.entryAt).getTime() : Date.now());
      const currentPrice = typeof sig.currentPrice === 'number' && sig.currentPrice > 0
        ? sig.currentPrice
        : sig.entryPrice;
      const amountUsd = typeof sig.amountUsd === 'number' && sig.amountUsd > 0 ? sig.amountUsd : 500;
      const pnlPercent = ((currentPrice - sig.entryPrice) / sig.entryPrice) * 100;

      const slPrice = typeof sig.invalidationSlUsd === 'number' && sig.invalidationSlUsd > 0
        ? sig.invalidationSlUsd
        : +(sig.entryPrice * 0.82).toFixed(6);
      const tp1Price = typeof sig.tp1PriceUsd === 'number' && sig.tp1PriceUsd > 0
        ? sig.tp1PriceUsd
        : +(sig.entryPrice * 1.50).toFixed(6);
      const tp2Price = typeof sig.tp2PriceUsd === 'number' && sig.tp2PriceUsd > 0
        ? sig.tp2PriceUsd
        : +(sig.entryPrice * 2.00).toFixed(6);
      const tp3Price = typeof sig.tp3PriceUsd === 'number' && sig.tp3PriceUsd > 0
        ? sig.tp3PriceUsd
        : +(sig.entryPrice * 4.00).toFixed(6);

      const rawJev = sig.jevAssessment || sig.jev || null;
      const jevAssessment = {
        model: (rawJev && rawJev.model) || 'jev-1.14.0',
        confidence: (rawJev && typeof rawJev.confidence === 'number') ? rawJev.confidence : 0.95,
        choice: (rawJev && rawJev.choice) || 'admit_vip_signal',
        requestId: (rawJev && (rawJev.requestId || rawJev.reqId || rawJev.id)) || (sig.id ? `req_${sig.id}` : 'verified')
      };

      // Deduct funded margin from Free Cash when available (keeping realistic Free Cash reserve)
      if (userBalance >= amountUsd) {
        userBalance -= amountUsd;
      }

      demoPositions.unshift({
        id: 'vip-' + sig.id,
        token: `${ticker} (${sig.assetName || ticker.replace('$', '')})`,
        chain: network,
        entry: sig.entryPrice,
        current: currentPrice,
        initialAmountUsd: amountUsd,
        amountUsd: amountUsd,
        pnlUsd: amountUsd * pnlPercent / 100,
        pnlPercent: pnlPercent,
        slPrice: slPrice,
        tp1Price: tp1Price,
        tp2Price: tp2Price,
        tp3Price: tp3Price,
        tp1Hit: false,
        tp2Hit: false,
        breakevenLocked: false,
        entryAt: entryAtMs,
        signalNo: sig.signalNo != null ? sig.signalNo : nextSignalNo(),
        bridgeSource: sig.source || 'VIP',
        bridgeDirection: sig.direction || 'SPOT_BUY',
        jevAssessment: jevAssessment
      });
      bridgeIngestedIds.add(sig.id);
      if (typeof sig.signalNo === 'number' && sig.signalNo > signalCounter) {
        signalCounter = sig.signalNo;
      }
      added++;
    });
    if (added > 0) {
      renderPositions();
      updateWalletDisplays();
    }
    return added;
  }

  async function pollBridgeState() {
    for (const url of BRIDGE_STATE_URLS) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const state = await res.json();
        if (!state || !Array.isArray(state.signals)) continue;
        bridgeActiveUrl = url;
        const jevStatus = state.jevEngineStatus || state.jevStatus || state.jev || (state.signals && state.signals[0] && state.signals[0].jevAssessment) || { model: 'jev-1.14.0' };
        setBridgeChip('live', state.signals.length, jevStatus);
        const added = ingestBridgeSignals(state.signals);
        if (added > 0) {
          showToast(`🌉 VIP Bridge: загружено ${added} верифицированных сигналов Jev 1.14!`, 'cyan');
        }
        return;
      } catch (err) {
        // try next URL
      }
    }
    setBridgeChip('off');
  }

  function startBridgePolling() {
    if (bridgePollingStarted) return;
    bridgePollingStarted = true;
    pollBridgeState();
    setInterval(pollBridgeState, 5000);
  }

  // PARTIAL TAKE-PROFIT LADDER EXECUTION (TP1 50% + SL->BE, TP2 50% OF REMAINDER)
  function takePartialProfit(posId, stage, fraction = 0.50, isAuto = false) {
    const pos = demoPositions.find(p => String(p.id) === String(posId));
    if (!pos) return;
    if (stage === 'tp1' && pos.tp1Hit) return;
    if (stage === 'tp2' && pos.tp2Hit) return;

    playSound('buy');
    const closeRatio = Math.min(0.95, Math.max(0.10, Number(fraction) || 0.50));
    const closedMarginUsd = +(pos.amountUsd * closeRatio).toFixed(2);
    const realizedGainUsd = +(pos.pnlUsd * closeRatio).toFixed(2);
    const payoutUsd = +(closedMarginUsd + realizedGainUsd).toFixed(2);

    // Update Free Cash & Realized PnL
    userBalance = +(userBalance + payoutUsd).toFixed(2);
    realizedPnlTotal = +(realizedPnlTotal + realizedGainUsd).toFixed(2);

    // Reduce remaining position margin & unrealized PnL proportionally
    pos.amountUsd = Math.max(0, +(pos.amountUsd - closedMarginUsd).toFixed(2));
    pos.pnlUsd = +(pos.amountUsd * (pos.pnlPercent / 100)).toFixed(2);

    let actionLabel = '🎯 Частичная фиксация';
    let stopStatusText = `SL: ${fmtPrice(pos.slPrice)}`;
    if (stage === 'tp1') {
      pos.tp1Hit = true;
      pos.breakevenLocked = true;
      pos.slPrice = pos.entry; // Move Stop-Loss to Breakeven!
      actionLabel = isAuto ? '⚡ Авто-TP1 (50% + SL→БУ)' : '🎯 TP1 (50% + SL→БУ)';
      stopStatusText = `🛡️ Стоп в БУ (${fmtPrice(pos.entry)})`;
    } else if (stage === 'tp2') {
      pos.tp2Hit = true;
      pos.breakevenLocked = true;
      pos.slPrice = pos.tp1Price || pos.entry;
      actionLabel = isAuto ? '⚡ Авто-TP2 (Фикс 25%)' : '🎯 TP2 (Фикс 25% + SL→TP1)';
      stopStatusText = `🛡️ Стоп профит (${fmtPrice(pos.slPrice)})`;
    }

    tradeJournal.unshift({
      id: 'fill-' + Date.now() + '-' + Math.floor(Math.random() * 999),
      closedAt: Date.now(),
      token: pos.token,
      signalNo: pos.signalNo || 185,
      source: pos.bridgeSource || 'VIP',
      actionType: actionLabel,
      entryPrice: pos.entry,
      exitPrice: pos.current,
      closedUsd: closedMarginUsd,
      realizedPnlUsd: realizedGainUsd,
      realizedRoiPct: pos.pnlPercent,
      stopStatus: stopStatusText,
      jevAssessment: pos.jevAssessment
    });

    renderPositions();
    renderTradeJournal();
    updateWalletDisplays();

    const sign = realizedGainUsd >= 0 ? '+' : '';
    showToast(`${actionLabel}: ${pos.token} · в кэш возвращено $${payoutUsd.toFixed(2)} (${sign}$${realizedGainUsd.toFixed(2)})!`, 'emerald');
  }

  function renderPositions() {
    updatePortfolioClock();
    const now = Date.now();
    const tbody = document.getElementById('positionsTableBody');
    document.getElementById('openPosCount').innerText = demoPositions.length;

    if (demoPositions.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-state">Все активные позиции зафиксированы в кэш. Проверьте Журнал сделок ниже или откройте новую сделку!</td></tr>`;
      updateWalletDisplays();
      return;
    }

    let html = '';
    demoPositions.forEach(pos => {
      const pnlColor = pos.pnlUsd >= 0 ? 'text-emerald' : 'text-crimson';
      const pnlSign = pos.pnlUsd >= 0 ? '+' : '';
      const entryTs = pos.entryAt ? new Date(pos.entryAt) : null;
      const inTrade = entryTs ? fmtDuration(now - entryTs.getTime()) : '—';
      const sourceBadge = renderSourceBadge(pos.bridgeSource);
      const jevBadge = renderJevBadge(pos.jevAssessment);
      const donorSub = formatDonorSubtitle(pos.bridgeSource);
      const chainStyle = getChainBadgeStyle(pos.chain);

      const slPx = pos.slPrice || +(pos.entry * 0.85).toFixed(5);
      const tp1Px = pos.tp1Price || +(pos.entry * 1.50).toFixed(5);
      const tp2Px = pos.tp2Price || +(pos.entry * 2.00).toFixed(5);
      const tp3Px = pos.tp3Price || +(pos.entry * 4.00).toFixed(5);

      // Compute progress toward TP2/TP3
      const targetSpan = Math.max(0.000001, tp2Px - pos.entry);
      const rawProgress = ((pos.current - pos.entry) / targetSpan) * 100;
      const progressPct = Math.max(6, Math.min(100, Math.round(rawProgress)));

      const slPill = pos.breakevenLocked
        ? `<span class="ladder-mini-pill be-lock" title="Стоп-лосс переведён в безубыток после TP1">🛡️ SL в БУ: ${fmtPrice(slPx)}</span>`
        : `<span class="ladder-mini-pill">🛑 SL: ${fmtPrice(slPx)}</span>`;
      const tp1Pill = `<span class="ladder-mini-pill ${pos.tp1Hit || pos.current >= tp1Px ? 'hit' : ''}">TP1: ${fmtPrice(tp1Px)}${pos.tp1Hit ? ' ✓' : ''}</span>`;
      const tp2Pill = `<span class="ladder-mini-pill ${pos.tp2Hit || pos.current >= tp2Px ? 'hit' : ''}">TP2: ${fmtPrice(tp2Px)}${pos.tp2Hit ? ' ✓' : ''}</span>`;

      const initUsd = pos.initialAmountUsd || pos.amountUsd;
      const remPct = Math.round((pos.amountUsd / Math.max(1, initUsd)) * 100);

      html += `
        <tr>
          <td>
            <div style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px;">
              <strong class="text-main">${pos.token}</strong>
              ${sourceBadge}
              ${jevBadge}
            </div>
          </td>
          <td><span class="narrative-tag" style="${chainStyle}">${pos.chain}</span></td>
          <td>
            <div class="mono" style="font-weight:700;">Вход: ${fmtPrice(pos.entry)}</div>
            <div class="pos-ladder-wrap">
              <div class="pos-ladder-bar"><div class="pos-ladder-fill" style="width:${progressPct}%;"></div></div>
              <div class="pos-ladder-pills">
                ${slPill}
                ${tp1Pill}
                ${tp2Pill}
              </div>
            </div>
          </td>
          <td class="ts-cell">
            <div class="ts-main">${entryTs ? fmtDateTime(entryTs) : '—'}</div>
            <div class="ts-sub">Сигнал #${pos.signalNo ?? '—'}${donorSub}</div>
          </td>
          <td class="mono text-cyan">${fmtPrice(pos.current)}</td>
          <td class="ts-cell">
            <div class="ts-main">${fmtDateTime(new Date(now))}</div>
            <div class="ts-sub">В сделке: <span class="text-emerald">${inTrade}</span></div>
          </td>
          <td class="mono">
            <div><strong>$${pos.amountUsd.toFixed(2)}</strong></div>
            <div style="font-size:10.5px;color:var(--text-muted);">${remPct}% от $${initUsd.toFixed(0)}</div>
          </td>
          <td class="mono ${pnlColor} font-bold">${pnlSign}$${pos.pnlUsd.toFixed(2)} (${pnlSign}${pos.pnlPercent.toFixed(1)}%)</td>
          <td>
            <div class="pos-actions-stack">
              <button class="btn-pos-step tp1-btn" ${pos.tp1Hit ? 'disabled' : ''} onclick="takePartialProfit('${pos.id}', 'tp1', 0.50, false)" title="Зафиксировать 50% позиции в кэш и перенести Stop-Loss в безубыток">
                ${pos.tp1Hit ? '✓ TP1+БУ' : '🎯 TP1+БУ'}
              </button>
              <button class="btn-pos-step tp2-btn" ${pos.tp2Hit ? 'disabled' : ''} onclick="takePartialProfit('${pos.id}', 'tp2', 0.50, false)" title="Зафиксировать половину остатка на TP2 и подтянуть стоп">
                ${pos.tp2Hit ? '✓ TP2' : '🎯 TP2'}
              </button>
              <button class="btn-pos-step close-btn" onclick="closePosition('${pos.id}')" title="Полностью закрыть оставшуюся позицию по текущей цене">
                ✕ Выход
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
    updateWalletDisplays();
  }

  function renderTradeJournal() {
    const tbody = document.getElementById('tradeJournalBody');
    if (!tbody) return;
    const countEl = document.getElementById('journalCountBadge');
    if (countEl) countEl.innerText = tradeJournal.length;
    const totalEl = document.getElementById('journalRealizedTotal');
    if (totalEl) {
      const s = realizedPnlTotal >= 0 ? '+' : '';
      totalEl.innerText = `${s}$${realizedPnlTotal.toFixed(2)}`;
    }

    if (tradeJournal.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state" id="journalEmptyState">Пока нет закрытий. Частичные фиксации TP1/TP2 и полные выходы появятся здесь.</td></tr>`;
      return;
    }

    let html = '';
    tradeJournal.slice(0, 15).forEach(item => {
      const ts = item.closedAt ? fmtDateTime(new Date(item.closedAt)) : '—';
      const pnlColor = item.realizedPnlUsd >= 0 ? 'text-emerald' : 'text-crimson';
      const pnlSign = item.realizedPnlUsd >= 0 ? '+' : '';
      html += `
        <tr>
          <td class="mono" style="font-size:11.5px;color:var(--text-sub);">${ts}</td>
          <td>
            <div style="display:inline-flex;align-items:center;flex-wrap:wrap;gap:4px;">
              <strong class="text-main">${item.token}</strong>
              ${renderSourceBadge(item.source)}
              ${renderJevBadge(item.jevAssessment)}
            </div>
          </td>
          <td><span class="ladder-mini-pill hit">${item.actionType}</span></td>
          <td class="mono">${fmtPrice(item.entryPrice)} → <strong class="text-cyan">${fmtPrice(item.exitPrice)}</strong></td>
          <td class="mono">$${Number(item.closedUsd || 0).toFixed(2)}</td>
          <td class="mono ${pnlColor} font-bold">${pnlSign}$${Number(item.realizedPnlUsd || 0).toFixed(2)} (${pnlSign}${Number(item.realizedRoiPct || 0).toFixed(1)}%)</td>
          <td><span class="ladder-mini-pill be-lock">${item.stopStatus || '✓ Исполнено'}</span></td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  }

  function closePosition(posId) {
    playSound('buy');
    const posIndex = demoPositions.findIndex(p => String(p.id) === String(posId));
    if (posIndex > -1) {
      const pos = demoPositions[posIndex];
      const returnAmount = +(pos.amountUsd + pos.pnlUsd).toFixed(2);
      userBalance = +(userBalance + returnAmount).toFixed(2);
      realizedPnlTotal = +(realizedPnlTotal + pos.pnlUsd).toFixed(2);

      tradeJournal.unshift({
        id: 'fill-close-' + Date.now(),
        closedAt: Date.now(),
        token: pos.token,
        signalNo: pos.signalNo || 185,
        source: pos.bridgeSource || 'VIP',
        actionType: '✅ Полный выход (100%)',
        entryPrice: pos.entry,
        exitPrice: pos.current,
        closedUsd: pos.amountUsd,
        realizedPnlUsd: pos.pnlUsd,
        realizedRoiPct: pos.pnlPercent,
        stopStatus: '✓ Позиция полностью закрыта',
        jevAssessment: pos.jevAssessment
      });

      demoPositions.splice(posIndex, 1);
      renderPositions();
      renderTradeJournal();
      updateWalletDisplays();
      showToast(`🎯 Позиция ${pos.token} полностью закрыта! В свободный кэш зачислено $${returnAmount.toFixed(2)}`, 'emerald');
    }
  }

  function addRandomDemoPosition() {
    playSound('click');
    const randomGems = [
      { token: '$FART (FARTCOIN)', chain: 'Solana', price: 0.3420, source: 'GERMAN' },
      { token: '$VIRTUAL (Virtual Protocol)', chain: 'Base', price: 1.8450, source: 'GERMAN' },
      { token: '$SPX (SPX6900)', chain: 'Ethereum', price: 0.7850, source: 'MAKECASHTRADE' }
    ];
    const gem = randomGems[Math.floor(Math.random() * randomGems.length)];
    const amt = 250;
    if (userBalance >= amt) {
      userBalance -= amt;
      const curPx = +(gem.price * 1.06).toFixed(4);
      demoPositions.unshift({
        id: Date.now(),
        token: gem.token,
        chain: gem.chain,
        entry: gem.price,
        current: curPx,
        initialAmountUsd: amt,
        amountUsd: amt,
        pnlUsd: +(amt * 0.06).toFixed(2),
        pnlPercent: 6.0,
        slPrice: +(gem.price * 0.85).toFixed(4),
        tp1Price: +(gem.price * 1.50).toFixed(4),
        tp2Price: +(gem.price * 2.00).toFixed(4),
        tp3Price: +(gem.price * 4.00).toFixed(4),
        tp1Hit: false,
        tp2Hit: false,
        breakevenLocked: false,
        entryAt: Date.now(),
        signalNo: nextSignalNo(),
        bridgeSource: gem.source,
        jevAssessment: { model: 'jev-1.14.0', confidence: 0.96, choice: 'admit_vip_signal', requestId: 'demo-random-' + Date.now() }
      });
      renderPositions();
      updateWalletDisplays();
      showToast(`💼 Открыта новая демо-позиция ${gem.token} на $${amt} (SL и лесенка TP1–TP3 выставлены)!`, 'emerald');
    } else {
      showToast('Недостаточно свободного кэша. Зафиксируйте TP1 или пополните демо-кошелек!', 'red');
    }
  }

  function addFunds(amt) {
    playSound('buy');
    userBalance += amt;
    updateWalletDisplays();
    showToast(`💼 Свободный кэш пополнен на +$${amt.toLocaleString()}!`, 'emerald');
  }

  function resetDemoPortfolio() {
    playSound('click');
    userBalance = 3500.00;
    realizedPnlTotal = 412.50;
    bridgeIngestedIds.clear();
    demoPositions = [
      {
        id: 1,
        token: '$FART (FARTCOIN)',
        chain: 'Solana',
        entry: 0.3150,
        current: 0.3420,
        initialAmountUsd: 500,
        amountUsd: 500,
        pnlUsd: 42.85,
        pnlPercent: 8.57,
        slPrice: 0.2678,
        tp1Price: 0.4725,
        tp2Price: 0.6300,
        tp3Price: 1.2600,
        tp1Hit: false,
        tp2Hit: false,
        breakevenLocked: false,
        entryAt: Date.now() - 42 * 60000,
        signalNo: 184,
        bridgeSource: 'GERMAN',
        jevAssessment: { model: 'jev-1.14.0', confidence: 0.96, choice: 'admit_vip_signal', requestId: 'demo-fart-184' }
      },
      {
        id: 2,
        token: '$VIRTUAL (Virtual)',
        chain: 'Base',
        entry: 1.5200,
        current: 1.8450,
        initialAmountUsd: 1000,
        amountUsd: 1000,
        pnlUsd: 213.80,
        pnlPercent: 21.38,
        slPrice: 1.2920,
        tp1Price: 2.2800,
        tp2Price: 3.0400,
        tp3Price: 6.0800,
        tp1Hit: false,
        tp2Hit: false,
        breakevenLocked: false,
        entryAt: Date.now() - 126 * 60000,
        signalNo: 183,
        bridgeSource: 'GERMAN',
        jevAssessment: { model: 'jev-1.14.0', confidence: 0.96, choice: 'admit_vip_signal', requestId: 'demo-virtual-183' }
      }
    ];
    pollBridgeState();
    renderPositions();
    renderTradeJournal();
    updateWalletDisplays();
    showToast('🔄 Портфель сброшен и синхронизирован с живым мостом Jev 1.14!', 'cyan');
  }

  function updateWalletDisplays() {
    const marginInPos = demoPositions.reduce((acc, p) => acc + (Number(p.amountUsd) || 0), 0);
    const unrealizedPnl = demoPositions.reduce((acc, p) => acc + (Number(p.pnlUsd) || 0), 0);
    const totalEquity = userBalance + marginInPos + unrealizedPnl;
    const fmt = v => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Top Header shows Total Equity + Free Cash
    const hdrBal = document.getElementById('userDemoBalance');
    if (hdrBal) hdrBal.innerText = `$${fmt(totalEquity)}`;
    const mBal = document.getElementById('walletModalBalance');
    if (mBal) mBal.innerText = `$${fmt(userBalance)}`;
    const swapBal = document.getElementById('modalUserBalance');
    if (swapBal) swapBal.innerText = `$${fmt(userBalance)}`;

    // 5-Metric Strip
    const eqEl = document.getElementById('totalEquityValue');
    if (eqEl) eqEl.innerText = `$${fmt(totalEquity)}`;
    const eqSub = document.getElementById('totalEquitySub');
    if (eqSub) {
      const totalRoiPct = ((totalEquity - INITIAL_CAPITAL_USD) / INITIAL_CAPITAL_USD) * 100;
      const sign = totalRoiPct >= 0 ? '+' : '';
      eqSub.innerText = `К начальным $5,000: ${sign}${totalRoiPct.toFixed(1)}%`;
    }

    const fcEl = document.getElementById('freeCashValue');
    if (fcEl) fcEl.innerText = `$${fmt(userBalance)}`;

    const mgEl = document.getElementById('marginInPositionsValue');
    if (mgEl) mgEl.innerText = `$${fmt(marginInPos)}`;
    const mgCnt = document.getElementById('marginPositionsCount');
    if (mgCnt) mgCnt.innerText = `${demoPositions.length} поз.`;

    const unEl = document.getElementById('unrealizedPnlValue');
    if (unEl) {
      const uSign = unrealizedPnl >= 0 ? '+' : '';
      unEl.innerText = `${uSign}$${fmt(unrealizedPnl)}`;
      unEl.className = 'equity-metric-val ' + (unrealizedPnl >= 0 ? 'text-emerald' : 'text-crimson');
    }
    const unPctEl = document.getElementById('unrealizedPnlPct');
    if (unPctEl) {
      const uPct = marginInPos > 0 ? (unrealizedPnl / marginInPos) * 100 : 0;
      const uSign = uPct >= 0 ? '+' : '';
      unPctEl.innerText = `${uSign}${uPct.toFixed(1)}% к активной марже`;
    }

    const rlEl = document.getElementById('realizedPnlValue');
    if (rlEl) {
      const rSign = realizedPnlTotal >= 0 ? '+' : '';
      rlEl.innerText = `${rSign}$${fmt(realizedPnlTotal)}`;
    }
    const rlCnt = document.getElementById('realizedFillsCount');
    if (rlCnt) rlCnt.innerText = `${tradeJournal.length} исп.`;

    // Bottom KPI strip
    const kpiRoi = document.getElementById('metricRoi');
    if (kpiRoi) {
      const rSign = realizedPnlTotal >= 0 ? '+' : '';
      kpiRoi.innerText = `${rSign}$${fmt(realizedPnlTotal)}`;
    }
    const kpiLat = document.getElementById('metricEntryLatency');
    if (kpiLat) {
      kpiLat.innerText = `${demoPositions.length} актив. / ${tradeJournal.length} тейков`;
    }

    // Update Octav Hero Cards, Segmented Allocation Bar & Treemap
    renderOctavForensicWidgets(totalEquity, userBalance, marginInPos, unrealizedPnl);
  }

  function renderOctavForensicWidgets(totalEquity, freeCash, marginInPos, unrealizedPnl) {
    const fmt = v => v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const beMargin = demoPositions.filter(p => p.breakevenLocked).reduce((a, p) => a + (Number(p.amountUsd) || 0), 0);
    const riskMargin = Math.max(0, marginInPos - beMargin);
    const beCount = demoPositions.filter(p => p.breakevenLocked).length;
    const protectedTotal = freeCash + beMargin;

    const hEq = document.getElementById('heroEquityBig');
    if (hEq) hEq.innerText = `$${fmt(totalEquity)}`;
    const hEqSub = document.getElementById('heroEquitySub');
    if (hEqSub) {
      const uSign = unrealizedPnl >= 0 ? '+' : '';
      hEqSub.innerHTML = `Свободный кэш: <b>$${fmt(freeCash)}</b> · В сделках: <b>$${fmt(marginInPos)}</b> · Нереализ. PnL: <b>${uSign}$${fmt(unrealizedPnl)}</b>`;
    }

    const hProt = document.getElementById('heroProtectedBig');
    if (hProt) hProt.innerText = `$${fmt(protectedTotal)}`;
    const hProtSub = document.getElementById('heroProtectedSub');
    if (hProtSub) {
      hProtSub.innerHTML = `Из них <b>$${fmt(beMargin)}</b> в позициях со стопом в БУ (🛡️ после TP1) и <b>$${fmt(freeCash)}</b> в свободном USDC`;
    }
    const beChip = document.getElementById('heroBeCountChip');
    if (beChip) beChip.innerText = `🛡️ ${beCount} поз. в БУ (0% риск тела)`;
    const rlChip = document.getElementById('heroRealizedChip');
    if (rlChip) {
      const rSign = realizedPnlTotal >= 0 ? '+' : '';
      rlChip.innerText = `💰 Зафиксировано: ${rSign}$${fmt(realizedPnlTotal)}`;
    }

    // Proportional Segmented Bar
    const barEl = document.getElementById('octavAllocationBar');
    const barTotEl = document.getElementById('octavBarTotalLabel');
    const legEl = document.getElementById('octavSplitLegend');
    const posPnl = Math.max(0, unrealizedPnl);
    const denom = Math.max(1, beMargin + riskMargin + freeCash + posPnl);
    if (barTotEl) barTotEl.innerText = `$${fmt(totalEquity)} Эквити`;

    const segs = [
      { cls: 'seg-be-ice', val: beMargin, label: 'Защищено в БУ (SL=Вход)', sub: 'Позиции после TP1 (штриховка 135°)', color: 'var(--ice-ink)', swatch: 'var(--hatch-ice)' },
      { cls: 'seg-margin-gold', val: riskMargin, label: 'Активная маржа в работе', sub: 'Открытые позиции до первого тейка', color: 'var(--gold-ink)', swatch: 'var(--gold)' },
      { cls: 'seg-cash-slate', val: freeCash, label: 'Свободный кэш (USDC)', sub: 'Доступный резерв + возвраты с TP1/TP2', color: 'var(--text-main)', swatch: '#3B82F6' },
      { cls: 'seg-pnl-emerald', val: posPnl, label: 'Нереализованный профит', sub: 'Бумажная прибыль открытых лотов', color: 'var(--emerald-ink)', swatch: 'var(--emerald)' }
    ];
    if (barEl) {
      barEl.innerHTML = segs.filter(s => s.val > 0).map(s => `<div class="${s.cls}" style="flex:${Math.max(15, Math.round(s.val))} 1 0" title="${s.label}: $${fmt(s.val)}"></div>`).join('');
    }
    if (legEl) {
      legEl.innerHTML = segs.map(s => {
        const pct = Math.round((s.val / denom) * 100);
        return `<div class="octav-sl-item"><span class="octav-sl-swatch" style="background:${s.swatch}"></span><div><b style="color:${s.color}">$${fmt(s.val)} <span class="mono" style="font-size:12px;color:var(--text-dim);font-weight:500;">${pct}%</span></b><small><strong style="color:var(--text-main)">${s.label}.</strong> ${s.sub}</small></div></div>`;
      }).join('');
    }

    // Interactive Position Allocation Treemap
    const tmGrid = document.getElementById('octavTreemapGrid');
    const tmSum = document.getElementById('octavTreemapSummary');
    if (tmSum) tmSum.innerText = `${demoPositions.length} активных лотов · ${beCount} в безубытке`;
    if (tmGrid) {
      if (demoPositions.length === 0) {
        tmGrid.innerHTML = `<div style="padding:20px;color:var(--text-muted);font-size:13px;">Все позиции закрыты в кэш ($${fmt(freeCash)}).</div>`;
      } else {
        const totPosUsd = Math.max(1, demoPositions.reduce((a, p) => a + Math.max(50, Number(p.amountUsd) || 0), 0));
        tmGrid.innerHTML = demoPositions.map(p => {
          const sharePct = Math.round(((Number(p.amountUsd) || 0) / totPosUsd) * 100);
          const sign = p.pnlUsd >= 0 ? '+' : '';
          const pnlCol = p.pnlUsd >= 0 ? 'var(--emerald-ink)' : 'var(--crimson-ink)';
          const hatched = p.breakevenLocked ? `<div class="ice-hatched-fill" style="height:55%;"></div>` : '';
          const beTag = p.breakevenLocked ? `<span class="mono" style="font-size:10px;color:var(--ice-ink);font-weight:700;">🛡️ СТОП В БУ</span>` : `<span class="mono" style="font-size:10px;color:var(--text-muted);">SL АКТИВЕН</span>`;
          return `<div class="octav-tm-tile" style="flex:${Math.max(120, Math.round(p.amountUsd))} 1 150px;">
            ${hatched}
            <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
              <strong style="font-family:var(--font-display);font-size:15px;">${p.token}</strong>
              <span class="mono" style="font-size:11px;color:var(--gold-ink);">${sharePct}%</span>
            </div>
            <div class="mono" style="font-size:18px;font-weight:800;margin:4px 0;">$${Number(p.amountUsd).toFixed(0)}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:4px;">
              <span class="mono" style="font-size:11.5px;font-weight:700;color:${pnlCol};">${sign}${p.pnlPercent.toFixed(1)}%</span>
              ${beTag}
            </div>
          </div>`;
        }).join('');
      }
    }

    // Update Health Gauge
    const healthRatio = riskMargin > 0 ? ((freeCash + beMargin + Math.max(0, unrealizedPnl)) / riskMargin) : 3.5;
    const hf = Math.min(3.99, Math.max(1.05, healthRatio));
    const hLbl = document.getElementById('octavHealthScoreLabel');
    const hSub = document.getElementById('octavHealthSubLabel');
    if (hLbl) {
      hLbl.innerText = `HEALTH ${hf.toFixed(2)} · ${hf >= 1.5 ? 'SAFE' : 'MODERATE'}`;
      hLbl.style.color = hf >= 1.5 ? 'var(--emerald-ink)' : 'var(--gold-ink)';
    }
    if (hSub) {
      const beRatio = marginInPos > 0 ? Math.round((beMargin / marginInPos) * 100) : 100;
      hSub.innerText = `${beRatio}% маржи защищено стопом в БУ + $${fmt(freeCash)} в свободном кэше`;
    }
    updateStopFirstCalc();
  }

  function updateStopFirstCalc() {
    const riskEl = document.getElementById('stopCalcRiskUsd');
    const slEl = document.getElementById('stopCalcSlPct');
    if (!riskEl || !slEl) return;
    const riskUsd = Math.max(1, Number(riskEl.value) || 50);
    const slPct = Math.max(0.1, Number(slEl.value) || 2.5);
    const posSizeUsd = (riskUsd / (slPct / 100));
    const eqPct = ((riskUsd / Math.max(1, INITIAL_CAPITAL_USD)) * 100).toFixed(1);
    const rrProfit = riskUsd * 2.5;

    const szOut = document.getElementById('stopCalcResultSize');
    const lsOut = document.getElementById('stopCalcResultLoss');
    const pfOut = document.getElementById('stopCalcResultProfit');
    if (szOut) szOut.innerText = `$${posSizeUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (lsOut) lsOut.innerText = `-$${riskUsd.toFixed(2)} (${eqPct}% эквити)`;
    if (pfOut) pfOut.innerText = `+$${rrProfit.toFixed(2)} (+2.5R)`;
  }

  let simEduMotionPaused = false;
  function toggleSimEduMotion() {
    simEduMotionPaused = !simEduMotionPaused;
    const grp = document.getElementById('simEduAnimGroup');
    const btn = document.getElementById('simEduMotionBtn');
    if (grp) grp.style.display = simEduMotionPaused ? 'none' : '';
    if (btn) btn.textContent = simEduMotionPaused ? '▶ Продолжить анимацию' : '⏸ Пауза анимации';
  }

  function clearRealWalletInspector() {
    const inp = document.getElementById('walletFlowInput');
    const st = document.getElementById('simWalletStatus');
    const out = document.getElementById('simWalletRealOutput');
    if (inp) inp.value = '';
    if (st) {
      st.style.borderColor = 'var(--border)';
      st.style.color = 'var(--text-main)';
      st.textContent = 'Выберите сеть и введите публичный адрес. Переводы появятся после вашего запроса.';
    }
    if (out) {
      out.style.display = 'none';
      out.innerHTML = '';
    }
  }

  async function runRealWalletInspector(ev) {
    if (ev) ev.preventDefault();
    const netEl = document.getElementById('simWalletNet');
    const inpEl = document.getElementById('walletFlowInput');
    const stEl = document.getElementById('simWalletStatus');
    const outEl = document.getElementById('simWalletRealOutput');
    if (!netEl || !inpEl || !stEl || !outEl) return;

    const net = netEl.value;
    const raw = inpEl.value || '';
    const trimmed = raw.trim();

    if (!trimmed) {
      stEl.style.borderColor = '#FF9B9B';
      stEl.style.color = '#FF9B9B';
      stEl.textContent = 'Введите публичный адрес для выбранной сети.';
      return;
    }

    if (raw.length > 64 || /\s/.test(raw) || /^0x[0-9a-fA-F]{64}$/.test(trimmed)) {
      stEl.style.borderColor = '#FF9B9B';
      stEl.style.color = '#FF9B9B';
      stEl.textContent = 'Здесь нужен только публичный адрес. Seed-фразы, приватные ключи и пароли отправлять нельзя.';
      return;
    }

    if (net !== 'ethereum') {
      stEl.style.borderColor = '#FF9B9B';
      stEl.style.color = '#FF9B9B';
      outEl.style.display = 'none';
      stEl.textContent = 'Эта сеть пока не поддерживается в прямом браузерном запросе. Выберите сеть Ethereum.';
      return;
    }

    if (!/^0x[0-9a-fA-F]{40}$/.test(trimmed)) {
      stEl.style.borderColor = '#FF9B9B';
      stEl.style.color = '#FF9B9B';
      stEl.textContent = 'Проверьте адрес: его формат не подходит для выбранной сети (ожидается 0x и 40 hex-символов).';
      return;
    }

    stEl.style.borderColor = 'var(--border)';
    stEl.style.color = 'var(--text-main)';
    stEl.textContent = 'Запрашиваем переводы по указанному адресу через Blockscout v2 API...';
    outEl.style.display = 'none';

    try {
      const endpoint = 'https://eth.blockscout.com/api/v2/addresses/' + encodeURIComponent(trimmed) + '/transactions';
      const resp = await fetch(endpoint, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        mode: 'cors',
        headers: { 'Accept': 'application/json' }
      });
      if (!resp.ok) {
        stEl.style.borderColor = '#FF9B9B';
        stEl.style.color = '#FF9B9B';
        stEl.textContent = resp.status === 429
          ? 'Источник временно ограничил запросы. Повторите попытку позже.'
          : 'Не удалось получить переводы от провайдера (HTTP ' + resp.status + '). Данные не заменены демо-примером.';
        return;
      }
      const data = await resp.json();
      const items = Array.isArray(data && data.items) ? data.items : [];
      const transfers = [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it || it.status !== 'ok' || !it.from || !it.to || !it.value || it.value === '0') continue;
        const inc = String(it.to.hash || '').toLowerCase() === trimmed.toLowerCase();
        const out = String(it.from.hash || '').toLowerCase() === trimmed.toLowerCase();
        if (!inc && !out) continue;
        const ethVal = (Number(it.value) / 1e18).toFixed(4);
        transfers.push({
          dir: inc && out ? 'Самому себе' : inc ? 'Получено' : 'Отправлено',
          color: inc ? '#34D399' : '#FBBF24',
          from: String(it.from.hash).slice(0, 8) + '...' + String(it.from.hash).slice(-4),
          to: String(it.to.hash).slice(0, 8) + '...' + String(it.to.hash).slice(-4),
          amount: ethVal + ' ETH',
          block: it.block_number,
          hash: it.hash
        });
      }

      if (transfers.length === 0) {
        stEl.textContent = 'В доступной части истории (первые 50 транзакций верхнего уровня) переводы ETH не найдены.';
        return;
      }

      stEl.textContent = 'Показаны ' + transfers.length + ' переводов ETH верхнего уровня по данным Blockscout (chainId 1).';
      let rowsHtml = '';
      transfers.slice(0, 8).forEach(t => {
        rowsHtml += '<tr style="border-bottom:1px solid rgba(255,255,255,0.06);">' +
          '<td style="padding:6px 8px;color:' + t.color + ';font-weight:700;">' + t.dir + '</td>' +
          '<td style="padding:6px 8px;">' + t.from + '</td>' +
          '<td style="padding:6px 8px;">' + t.to + '</td>' +
          '<td style="padding:6px 8px;font-weight:700;">' + t.amount + '</td>' +
          '<td style="padding:6px 8px;color:var(--text-muted);">#' + t.block + '</td>' +
          '<td style="padding:6px 8px;"><a href="https://eth.blockscout.com/tx/' + encodeURIComponent(t.hash) + '" target="_blank" rel="noopener noreferrer" style="color:var(--ice-ink);">Blockscout ↗</a></td>' +
          '</tr>';
      });
      outEl.innerHTML = '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-family:var(--font-mono);font-size:12px;">' +
        '<thead><tr style="border-bottom:1px solid var(--border);color:var(--text-muted);text-align:left;">' +
        '<th style="padding:6px 8px;">Направление</th><th style="padding:6px 8px;">Отправитель</th><th style="padding:6px 8px;">Получатель</th><th style="padding:6px 8px;">Сумма</th><th style="padding:6px 8px;">Блок</th><th style="padding:6px 8px;">Проводник</th>' +
        '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';
      outEl.style.display = 'block';
    } catch (err) {
      stEl.style.borderColor = '#FF9B9B';
      stEl.style.color = '#FF9B9B';
      stEl.textContent = 'Ошибка соединения с Blockscout API. Данные не подменяются демо-примером.';
    }
  }

  function setForensicPreset(preset) {
    const valid = ['dark', 'light', 'slate', 'serif'];
    const next = valid.includes(preset) ? preset : 'dark';
    document.documentElement.dataset.theme = next;
    document.querySelectorAll('#forensicPresetGroup .forensic-preset-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.preset === next);
    });
    try { localStorage.setItem('makecash.forensic.theme.v1', next); } catch (e) {}
  }
  function toggleForensicTheme() {
    const cur = document.documentElement.dataset.theme || 'dark';
    setForensicPreset(cur === 'light' ? 'dark' : 'light');
  }

  // REAL-TIME PRICE FLICKER & AUTO-TP/SL ENGINE
  setInterval(() => {
    const pFart = document.getElementById('price-fart');
    if (pFart) {
      const delta = (Math.random() * 0.004 - 0.0018);
      const cur = 0.3420 + delta;
      pFart.innerText = `$${cur.toFixed(4)}`;
    }

    const pVirt = document.getElementById('price-virtual');
    if (pVirt) {
      const delta = (Math.random() * 0.02 - 0.009);
      const cur = 1.8450 + delta;
      pVirt.innerText = `$${cur.toFixed(4)}`;
    }

    if (demoPositions.length > 0) {
      demoPositions.forEach(p => {
        const pctChange = (Math.random() * 1.4 - 0.55);
        p.pnlPercent = Math.max(-14, p.pnlPercent + pctChange);
        p.pnlUsd = p.amountUsd * (p.pnlPercent / 100);
        p.current = p.entry * (1 + p.pnlPercent / 100);

        if (autoTpSlEnabled) {
          if (!p.tp1Hit && p.tp1Price && p.current >= p.tp1Price) {
            takePartialProfit(p.id, 'tp1', 0.50, true);
          } else if (p.tp1Hit && !p.tp2Hit && p.tp2Price && p.current >= p.tp2Price) {
            takePartialProfit(p.id, 'tp2', 0.50, true);
          } else if (p.slPrice && p.current <= p.slPrice) {
            closePosition(p.id);
          }
        }
      });
      renderPositions();
    }
  }, 4000);

  // INITIALIZE ON LOAD
  document.addEventListener('DOMContentLoaded', () => {
    try {
      const urlTheme = new URLSearchParams(window.location.search).get('theme');
      const savedTheme = urlTheme || localStorage.getItem('makecash.forensic.theme.v1');
      if (['dark', 'light', 'slate', 'serif'].includes(savedTheme)) {
        setForensicPreset(savedTheme);
      }
    } catch (e) {}
    // Scrollspy for .octav-jump
    const jumpLinks = [...document.querySelectorAll('#octavJumpNav a[data-sec]')];
    window.addEventListener('scroll', () => {
      let activeId = 'allocationSection';
      jumpLinks.forEach(a => {
        const el = document.getElementById(a.dataset.sec);
        if (el && el.getBoundingClientRect().top <= 160) activeId = a.dataset.sec;
      });
      jumpLinks.forEach(a => a.classList.toggle('active', a.dataset.sec === activeId));
    }, { passive: true });
    updateCalculator();
    updateStopFirstCalc();
    renderPositions();
    renderTradeJournal();
    updateWalletDisplays();
    startBridgePolling();
  });
