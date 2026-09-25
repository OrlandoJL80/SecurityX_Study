const SKIN_MUTE_KEY = "sx_mute";
let skinAudio = null;

function skinMuted() {
  const v = rawGet("localStorage", SKIN_MUTE_KEY);
  if (v === "0") return false;
  return true;
}
function setSkinMuted(on) {
  rawSet("localStorage", SKIN_MUTE_KEY, on ? "1" : "0");
  paintMuteBtn();
}
function toggleMute() { setSkinMuted(!skinMuted()); }

function paintMuteBtn() {
  const b = $("btn-mute");
  if (!b) return;
  b.textContent = skinMuted() ? "Sound off" : "Sound on";
  b.setAttribute("aria-pressed", skinMuted() ? "true" : "false");
}

function tick(kind) {
  if (skinMuted()) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!skinAudio) skinAudio = new Ctx();
    if (skinAudio.state === "suspended") skinAudio.resume();
    const t = skinAudio.currentTime;
    const o = skinAudio.createOscillator();
    const g = skinAudio.createGain();
    o.connect(g); g.connect(skinAudio.destination);
    if (kind === "ok") { o.frequency.value = 660; o.type = "triangle"; }
    else if (kind === "bad") { o.frequency.value = 180; o.type = "sine"; }
    else { o.frequency.value = 420; o.type = "triangle"; }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(kind === "bad" ? 0.05 : 0.035, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === "bad" ? 0.18 : 0.09));
    o.start(t); o.stop(t + 0.2);
  } catch (e) {}
}

function fmtClock(d) {
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}
function startSkinClock() {
  const el = $("ops-clock");
  if (!el) return;
  const beat = () => { el.textContent = fmtClock(new Date()); };
  beat();
  setInterval(beat, 15000);
}

function showToast(msg) {
  const el = $("ops-toast");
  if (!el || !msg) return;
  el.textContent = msg;
  el.classList.remove("hidden", "toast-out");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => {
    el.classList.add("toast-out");
    setTimeout(() => el.classList.add("hidden"), 280);
  }, 3200);
}

function tickStrip(arr) {
  const bits = Array.isArray(arr) ? arr : [];
  if (!bits.length) return `<div class="ticks empty" title="No recent answers in this domain">${"<i></i>".repeat(20)}</div>`;
  const cells = [];
  for (let i = 0; i < 20; i++) {
    const v = bits[i];
    const cls = v === 1 ? "ok" : (v === 0 ? "bad" : "void");
    cells.push(`<i class="${cls}"></i>`);
  }
  return `<div class="ticks" title="Last ${bits.length} scored answers">${cells.join("")}</div>`;
}

function weakestDomain(roll) {
  let best = null, score = -1;
  [1, 2, 3, 4].forEach((d) => {
    const r = roll[d];
    const missW = (r.missed || 0) * 2 + (r.weak || 0);
    const acc = r.attempts >= 5 ? r.correct / r.attempts : 0.5;
    const s = missW + (1 - acc) * 8;
    if (r.seen && s > score) { score = s; best = d; }
  });
  if (best == null) {
    [1, 2, 3, 4].forEach((d) => {
      if ((roll[d].missed || 0) > 0 && (best == null || roll[d].missed > roll[best].missed)) best = d;
    });
  }
  return best;
}

function recommendNext() {
  if (!state.data) return null;
  const roll = domainRollup();
  const w = weakestDomain(roll);
  if (w && roll[w].missed) {
    return { label: `Drill weak Domain ${w}: ${state.data.domains[w].short} (${roll[w].missed} open)`, fn: `startDomainMissed(${w}, true)` };
  }
  if (w) {
    return { label: `Study weakest: Domain ${w} ${state.data.domains[w].short}`, fn: `startDomain(${w}, true)` };
  }
  return { label: "Active rotation", fn: "startAll(true)" };
}

function paintHeaderShift() {
  const live = $("ops-live");
  if (live) live.textContent = $("quiz") && !$("quiz").classList.contains("hidden") ? "ON DUTY" : "DECK ARMED";
}

function skinAfterHome() {
  paintHeaderShift();
  const roll = state.data ? domainRollup() : null;
  if (!roll) return;
  const weak = weakestDomain(roll);
  document.querySelectorAll(".domain-card").forEach((card, i) => {
    const d = i + 1;
    card.classList.toggle("is-weakest", d === weak);
    const host = card.querySelector(".ticks-host");
    if (host) host.innerHTML = tickStrip(roll[d].last20);
    else {
      const bars = card.querySelector(".bars");
      if (bars) {
        const wrap = document.createElement("div");
        wrap.className = "ticks-host";
        wrap.innerHTML = tickStrip(roll[d].last20);
        bars.insertAdjacentElement("afterend", wrap);
      }
    }
  });
}

function skinStreakChip(q) {
  const el = $("streak-chip");
  if (!el || !q) return;
  const h = rec(q.id);
  const st = h.streak || 0;
  if ((h.wrong || 0) >= WEAK_MISSES) {
    el.textContent = `Weak item · ${st}/${MASTER_STREAK} streak`;
    el.className = "streak-chip warn";
  } else if (st === MASTER_STREAK - 1) {
    el.textContent = `1 more correct to leave rotation`;
    el.className = "streak-chip hot";
  } else if (!h.seen) {
    el.textContent = "New item";
    el.className = "streak-chip";
  } else {
    el.textContent = `Streak ${st}/${MASTER_STREAK}`;
    el.className = "streak-chip";
  }
}

function skinAfterScore() {
  const box = $("score-next");
  if (!box) return;
  const recm = recommendNext();
  if (!recm) { box.innerHTML = ""; return; }
  box.innerHTML = `<div class="kicker">Recommended next</div>
    <button type="button" class="gold" onclick="${recm.fn}">${escapeHtml(recm.label)}</button>`;
}

function toastResumeIfAny() {
  const keys = ["exam", "active", "missed", "domain:1", "domain:2", "domain:3", "domain:4",
    "domain-missed:1", "domain-missed:2", "domain-missed:3", "domain-missed:4"];
  let best = null;
  keys.forEach((k) => {
    const s = sessionOf(k);
    const p = sessionProgress(s);
    if (!p) return;
    if (!best || (s.updatedAt || 0) > (best.updatedAt || 0)) best = Object.assign({ key: k }, s, p);
  });
  if (!best) return;
  const ago = best.updatedAt ? Math.max(0, Math.round((Date.now() - best.updatedAt) / 60000)) : null;
  const when = ago == null ? "" : (ago < 1 ? "just now" : ago + "m ago");
  showToast(`${best.title || best.key} · ${best.left} left${when ? " · last save " + when : ""}`);
}

(function wrapSkin() {
  const wait = () => {
    if (typeof renderHome !== "function") { setTimeout(wait, 30); return; }
    const _home = renderHome;
    renderHome = function () { _home(); skinAfterHome(); };
    const _q = renderQuestion;
    renderQuestion = function () { _q(); skinStreakChip(currentQ()); paintHeaderShift(); };
    const _score = renderScore;
    renderScore = function () { _score(); skinAfterScore(); paintHeaderShift(); };
    const _tog = toggle;
    toggle = function (L) { _tog(L); if (!state.revealed) tick("sel"); };
    const _sub = submitAnswer;
    submitAnswer = function () {
      const before = state.revealed;
      _sub();
      if (!before && state.revealed) {
        const last = state.results[state.results.length - 1];
        tick(last && last.correct ? "ok" : "bad");
      }
    };
    const _go = goHome;
    goHome = function () { _go(); toastResumeIfAny(); };
    paintMuteBtn();
    startSkinClock();
    paintHeaderShift();
    document.body.classList.add("ops-skin");
    if (typeof unlocked === "function" && unlocked()) toastResumeIfAny();
  };
  wait();
})();
