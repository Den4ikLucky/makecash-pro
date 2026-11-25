
(function () {
  "use strict";
  const root = document.getElementById("orderflow-radar");
  const canvas = document.getElementById("orderflow-chart");
  const ctx = canvas.getContext("2d");
  const $ = (id) => document.getElementById(id);
  const money = (n) =>
    Number.isFinite(Number(n))
      ? "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })
      : "\u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445";
  const pct = (n) =>
    Number.isFinite(Number(n))
      ? (Number(n) >= 0 ? "+" : "") + Number(n).toFixed(2) + "%"
      : "\u043d\u0435\u0442 \u0438\u0441\u0442\u043e\u0440\u0438\u0438";
  let symbol = "TRUMP",
    payload = null,
    selected = null,
    detail = null,
    busy = false,
    generation = 0,
    hits = [],
    keyboardIndex = -1,
    socket = null,
    retry = null,
    retryMs = 2000,
    liquidations = [],
    socketState = "\u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435";
  const colors = {
    bg: "#050508",
    text: "#ADB4C4",
    up: "#34D399",
    down: "#FBBF24",
    grid: "rgba(247,244,238,.08)",
  };
  function card(id, icon, title, sub, body) {
    const el = document.createElement("details");
    el.className = "of-card";
    el.id = "of-card-" + id;
    const summary = document.createElement("summary"),
      glyph = document.createElement("span"),
      text = document.createElement("span"),
      strong = document.createElement("b"),
      small = document.createElement("small"),
      content = document.createElement("div");
    glyph.className = "of-icon";
    glyph.textContent = icon;
    strong.textContent = title;
    small.textContent = sub;
    content.className = "of-body";
    content.textContent = body;
    text.append(strong, small);
    summary.append(glyph, text);
    el.append(summary, content);
    return el;
  }
  function renderCards() {
    const holder = $("of-cards"),
      opened = new Set(
        [...holder.querySelectorAll("details[open]")].map((x) => x.id),
      );
    holder.replaceChildren();
    const metrics = selected?.aggregated_metrics || {},
      venues = selected?.venue_breakdown || {},
      flows = detail?.flows || [];
    for (const name of ["Bybit Futures", "Hyperliquid"]) {
      const flow = flows.find((x) => x.venue === name),
        fallback = venues[name === "Bybit Futures" ? "Bybit" : name];
      const buy = flow?.buy_usd ?? fallback?.taker_buy_usd,
        sell = flow?.sell_usd ?? fallback?.taker_sell_usd;
      const available = Number.isFinite(buy) && Number.isFinite(sell),
        total = (buy || 0) + (sell || 0),
        isBuy = buy >= sell;
      const windowMinutes = flow
        ? Math.max(0, (flow.end_ms - flow.start_ms) / 60000)
        : null;
      const period =
        windowMinutes === null
          ? "\u0437\u0430 \u043e\u043a\u043d\u043e \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0445 \u0441\u0434\u0435\u043b\u043e\u043a (\u0434\u043b\u0438\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u044c \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430)"
          : "\u0437\u0430 " + windowMinutes.toFixed(2) + " \u043c\u0438\u043d";
      holder.append(
        card(
          name === "Hyperliquid" ? "hl" : "flow",
          "🎰",
          available
            ? (isBuy ? "\u043f\u043e\u043a\u0443\u043f\u0430\u044e\u0442" : "\u043f\u0440\u043e\u0434\u0430\u044e\u0442") +
                " \u043d\u0430 " +
                money(isBuy ? buy : sell) +
                " " +
                period +
                " (" +
                (total ? (100 * Math.max(buy, sell)) / total : 0).toFixed(1) +
                "%)"
            : "\u041f\u043e\u0442\u043e\u043a \u0441\u0434\u0435\u043b\u043e\u043a \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d",
          name + " · " + symbol,
          available
            ? "Taker buy: " +
                money(buy) +
                " · sell: " +
                money(sell) +
                "\nNet delta: " +
                money(buy - sell) +
                "\n\u042d\u0442\u043e \u0432\u044b\u0431\u043e\u0440\u043a\u0430 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0445 " +
                (flow?.count ?? fallback?.recent_trades_count ?? "N/A") +
                " \u0441\u0434\u0435\u043b\u043e\u043a, \u043d\u0435 \u043f\u043e\u043b\u043d\u044b\u0439 \u043e\u0431\u044a\u0451\u043c \u0437\u0430 \u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u043d\u044b\u0439 \u0438\u043d\u0442\u0435\u0440\u0432\u0430\u043b."
            : "\u041f\u0443\u0431\u043b\u0438\u0447\u043d\u0430\u044f \u043b\u0435\u043d\u0442\u0430 \u043d\u0435 \u043e\u0442\u0432\u0435\u0442\u0438\u043b\u0430. \u041d\u0443\u043b\u0435\u0432\u044b\u0435 \u0437\u043d\u0430\u0447\u0435\u043d\u0438\u044f \u043d\u0435 \u043f\u043e\u0434\u0441\u0442\u0430\u0432\u043b\u044f\u044e\u0442\u0441\u044f.",
        ),
      );
    }
    const liqs = liquidations.filter((x) => x.symbol === symbol),
      latest = liqs.at(-1);
    holder.append(
      card(
        "liq",
        "☠️",
        latest
          ? "🔴 Liquidated " + latest.position + " · " + money(latest.usd)
          : "\u041b\u0438\u043a\u0432\u0438\u0434\u0430\u0446\u0438\u0438 > $50K: \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0451\u043d\u043d\u044b\u0445 \u0441\u043e\u0431\u044b\u0442\u0438\u0439 \u043d\u0435\u0442",
        "Binance · " + socketState + " · Hyperliquid: \u043d\u0435\u0442 liquidation feed",
        latest
          ? liqs
              .slice(-10)
              .reverse()
              .map(
                (x) =>
                  new Date(x.time).toLocaleTimeString("ru-RU") +
                  " · Liquidated " +
                  x.position +
                  " on Binance · " +
                  money(x.usd),
              )
              .join("\n")
          : "\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0435\u043c \u0442\u043e\u043b\u044c\u043a\u043e \u0444\u0430\u043a\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0435 forceOrder-\u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f \u043f\u043e\u0441\u043b\u0435 \u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044f. \u041e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u0435 \u0441\u043e\u0431\u044b\u0442\u0438\u0439 \u043d\u0435 \u043e\u0437\u043d\u0430\u0447\u0430\u0435\u0442 \u043e\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0438\u044f \u043b\u0438\u043a\u0432\u0438\u0434\u0430\u0446\u0438\u0439 \u043d\u0430 \u0440\u044b\u043d\u043a\u0435. \u0418\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u0438\u0435 \u0441\u043e\u0431\u044b\u0442\u0438\u044f \u0438 Hyperliquid \u043d\u0435 \u0438\u043c\u0438\u0442\u0438\u0440\u0443\u044e\u0442\u0441\u044f.",
      ),
    );
    const historians = Object.values(venues).filter(
      (v) => v.active && Number.isFinite(v.oi_change_15m_pct),
    );
    const has15 = historians.length > 0,
      has30 = Object.values(venues).some(
        (v) => v.active && Number.isFinite(v.oi_change_30m_pct),
      );
    const anomaly =
      (has15 && Math.abs(metrics.avg_oi_change_15m_pct) >= 2) ||
      (has30 && Math.abs(metrics.avg_oi_change_30m_pct) >= 2);
    holder.append(
      card(
        "oi",
        "🍿",
        "🔊 Open Interest " +
          (anomaly ? "ALERT" : "Monitor") +
          " · 15m " +
          (has15 ? pct(metrics.avg_oi_change_15m_pct) : "\u043d\u0435\u0442 \u0438\u0441\u0442\u043e\u0440\u0438\u0438") +
          " / 30m " +
          (has30 ? pct(metrics.avg_oi_change_30m_pct) : "\u043d\u0435\u0442 \u0438\u0441\u0442\u043e\u0440\u0438\u0438"),
        "Aggregated OI: " +
          (selected ? money(metrics.total_open_interest_usd) : "\u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445") +
          " · \u0438\u0441\u0442\u043e\u0440\u0438\u044f " +
          historians.length +
          "/5 \u0431\u0438\u0440\u0436",
        "\u0418\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f 15m / 30m: \u0441\u0440\u0435\u0434\u043d\u0435\u0435 \u043f\u043e \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u043c \u0440\u044f\u0434\u0430\u043c Bybit / Binance, \u043d\u0435 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u0435 \u0441\u0443\u043c\u043c\u044b \u043f\u044f\u0442\u0438 \u0431\u0438\u0440\u0436.\n" +
          Object.values(venues)
            .filter((v) => v.active)
            .map(
              (v) =>
                v.venue +
                ": OI " +
                money(v.open_interest_usd) +
                " · 15m " +
                (Number.isFinite(v.oi_change_15m_pct)
                  ? pct(v.oi_change_15m_pct)
                  : "\u043d\u0435\u0442 \u0438\u0441\u0442\u043e\u0440\u0438\u0438"),
            )
            .join("\n"),
      ),
    );
    const book = detail?.book;
    holder.append(
      card(
        "book",
        "🧨",
        book
          ? (Math.abs(book.imbalance_pct) >= 20
              ? "\u0418\u043c\u043f\u0443\u043b\u044c\u0441 \u0441\u0442\u0430\u043a\u0430\u043d\u0430: "
              : "\u0411\u0430\u043b\u0430\u043d\u0441 \u0441\u0442\u0430\u043a\u0430\u043d\u0430: ") + pct(book.imbalance_pct)
          : "\u0421\u0442\u0430\u043a\u0430\u043d: \u0434\u0430\u043d\u043d\u044b\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b",
        "Bybit Futures · top 25 bid / ask \u0443\u0440\u043e\u0432\u043d\u0435\u0439",
        book
          ? "Bid: " +
              money(book.bid_usd) +
              " · Ask: " +
              money(book.ask_usd) +
              "\n\u0414\u0438\u0441\u0431\u0430\u043b\u0430\u043d\u0441 = (bid − ask) / (bid + ask). \u042d\u0442\u043e \u0441\u043d\u0438\u043c\u043e\u043a \u0433\u043b\u0443\u0431\u0438\u043d\u044b, \u043d\u0435 \u0438\u0441\u043f\u043e\u043b\u043d\u0435\u043d\u043d\u044b\u0435 \u0441\u0434\u0435\u043b\u043a\u0438."
          : "REST orderbook \u043d\u0435 \u043e\u0442\u0432\u0435\u0442\u0438\u043b; \u0438\u043c\u043f\u0443\u043b\u044c\u0441 \u043d\u0435 \u0432\u044b\u0434\u0443\u043c\u044b\u0432\u0430\u0435\u0442\u0441\u044f.",
      ),
    );
    holder.append(
      card(
        "all",
        "📊",
        "🆕 all derivatives buy: " +
          (selected ? money(metrics.recent_taker_buy_usd) : "\u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445") +
          " · sell: " +
          (selected ? money(metrics.recent_taker_sell_usd) : "\u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445"),
        (selected?.active_venues_count ?? 0) +
          "/5 \u0431\u0438\u0440\u0436 \u0430\u043a\u0442\u0438\u0432\u043d\u043e · Net delta " +
          (selected ? money(metrics.recent_net_delta_usd) : "\u043d\u0435\u0442 \u0434\u0430\u043d\u043d\u044b\u0445"),
        "\u0421\u0443\u043c\u043c\u0430 \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0445 taker-\u0432\u044b\u0431\u043e\u0440\u043e\u043a. \u0423 \u0431\u0438\u0440\u0436 \u0440\u0430\u0437\u043d\u044b\u0435 \u043e\u043a\u043d\u0430 \u043f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0445 \u0441\u0434\u0435\u043b\u043e\u043a, \u044d\u0442\u043e \u043d\u0435 \u0441\u0438\u043d\u0445\u0440\u043e\u043d\u043d\u044b\u0439 \u043c\u0438\u043d\u0443\u0442\u043d\u044b\u0439 \u0431\u0430\u0440.\n" +
          Object.values(venues)
            .map(
              (v) =>
                v.venue +
                ": " +
                (v.active ? "LIVE" : "\u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430 / \u043d\u0435\u0442 \u043a\u043e\u043d\u0442\u0440\u0430\u043a\u0442\u0430") +
                " · buy " +
                money(v.taker_buy_usd) +
                " · sell " +
                money(v.taker_sell_usd),
            )
            .join("\n"),
      ),
    );
    for (const el of holder.children) if (opened.has(el.id)) el.open = true;
  }
  function inspect(hit) {
    if (!hit) return;
    $("of-marker-info").textContent = hit.label;
    const target = $("of-card-" + hit.card);
    if (target) target.open = true;
  }
  function draw() {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect(),
      ratio = Math.min(devicePixelRatio || 1, 2),
      width = rect.width,
      height = rect.height;
    if (!width || !height) return;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);
    hits = [];
    const candles = detail?.candles || [];
    if (!candles.length) {
      ctx.fillStyle = colors.text;
      ctx.font = "14px monospace";
      ctx.fillText("\u0421\u0432\u0435\u0447\u0438 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b · \u043e\u0436\u0438\u0434\u0430\u0435\u043c \u0436\u0438\u0432\u043e\u0439 \u043e\u0442\u0432\u0435\u0442 Bybit", 24, 48);
      return;
    }
    const left = 16,
      right = 88,
      top = 32,
      bottom = 32,
      plotW = width - left - right,
      plotH = height - top - bottom,
      lows = candles.map((c) => c.low),
      highs = candles.map((c) => c.high);
    let min = Math.min(...lows),
      max = Math.max(...highs),
      span = max - min || max * 0.01;
    min -= span * 0.18;
    max += span * 0.22;
    span = max - min;
    const step = plotW / candles.length,
      x = (i) => left + (i + 0.5) * step,
      y = (p) => top + ((max - p) / span) * plotH;
    ctx.font = "11px monospace";
    ctx.textBaseline = "middle";
    for (let n = 0; n <= 4; n++) {
      const py = top + (n * plotH) / 4;
      ctx.strokeStyle = colors.grid;
      ctx.beginPath();
      ctx.moveTo(left, py);
      ctx.lineTo(width - right, py);
      ctx.stroke();
      ctx.fillStyle = colors.text;
      ctx.fillText(
        (max - (n * span) / 4).toLocaleString("en-US", {
          maximumFractionDigits: max > 100 ? 2 : 5,
        }),
        width - right + 8,
        py,
      );
    }
    const maxVolume = Math.max(...candles.map((c) => c.volume), 1);
    candles.forEach((c, i) => {
      ctx.fillStyle = c.close >= c.open ? colors.up : colors.down;
      ctx.globalAlpha = 0.16;
      ctx.fillRect(
        x(i) - step * 0.3,
        height - bottom - (c.volume / maxVolume) * 40,
        Math.max(1, step * 0.6),
        (c.volume / maxVolume) * 40,
      );
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.beginPath();
      ctx.moveTo(x(i), y(c.high));
      ctx.lineTo(x(i), y(c.low));
      ctx.stroke();
      ctx.fillRect(
        x(i) - Math.max(1, step * 0.58) / 2,
        Math.min(y(c.open), y(c.close)),
        Math.max(1, step * 0.58),
        Math.max(1, Math.abs(y(c.close) - y(c.open))),
      );
    });
    [0, Math.floor(candles.length / 2), candles.length - 1].forEach((i) => {
      ctx.fillStyle = colors.text;
      ctx.fillText(
        new Date(candles[i].time).toLocaleTimeString("ru-RU", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        Math.max(left, Math.min(width - right - 40, x(i) - 16)),
        height - 12,
      );
    });
    const events = [];
    for (const bucket of detail?.minute_flows || []) {
      const total = bucket.buy_usd + bucket.sell_usd;
      if (
        total >= 10000 &&
        Math.abs(bucket.buy_usd - bucket.sell_usd) / total >= 0.1
      )
        events.push({
          time: bucket.time,
          icon: "🎰",
          card: "flow",
          label:
            "🎰 Bybit · " +
            new Date(bucket.time).toLocaleTimeString("ru-RU") +
            " · buy " +
            money(bucket.buy_usd) +
            " / sell " +
            money(bucket.sell_usd),
        });
    }
    const sampled = Number(payload?.epoch) * 1000;
    if (selected && Number.isFinite(sampled))
      events.push({
        time: sampled,
        icon: "📊",
        card: "all",
        label:
          "📊 \u0421\u0440\u0435\u0437 \u043f\u044f\u0442\u0438 \u0431\u0438\u0440\u0436 · " +
          new Date(sampled).toLocaleTimeString("ru-RU") +
          " · " +
          symbol,
      });
    const hasOI = Object.values(selected?.venue_breakdown || {}).some(
      (v) => v.active && Number.isFinite(v.oi_change_15m_pct),
    );
    if (hasOI)
      events.push({
        time: sampled,
        icon: "🍿",
        card: "oi",
        label:
          "🍿 OI \u0441\u0440\u0435\u0437 (\u043d\u0435 \u0438\u0441\u0442\u043e\u0440\u0438\u0447\u0435\u0441\u043a\u043e\u0435 \u0441\u043e\u0431\u044b\u0442\u0438\u0435): 15m " +
          pct(selected.aggregated_metrics.avg_oi_change_15m_pct) +
          " · 30m " +
          pct(selected.aggregated_metrics.avg_oi_change_30m_pct),
      });
    if (detail?.book)
      events.push({
        time: detail.book.time,
        icon: "🧨",
        card: "book",
        label: "🧨 \u0421\u0440\u0435\u0437 \u0441\u0442\u0430\u043a\u0430\u043d\u0430 · \u0434\u0438\u0441\u0431\u0430\u043b\u0430\u043d\u0441 " + pct(detail.book.imbalance_pct),
      });
    for (const event of liquidations.filter((e) => e.symbol === symbol))
      events.push({
        time: event.time,
        icon: "☠️",
        card: "liq",
        label:
          "☠️ Liquidated " +
          event.position +
          " on Binance · " +
          money(event.usd),
      });
    const counts = new Map();
    for (const event of events.slice(-32)) {
      const i = Math.floor((event.time - candles[0].time) / 60000);
      if (i < 0 || i >= candles.length) continue;
      const stack = counts.get(i) || 0;
      counts.set(i, stack + 1);
      const px = x(i),
        py = Math.max(
          20,
          Math.min(height - bottom - 16, y(candles[i].high) - 20 - stack * 28),
        );
      ctx.fillStyle = colors.bg;
      ctx.fillRect(px - 14, py - 14, 28, 28);
      ctx.textAlign = "center";
      ctx.font = '20px "Apple Color Emoji",sans-serif';
      ctx.fillText(event.icon, px, py);
      hits.push({ ...event, x: px, y: py });
    }
    ctx.textAlign = "left";
    canvas.setAttribute(
      "aria-label",
      symbol +
        " · " +
        candles.length +
        " \u0440\u0435\u0430\u043b\u044c\u043d\u044b\u0445 \u0441\u0432\u0435\u0447\u0435\u0439 Bybit · " +
        hits.length +
        " \u0441\u043e\u0431\u044b\u0442\u0438\u0439. Enter: \u0441\u043b\u0435\u0434\u0443\u044e\u0449\u0435\u0435 \u0441\u043e\u0431\u044b\u0442\u0438\u0435.",
    );
    root.dataset.markers = String(hits.length);
    root.dataset.candles = String(candles.length);
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    const current = ++generation,
      requested = symbol;
    $("of-status").textContent = "\u041e\u0431\u043d\u043e\u0432\u043b\u044f\u0435\u043c " + requested + "…";
    try {
      const origins =
        location.protocol === "file:"
          ? ["http://127.0.0.1:8798/orderflow_radar"]
          : ["/orderflow_radar"];
      let data = null;
      for (const origin of origins) {
        try {
          const response = await fetch(
            origin + "?symbol=" + encodeURIComponent(requested),
            { cache: "no-store", signal: AbortSignal.timeout(20000) },
          );
          if (response.ok) {
            const candidate = await response.json();
            if (Array.isArray(candidate.results)) {
              data = candidate;
              break;
            }
          }
        } catch (_) {}
      }
      if (!data) {
        const response = await fetch("data/live_orderflow_oi_radar.json", {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw Error("snapshot_unavailable");
        data = await response.json();
      }
      if (current !== generation || requested !== symbol) return;
      payload = data;
      selected =
        data.results?.find((r) => r.symbol === "#" + requested) || null;
      detail = data.detail?.symbol === requested ? data.detail : null;
      const age = Math.max(
          0,
          Math.round(Date.now() / 1000 - Number(data.epoch)),
        ),
        fresh = Number.isFinite(age) && age <= 120;
      $("of-status").textContent =
        (fresh ? "● LIVE" : "◌ SNAPSHOT / STALE") +
        " · " +
        (selected?.active_venues_count ?? 0) +
        "/5 \u0431\u0438\u0440\u0436\n" +
        (data.timestamp_utc || "\u043d\u0435\u0442 \u0432\u0440\u0435\u043c\u0435\u043d\u0438") +
        (detail ? "" : " · bridge offline");
      $("of-market").textContent =
        "#" + symbol + " / USDT · Bybit Futures · 1m";
      $("of-price").textContent =
        selected?.reference_price > 0
          ? "$" +
            selected.reference_price.toLocaleString("en-US", {
              maximumFractionDigits: 6,
            }) +
            " · OI " +
            money(selected.aggregated_metrics.total_open_interest_usd)
          : "\u041d\u0435\u0442 \u043b\u0438\u0441\u0442\u0438\u043d\u0433\u0430 / \u043f\u0443\u0431\u043b\u0438\u0447\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b";
      renderCards();
      draw();
      root.dataset.ready = "true";
    } catch (error) {
      if (current === generation) {
        $("of-status").textContent = "OFFLINE · \u0434\u0430\u043d\u043d\u044b\u0435 \u043d\u0435 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u044b";
        payload = null;
        selected = null;
        detail = null;
        renderCards();
        draw();
      }
    } finally {
      busy = false;
    }
  }
  root.querySelectorAll("[data-of-symbol]").forEach((button) =>
    button.addEventListener("click", () => {
      symbol = button.dataset.ofSymbol;
      generation++;
      busy = false;
      selected = null;
      detail = null;
      root.dataset.ready = "false";
      root
        .querySelectorAll("[data-of-symbol]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      $("of-bybit").href =
        "https://www.bybit.com/trade/usdt/" +
        symbol +
        "USDT?affiliate_id=XBPK8";
      $("of-okx").href =
        "https://www.okx.com/trade-swap/" + symbol.toLowerCase() + "-usdt-swap";
      $("of-hl").href = "https://app.hyperliquid.xyz/trade/" + symbol;
      renderCards();
      draw();
      refresh();
    }),
  );
  canvas.addEventListener("click", (event) => {
    const box = canvas.getBoundingClientRect(),
      px = event.clientX - box.left,
      py = event.clientY - box.top;
    inspect(
      hits.find(
        (hit) => Math.abs(hit.x - px) <= 18 && Math.abs(hit.y - py) <= 18,
      ),
    );
  });
  canvas.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && hits.length) {
      event.preventDefault();
      keyboardIndex = (keyboardIndex + 1) % hits.length;
      inspect(hits[keyboardIndex]);
    }
  });
  new ResizeObserver(draw).observe(canvas);
  $("of-refresh").addEventListener("click", refresh);
  function connectLiquidations() {
    if (document.hidden) return;
    try {
      socket = new WebSocket("wss://fstream.binance.com/ws/!forceOrder@arr");
      socket.onopen = () => {
        socketState = "WS LIVE";
        retryMs = 2000;
        renderCards();
      };
      socket.onmessage = (message) => {
        try {
          const raw = JSON.parse(message.data),
            o = (raw.data || raw).o;
          if (!o) return;
          const token = String(o.s).replace(/USDT$/, ""),
            usd = Number(o.ap || o.p) * Number(o.z || o.q),
            time = Number(o.T);
          if (
            usd <= 50000 ||
            !Number.isFinite(time) ||
            !["TRUMP", "WLFI", "MELANIA", "BTC", "SOL", "LIT"].includes(token)
          )
            return;
          const id = [o.s, o.T, o.S, o.z, o.ap].join(":");
          if (liquidations.some((e) => e.id === id)) return;
          liquidations.push({
            id,
            symbol: token,
            usd,
            time,
            position: o.S === "SELL" ? "Long" : "Short",
          });
          liquidations = liquidations.slice(-200);
          renderCards();
          draw();
        } catch (_) {}
      };
      socket.onerror = () => {
        socketState = "WS \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d";
        renderCards();
      };
      socket.onclose = () => {
        socketState = "WS \u043e\u0442\u043a\u043b\u044e\u0447\u0451\u043d";
        renderCards();
        clearTimeout(retry);
        retry = setTimeout(connectLiquidations, retryMs);
        retryMs = Math.min(retryMs * 2, 60000);
      };
    } catch (_) {
      socketState = "WS \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d";
      renderCards();
    }
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      clearTimeout(retry);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    } else {
      refresh();
      connectLiquidations();
    }
  });
  window.addEventListener("pagehide", () => {
    clearTimeout(retry);
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
  });
  document.fonts.ready.then(draw);
  renderCards();
  refresh();
  connectLiquidations();
  setInterval(() => {
    if (!document.hidden) refresh();
  }, 30000);
  window.MakeCashOrderflowRadar = Object.freeze({
    refresh,
    getState: () => ({
      symbol,
      payload,
      detail,
      markers: hits,
      liquidations,
      socketState,
    }),
  });
})();
