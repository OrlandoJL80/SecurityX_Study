const ANALOGY_FIX = {
  277: "A packet filter asks what port. An NGFW also sees the app and can run several VPN worlds on one box.",
  407: "A buyer cannot read a private risk memo. They can see a published supply-chain test program.",
  414: "Security patches the chatbot. Legal must approve using customer data to train it."
};

const CONNECT_FIX = {
  277: "Connect: <b>one box</b> + <b>Layer-7</b> in the stem and <b>next-generation firewall</b> in the key — only that product does both.",
  407: "Connect: <b>reassure customers</b> in the stem and <b>transparent supply chain … testing program</b> in the key — that is what a buyer can actually inspect.",
  414: "Connect: <b>legal team</b> in the stem and <b>consent</b> in the key — in law you do not take someone’s data without permission."
};

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

function correctLetters(q) {
  return String(q.answer || "").split(",").map((s) => s.trim()).filter(Boolean);
}
function correctText(q) {
  return correctLetters(q).map((L) => (q.options && q.options[L]) || "").filter(Boolean).join("; ");
}

function lastAsk(stem) {
  const t = String(stem || "").replace(/\s+/g, " ").trim();
  const m = t.match(/(Which of the following[^.?]{8,160}|What should[^.?]{8,120}|Who should[^.?]{8,120})/i);
  return m ? m[0].trim() : "";
}

function connectLine(q) {
  if (CONNECT_FIX[q.id]) return CONNECT_FIX[q.id];
  const pick = correctText(q);
  if (!pick) return "";
  const ask = lastAsk(q.stem);
  const short = pick.length > 110 ? pick.slice(0, 107) + "…" : pick;
  if (/legal team|counsel/i.test(q.stem) && /consent/i.test(pick)) {
    return "Connect: <b>legal team</b> in the stem and <b>consent</b> in the key — law requires permission before you use someone’s data.";
  }
  if (ask) {
    return "Connect: the stem asks you to <i>" + escapeHtml(ask) + "</i> and the key is <b>" + escapeHtml(short) + "</b> — that is the work product the ask is looking for.";
  }
  return "Connect: the key (<b>" + escapeHtml(short) + "</b>) is the thing that satisfies the job named in the stem.";
}

function pictureIt(q, parsed) {
  if (ANALOGY_FIX[q.id]) return ANALOGY_FIX[q.id];
  const a = parsed.analogy || "";
  if (!a || a.length > 120) return "";
  if (/nightclub|shrink-wrap|spell-check|photocopies|go-bag|bouncer|private letters|baby-crib|baby crib/i.test(a)) return "";
  return a;
}

function explainHtml(q) {
  const parsed = splitExplain(q.explanation || "");
  const pic = pictureIt(q, parsed);
  const line = connectLine(q);
  let html = "";
  if (parsed.body) html += "<div class=\"exp-body\">" + escapeHtml(parsed.body).replace(/\n/g, "<br>") + "</div>";
  if (line) html += "<p class=\"connect-line\">" + line + "</p>";
  if (pic) html += "<p class=\"picture-it\"><i>" + escapeHtml(pic) + "</i></p>";
  return html;
}

(function wrapCoach() {
  const wait = () => {
    if (typeof revealPanel !== "function") { setTimeout(wait, 30); return; }
    revealPanel = function (q, header, trail) {
      $("explain").classList.remove("hidden");
      $("explain").innerHTML = header + "<div class=\"exp-stack\">" + explainHtml(q) + "</div>" + (trail || "");
      $("btn-submit").classList.add("hidden");
      $("btn-next").classList.remove("hidden");
      renderGlossary(findAcronyms(questionText(q) + " \n " + (q.explanation || "")));
      $("btn-next").textContent = state.idx + 1 >= state.queue.length ? "See results" : "Next";
    };
  };
  wait();
})();
