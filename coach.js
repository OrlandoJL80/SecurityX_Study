const CONNECT_FIX = {
  184: 'The question mentions "right to be forgotten" and scrubbing publications. The only answer that names that right is GDPR.',
  201: 'The question mentions "new markets", "legal counsel", and "age-related". The only answer that addresses the legal counsel\'s concerns is COPPA. COPPA is the U.S. child-privacy law — age (children), legal (privacy), and the market they want to enter.',
  277: 'The question mentions "single footprint", "multiple VPNs", and "Layer-7". The only answer that covers all three is a next-generation firewall.',
  407: 'The question mentions "globally sourced" parts and "reassure customers". The only answer a buyer can inspect is a transparent supply-chain risk and testing program.',
  414: 'The question mentions "legal team". The only answer that addresses counsel is consent before training on customer data. In law you do not take someone\'s data without permission.'
};

const HINTS = ["legal counsel","legal team","right to be forgotten","age-related","new markets","supply chain","single footprint","layer-7","application layer","customer data","consent","zero trust","least privilege","at rest","in transit","tabletop","compensating control","threat modeling","playbook","globally sourced","reassure","chatbot","security contexts","forward secrecy","split tunnel","code signing","bug bounty","prompt injection","model inversion","secure boot","business impact"];

function splitExplain(raw) {
  const text = String(raw || "").replace(/\r/g, "").trim();
  const chunks = text.split(/\n\s*\n/);
  const body = [];
  chunks.forEach((c) => {
    const t = c.trim();
    if (!t || /^Imagine\b/i.test(t)) return;
    body.push(t);
  });
  return body.join("\n\n");
}

function mentions(stem) {
  const t = String(stem || "");
  const low = t.toLowerCase();
  const out = [];
  HINTS.forEach((h) => {
    if (low.indexOf(h) >= 0 && out.indexOf(h) < 0) out.push(h);
  });
  return out.slice(0, 3);
}

function shortAns(q) {
  const letters = String(q.answer || "").split(",").map((s) => s.trim()).filter(Boolean);
  const text = letters.map((L) => (q.options && q.options[L]) || "").filter(Boolean).join("; ");
  const first = text.split(/[.;]/)[0].trim();
  const cut = first.length > 72 ? first.slice(0, 69) + "\u2026" : first;
  return { cut: cut, key: letters.join(",") };
}

function firstWhy(q) {
  const body = splitExplain(q.explanation || "");
  const s = body.split(/(?<=[.])\s+/)[0] || "";
  return s.length > 140 ? s.slice(0, 137) + "\u2026" : s;
}

function connectLine(q) {
  if (CONNECT_FIX[q.id]) return CONNECT_FIX[q.id];
  if (q.pbq || !q.options) return "Match the exhibit to the job named in the stem.";
  const ms = mentions(q.stem);
  const a = shortAns(q);
  const why = firstWhy(q);
  let head;
  if (ms.length === 1) head = 'The question mentions "' + ms[0] + '".';
  else if (ms.length === 2) head = 'The question mentions "' + ms[0] + '" and "' + ms[1] + '".';
  else if (ms.length >= 3) head = 'The question mentions "' + ms[0] + '", "' + ms[1] + '", and "' + ms[2] + '".';
  else head = "Look at the constraints in the stem.";
  return head + " The only answer that fits is " + a.cut + " (" + a.key + "). " + why;
}

function explainHtml(q) {
  const body = splitExplain(q.explanation || "");
  const line = connectLine(q);
  let html = "";
  if (body) html += "<div class=\"exp-body\">" + escapeHtml(body).replace(/\n/g, "<br>") + "</div>";
  if (line) html += "<p class=\"connect-line\">" + escapeHtml(line) + "</p>";
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
