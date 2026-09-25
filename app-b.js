function renderQuestion() {
  const q = currentQ();
  if (!q) { renderScore(); return; }
  state.selected = new Set();
  state.revealed = false;
  $("q-progress").textContent = `Question ${state.idx + 1} of ${state.queue.length}`;
  $("q-domain").textContent = `Domain ${q.domain} · Bank Q${q.id}`;
  $("bar").style.width = `${((state.idx + 1) / state.queue.length) * 100}%`;
  $("stem").innerHTML = stemHtml(q.stem);
  $("why").textContent = whyChip(q);
  $("think").textContent = THINK[q.domain] || "";

  const tags = [];
  if (q.choose > 1) tags.push(`Choose ${q.choose}`);
  if (q.pbq) tags.push("PBQ / lab item");
  if (q.exhibits && q.exhibits.length) tags.push("Exhibit");
  if (isWeak(q)) tags.push("Weak item");
  $("tags").innerHTML = tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("");

  renderGlossary(findAcronyms(questionText(q)));

  const ex = $("exhibits");
  ex.innerHTML = "";
  (q.exhibits || []).forEach((src, i) => {
    const link = document.createElement("a");
    link.href = src;
    link.target = "_blank";
    link.rel = "noopener";
    link.className = "exhibit-link";
    link.title = "Open full size";
    const img = document.createElement("img");
    img.src = src;
    img.alt = `Exhibit ${i + 1} for question ${q.id}`;
    img.className = "exhibit";
    img.loading = "lazy";
    img.decoding = "async";
    link.appendChild(img);
    ex.appendChild(link);
  });

  const letters = Object.keys(q.options || {}).sort();
  $("choices").innerHTML = letters.map((L) =>
    `<button class="choice" id="opt-${L}" type="button" aria-pressed="false" onclick="toggle('${L}')"><b>${escapeHtml(L)}.</b> ${escapeHtml(q.options[L])}</button>`
  ).join("") || "<p class='muted'>PBQ / lab item. Use the exhibit. Submit marks it reviewed so you can continue.</p>";

  $("explain").classList.add("hidden");
  $("explain").innerHTML = "";
  $("btn-next").classList.add("hidden");
  $("btn-submit").classList.remove("hidden");
  updateSubmitLabel();
  scrollTop();
}

function updateSubmitLabel() {
  const q = currentQ();
  const need = q && q.choose > 1 ? q.choose : 0;
  $("btn-submit").textContent = need
    ? `Submit (${state.selected.size} of ${need} selected)`
    : "Submit";
}

function toggle(letter) {
  if (state.revealed) return;
  const q = currentQ();
  if (!q) return;
  if (!(q.choose > 1)) state.selected = new Set([letter]);
  else if (state.selected.has(letter)) state.selected.delete(letter);
  else state.selected.add(letter);
  document.querySelectorAll(".choice").forEach((el) => {
    el.classList.remove("selected");
    el.setAttribute("aria-pressed", "false");
  });
  state.selected.forEach((L) => {
    const el = $("opt-" + L);
    if (el) { el.classList.add("selected"); el.setAttribute("aria-pressed", "true"); }
  });
  updateSubmitLabel();
}

function submitAnswer() {
  if (state.revealed) return;
  const q = currentQ();
  if (!q) return;
  const official = new Set((q.answer || "").split(",").filter(Boolean));

  if (!official.size || q.pbq) {
    state.revealed = true;
    recordResult(q.id, true, q.domain);
    state.results.push({ id: q.id, domain: q.domain, correct: true, pbq: true });
    persistSession();
    revealPanel(q,
      `<b>PBQ reviewed.</b> These lab items are not letter-scored. They are excluded from the 90-question exam mix.`,
      "");
    return;
  }

  if (q.choose > 1 && state.selected.size !== q.choose) {
    alert(`Select exactly ${q.choose} answers. You have ${state.selected.size}.`);
    return;
  }
  if (!state.selected.size) {
    alert("Select an answer.");
    return;
  }

  const picked = [...state.selected].sort().join(",");
  const correct = picked === [...official].sort().join(",");
  state.revealed = true;
  const h = recordResult(q.id, correct, q.domain);
  state.results.push({ id: q.id, domain: q.domain, correct });

  Object.keys(q.options || {}).forEach((L) => {
    const el = $("opt-" + L);
    if (!el) return;
    if (official.has(L)) el.classList.add("correct");
    else if (state.selected.has(L)) el.classList.add("wrong");
  });

  const trail = correct
    ? (h.streak >= MASTER_STREAK
      ? ` This item now has a ${MASTER_STREAK}-in-a-row streak and will drop out of active rotation.`
      : ` Streak is ${h.streak} of ${MASTER_STREAK}.`)
    : " Streak reset. This item stays in rotation until you can explain the control, not just the letter.";

  persistSession();
  revealPanel(q,
    `<b>${correct ? "Correct" : "Incorrect"}.</b> Key: ${escapeHtml([...official].sort().join(", ")) || "n/a"}`,
    `<br><br><i>${trail}</i>`);
}

function revealPanel(q, header, trail) {
  const why = escapeHtml(q.explanation || "").replace(/\n/g, "<br>");
  $("explain").classList.remove("hidden");
  $("explain").innerHTML = `${header}<br><br>${why}${trail}`;
  $("btn-submit").classList.add("hidden");
  $("btn-next").classList.remove("hidden");
  renderGlossary(findAcronyms(questionText(q) + " \n " + (q.explanation || "")));
  $("btn-next").textContent = state.idx + 1 >= state.queue.length ? "See results" : "Next";
}

function nextQuestion() {
  if (state.idx + 1 >= state.queue.length) {
    renderScore();
    return;
  }
  state.idx += 1;
  state.revealed = false;
  persistSession();
  renderQuestion();
}

function renderScore() {
  if (state.sessionKey) clearSession(state.sessionKey);
  state.sessionKey = null;
  const scored = state.results.filter((r) => !r.pbq);
  const total = scored.length;
  const ok = scored.filter((r) => r.correct).length;
  const setPct = total ? Math.round((ok / total) * 100) : 0;
  const pbqN = state.results.filter((r) => r.pbq).length;
  const by = { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] };
  scored.forEach((r) => {
    if (!by[r.domain]) return;
    by[r.domain][1] += 1;
    if (r.correct) by[r.domain][0] += 1;
  });
  $("score-summary").textContent = total
    ? `${ok} / ${total}  (${setPct}%)`
    : (pbqN ? `${pbqN} PBQ item${pbqN === 1 ? "" : "s"} reviewed` : "No scored items");
  const st = stats();
  const now = domainRollup();
  const snap = state.startSnap || {};
  $("score-rows").innerHTML = [1, 2, 3, 4].map((d) => {
    const [c, n] = by[d];
    const before = snap[d] || { attempts: 0, correct: 0, mastered: 0, weak: 0 };
    const after = now[d];
    const beforePct = before.attempts >= 5 ? Math.round((before.correct / before.attempts) * 100) : null;
    const afterPct = after.attempts >= 5 ? Math.round((after.correct / after.attempts) * 100) : null;
    let lifeTxt = "";
    if (beforePct !== null && afterPct !== null && afterPct !== beforePct) {
      const arrow = afterPct > beforePct ? "↑" : "↓";
      lifeTxt = ` · lifetime ${beforePct}% → ${afterPct}% ${arrow}`;
    } else if (afterPct !== null) {
      lifeTxt = ` · lifetime ${afterPct}%`;
    }
    const mDelta = after.mastered - (before.mastered || 0);
    const wDelta = after.weak - (before.weak || 0);
    const mTxt = mDelta ? ` · mastered ${mDelta > 0 ? "+" : ""}${mDelta}` : "";
    const wTxt = wDelta ? ` · weak ${wDelta > 0 ? "+" : ""}${wDelta}` : "";
    const setTxt = n ? `${c}/${n} this set` : "not in this set";
    return `<div class="score-row"><span>Domain ${d}: ${escapeHtml(state.data.domains[d].short)}<small class="delta">${setTxt}${lifeTxt}${mTxt}${wTxt}</small></span><b>${after.mastered}/${after.total} mastered</b></div>`;
  }).join("") +
    (pbqN ? `<div class="score-row"><span>PBQ / lab items reviewed (not scored)</span><b>${pbqN}</b></div>` : "") +
    `<div class="score-row"><span>Mastered (${MASTER_STREAK} in a row)</span><b>${st.mastered}</b></div>` +
    `<div class="score-row"><span>Weak (missed ${WEAK_MISSES}+)</span><b>${st.weak}</b></div>`;
  show("score");
}

function resetProgress() {
  if (!confirm("Clear streaks, misses, seen counts, and saved sessions on this device?")) return;
  rawRemove("localStorage", STORE);
  storeCache = null;
  renderHome();
}
function saveAndQuit() {
  persistSession();
  goHome();
}

function escapeHtml(s) {
  return String(s === null || s === undefined ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function goHome() {
  show("home");
  renderHome();
}

function fatal(msg) {
  const g = $("gate");
  g.classList.remove("hidden");
  g.innerHTML = `<div class="kicker">Problem</div><h2>Could not load the deck</h2><p class="muted">${escapeHtml(msg)}</p>`;
}

async function boot() {
  $("pin").addEventListener("keydown", (e) => { if (e.key === "Enter") tryPin(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || $("quiz").classList.contains("hidden")) return;
    const tag = e.target && e.target.tagName;
    if (tag === "INPUT" || tag === "BUTTON" || tag === "A" || tag === "TEXTAREA") return;
    if (state.revealed) nextQuestion(); else submitAnswer();
  });

  try {
    if (window.QUESTION_BANK) {
      state.data = window.QUESTION_BANK;
    } else {
      const res = await fetch("questions.json");
      if (!res.ok) throw new Error(`questions.json returned ${res.status}`);
      state.data = await res.json();
    }
  } catch (e) {
    fatal("questions-data.js did not load and questions.json could not be fetched. Keep all files in the same folder and open index.html directly. " + e.message);
    return;
  }

  if (!state.data || !Array.isArray(state.data.questions) || !state.data.questions.length) {
    fatal("The question bank is empty or malformed.");
    return;
  }

  window.addEventListener("pagehide", persistSession);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") persistSession();
  });

  if (unlocked()) { show("home"); renderHome(); }
  else show("gate");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
