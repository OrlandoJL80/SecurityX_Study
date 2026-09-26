const ANALOGY_FIX = {
  277: "A basic firewall only asks what port you used. An NGFW sits in the same place, also looks at which app is talking, and can run several separate VPN setups on one box.",
  414: "Security can patch a chatbot. Legal has to approve using a customer's data to train it."
};

const STOP = new Set(("a an the and or of to for from with without on in into by as is are was be been being that this these those which who whom whose what when where why how would should could may might must can not no nor if then than so such its their his her your our any all each both few more most other some only own same than too very just also will shall about over after before between against during without within across per via using used use than").split(" "));

const PHRASES = [
  "internal legal team", "legal team", "user consent", "customer data",
  "prompt injection", "model inversion", "model poisoning", "bug bounty",
  "next-generation firewall", "layer-7", "application layer", "single footprint",
  "security contexts", "zero trust", "least privilege", "at rest", "in transit",
  "recovery time objective", "recovery point objective", "tabletop", "walk-through",
  "parallel test", "full interruption", "compensating control", "write once",
  "access control", "threat modeling", "configuration information"
].sort((a, b) => b.length - a.length);

const JOBS = [
  { re: /legal team|counsel|attorney|privacy officer|DPO/i, job: "legal / privacy",
    rule: "Legal decides what the law allows you to do with a person or their data." },
  { re: /board|auditor|executive|CISO|risk owner|governance/i, job: "risk / governance",
    rule: "They want a decision, a document, or proof — not a packet capture." },
  { re: /architect|design|solution that includes/i, job: "architect",
    rule: "Pick the design that covers every listed requirement with the fewest extra boxes." },
  { re: /SOC|analyst|detect|alert|incident|hunt/i, job: "operations",
    rule: "Pick the action or evidence that stops or proves the event." },
  { re: /engineer|implement|configure|deploy|patch/i, job: "engineering",
    rule: "Pick the control that actually changes the system." }
];

function splitExplain(raw) {
  const text = String(raw || "").replace(/\r/g, "").trim();
  const chunks = text.split(/\n\s*\n/);
  let analogy = "";
  const body = [];
  chunks.forEach((c) => {
    const t = c.trim();
    if (/^Imagine\b/i.test(t)) analogy = t.replace(/^Imagine\s+/i, "").replace(/\.+$/, "");
    else if (t) body.push(t);
  });
  return { body: body.join("\n\n"), analogy };
}

function lastAsk(stem) {
  const t = String(stem || "").replace(/\s+/g, " ").trim();
  const parts = t.split(/(?<=[.?!])\s+/);
  const last = parts[parts.length - 1] || t;
  if (/which of the following|which of these|what should|what is the|who should|who is/i.test(last)) return last;
  const m = t.match(/(Which of the following[^.?]*[.?]|Which of these[^.?]*[.?]|What should the[^.?]*[.?]|Who should[^.?]*[.?])/i);
  return (m && m[0]) || last;
}

function norm(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9+\-/ ]+/g, " ").replace(/\s+/g, " ").trim();
}

function phrasesIn(text) {
  const n = norm(text);
  const hits = [];
  PHRASES.forEach((p) => {
    if (n.indexOf(p) >= 0) hits.push(p);
  });
  return hits;
}

function tokens(text) {
  return norm(text).split(" ").filter((w) => w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w));
}

function correctLetters(q) {
  return String(q.answer || "").split(",").map((s) => s.trim()).filter(Boolean);
}

function correctText(q) {
  return correctLetters(q).map((L) => (q.options && q.options[L]) || "").filter(Boolean).join(" ");
}

function wrongText(q) {
  const ok = new Set(correctLetters(q));
  return Object.keys(q.options || {}).filter((L) => !ok.has(L)).map((L) => q.options[L]).join(" ");
}

function distinctive(q) {
  const good = correctText(q);
  const bad = wrongText(q);
  const goodP = phrasesIn(good);
  const badP = new Set(phrasesIn(bad));
  const phraseHits = goodP.filter((p) => !badP.has(p));
  const badTok = new Set(tokens(bad));
  const wordHits = tokens(good).filter((w) => !badTok.has(w));
  const out = [];
  phraseHits.forEach((p) => { if (out.indexOf(p) < 0) out.push(p); });
  wordHits.forEach((w) => { if (out.indexOf(w) < 0) out.push(w); });
  return out.slice(0, 6);
}

function baitWords(q) {
  const good = new Set(tokens(correctText(q)).concat(phrasesIn(correctText(q))));
  const bits = [];
  const ok = new Set(correctLetters(q));
  Object.keys(q.options || {}).forEach((L) => {
    if (ok.has(L)) return;
    const p = phrasesIn(q.options[L])[0];
    const t = tokens(q.options[L]).find((w) => !good.has(w));
    bits.push(p || t || "");
  });
  return bits.filter(Boolean).slice(0, 5);
}

function jobLine(q) {
  const hay = q.stem || "";
  for (let i = 0; i < JOBS.length; i++) {
    if (JOBS[i].re.test(hay)) return JOBS[i];
  }
  return null;
}

function teachPair(q) {
  const stem = q.stem || "";
  const opts = Object.values(q.options || {}).join(" ");
  if (/legal team|internal legal|counsel/i.test(stem) && /consent/i.test(opts + stem)) {
    return "The stem says <b>legal team</b>. Legal works in law. In law you do not take something from a person unless they gave <b>consent</b>. That is why the answer with consent is the one counsel must handle. Prompt injection, DoS, and model poisoning are bugs. Security patches bugs. Legal does not.";
  }
  if (/single footprint|one box|collapse of multiple/i.test(stem) && /layer[- ]?7|application layer/i.test(stem)) {
    return "The stem wants <b>several functions in one box</b> and <b>Layer-7</b> inspection. That pair is an NGFW, not a NAT box or a sensor that only watches.";
  }
  return "";
}

function teachAll(q) {
  const crafted = teachPair(q);
  if (crafted) return crafted;
  if (q.pbq || !correctText(q)) {
    return "Read the exhibit and the ask. The right move is the one that matches the job in the stem.";
  }
  const ask = lastAsk(q.stem);
  const keys = distinctive(q);
  const job = jobLine(q);
  const bait = baitWords(q);
  let html = "<p>The question is asking: <i>" + escapeHtml(ask) + "</i></p>";
  if (job) {
    html += "<p>That is a <b>" + escapeHtml(job.job) + "</b> ask. " + escapeHtml(job.rule) + "</p>";
  }
  if (keys.length) {
    html += "<p>The correct choice is the one that says <b>" + keys.map(escapeHtml).join("</b>, <b>") + "</b>. Those words fit the ask. The other choices do not.</p>";
  } else {
    html += "<p>Match the correct option to the ask. A wrong option usually fits one security-sounding word and misses the job the stem named.</p>";
  }
  if (bait.length) {
    html += "<p>Bait words in the wrong answers: <b>" + bait.map(escapeHtml).join("</b>, <b>") + "</b>. They sound like security work. They do not answer this ask.</p>";
  }
  return html;
}

function pictureIt(q, parsed) {
  if (ANALOGY_FIX[q.id]) return ANALOGY_FIX[q.id];
  if (q.analogy) return q.analogy;
  const a = parsed.analogy || "";
  if (!a) return "";
  if (a.length > 160) return "";
  if (/nightclub|shrink-wrap|spell-check|photocopies the entire|go-bag|bouncer who only checks IDs for people who look|private letters/i.test(a)) return "";
  return a;
}

function explainHtml(q) {
  const parsed = splitExplain(q.explanation || "");
  const pic = pictureIt(q, parsed);
  let html = "";
  if (parsed.body) {
    html += `<div class="exp-body">${escapeHtml(parsed.body).replace(/\n/g, "<br>")}</div>`;
  }
  html += `<div class="look-for"><div class="kicker">How the words pick the answer</div>${teachAll(q)}</div>`;
  if (pic) {
    html += `<div class="picture-it"><div class="kicker">Picture it</div><p>${escapeHtml(pic)}</p></div>`;
  }
  return html;
}

(function wrapCoach() {
  const wait = () => {
    if (typeof revealPanel !== "function") { setTimeout(wait, 30); return; }
    revealPanel = function (q, header, trail) {
      $("explain").classList.remove("hidden");
      $("explain").innerHTML = `${header}<div class="exp-stack">${explainHtml(q)}</div>${trail || ""}`;
      $("btn-submit").classList.add("hidden");
      $("btn-next").classList.remove("hidden");
      renderGlossary(findAcronyms(questionText(q) + " \n " + (q.explanation || "")));
      $("btn-next").textContent = state.idx + 1 >= state.queue.length ? "See results" : "Next";
    };
  };
  wait();
})();
