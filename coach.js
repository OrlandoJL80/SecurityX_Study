const ANALOGY_FIX = {
  277: "A basic firewall only asks what port you used. An NGFW sits in the same place, also looks at which app is talking, and can run several separate VPN setups on one box.",
  407: "A customer cannot read your private risk memo. They can see a public program that tracks every part and shows the tests.",
  414: "Security can patch a chatbot. Legal has to approve using a customer's data to train it."
};

const TEACH_FIX = {
  407: "The stem says the box is built from parts sourced around the world, and customers must be reassured the extra risk is small. A customer cannot inspect an internal qualitative analysis, a BIA, or a one-off third-party study. They can inspect a <b>transparent supply-chain risk program that tests parts and publishes that work</b>. Transparent + supply chain + testing is what a buyer can actually see.",
  414: "The stem says <b>legal team</b>. Legal works in law. In law you do not take something from a person unless they gave <b>consent</b>. That is why the answer with consent is the one counsel handles. Prompt injection, DoS, and poisoning are bugs. Security patches bugs. Legal does not.",
  277: "The stem wants several security functions in <b>one box</b>, several VPNs with separate contexts, and <b>Layer-7</b> inspection. A NAT box only rewrites addresses. A reverse proxy fronts one app. NIDS mostly watches. An NGFW is the one product that does all three."
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

function sentences(text) {
  return String(text || "").replace(/\s+/g, " ").trim().split(/(?<=\.)\s+/).filter((s) => s && s.length > 8);
}

function lastAsk(stem) {
  const t = String(stem || "").replace(/\s+/g, " ").trim();
  const m = t.match(/(Which of the following[^.?]*[.?]?|Which of these[^.?]*[.?]?|What should[^.?]*[.?]?|Who should[^.?]*[.?]?|What is the[^.?]*[.?]?)$/i);
  if (m) return m[0].replace(/\s+/g, " ").trim();
  const parts = t.split(/(?<=[.?!])\s+/);
  return parts[parts.length - 1] || t;
}

function setup(stem) {
  const t = String(stem || "").replace(/\s+/g, " ").trim();
  const ask = lastAsk(t);
  let head = t;
  if (ask && t.indexOf(ask) >= 0) head = t.slice(0, t.indexOf(ask)).trim();
  const sents = sentences(head);
  return sents.slice(0, 2).join(" ");
}

function correctLetters(q) {
  return String(q.answer || "").split(",").map((s) => s.trim()).filter(Boolean);
}
function optionOf(q, L) { return (q.options && q.options[L]) || ""; }
function correctText(q) {
  return correctLetters(q).map((L) => optionOf(q, L)).filter(Boolean).join("; ");
}

function whoMustSee(stem) {
  const t = stem || "";
  if (/legal team|counsel|attorney/i.test(t)) return { who: "legal", verb: "allow under the law" };
  if (/customer|buyer|client|consumer/i.test(t)) return { who: "the customer", verb: "see and believe" };
  if (/board|executive|auditor|regulator/i.test(t)) return { who: "the board or auditor", verb: "accept as proof" };
  if (/SOC|analyst|detect|alert/i.test(t)) return { who: "operations", verb: "detect or contain" };
  if (/architect|design|solution that includes/i.test(t)) return { who: "the architect", verb: "cover every listed requirement" };
  return { who: "the person named in the stem", verb: "do the job the question asked" };
}

function dismissWrong(text) {
  const t = text || "";
  if (/qualitative risk analysis|risk analysis performed/i.test(t)) return "that stays in a private memo. A customer cannot inspect it.";
  if (/business impact analysis|risk prioritization/i.test(t)) return "that is an internal planning process, not something you publish to buyers.";
  if (/third-party assessor|third party/i.test(t)) return "that is still a report, not an ongoing program the customer can watch.";
  if (/prompt injection|guardrail/i.test(t)) return "that is an engineering bug, not a legal permission issue.";
  if (/DoS|denial of service/i.test(t)) return "that is availability. Operations owns it, not counsel.";
  if (/model inversion|model poison|access control issue/i.test(t)) return "that is a technical flaw. Security patches it.";
  if (/bug bounty/i.test(t)) return "that is a vuln-intake process, not privacy permission.";
  if (/NAT gateway/i.test(t)) return "that only rewrites addresses.";
  if (/reverse proxy/i.test(t)) return "that fronts one application.";
  if (/NIDS|IDS/i.test(t)) return "that mostly watches. It does not enforce Layer-7 policy on several VPN contexts.";
  return "that answers a different job than the one in the stem.";
}

function teachAll(q) {
  if (TEACH_FIX[q.id]) return TEACH_FIX[q.id];
  if (q.pbq || !correctText(q)) {
    return "Read the exhibit and the ask. Pick the action that matches the job the stem named.";
  }
  const scene = setup(q.stem);
  const ask = lastAsk(q.stem);
  const who = whoMustSee(q.stem);
  const pick = correctText(q);
  const letters = correctLetters(q).join(", ");
  const why = sentences(splitExplain(q.explanation).body).slice(0, 2).join(" ");
  const ok = new Set(correctLetters(q));
  const wrong = Object.keys(q.options || {}).filter((L) => !ok.has(L));

  let html = "";
  if (scene) html += "<p>" + escapeHtml(scene) + "</p>";
  html += "<p>The ask is: <i>" + escapeHtml(ask) + "</i> That is for <b>" + escapeHtml(who.who) + "</b> — they must be able to <b>" + escapeHtml(who.verb) + "</b>.</p>";
  html += "<p>Choice <b>" + escapeHtml(letters) + "</b> says: <b>" + escapeHtml(pick) + "</b>.</p>";
  if (why) html += "<p>" + escapeHtml(why) + "</p>";
  html += "<p>Connect them: the stem named a job. This choice is the thing that job can actually use. The words in this choice are not decoration — they are the work product " + escapeHtml(who.who) + " can " + escapeHtml(who.verb) + ".</p>";
  if (wrong.length) {
    html += "<p>Why the others miss:</p><ul>";
    wrong.forEach((L) => {
      html += "<li><b>" + escapeHtml(L) + 