const memStore = {};
let storeCache = null;

function rawGet(area, key) {
  try {
    const v = window[area].getItem(key);
    if (v !== null) return v;
  } catch (e) { /* private mode */ }
  return Object.prototype.hasOwnProperty.call(memStore, area + key) ? memStore[area + key] : null;
}
function rawSet(area, key, val) {
  memStore[area + key] = val;
  try { window[area].setItem(key, val); } catch (e) { /* keep memory copy */ }
}
function rawRemove(area, key) {
  delete memStore[area + key];
  try { window[area].removeItem(key); } catch (e) {}
}

const EMPTY_REC = Object.freeze({ seen: 0, correct: 0, wrong: 0, streak: 0 });

function loadStore() {
  if (storeCache) return storeCache;
  const raw = rawGet("localStorage", STORE);
  let obj;
  try { obj = raw ? JSON.parse(raw) : {}; } catch (e) { obj = {}; }
  if (!obj || typeof obj !== "object") obj = {};
  if (!obj.history || typeof obj.history !== "object") obj.history = {};
  if (!obj.sessions || typeof obj.sessions !== "object") obj.sessions = {};
  if (!obj.recent || typeof obj.recent !== "object") obj.recent = {};
  storeCache = obj;
  return storeCache;
}
function saveStore(obj) {
  storeCache = obj;
  rawSet("localStorage", STORE, JSON.stringify(obj));
}
function rec(qid) {
  return loadStore().history[qid] || EMPTY_REC;
}
function recordResult(qid, correct, domain) {
  const s = loadStore();
  const prev = s.history[qid] || EMPTY_REC;
  const h = {
    seen: (prev.seen || 0) + 1,
    correct: (prev.correct || 0) + (correct ? 1 : 0),
    wrong: (prev.wrong || 0) + (correct ? 0 : 1),
    streak: correct ? (prev.streak || 0) + 1 : 0,
  };
  s.history[qid] = h;
  const d = String(domain || "");
  if (d) {
    const arr = Array.isArray(s.recent[d]) ? s.recent[d].slice() : [];
    arr.push(correct ? 1 : 0);
    s.recent[d] = arr.slice(-20);
  }
  saveStore(s);
  return h;
}
function isMastered(q) { return (rec(q.id).streak || 0) >= MASTER_STREAK; }
function isWeak(q) { return (rec(q.id).wrong || 0) >= WEAK_MISSES; }
function isOpenMiss(q) { return (rec(q.id).wrong || 0) > 0 && !isMastered(q); }

function qById(id) {
  return state.data.questions.find((q) => String(q.id) === String(id));
}
function sessionOf(key) {
  const s = loadStore().sessions[key];
  return s && typeof s === "object" ? s : null;
}
function sessionProgress(sess) {
  if (!sess || !Array.isArray(sess.ids) || !sess.ids.length) return null;
  const idx = Math.max(0, Math.min(Number(sess.idx) || 0, sess.ids.length));
  if (idx >= sess.ids.length) return null;
  return { idx, total: sess.ids.length, left: sess.ids.length - idx };
}
function persistSession() {
  if (!state.sessionKey || !state.queue.length) return;
  const idx = state.revealed ? state.idx + 1 : state.idx;
  const s = loadStore();
  if (idx >= state.queue.length) {
    delete s.sessions[state.sessionKey];
    saveStore(s);
    return;
  }
  s.sessions[state.sessionKey] = {
    key: state.sessionKey,
    title: state.title || "",
    ids: state.queue.map((q) => q.id),
    idx,
    results: state.results || [],
    snap: state.startSnap || null,
    startedAt: (s.sessions[state.sessionKey] && s.sessions[state.sessionKey].startedAt) || Date.now(),
    updatedAt: Date.now(),
  };
  saveStore(s);
}
function clearSession(key) {
  const s = loadStore();
  delete s.sessions[key];
  saveStore(s);
}
function domainRollup() {
  const by = { 1: null, 2: null, 3: null, 4: null };
  [1, 2, 3, 4].forEach((d) => {
    by[d] = { total: 0, seen: 0, attempts: 0, correct: 0, mastered: 0, weak: 0, missed: 0, last20: [], last20n: 0, last20ok: 0 };
  });
  state.data.questions.forEach((q) => {
    const d = by[q.domain];
    if (!d) return;
    d.total += 1;
    const h = rec(q.id);
    d.attempts = (d.attempts || 0) + (h.seen || 0);
    d.correct += (h.correct || 0);
    if ((h.seen || 0) > 0) d.seen += 1;
    if ((h.streak || 0) >= MASTER_STREAK) d.mastered += 1;
    if ((h.wrong || 0) >= WEAK_MISSES) d.weak += 1;
    if ((h.wrong || 0) > 0 && (h.streak || 0) < MASTER_STREAK) d.missed += 1;
  });
  const recent = loadStore().recent || {};
  [1, 2, 3, 4].forEach((d) => {
    const arr = Array.isArray(recent[String(d)]) ? recent[String(d)] : [];
    by[d].last20 = arr;
    by[d].last20n = arr.length;
    by[d].last20ok = arr.reduce((a, b) => a + (b ? 1 : 0), 0);
  });
  return by;
}
function pct(ok, n) {
  if (!n) return null;
  return Math.round((ok / n) * 100);
}
function accLabel(ok, n, min) {
  const p = pct(ok, n);
  if (p === null || n < (min || 1)) return "—";
  return p + "%";
}
function snapDomains() {
  const r = domainRollup();
  const out = {};
  [1, 2, 3, 4].forEach((d) => {
    out[d] = { seen: r[d].seen, attempts: r[d].attempts, correct: r[d].correct, mastered: r[d].mastered, weak: r[d].weak };
  });
  return out;
}

function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function show(id) {
  ["gate", "home", "quiz", "score"].forEach((p) => $(p).classList.add("hidden"));
  $(id).classList.remove("hidden");
  scrollTop();
}
function scrollTop() {
  window.scrollTo(0, 0);
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
}

function unlocked() { return rawGet("sessionStorage", "sx_ok") === "1"; }
function tryPin() {
  const val = ($("pin").value || "").trim();
  if (val === PIN) {
    rawSet("sessionStorage", "sx_ok", "1");
    $("pin").value = "";
    $("pin-msg").textContent = "";
    show("home");
    renderHome();
  } else {
    $("pin-msg").textContent = val ? "Wrong study PIN." : "Enter the study PIN.";
  }
}
function domainName(d) { return state.data.domains[d].name; }

function stats() {
  const qs = state.data.questions;
  let mastered = 0, weak = 0, missed = 0;
  qs.forEach((q) => {
    const h = rec(q.id);
    const isM = (h.streak || 0) >= MASTER_STREAK;
    if (isM) mastered += 1;
    if ((h.wrong || 0) >= WEAK_MISSES) weak += 1;
    if ((h.wrong || 0) > 0 && !isM) missed += 1;
  });
  return { mastered, weak, missed };
}

function modeResumeHtml(key, resumeFn, newFn, newLabel) {
  const prog = sessionProgress(sessionOf(key));
  if (!prog) {
    return `<button type="button" class="secondary" onclick="${newFn}">${escapeHtml(newLabel)}</button>`;
  }
  return `<div class="mode-stack">
    <button type="button" class="gold" onclick="${resumeFn}">Resume ${prog.idx} / ${prog.total} · ${prog.left} left</button>
    <button type="button" class="secondary" onclick="${newFn}">${escapeHtml(newLabel)}</button>
  </div>`;
}

function renderHome() {
  const st = stats();
  const roll = domainRollup();
  $("mastered-count").textContent = st.mastered;
  $("weak-count").textContent = st.weak;
  $("missed-count").textContent = st.missed;

  $("exam-actions").innerHTML = modeResumeHtml("exam", "resumeExam()", "startExam(true)", "New 90-question exam");
  $("active-actions").innerHTML = modeResumeHtml("active", "resumeActive()", "startAll(true)", "New active rotation");
  $("missed-actions").innerHTML = modeResumeHtml("missed", "resumeMissed()", "startMissed(true)", "New missed-only set");

  $("domain-grid").innerHTML = [1, 2, 3, 4].map((d) => {
    const r = roll[d];
    const lifePct = r.attempts >= 5 ? accLabel(r.correct, r.attempts, 5) : "need 5";
    const lastPct = r.last20n ? accLabel(r.last20ok, r.last20n, 1) : "—";
    const sess = sessionProgress(sessionOf("domain:" + d));
    const weakSess = sessionProgress(sessionOf("domain-missed:" + d));
    const resumeRow = sess
      ? `<button type="button" class="gold" onclick="resumeDomain(${d})">Resume domain ${sess.idx}/${sess.total}</button>`
      : `<button type="button" onclick="startDomain(${d}, true)">Study this domain</button>`;
    const weakBtn = r.missed
      ? (weakSess
        ? `<button type="button" class="secondary" onclick="resumeDomainMissed(${d})">Resume weak ${weakSess.idx}/${weakSess.total}</button>`
        : `<button type="button" class="secondary" onclick="startDomainMissed(${d}, true)">Weak in this domain (${r.missed})</button>`)
      : `<button type="button" class="secondary" disabled>No open misses in this domain</button>`;
    const newRow = sess
      ? `<button type="button" class="secondary" onclick="startDomain(${d}, true)">Start new domain set</button>`
      : "";
    return `<div class="domain-card">
      <div class="domain-head">Domain ${d}: ${escapeHtml(state.data.domains[d].short)}
        <small>${r.total} in bank · ${escapeHtml(state.data.domains[d].weight)} of the real exam</small></div>
      <div class="bars">
        <span class="bar-seg ok" style="flex:${Math.max(r.mastered,0)}"></span>
        <span class="bar-seg weak" style="flex:${Math.max(r.weak,0)}"></span>
        <span class="bar-seg rest" style="flex:${Math.max(r.total - r.mastered - r.weak,0)}"></span>
      </div>
      <div class="domain-stats">
        <div><b>${r.seen}</b><span>seen</span></div>
        <div><b>${lifePct}</b><span>lifetime</span></div>
        <div><b>${r.mastered}</b><span>mastered</span></div>
        <div><b>${r.weak}</b><span>weak</span></div>
        <div><b>${lastPct}</b><span>last ${r.last20n || 0}</span></div>
      </div>
      <div class="mode-stack">
        ${resumeRow}
        ${weakBtn}
        ${newRow}
      </div>
    </div>`;
  }).join("");
}

function startDomain(d, forceNew) {
  const key = "domain:" + d;
  if (!forceNew) {
    const sess = sessionOf(key);
    if (sessionProgress(sess)) { resumeSession(key); return; }
  }
  const qs = state.data.questions.filter((q) => q.domain === d && !isMastered(q));
  if (!qs.length) {
    alert("Every item in this domain has a 3-in-a-row streak. Use Active rotation if you want a full refresh.");
    return;
  }
  beginQueue(shuffled(qs), `Domain ${d}: ${domainName(d)}`, key);
}
function startDomainMissed(d, forceNew) {
  const key = "domain-missed:" + d;
  if (!forceNew) {
    const sess = sessionOf(key);
    if (sessionProgress(sess)) { resumeSession(key); return; }
  }
  const qs = state.data.questions.filter((q) => q.domain === d && isOpenMiss(q));
  if (!qs.length) {
    alert("No open misses in this domain.");
    return;
  }
  beginQueue(shuffled(qs), `Weak · Domain ${d}: ${domainName(d)}`, key);
}
function startAll(forceNew) {
  const key = "active";
  if (!forceNew) {
    const sess = sessionOf(key);
    if (sessionProgress(sess)) { resumeSession(key); return; }
  }
  const live = state.data.questions.filter((q) => !isMastered(q));
  if (!live.length) {
    if (!confirm("Every item has a 3-in-a-row streak. Run the full bank again anyway?")) return;
    beginQueue(shuffled(state.data.questions), "Full bank refresh", key);
    return;
  }
  beginQueue(shuffled(live), "Active rotation", key);
}
function startMissed(forceNew) {
  const key = "missed";
  if (!forceNew) {
    const sess = sessionOf(key);
    if (sessionProgress(sess)) { resumeSession(key); return; }
  }
  const qs = state.data.questions.filter(isOpenMiss);
  if (!qs.length) {
    alert("No open misses. Run a domain first, or those misses already have a 3-in-a-row streak.");
    return;
  }
  beginQueue(shuffled(qs), "Missed items still in rotation", key);
}
function resumeDomain(d) { resumeSession("domain:" + d); }
function resumeDomainMissed(d) { resumeSession("domain-missed:" + d); }
function resumeActive() { resumeSession("active"); }
function resumeMissed() { resumeSession("missed"); }
function resumeExam() { resumeSession("exam"); }

function resumeSession(key) {
  const sess = sessionOf(key);
  const prog = sessionProgress(sess);
  if (!prog) {
    alert("No saved set to resume.");
    return;
  }
  const qs = sess.ids.map(qById).filter(Boolean);
  if (!qs.length) {
    clearSession(key);
    alert("Saved items are no longer in the bank.");
    return;
  }
  const idx = Math.min(sess.idx || 0, qs.length - 1);
  beginQueue(qs, sess.title || "Resume", key, { idx, results: sess.results || [], snap: sess.snap || null, resume: true });
}
function isScoreable(q) {
  const letters = Object.keys(q.options || {});
  const ans = (q.answer || "").split(",").filter(Boolean);
  return !q.pbq && letters.length > 0 && ans.length > 0;
}

function startExam(forceNew) {
  const key = "exam";
  if (!forceNew) {
    const sess = sessionOf(key);
    if (sessionProgress(sess)) { resumeSession(key); return; }
  }
  const byD = { 1: [], 2: [], 3: [], 4: [] };
  state.data.questions.forEach((q) => {
    if (isScoreable(q) && byD[q.domain]) byD[q.domain].push(q);
  });
  const mix = [];
  Object.entries(EXAM_MIX).forEach(([d, n]) => {
    mix.push(...pickForExam(byD[Number(d)] || [], Number(n)));
  });
  if (mix.length < 90) {
    const used = new Set(mix.map((q) => q.id));
    const rest = state.data.questions.filter((q) => !used.has(q.id) && isScoreable(q));
    mix.push(...pickForExam(rest, 90 - mix.length));
  }
  const final = shuffled(mix.slice(0, 90));
  if (!final.length) {
    alert("No scored items are available to build an exam.");
    return;
  }
  const weakN = final.filter((q) => isWeak(q) && !isMastered(q)).length;
  const title = final.length === 90
    ? "90-question practice exam"
    : `Practice exam (${final.length} items available)`;
  beginQueue(final, title + ` · ${weakN} from weak pool`, key);
}

function pickForExam(pool, n) {
  const weak = shuffled(pool.filter((q) => isWeak(q) && !isMastered(q)));
  const fresh = shuffled(pool.filter((q) => !isWeak(q) && !isMastered(q)));
  const out = weak.concat(fresh).slice(0, n);
  if (out.length < n) {
    const mastered = shuffled(pool.filter(isMastered));
    out.push(...mastered.slice(0, n - out.length));
  }
  return out;
}

function beginQueue(qs, title, sessionKey, opts) {
  if (!qs || !qs.length) {
    alert("Nothing to study in that selection.");
    return;
  }
  opts = opts || {};
  state.queue = qs;
  state.idx = opts.idx || 0;
  state.results = Array.isArray(opts.results) ? opts.results.slice() : [];
  state.title = title;
  state.sessionKey = sessionKey || null;
  state.startSnap = opts.snap || snapDomains();
  state.revealed = false;
  $("quiz-title").textContent = title;
  show("quiz");
  renderQuestion();
  persistSession();
}
function currentQ() { return state.queue[state.idx]; }

function whyChip(q) {
  const h = rec(q.id);
  if ((h.wrong || 0) >= WEAK_MISSES) {
    return `In the rotation because you missed this ${h.wrong} times. Treat it as a concept check, not a letter to memorize.`;
  }
  if (!h.seen) return "New item. Read the stem, then pick the control that solves that problem — not the one that sounds most 'security'.";
  if ((h.streak || 0) === MASTER_STREAK - 1) return "One more correct in a row and this item leaves active rotation.";
  return `Seen ${h.seen} time${h.seen === 1 ? "" : "s"}. Ask what job the correct control is hired to do.`;
}

const GLOSSARY_KEYS = Object.keys(GLOSSARY).sort((a, b) => b.length - a.length);
function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function acronymPattern(k) {
  if (k === "ZERO") return /\bzero[\s-]?trust\b/gi;
  const alts = [k].concat(GLOSSARY_VARIANTS[k] || []);
  const uniq = alts.filter((v, i) => alts.indexOf(v) === i).map(escapeRe);
  return new RegExp(`\\b(?:${uniq.join("|")})s?\\b`, "g");
}
function findAcronyms(text) {
  let blob = String(text || "");
  const hits = [];
  GLOSSARY_KEYS.forEach((k) => {
    const pat = acronymPattern(k);
    let first = -1;
    blob = blob.replace(pat, (m, offset) => {
      if (first < 0) first = offset;
      return " ".repeat(m.length);
    });
    if (first >= 0) hits.push({ key: k, at: first });
  });
  return hits.sort((a, b) => a.at - b.at).map((h) => h.key).slice(0, 10);
}
function questionText(q) {
  return [q.stem].concat(Object.values(q.options || {})).join(" \n ");
}
function renderGlossary(keys) {
  const el = $("glossary");
  if (!keys.length) {
    el.classList.add("hidden");
    el.innerHTML = "";
    return;
  }
  el.classList.remove("hidden");
  el.innerHTML = "<h3>Terms in this item</h3><dl>" +
    keys.map((k) => `<dt>${k === "ZERO" ? "Zero Trust" : escapeHtml(k)}</dt><dd>${escapeHtml(GLOSSARY[k])}</dd>`).join("") +
    "</dl>";
}
function formatStem(raw) {
  let t = String(raw || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  if (!t) return "See the source exhibit.";
  t = t.replace(/\s*\u2022\s*-?\s*/g, "\n\u2022 ");
  const nums = [];
  const NUMBERED = /(^|\s)(\d{1,2})\.\s(?=[A-Za-z])/g;
  t.replace(NUMBERED, (m, pre, n) => { nums.push(Number(n)); return m; });
  let prev = 0, isRun = nums.length >= 3;
  for (const n of nums) {
    if (n !== 1 && n !== prev + 1) { isRun = false; break; }
    prev = n;
  }
  if (isRun) t = t.replace(NUMBERED, (m, pre, n) => `\n${n}. `);
  const LEADIN = /(Which of the following|Which of these|Which two of the following)/g;
  let last = -1, m;
  while ((m = LEADIN.exec(t)) !== null) last = m.index;
  if (last > 0 && t.length - last <= 400) {
    t = t.slice(0, last).replace(/\s+$/, "") + "\n\n" + t.slice(last);
  }
  return t.replace(/\n{3,}/g, "\n\n").trim();
}
function stemHtml(raw) {
  const lines = formatStem(raw).split("\n");
  let out = "";
  lines.forEach((line) => {
    const t = line.trim();
    if (!t) return;
    if (t.charAt(0) === "\u2022") out += `<div class="stem-item">${escapeHtml(t)}</div>`;
    else if (/^\d{1,2}\.\s/.test(t)) out += `<div class="stem-item stem-num">${escapeHtml(t)}</div>`;
    else out += `<p class="stem-p">${escapeHtml(t)}</p>`;
  });
  return out || `<p class="stem-p">${escapeHtml("See the source exhibit.")}</p>`;
}
