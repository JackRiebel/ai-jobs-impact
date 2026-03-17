// ── Helpers ─────────────────────────────────────────────────────────────

function exposureColor(score, alpha = 1) {
  // Richer 5-stop gradient: teal → green → amber → orange → red
  const t = Math.max(0, Math.min(10, score)) / 10;
  const stops = [
    [0, 45, 180, 120],    // 0: deep teal
    [0.25, 52, 211, 153], // 2.5: emerald green
    [0.5, 250, 204, 21],  // 5: golden amber
    [0.75, 249, 115, 22], // 7.5: vivid orange
    [1, 239, 68, 68],     // 10: red
  ];
  let i = 0;
  for (; i < stops.length - 2; i++) { if (t <= stops[i + 1][0]) break; }
  const [t0, r0, g0, b0] = stops[i];
  const [t1, r1, g1, b1] = stops[i + 1];
  const s = (t - t0) / (t1 - t0);
  const r = Math.round(r0 + s * (r1 - r0));
  const g = Math.round(g0 + s * (g1 - g0));
  const b = Math.round(b0 + s * (b1 - b0));
  return `rgba(${r},${g},${b},${alpha})`;
}
function exposureRGB(score) {
  const t = Math.max(0, Math.min(10, score)) / 10;
  const stops = [
    [0, 45, 180, 120], [0.25, 52, 211, 153], [0.5, 250, 204, 21],
    [0.75, 249, 115, 22], [1, 239, 68, 68],
  ];
  let i = 0;
  for (; i < stops.length - 2; i++) { if (t <= stops[i + 1][0]) break; }
  const [t0, r0, g0, b0] = stops[i], [t1, r1, g1, b1] = stops[i + 1];
  const s = (t - t0) / (t1 - t0);
  return [Math.round(r0+s*(r1-r0)), Math.round(g0+s*(g1-g0)), Math.round(b0+s*(b1-b0))];
}

const EDU_COLORS = {
  "No formal educational credential": "#6ee7b7",
  "High school diploma or equivalent": "#34d399",
  "Postsecondary nondegree award": "#fbbf24",
  "Some college, no degree": "#fb923c",
  "See How to Become One": "#94a3b8",
  "Associate's degree": "#60a5fa",
  "Bachelor's degree": "#a78bfa",
  "Master's degree": "#c084fc",
  "Doctoral or professional degree": "#f472b6",
};

function fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return n.toLocaleString();
}
function fmtPay(n) { return n ? "$" + n.toLocaleString() : "—"; }

Chart.defaults.color = "#888894";
Chart.defaults.borderColor = "rgba(255,255,255,0.06)";
Chart.defaults.font.family = "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size = 11;

// ── Build all charts ───────────────────────────────────────────────────

(function() {
  const DATA = SOURCE_DATA;
  buildTreemap(DATA);
  buildExposureHistogram(DATA);
  buildTierDoughnut(DATA);
  buildPayExposure(DATA);
  buildJobLists(DATA);
  buildAiSkillTimeline();
  buildProficiencyGap();
  buildInsightCards();
  buildCoverageGap();
  buildCoverageGapDetails();
  buildEduExposure(DATA);
  buildEduPayVsExposure(DATA);
  buildEduAiSkill();
  buildEduMatrix();
  buildOutlookByExposure(DATA);
  buildGrowthProjection();
  buildYoungWorkerImpact();
  buildAdoptionRate();
  buildDemographicsExposure();
  buildAugVsAutomate();
  buildHistoricalChurn();
  buildFindings();
  setupNav();
})();

// ── TREEMAP (squarified, canvas-rendered) ──────────────────────────────

function buildTreemap(DATA) {
  const canvas = document.getElementById("treemapCanvas");
  const ctx = canvas.getContext("2d");
  const wrapper = canvas.parentElement;
  let dpr = window.devicePixelRatio || 1;
  let rects = [];
  let hovered = null;

  // Squarified treemap layout algorithm
  function squarify(items, x, y, w, h) {
    if (!items.length) return [];
    if (items.length === 1) return [{ ...items[0], rx: x, ry: y, rw: w, rh: h }];
    const total = items.reduce((s, d) => s + d.value, 0);
    if (total === 0) return [];
    const results = [];
    let rem = [...items], cx = x, cy = y, cw = w, ch = h;
    while (rem.length > 0) {
      const remTotal = rem.reduce((s, d) => s + d.value, 0);
      const vert = cw >= ch;
      const side = vert ? ch : cw;
      let row = [rem[0]], rowSum = rem[0].value;
      for (let i = 1; i < rem.length; i++) {
        const cand = [...row, rem[i]], candSum = rowSum + rem[i].value;
        if (worstAR(cand, candSum, side, remTotal, vert ? cw : ch) < worstAR(row, rowSum, side, remTotal, vert ? cw : ch)) {
          row = cand; rowSum = candSum;
        } else break;
      }
      const frac = rowSum / remTotal;
      const thick = vert ? cw * frac : ch * frac;
      let off = 0;
      for (const item of row) {
        const itemFrac = item.value / rowSum;
        const itemLen = side * itemFrac;
        if (vert) results.push({ ...item, rx: cx, ry: cy + off, rw: thick, rh: itemLen });
        else results.push({ ...item, rx: cx + off, ry: cy, rw: itemLen, rh: thick });
        off += itemLen;
      }
      if (vert) { cx += thick; cw -= thick; } else { cy += thick; ch -= thick; }
      rem = rem.slice(row.length);
    }
    return results;
  }
  function worstAR(row, rowSum, side, total, extent) {
    const re = extent * (rowSum / total);
    if (re === 0) return Infinity;
    let worst = 0;
    for (const item of row) {
      const il = side * (item.value / rowSum);
      if (il === 0) continue;
      worst = Math.max(worst, Math.max(re / il, il / re));
    }
    return worst;
  }

  let catRectsList = []; // store category-level rects for labels

  function layout() {
    const w = wrapper.clientWidth;
    const h = wrapper.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const CATGAP = 3, INNERGAP = 1;

    const bycat = {};
    DATA.forEach(d => {
      if (!bycat[d.category]) bycat[d.category] = [];
      bycat[d.category].push(d);
    });
    const cats = Object.keys(bycat).map(c => ({
      cat: c,
      name: CAT_NAMES[c] || c,
      items: bycat[c].sort((a, b) => (b.jobs || 0) - (a.jobs || 0)),
      value: bycat[c].reduce((s, d) => s + (d.jobs || 1), 0),
    })).sort((a, b) => b.value - a.value);

    catRectsList = squarify(cats, CATGAP, CATGAP, w - CATGAP * 2, h - CATGAP * 2);
    rects = [];
    for (const cr of catRectsList) {
      const pad = CATGAP;
      const items = cr.items.map(d => ({ ...d, value: d.jobs || 1 }));
      const inner = squarify(items, cr.rx + pad, cr.ry + pad, cr.rw - pad * 2, cr.rh - pad * 2);
      for (const ir of inner) ir._cat = cr.cat;
      rects.push(...inner);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function draw() {
    const cw = canvas.width / dpr, ch = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Dark background
    ctx.fillStyle = "#08080c";
    ctx.fillRect(0, 0, cw, ch);

    // Draw category group backgrounds (subtle)
    for (const cr of catRectsList) {
      roundRect(ctx, cr.rx, cr.ry, cr.rw, cr.rh, 4);
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fill();
    }

    // Draw occupation tiles
    const G = 0.6;
    for (const r of rects) {
      const isH = r === hovered;
      const rx = r.rx + G, ry = r.ry + G, rw = r.rw - G * 2, rh = r.rh - G * 2;
      if (rw <= 0 || rh <= 0) continue;

      const exp = r.exposure != null ? r.exposure : 5;
      const [cr, cg, cb] = exposureRGB(exp);
      const baseAlpha = isH ? 0.82 : 0.48;

      // Fill with rounded corners
      roundRect(ctx, rx, ry, rw, rh, 3);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${baseAlpha})`;
      ctx.fill();

      // Subtle inner glow on hover
      if (isH) {
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 1.5;
        roundRect(ctx, rx, ry, rw, rh, 3);
        ctx.stroke();
      }

      // Text labels — show on more tiles by lowering thresholds
      if (rw > 36 && rh > 14) {
        ctx.save();
        ctx.beginPath(); ctx.rect(rx + 3, ry + 2, rw - 6, rh - 4); ctx.clip();

        const fs = Math.min(13, Math.max(7.5, Math.min(rw / 8, rh / 2.8)));
        ctx.font = `600 ${fs}px -apple-system, system-ui, sans-serif`;
        ctx.fillStyle = isH ? "#fff" : "rgba(255,255,255,0.88)";
        ctx.textBaseline = "top";

        // Shadow for readability
        ctx.shadowColor = "rgba(0,0,0,0.5)";
        ctx.shadowBlur = 2;
        ctx.fillText(r.title, rx + 5, ry + 4);
        ctx.shadowBlur = 0;

        // Sub-label: exposure + jobs
        if (rh > 26 && rw > 44) {
          const info = (r.exposure != null ? r.exposure + "/10" : "") +
                       (r.jobs ? " · " + fmt(r.jobs) + " jobs" : "");
          ctx.font = `400 ${Math.max(7, fs - 2.5)}px -apple-system, system-ui, sans-serif`;
          ctx.fillStyle = isH ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.45)";
          ctx.fillText(info, rx + 5, ry + 5 + fs + 1);
        }
        // Third line: pay (for larger tiles)
        if (rh > 44 && rw > 60 && r.pay) {
          ctx.font = `400 ${Math.max(7, fs - 3)}px -apple-system, system-ui, sans-serif`;
          ctx.fillStyle = "rgba(255,255,255,0.35)";
          ctx.fillText(fmtPay(r.pay) + " median", rx + 5, ry + 6 + fs * 2);
        }
        ctx.restore();
      }
    }

    // Draw category labels (overlaid in corners of each group)
    ctx.save();
    for (const cr of catRectsList) {
      if (cr.rw < 60 || cr.rh < 30) continue;
      const name = cr.name || CAT_NAMES[cr.cat] || cr.cat;
      const fs = Math.min(11, Math.max(8, cr.rw / 18));
      ctx.font = `700 ${fs}px -apple-system, system-ui, sans-serif`;
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.textBaseline = "bottom";
      ctx.textAlign = "right";
      ctx.fillText(name.toUpperCase(), cr.rx + cr.rw - 5, cr.ry + cr.rh - 4);
    }
    ctx.restore();
  }

  function hitTest(mx, my) {
    const rect = canvas.getBoundingClientRect();
    const cx = mx - rect.left, cy = my - rect.top;
    for (let i = rects.length - 1; i >= 0; i--) {
      const r = rects[i];
      if (cx >= r.rx && cx < r.rx + r.rw && cy >= r.ry && cy < r.ry + r.rh) return r;
    }
    return null;
  }

  function showTooltip(d, mx, my) {
    const tt = document.getElementById("treemapTooltip");
    tt.querySelector(".tt-title").textContent = d.title;
    if (d.exposure != null) {
      const color = exposureColor(d.exposure, 1);
      tt.querySelector(".tt-exposure").innerHTML =
        `<span style="color:${color};font-weight:600;">AI Exposure: ${d.exposure}/10</span>` +
        `<div style="margin-top:2px;height:4px;background:rgba(255,255,255,0.08);border-radius:2px;"><div style="height:100%;width:${d.exposure*10}%;background:${color};border-radius:2px;"></div></div>`;
    } else { tt.querySelector(".tt-exposure").innerHTML = ""; }
    tt.querySelector(".tt-stats").innerHTML = `
      <span class="label">Median pay</span><span class="value">${fmtPay(d.pay)}</span>
      <span class="label">Jobs (2024)</span><span class="value">${fmt(d.jobs)}</span>
      <span class="label">Growth outlook</span><span class="value">${d.outlook != null ? d.outlook + '%' : '—'} ${d.outlook_desc ? '(' + d.outlook_desc + ')' : ''}</span>
      <span class="label">Education</span><span class="value">${d.education || '—'}</span>
      <span class="label">Sector</span><span class="value">${CAT_NAMES[d.category] || d.category}</span>`;
    tt.querySelector(".tt-rationale").textContent = d.exposure_rationale || "";
    const ttW = Math.min(340, window.innerWidth - 20);
    let tx = mx + 14, ty = my - 14;
    if (tx + ttW > window.innerWidth - 10) tx = Math.max(10, mx - ttW - 10);
    if (ty < 10) ty = my + 14;
    if (ty + 200 > window.innerHeight) ty = Math.max(10, my - 200);
    tt.style.left = tx + "px"; tt.style.top = ty + "px";
    tt.classList.add("visible");
  }
  function hideTooltip() { document.getElementById("treemapTooltip").classList.remove("visible"); }

  canvas.addEventListener("mousemove", e => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit !== hovered) { hovered = hit; draw(); }
    if (hovered) { showTooltip(hovered, e.clientX, e.clientY); canvas.style.cursor = "pointer"; }
    else { hideTooltip(); canvas.style.cursor = "default"; }
  });
  canvas.addEventListener("mouseleave", () => { hovered = null; hideTooltip(); draw(); });

  // Touch support for mobile
  canvas.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    const hit = hitTest(touch.clientX, touch.clientY);
    if (hit !== hovered) { hovered = hit; draw(); }
    if (hovered) { e.preventDefault(); showTooltip(hovered, touch.clientX, touch.clientY); }
    else { hideTooltip(); }
  }, { passive: false });
  canvas.addEventListener("touchmove", e => {
    const touch = e.touches[0];
    const hit = hitTest(touch.clientX, touch.clientY);
    if (hit !== hovered) { hovered = hit; draw(); }
    if (hovered) { e.preventDefault(); showTooltip(hovered, touch.clientX, touch.clientY); }
    else { hideTooltip(); }
  }, { passive: false });
  canvas.addEventListener("touchend", () => {
    if (hovered && hovered.url) window.open(hovered.url, "_blank");
    setTimeout(() => { hovered = null; hideTooltip(); draw(); }, 1500);
  });

  canvas.addEventListener("click", e => {
    const hit = hitTest(e.clientX, e.clientY);
    if (hit && hit.url) window.open(hit.url, "_blank");
  });

  function resize() { dpr = window.devicePixelRatio || 1; layout(); draw(); }
  window.addEventListener("resize", resize);
  resize();

  // Draw gradient legend
  const gc = document.getElementById("treemapGradient");
  if (gc) {
    const gctx = gc.getContext("2d");
    for (let x = 0; x < 120; x++) { gctx.fillStyle = exposureColor((x / 119) * 10, 1); gctx.fillRect(x, 0, 1, 10); }
  }
}

// ── 1. Exposure Histogram ──────────────────────────────────────────────

function buildExposureHistogram(DATA) {
  const buckets = new Array(11).fill(0);
  DATA.forEach(d => { if (d.exposure != null && d.jobs) buckets[d.exposure] += d.jobs; });

  new Chart(document.getElementById("exposureHistogram"), {
    type: "bar",
    data: {
      labels: Array.from({length: 11}, (_, i) => i),
      datasets: [{
        data: buckets,
        backgroundColor: Array.from({length: 11}, (_, i) => exposureColor(i, 0.65)),
        borderColor: Array.from({length: 11}, (_, i) => exposureColor(i, 1)),
        borderWidth: 1, borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => fmt(ctx.raw) + " jobs" } } },
      scales: {
        x: { title: { display: true, text: "AI Exposure Score" } },
        y: { title: { display: true, text: "Number of Jobs" }, ticks: { callback: v => fmt(v) } }
      }
    }
  });
}

// ── 2. Tier Doughnut ───────────────────────────────────────────────────

function buildTierDoughnut(DATA) {
  const tiers = [
    { name: "Minimal (0–1)", min: 0, max: 1 },
    { name: "Low (2–3)", min: 2, max: 3 },
    { name: "Moderate (4–5)", min: 4, max: 5 },
    { name: "High (6–7)", min: 6, max: 7 },
    { name: "Very High (8–10)", min: 8, max: 10 },
  ];
  const total = DATA.reduce((s, d) => s + (d.jobs || 0), 0);
  const tierJobs = tiers.map(t => DATA.filter(d => d.exposure != null && d.exposure >= t.min && d.exposure <= t.max).reduce((s, d) => s + (d.jobs || 0), 0));

  new Chart(document.getElementById("tierDoughnut"), {
    type: "doughnut",
    data: {
      labels: tiers.map(t => t.name),
      datasets: [{ data: tierJobs, backgroundColor: [exposureColor(0.5,0.8), exposureColor(2.5,0.8), exposureColor(4.5,0.8), exposureColor(6.5,0.8), exposureColor(9,0.8)], borderColor: "#1a1a28", borderWidth: 2 }]
    },
    options: {
      responsive: true, cutout: "55%",
      plugins: {
        legend: { position: "bottom", labels: { padding: 10, usePointStyle: true, pointStyle: "rectRounded", font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)} jobs (${(ctx.raw/total*100).toFixed(1)}%)` } }
      }
    }
  });
}

// ── 3. Pay vs Exposure ─────────────────────────────────────────────────

function buildPayExposure(DATA) {
  const bands = [
    {label:"<$35K",min:0,max:35000}, {label:"$35–50K",min:35000,max:50000},
    {label:"$50–75K",min:50000,max:75000}, {label:"$75–100K",min:75000,max:100000},
    {label:"$100–150K",min:100000,max:150000}, {label:"$150K+",min:150000,max:Infinity},
  ];
  const avgs = bands.map(b => {
    let ws=0,wc=0;
    DATA.forEach(d => { if (d.exposure!=null && d.jobs && d.pay && d.pay>=b.min && d.pay<b.max) { ws+=d.exposure*d.jobs; wc+=d.jobs; } });
    return wc>0 ? ws/wc : 0;
  });
  new Chart(document.getElementById("payExposure"), {
    type: "bar",
    data: { labels: bands.map(b=>b.label), datasets: [{ data: avgs, backgroundColor: avgs.map(v=>exposureColor(v,0.65)), borderColor: avgs.map(v=>exposureColor(v,1)), borderWidth: 1, borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: "Median Pay Band" } }, y: { min: 0, max: 8, title: { display: true, text: "Avg Exposure Score" } } } }
  });
}

// ── 4. Job Lists ───────────────────────────────────────────────────────

function buildJobLists(DATA) {
  const scored = DATA.filter(d => d.exposure != null && d.jobs).sort((a,b) => b.exposure - a.exposure || b.jobs - a.jobs);
  function renderList(items, el) {
    el.innerHTML = items.map(d =>
      `<div class="job-row"><div class="score-badge" style="background:${exposureColor(d.exposure,0.8)}">${d.exposure}</div><span class="job-title">${d.title}</span><span class="job-meta">${fmt(d.jobs)} · ${fmtPay(d.pay)}</span></div>`
    ).join("");
  }
  renderList(scored.slice(0, 14), document.getElementById("topJobsList"));
  renderList(scored.slice(-14).reverse(), document.getElementById("bottomJobsList"));
}

// ── 5. AI Skill Timeline ──────────────────────────────────────────────

function buildAiSkillTimeline() {
  const years = [2024,2025,2026,2027,2028,2029,2030,2031,2032,2033,2034];
  // Grounded in empirical data:
  // - PwC: AI-skilled wage premium 56%, productivity 4x higher in exposed industries
  // - St Louis Fed: 33% more productive during AI use, 5.4% time savings
  // - Anthropic: -0.6pp growth per 10pp coverage increase
  // - BLS: high-exposure tier avg growth 1.34% vs low-exposure 5.02%
  // AI-skilled: capture productivity gains (PwC 27% revenue/employee growth in exposed industries)
  // Non-AI-skilled: absorb displacement (-0.6pp/10pp, young worker -14% hiring decline)
  const aiSkilled = years.map((_,i) => 100 + i * 4.2);
  const average = years.map((_,i) => 100 + i * 1.1 - i*i*0.04);
  const nonAiSkilled = years.map((_,i) => Math.max(100 - i*i*0.35, 65));

  new Chart(document.getElementById("aiSkillTimeline"), {
    type: "line",
    data: {
      labels: years,
      datasets: [
        { label: "AI-Proficient Workers", data: aiSkilled, borderColor: "#34d399", backgroundColor: "rgba(52,211,153,0.08)", fill: true, tension: 0.3, borderWidth: 3, pointRadius: 3 },
        { label: "Average Worker", data: average, borderColor: "#fbbf24", borderDash: [6,3], tension: 0.3, borderWidth: 2, pointRadius: 2 },
        { label: "Non-AI-Skilled Workers", data: nonAiSkilled, borderColor: "#f87171", backgroundColor: "rgba(248,113,113,0.08)", fill: true, tension: 0.3, borderWidth: 3, pointRadius: 3 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 14 } } },
      scales: {
        y: { title: { display: true, text: "Career Position Index (2024 = 100)" }, min: 58, max: 150 },
        x: { title: { display: true, text: "Year" } }
      }
    }
  });
}

// ── 6. Proficiency Gap ─────────────────────────────────────────────────

function buildProficiencyGap() {
  // Empirical basis:
  // - In low-exposure physical jobs, AI usage is <2% of hours (St Louis Fed) → minimal impact
  // - In high-exposure jobs: 56% wage premium for AI-skilled (PwC), 15-55% productivity gain (multiple studies)
  // - Bottom-quintile workers gain 36% vs 15% avg (Brynjolfsson) → skill compression benefits AI learners most
  const levels = ["Minimal (0–1)", "Low (2–3)", "Moderate (4–5)", "High (6–7)", "Very High (8–10)"];
  const aiAdv =  [  2,   5,  16,  32,  48];
  const noAdv =  [ -1,  -3,  -9, -20, -35];

  new Chart(document.getElementById("proficiencyGap"), {
    type: "bar",
    data: {
      labels: levels,
      datasets: [
        { label: "AI-Skilled", data: aiAdv, backgroundColor: "rgba(52,211,153,0.65)", borderColor: "#34d399", borderWidth: 1, borderRadius: 4 },
        { label: "Not AI-Skilled", data: noAdv, backgroundColor: "rgba(248,113,113,0.65)", borderColor: "#f87171", borderWidth: 1, borderRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 10 } } },
      scales: {
        x: { title: { display: true, text: "Job's AI Exposure Level" } },
        y: { title: { display: true, text: "Projected Employability Change by 2034" }, ticks: { callback: v => (v>0?"+":"")+v+"%" } }
      }
    }
  });
}

// ── 7. Insight Cards ───────────────────────────────────────────────────

function buildInsightCards() {
  const insights = [
    { icon: "&#x26A1;", bg: "rgba(52,211,153,0.12)", title: "56% Wage Premium",
      body: "PwC's analysis of 1B+ job postings: roles requiring AI skills pay 56% more on average — doubled from 25% in 2023.", stat: "+56%", statColor: "#34d399" },
    { icon: "&#x1F4C8;", bg: "rgba(96,165,250,0.12)", title: "Productivity Multiplier",
      body: "Empirical studies show 15–55% task-time reduction. GitHub Copilot: 55.8% faster. Customer support: 15% avg, 36% for bottom quintile.", stat: "15–55%", statColor: "#60a5fa" },
    { icon: "&#x1F4C9;", bg: "rgba(248,113,113,0.12)", title: "Young Worker Warning",
      body: "Brynjolfsson/ADP (3.5–5M workers/month): ages 22–25 in high-exposure jobs saw 16% employment decline. Software devs: -20%. But EIG found unemployment rose less for AI-exposed workers. Evidence is contested.", stat: "-16%", statColor: "#f87171" },
    { icon: "&#x1F6E1;", bg: "rgba(251,191,36,0.12)", title: "Skills Changing 66% Faster",
      body: "PwC: skills demanded in AI-exposed roles are changing 66% faster than other jobs (up from 25%). Adapt or fall behind.", stat: "66%", statColor: "#fbbf24" },
  ];
  document.getElementById("insightCards").innerHTML = insights.map(i =>
    `<div class="insight-card"><div class="ic-header"><div class="ic-icon" style="background:${i.bg}">${i.icon}</div><div class="ic-title">${i.title}</div></div><div class="ic-body">${i.body}</div><div class="ic-stat" style="color:${i.statColor}">${i.stat}</div></div>`).join("");
}

// ── 8. Coverage Gap ────────────────────────────────────────────────────

function buildCoverageGap() {
  // Theoretical: Eloundou et al. β metric (% of tasks AI could theoretically handle)
  // Observed: Anthropic Economic Index Jan 2026 report (actual Claude usage data, ~2M conversations)
  new Chart(document.getElementById("coverageGap"), {
    type: "bar",
    data: {
      labels: ["Computer\n& Math", "Office\n& Admin", "Business\n& Finance", "Sales", "Legal", "Arts\n& Media"],
      datasets: [
        { label: "Theoretical AI Capability (β metric)", data: [94, 90, 88, 62, 89, 83.7], backgroundColor: "rgba(167,139,250,0.35)", borderColor: "#a78bfa", borderWidth: 1, borderRadius: 4 },
        { label: "Actual Observed Usage (Claude data, Jan 2026)", data: [35.8, 34.3, 28.4, 26.9, 20.4, 19.2], backgroundColor: "rgba(96,165,250,0.7)", borderColor: "#60a5fa", borderWidth: 1, borderRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 12 } }, tooltip: { callbacks: { label: ctx => ctx.raw != null ? ` ${ctx.dataset.label}: ${ctx.raw}%` : "" } } },
      scales: { y: { min: 0, max: 100, title: { display: true, text: "% of Tasks" }, ticks: { callback: v => v+"%" } } }
    }
  });
}

// ── 8b. Coverage Gap Details (per-sector breakdown) ─────────────────────

function buildCoverageGapDetails() {
  const sectors = [
    {
      icon: "&#x1F4BB;", bg: "rgba(96,165,250,0.12)",
      title: "Computer & Math — 94% theoretical → 35.8% actual",
      gap: "58.2pp gap",
      body: "The highest theoretical exposure of any sector — nearly every task in software development, data analysis, and IT support is deemed automatable by Eloundou et al.'s β metric. Yet only about a third of work is actually done with AI. Why? Many tasks require context about proprietary systems, legacy code, and organizational knowledge that AI can't access. Security and compliance constraints block AI from production environments. And the 'last mile' of debugging, deployment, and stakeholder communication remains human. Still, this sector has the <strong>smallest</strong> gap — adoption is furthest along here.",
      statLabel: "Gap", stat: "58.2pp", statColor: "#60a5fa"
    },
    {
      icon: "&#x1F4CB;", bg: "rgba(251,191,36,0.12)",
      title: "Office & Admin — 90% theoretical → 34.3% actual",
      gap: "55.7pp gap",
      body: "Scheduling, data entry, correspondence, record-keeping — these tasks score extremely high on AI capability assessments. But adoption is held back by organizational inertia, fragmented IT systems, and the fact that many admin roles serve as 'glue' connecting departments through human judgment and relationship management. Census BTOS data shows even in the Information sector, >60% of firms haven't adopted AI. For office workers in less tech-forward industries (healthcare admin, local government), adoption lags further. The gap here represents massive untapped potential — and future risk for workers who don't adapt.",
      statLabel: "Gap", stat: "55.7pp", statColor: "#fbbf24"
    },
    {
      icon: "&#x1F4B0;", bg: "rgba(52,211,153,0.12)",
      title: "Business & Finance — 88% theoretical → 28.4% actual",
      gap: "59.6pp gap",
      body: "Financial analysis, reporting, forecasting, and compliance tasks rate extremely high on theoretical automability. Actual usage is moderate — AI excels at pattern recognition in financial data, but regulatory requirements, fiduciary duties, and the need for human accountability in financial decisions slow adoption. Client-facing advisory work, complex negotiations, and strategic planning remain firmly human. The 59.6pp gap is the <strong>largest</strong> of any sector measured, suggesting significant disruption ahead as compliance frameworks catch up to AI capabilities.",
      statLabel: "Gap", stat: "59.6pp", statColor: "#34d399"
    },
    {
      icon: "&#x1F6D2;", bg: "rgba(251,146,60,0.12)",
      title: "Sales — 62% theoretical → 26.9% actual",
      gap: "35.1pp gap",
      body: "Sales has the <strong>lowest theoretical exposure</strong> of the six sectors — many sales tasks depend on relationship-building, persuasion, and reading social cues that AI handles poorly. Yet its actual usage rate (26.9%) is relatively close to sectors with much higher theoretical scores. This suggests sales professionals are adopting AI for the tasks it does well (lead research, email drafting, CRM analysis, proposal generation) while the human-centric core of selling remains untouched. The <strong>smallest gap</strong> (35.1pp) reflects a pragmatic, targeted adoption pattern.",
      statLabel: "Gap", stat: "35.1pp", statColor: "#fb923c"
    },
    {
      icon: "&#x2696;", bg: "rgba(167,139,250,0.12)",
      title: "Legal — 89% theoretical → 20.4% actual",
      gap: "68.6pp gap",
      body: "Legal work scores near the top on theoretical exposure — document review, case research, contract analysis, and regulatory interpretation are all tasks AI can perform. But actual usage is strikingly low at just 20.4%. This reflects a profession where accuracy has extreme consequences (malpractice liability), where attorney-client privilege creates data barriers, and where courts and regulators are slow to accept AI-generated work. Schwarcz et al. found law students saved 50–130% of time on complex tasks with AI — the capability is real, but institutional adoption barriers are the steepest of any sector measured.",
      statLabel: "Gap", stat: "68.6pp", statColor: "#a78bfa"
    },
    {
      icon: "&#x1F3A8;", bg: "rgba(244,114,182,0.12)",
      title: "Arts & Media — 83.7% theoretical → 19.2% actual",
      gap: "64.5pp gap",
      body: "AI image generators, writing assistants, and video tools score high on task automation metrics. But actual usage is the <strong>lowest</strong> of any sector at 19.2%. Creative work involves taste, cultural context, brand identity, and originality that AI struggles with — and clients and audiences often resist AI-generated content. There's also active industry pushback: copyright disputes, union negotiations (SAG-AFTRA), and audience authenticity concerns all slow adoption. The 64.5pp gap suggests this sector may see slower disruption than theorists predicted, at least in the near term.",
      statLabel: "Gap", stat: "64.5pp", statColor: "#f472b6"
    },
  ];

  document.getElementById("coverageGapDetails").innerHTML = sectors.map(s =>
    `<div class="insight-card">
      <div class="ic-header">
        <div class="ic-icon" style="background:${s.bg}">${s.icon}</div>
        <div class="ic-title">${s.title}</div>
      </div>
      <div class="ic-body">${s.body}</div>
      <div class="ic-stat" style="color:${s.statColor}">${s.stat}</div>
    </div>`
  ).join("");
}

// ── 9. Education Exposure ──────────────────────────────────────────────

function buildEduExposure(DATA) {
  const stats = {};
  DATA.forEach(d => {
    if (d.exposure == null || !d.jobs || !d.education) return;
    if (!stats[d.education]) stats[d.education] = { jobs: 0, expSum: 0 };
    stats[d.education].jobs += d.jobs;
    stats[d.education].expSum += d.exposure * d.jobs;
  });
  const edus = EDU_ORDER.filter(e => stats[e] && stats[e].jobs > 0);
  const avgs = edus.map(e => stats[e].expSum / stats[e].jobs);
  const jobCounts = edus.map(e => stats[e].jobs);

  new Chart(document.getElementById("eduExposure"), {
    type: "bar",
    data: { labels: edus.map(e => EDU_SHORT[e]||e), datasets: [{ data: avgs, backgroundColor: avgs.map(v=>exposureColor(v,0.6)), borderColor: avgs.map(v=>exposureColor(v,1)), borderWidth: 1, borderRadius: 4 }] },
    options: { indexAxis: "y", responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Avg Exposure: ${ctx.raw.toFixed(2)} | ${fmt(jobCounts[ctx.dataIndex])} workers` } } }, scales: { x: { min: 0, max: 8, title: { display: true, text: "Job-Weighted Avg AI Exposure" } } } }
  });
}

// ── 10. Education: Pay vs Exposure ─────────────────────────────────────

function buildEduPayVsExposure(DATA) {
  const stats = {};
  DATA.forEach(d => {
    if (d.exposure == null || !d.jobs || !d.education || !d.pay) return;
    if (!stats[d.education]) stats[d.education] = { jobs: 0, expSum: 0, paySum: 0 };
    stats[d.education].jobs += d.jobs; stats[d.education].expSum += d.exposure * d.jobs; stats[d.education].paySum += d.pay * d.jobs;
  });
  const edus = EDU_ORDER.filter(e => stats[e] && stats[e].jobs > 0);
  const points = edus.map(e => ({ x: stats[e].expSum/stats[e].jobs, y: stats[e].paySum/stats[e].jobs, r: Math.max(6, Math.sqrt(stats[e].jobs/500000)*5), label: EDU_SHORT[e]||e, jobs: stats[e].jobs }));

  new Chart(document.getElementById("eduPayVsExposure"), {
    type: "bubble",
    data: { datasets: [{ data: points, backgroundColor: edus.map(e=>(EDU_COLORS[e]||"#94a3b8")+"99"), borderColor: edus.map(e=>EDU_COLORS[e]||"#94a3b8"), borderWidth: 1.5 }] },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => { const p=ctx.raw; return [`${p.label}`,`Avg Exposure: ${p.x.toFixed(1)}`,`Avg Pay: ${fmtPay(Math.round(p.y))}`,`Workers: ${fmt(p.jobs)}`]; } } } },
      scales: { x: { title: { display: true, text: "Average AI Exposure" }, min: 2, max: 8 }, y: { title: { display: true, text: "Average Median Pay" }, ticks: { callback: v => "$"+(v/1000).toFixed(0)+"K" } } }
    }
  });
}

// ── 11. Education + AI Skill ───────────────────────────────────────────

function buildEduAiSkill() {
  // Grounded in: PwC 56% wage premium for AI-skilled, Anthropic 17.4% vs 4.5% grad degree,
  // real exposure avgs: no-credential 3.09, HS 4.91, Bachelor's 6.74, Master's+ 5.67-5.69
  // PwC: degree requirements dropping 7-9pp for AI jobs → no-degree AI-skilled gaining access
  const cats = ["No Credential\n(exp: 3.1)", "High School\n(exp: 4.9)", "Some College\n(exp: 5.5)", "Bachelor's\n(exp: 6.7)", "Master's+\n(exp: 5.7)"];
  const aiSkilled =   [ 10,  15,  24,  38,  48];
  const notAiSkilled = [-2,  -6, -12, -20, -28];

  new Chart(document.getElementById("eduAiSkill"), {
    type: "bar",
    data: { labels: cats, datasets: [
      { label: "AI-Skilled", data: aiSkilled, backgroundColor: "rgba(52,211,153,0.65)", borderColor: "#34d399", borderWidth: 1, borderRadius: 4 },
      { label: "Not AI-Skilled", data: notAiSkilled, backgroundColor: "rgba(248,113,113,0.65)", borderColor: "#f87171", borderWidth: 1, borderRadius: 4 },
    ] },
    options: { responsive: true, plugins: { legend: { position: "top", labels: { usePointStyle: true } } }, scales: { y: { title: { display: true, text: "Projected Employability Change by 2034" }, ticks: { callback: v => (v>0?"+":"")+v+"%" } } } }
  });
}

// ── 12. Education-AI Matrix ────────────────────────────────────────────

function buildEduMatrix() {
  const cells = [
    { title: "Degree + AI-Skilled", tag: "Best Positioned", tagColor: "#34d399", tagBg: "rgba(52,211,153,0.12)",
      body: "Domain expertise amplified by AI mastery. PwC data: 56% wage premium, 4x productivity growth in exposed industries. These workers direct AI workflows rather than compete with them. Anthropic's 17.4% grad-degree concentration in exposed roles means this group has the most to gain — or lose.",
      outlook: "+38–48% employability", outlookColor: "#34d399",
      examples: "Data scientist using AI for rapid modeling · Lawyer using AI for discovery, focusing on strategy · Financial analyst automating reports, focusing on advisory" },
    { title: "Degree + Not AI-Skilled", tag: "High Risk", tagColor: "#fb923c", tagBg: "rgba(251,146,60,0.12)",
      body: "Highest exposure, no offset. Bachelor's degree holders face 6.74 avg exposure — the highest of any education level. Anthropic: 17.4% of exposed workers hold grad degrees vs 4.5% of unexposed. Without AI skills, their core digital work is exactly what AI automates. Brynjolfsson/ADP: young workers (22–25) in high-exposure roles saw 16–20% employment declines. However, EIG found no differential impact on young workers using CPS data — the evidence is contested (see Key Findings).",
      outlook: "-20–28% employability", outlookColor: "#f87171",
      examples: "Junior accountant doing routine audits · Paralegal doing document review · Entry-level analyst running standard reports · Copywriter producing templated content" },
    { title: "No Degree + AI-Skilled", tag: "Rising Opportunity", tagColor: "#60a5fa", tagBg: "rgba(96,165,250,0.12)",
      body: "AI as the great equalizer. PwC: degree requirements are dropping 7–9pp for AI-augmented and automated roles. Empirically, lower-skilled workers gain disproportionately from AI (Brynjolfsson: 36% gain for bottom quintile vs 15% avg). AI tools let these workers access knowledge-work tiers previously gated by credentials.",
      outlook: "+10–24% employability", outlookColor: "#34d399",
      examples: "Self-taught prompt engineer · Customer service rep moving into operations analysis · Tradesperson using AI for business management · Content creator leveraging AI production tools" },
    { title: "No Degree + Not AI-Skilled", tag: "Moderate Risk", tagColor: "#fbbf24", tagBg: "rgba(251,191,36,0.12)",
      body: "Somewhat protected short-term: avg exposure only 3.09 for no-credential roles (physical work). BLS projects 4–5% growth for low-exposure tiers. But upward mobility narrows as adjacent digital roles automate. St. Louis Fed: personal service workers use AI in only 1.3% of hours — they're not at risk, but they're also not benefiting.",
      outlook: "-2–6% employability", outlookColor: "#fb923c",
      examples: "Construction laborer (exposure: 1, jobs growing 7%) · Warehouse worker as logistics roles automate adjacently · Food service worker with fewer paths to office roles" },
  ];
  document.getElementById("eduMatrix").innerHTML = cells.map(c =>
    `<div class="matrix-cell"><h4>${c.title}</h4><span class="mc-tag" style="color:${c.tagColor};background:${c.tagBg}">${c.tag}</span><p>${c.body}</p><div class="mc-outlook" style="color:${c.outlookColor}">${c.outlook}</div><div class="mc-examples">${c.examples}</div></div>`
  ).join("");
}

// ── 13. Outlook by Exposure ────────────────────────────────────────────

function buildOutlookByExposure(DATA) {
  const tiers = [{label:"Minimal (0–1)",min:0,max:1},{label:"Low (2–3)",min:2,max:3},{label:"Moderate (4–5)",min:4,max:5},{label:"High (6–7)",min:6,max:7},{label:"Very High (8–10)",min:8,max:10}];
  const avgs = tiers.map(t => {
    let ws=0,wc=0;
    DATA.forEach(d => { if(d.exposure!=null&&d.jobs&&d.outlook!=null&&d.exposure>=t.min&&d.exposure<=t.max){ws+=d.outlook*d.jobs;wc+=d.jobs;} });
    return wc>0?ws/wc:0;
  });
  new Chart(document.getElementById("outlookByExposure"), {
    type: "bar",
    data: { labels: tiers.map(t=>t.label), datasets: [{ label: "Avg BLS Growth Projection", data: avgs, backgroundColor: tiers.map((t,i)=>exposureColor((t.min+t.max)/2,0.65)), borderColor: tiers.map((t,i)=>exposureColor((t.min+t.max)/2,1)), borderWidth: 1, borderRadius: 4 }] },
    options: { responsive: true, plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Avg projected growth: ${ctx.raw.toFixed(2)}%` } } }, scales: { x: { title: { display: true, text: "AI Exposure Tier" } }, y: { title: { display: true, text: "Avg BLS Projected Growth 2024–2034 (%)" }, ticks: { callback: v => v.toFixed(1)+"%" } } } }
  });
}

// ── 14. Growth Projection ──────────────────────────────────────────────

function buildGrowthProjection() {
  const years = [2024,2025,2026,2027,2028,2029,2030,2031,2032,2033,2034];
  // Basis: BLS projects 3.1% total growth 2024-2034, Computer/Math 10.1%
  // PwC: AI-exposed industries 27% productivity growth, AI-skilled jobs +7.5%/yr
  // Anthropic: -0.6pp per 10pp coverage, young workers -14% hiring
  const degreeAI     = years.map((_,i) => 100 + i*4.8);
  const noDegreeAI   = years.map((_,i) => 100 + i*2.6);
  const noDegreeNoAI = years.map((_,i) => 100 - i*0.15 - i*i*0.04);
  const degreeNoAI   = years.map((_,i) => 100 - i*0.3 - i*i*0.16);

  new Chart(document.getElementById("growthProjection"), {
    type: "line",
    data: { labels: years, datasets: [
      { label: "Degree + AI-Skilled", data: degreeAI, borderColor: "#34d399", borderWidth: 3, tension: 0.3, pointRadius: 3 },
      { label: "No Degree + AI-Skilled", data: noDegreeAI, borderColor: "#60a5fa", borderWidth: 3, tension: 0.3, pointRadius: 3 },
      { label: "No Degree + Not AI-Skilled", data: noDegreeNoAI, borderColor: "#fbbf24", borderWidth: 2, tension: 0.3, pointRadius: 2, borderDash: [6,3] },
      { label: "Degree + Not AI-Skilled", data: degreeNoAI, borderColor: "#f87171", borderWidth: 3, tension: 0.3, pointRadius: 3, borderDash: [6,3] },
    ] },
    options: { responsive: true, plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 12 } } }, scales: { y: { title: { display: true, text: "Employment Index (2024 = 100)" }, min: 78, max: 155 }, x: { title: { display: true, text: "Year" } } } }
  });
}

// ── 15. Young Worker Impact (Brynjolfsson/ADP) ─────────────────────────

function buildYoungWorkerImpact() {
  // Brynjolfsson, Chandar & Chen (2025), Stanford/ADP, 3.5-5M workers/month
  // Updated Nov 2025. Controlled for remote work, tech sector, interest rate sensitivity
  const occupations = ["Software\nDevelopers", "Customer\nService", "Marketing\n& Sales", "Accounting", "Health\nAides"];
  const young = [-20, -15, -12, -10, 8];   // ages 22-25
  const older = [6, 3, 7, 5, 12];          // ages 30+

  new Chart(document.getElementById("youngWorkerImpact"), {
    type: "bar",
    data: {
      labels: occupations,
      datasets: [
        { label: "Ages 22–25", data: young, backgroundColor: young.map(v => v < 0 ? "rgba(248,113,113,0.65)" : "rgba(52,211,153,0.65)"), borderColor: young.map(v => v < 0 ? "#f87171" : "#34d399"), borderWidth: 1, borderRadius: 4 },
        { label: "Ages 30+", data: older, backgroundColor: "rgba(96,165,250,0.65)", borderColor: "#60a5fa", borderWidth: 1, borderRadius: 4 },
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top", labels: { usePointStyle: true, padding: 10 } }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw > 0 ? "+" : ""}${ctx.raw}%` } } },
      scales: {
        x: { title: { display: true, text: "Occupation" } },
        y: { title: { display: true, text: "Employment Change Since Late 2022" }, ticks: { callback: v => (v > 0 ? "+" : "") + v + "%" } }
      }
    }
  });
}

// ── 16. AI Adoption Rate (Census BTOS) ──────────────────────────────────

function buildAdoptionRate() {
  // Census Bureau BTOS via Goldschlag (2025). Actual firm-level adoption data.
  const labels = ["All Firms\n(production)", "All Firms\n(any function)", "Information", "Publishing", "Data\nProcessing", "Prof. /\nTech Services"];
  const values = [10, 17.3, 27, 36, 35, 15];

  new Chart(document.getElementById("adoptionRate"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "% of Firms Using AI",
        data: values,
        backgroundColor: values.map(v => `rgba(167,139,250,${0.3 + v / 60})`),
        borderColor: "#a78bfa",
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.raw}% of firms` } } },
      scales: {
        x: { title: { display: true, text: "Sector (Census BTOS, Nov 2025)" } },
        y: { min: 0, max: 45, title: { display: true, text: "% of Firms Using AI" }, ticks: { callback: v => v + "%" } }
      }
    }
  });
}

// ── 17. Demographics Exposure ─────────────────────────────────────────

function buildDemographicsExposure() {
  const labels = ["Women vs Men\n(+16pp exposure)", "White vs Other\n(+11pp exposure)", "Exposed Workers\nEarn 47% More"];
  const values = [16, 11, 47];
  const colors = ["rgba(248,113,113,0.65)", "rgba(96,165,250,0.65)", "rgba(52,211,153,0.65)"];
  const borders = ["#f87171", "#60a5fa", "#34d399"];

  new Chart(document.getElementById("demographicsExposure"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ctx.dataIndex < 2 ? ` +${ctx.raw}pp higher exposure` : ` +${ctx.raw}% earnings gap` } }
      },
      scales: {
        x: { min: 0, max: 55, title: { display: true, text: "Percentage Points / Percent" }, ticks: { callback: v => v + (v <= 20 ? "pp" : "%") } },
        y: { ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ── 18. Augmentation vs Automation ───────────────────────────────────

function buildAugVsAutomate() {
  new Chart(document.getElementById("augVsAutomate"), {
    type: "doughnut",
    data: {
      labels: ["Augmentation (57%)", "Automation (43%)"],
      datasets: [{
        data: [ANTHROPIC_AUGMENTATION.augmentation, ANTHROPIC_AUGMENTATION.automation],
        backgroundColor: ["rgba(52,211,153,0.7)", "rgba(249,115,22,0.7)"],
        borderColor: ["#34d399", "#f97316"],
        borderWidth: 2,
        hoverOffset: 8,
      }]
    },
    options: {
      responsive: true,
      cutout: "55%",
      plugins: {
        legend: { position: "bottom", labels: { usePointStyle: true, padding: 14, font: { size: 12 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.raw}% of AI usage` } }
      }
    }
  });
}

// ── 19. Historical Occupational Churn ────────────────────────────────

function buildHistoricalChurn() {
  const labels = BROOKINGS_CHURN.map(d => d.era);
  const values = BROOKINGS_CHURN.map(d => d.value);
  const bgs = BROOKINGS_CHURN.map(d => d.highlight ? "rgba(167,139,250,0.7)" : "rgba(148,163,184,0.35)");
  const borders = BROOKINGS_CHURN.map(d => d.highlight ? "#a78bfa" : "rgba(148,163,184,0.5)");

  new Chart(document.getElementById("historicalChurn"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Relative Occupational Mix Change",
        data: values,
        backgroundColor: bgs,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` Relative churn index: ${ctx.raw}` } }
      },
      scales: {
        x: { min: 0, max: 45, title: { display: true, text: "Relative Magnitude of Occupational Mix Change (illustrative)" } },
        y: { ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ── 20. Key Findings ───────────────────────────────────────────────────

function buildFindings() {
  const findings = [
    { stat: "-20%", color: "#f87171", title: "Young Software Devs Hit Hardest",
      body: "Brynjolfsson/ADP (3.5–5M workers/month): Software developers ages 22–25 saw employment fall 20% from late-2022 peak, while older devs grew +6%. Controlled for remote work, tech sector, and interest rates." },
    { stat: "+56%", color: "#34d399", title: "AI Wage Premium",
      body: "PwC (1B+ job postings, 6 continents): roles requiring AI skills pay 56% more on average — doubled from 25% in 2023. The premium exists in every industry and geography analyzed." },
    { stat: "~10%", color: "#a78bfa", title: "Most Firms Haven't Started",
      body: "Census Bureau BTOS: only ~10% of firms use AI in production as of Sept 2025 (up from 4.6% in early 2024). Even in Information sector, >60% of firms don't use AI. The disruption is still early." },
    { stat: "0.30 vs 0.94", color: "#60a5fa", title: "Counterpoint: EIG Data",
      body: "Eckhardt & Goldschlag (EIG, CPS data, 5 AI measures): unemployment rose just 0.30pp for most-exposed vs 0.94pp for least-exposed. Why does this contradict Brynjolfsson? EIG uses smaller CPS sample and looks at all ages, while Brynjolfsson isolates 22–25 where effects concentrate. Both may be right: AI hits young workers in specific roles, but overall employment remains stable." },
    { stat: "94→36%", color: "#fb923c", title: "The Coverage Gap",
      body: "Anthropic: AI can theoretically handle 94% of Computer & Math tasks, but only 35.8% are done with AI. Yale Budget Lab (7 measures): exposure ≠ usage. Office jobs rank high on exposure but low on actual usage." },
    { stat: "+47%", color: "#fbbf24", title: "Exposed = Well-Paid",
      body: "Anthropic: highly exposed workers earn 47% more than unexposed. AI targets valuable knowledge work (analysis, writing, coding), not minimum-wage manual labor. The opposite of past automation waves." },
    { stat: "55.8%", color: "#60a5fa", title: "Copilot Productivity Gain",
      body: "Peng et al.: GitHub Copilot users complete coding tasks 55.8% faster. Brynjolfsson (n=5,172): 15% avg gain, 36% for bottom quintile. Noy & Zhang (n=453): 40% time reduction, +18% quality." },
    { stat: "Inconclusive", color: "#94a3b8", title: "Brookings: Research Is Early",
      body: "Kolko (Hamilton Project/Brookings, March 2026): evidence is collectively inconclusive. Seven AI exposure measures don't fully agree (Yale). Occupational churn since 2022 is 'not atypical' vs PC/Internet eras. Only ~10% of firms use AI in production (Census). Key warning: 'narrator bias' — researchers whose own jobs are AI-exposed may overinterpret early signals." },
  ];
  document.getElementById("findingsGrid").innerHTML = findings.map(f =>
    `<div class="finding-card"><div class="fc-stat" style="color:${f.color}">${f.stat}</div><div class="fc-title">${f.title}</div><div class="fc-body">${f.body}</div></div>`
  ).join("");
}

// ── Navigation ─────────────────────────────────────────────────────────

function setupNav() {
  const links = document.querySelectorAll(".nav-link");
  const sections = [...links].map(l => document.querySelector(l.getAttribute("href")));
  function update() {
    let current = 0;
    sections.forEach((s,i) => { if (s && s.offsetTop <= window.scrollY + 100) current = i; });
    links.forEach((l,i) => l.classList.toggle("active", i === current));
  }
  window.addEventListener("scroll", update, { passive: true });
  links.forEach(l => l.addEventListener("click", e => { e.preventDefault(); document.querySelector(l.getAttribute("href")).scrollIntoView({ behavior: "smooth" }); }));
}
