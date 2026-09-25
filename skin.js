const SKIN_MUTE_KEY = "sx_mute";
let skinAudio = null;
let radarWeak = null;
let radarAngle = 0;
let radarRaf = 0;

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

function reduceMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function nodePos(d, cx, cy, r) {
  const ang = (-Math.PI / 2) + (d - 1) * (Math.PI / 2);
  return { x: cx + Math.cos(ang) * r * 0.72, y: cy + Math.sin(ang) * r * 0.72, ang };
}

function drawRadarFrame(ctx, w, h, angle) {
  const cx = w * 0.5;
  const cy = h * 0.38;
  const rad = Math.min(w, h) * 0.42;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(196,163,90,0.18)";
  ctx.lineWidth = 1;
  for (let i = 1; i <= 4; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, rad * (i / 4), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx - rad, cy); ctx.lineTo(cx + rad, cy);
  ctx.moveTo(cx, cy - rad); ctx.lineTo(cx, cy + rad);
  ctx.stroke();
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  const grd = ctx.createLinearGradient(0, 0, rad, 0);
  grd.addColorStop(0, "rgba(196,163,90,0.00)");
  grd.addColorStop(0.75, "rgba(196,163,90,0.05)");
  grd.addColorStop(1, "rgba(196,163,90,0.28)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, rad, -0.55, 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(196,163,90,0.55)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(rad, 0);
  ctx.stroke();
  ctx.restore();
  [1, 2, 3, 4].forEach((d) => {
    const p = nodePos(d, cx, cy, rad);
    const weak = radarWeak === d;
    ctx.beginPath();
    ctx.arc(p.x, p.y, weak ? 7 : 4, 0, Math.PI * 2);
    ctx.fillStyle = weak ? "rgba(196,163,90,0.95)" : "rgba(61,155,95,0.55)";
    ctx.fill();
    if (weak) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(196,163,90,0.45)";
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(201,214,229,0.55)";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("D" + d, p.x, p.y + 20);
  });
}

function startRadar() {
  const canvas = $("radar-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  fit();
  window.addEventListener("resize", fit);
  const loop = (ts) => {
    if (!reduceMotion()) radarAngle = (ts / 12000) * Math.PI * 2;
    drawRadarFrame(ctx, window.innerWidth, window.innerHeight, radarAngle);
    radarRaf = requestAnimationFrame(loop);
  };
  if (reduceMotion()) drawRadarFrame(ctx, window.innerWidth, window.innerHeight, -Math.PI / 3);
  else radarRaf = requestAnimationFrame(loop);
}

function reassureLine(q, correct) {
  if (!q) return "";
  if (q.pbq) return "Reviewed. Lab items are not letter-scored.";
  const h = rec(q.id);
  if (!correct) return "Miss logged. It stays in the weak pool until you can explain the control.";
  if ((h.wrong || 0) > 0 && (h.streak || 0) < MASTER_STREAK) {
    return "Recovery logged. Miss count stays until the streak holds.";
  }
  if ((h.streak || 0) >= MASTER_STREAK) return "Out of rotation. You can still meet it on an exam.";
  if ((h.streak || 0) === MASTER_STREAK - 1) return "One more clean hit and it leaves active rotation.";
  if ((h.seen || 0) <= 1) return "Logged. This item is in your rotation.";
  return "Logged. Streak " + (h.streak || 0) + " of " + MASTER_STREAK + ".";
}

function paintReassureExplain() {
  const last = state.results[state.results.length - 1];
  const q = currentQ();
  if (!last || !q) return;
  const box = $("explain");
  if (!box) return;
  let note = box.querySelector(".reassure");
  if (!note) {
    note = document.createElement("p");
    note.className = "reassure";
    box.appendChild(note);
  }
  note.textContent = reassureLine(q, last.correct);
}

function paintHomeBoard() {
  const host = $("home");
  if (!host || !state.data) return;
  const card = host.querySelector(".card");
  if (!card) return;
  let line = $("board-line");
  if (!line) {
    line = document.createElement("p");
    line.id = "board-line";
    line.className = "board-line";
    const stats = card.querySelector(".statline");
    if (stats && stats.parentNode) stats.insertAdjacentElement("afterend", line);
    else card.appendChild(line);
  }
  const st = stats();
  let seen = 0;
  state.data.questions.forEach((q) => { if ((rec(q.id).seen || 0) > 0) seen += 1; });
  const roll = domainRollup();
  const w = weakestDomain(roll);
  let extra = "";
  if (w) {
    const r = roll[w];
    const life = r.attempts >= 5 ? Math.round((r.correct / r.attempts) * 100) : null;
    const last = r.last20n ? Math.round((r.last20ok / r.last20n) * 100) : null;
    if (life != null && last != null && last !== life) {
      extra = last > life
        ? ` Last ${r.last20n} in Domain ${w} running hotter than lifetime (${last}% vs ${life}%).`
        : ` Last ${r.last20n} in Domain ${w} cooler than lifetime (${last}% vs ${life}%).`;
    }
  }
  line.textContent = `Board: ${seen} of ${state.data.questions.length} seen · ${st.mastered} left rotation · ${st.missed} open misses.${extra}`;
}

function paintScoreBoard() {
  const box = $("score-next");
  if (!box) return;
  const snap = state.startSnap || {};
  const now = domainRollup();
  let mGain = 0;
  [1, 2, 3, 4].forEach((d) => {
    const before = (snap[d] && snap[d].mastered) || 0;
    mGain += Math.max(0, (now[d].mastered || 0) - before);
  });
  let note = box.querySelector(".board-line");
  if (!note) {
    note = document.createElement("p");
    note.className = "board-line";
    box.insertBefore(note, box.firstChild);
  }
  note.textContent = mGain
    ? `+${mGain} left rotation this set. The board is quieter.`
    : "No new items left rotation this set. Misses are parked. Come back to them.";
  const recm = recommendNext();
  let btnWrap = box.querySelector(".rec-wrap");
  if (!btnWrap) {
    btnWrap = document.createElement("div");
    btnWrap.className = "rec-wrap";
    box.appendChild(btnWrap);
  }
  btnWrap.innerHTML = recm
    ? `<div class="kicker">Recommended next</div><button type="button" class="gold" onclick="${recm.fn}">${escapeHtml(recm.label)}</button>`
    : "";
}

function skinAfterHome() {
  paintHeaderShift();
  paintHomeBoard();
  const roll = state.data ? domainRollup() : null;
  if (!roll) return;
  const weak = weakestDomain(roll);
  radarWeak = weak;
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
  paintScoreBoard();
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
        paintReassureExplain();
      }
    };
    const _go = goHome;
    goHome = function () { _go(); toastResumeIfAny(); };
    paintMuteBtn();
    startSkinClock();
    paintHeaderShift();
    document.body.classList.add("ops-skin");
    startRadar();
    if (typeof unlocked === "function" && unlocked()) toastResumeIfAny();
  };
  wait();
})();
