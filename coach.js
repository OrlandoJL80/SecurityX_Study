const ANALOGY_FIX = {
  277: "A basic firewall only asks what port you used. An NGFW sits in the same place, also looks at which app is talking, and can run several separate VPN setups on one box.",
  414: "Security can patch a chatbot. Legal has to approve using a customer's data to train it."
};

const TELL_RULES = [
  { re: /internal legal|legal team|counsel|office of general counsel/i,
    cue: "legal team",
    why: "Legal works in law. Law is about rights and permission, not about patching a bug." },
  { re: /consent|lawful basis/i,
    cue: "consent",
    why: "You cannot take someone's data and use it unless they agreed. That agreement is consent. That is why legal owns this option." },
  { re: /privacy (?:team|office|issue)|GDPR|CCPA/i,
    cue: "privacy",
    why: "Privacy rules decide whether customer data may be collected, kept, or reused." },
  { re: /single footprint|one box|one appliance|collapse of multiple|consolidated|unified threat/i,
    cue: "one box / single footprint",
    why: "They want several security jobs on one device, not three separate tools." },
  { re: /layer[- ]?7|application layer|application-aware|application visibility/i,
    cue: "Layer-7 / application layer",
    why: "A port filter only sees numbers. Layer-7 means the tool must see which application is talking." },
  { re: /multiple VPNs|security contexts|virtual systems|separate contexts/i,
    cue: "multiple VPNs / separate contexts",
    why: "One device, several isolated tunnels or policy worlds." },
  { re: /least privilege|need[- ]to[- ]know/i,
    cue: "least privilege",
    why: "Give only the access the job needs, then stop." },
  { re: /zero trust|always verify|assume breach/i,
    cue: "zero trust",
    why: "Do not trust the path. Check user, device, and request each time." },
  { re: /at rest|volume encrypt/i,
    cue: "at rest",
    why: "The data is sitting still. Encrypt the store, not the wire." },
  { re: /in transit|data in motion/i,
    cue: "in transit",
    why: "The data is moving. Protect the path." },
  { re: /\bRTO\b|recovery time/i,
    cue: "RTO",
    why: "How fast the service must be back. Time, not data." },
  { re: /\bRPO\b|recovery point/i,
    cue: "RPO",
    why: "How much data you can afford to lose. Point-in-time, not speed." },
  { re: /tabletop/i,
    cue: "tabletop",
    why: "Talk through the plan. Nobody takes production down." },
  { re: /walk[- ]through/i,
    cue: "walk-through",
    why: "People review the steps. Still not a live failover." },
  { re: /parallel test/i,
    cue: "parallel test",
    why: "Backup site runs beside production. Production stays up." },
  { re: /full (?:interruption|failover) test|cutover/i,
    cue: "full interruption",
    why: "Production is taken down on purpose to prove the swap." },
  { re: /\bSIEM\b/,
    cue: "SIEM",
    why: "Collects and correlates logs. Library, not lock." },
  { re: /\bSOAR\b/,
    cue: "SOAR",
    why: "Playbooks that act on alerts without a click every time." },
  { re: /\bEDR\b/,
    cue: "EDR",
    why: "Watch and respond on the laptop or server itself." },
  { re: /\bSASE\b/,
    cue: "SASE",
    why: "Cloud-delivered access plus inspection for users anywhere." },
  { re: /\bCASB\b/,
    cue: "CASB",
    why: "Control point between users and cloud apps." },
  { re: /immutable|\bWORM\b|write once/i,
    cue: "immutable / WORM",
    why: "Once written, nobody can quietly edit the record." },
  { re: /compensat(?:ing|ory) control/i,
    cue: "compensating control",
    why: "The preferred control will not fit, so you add a different control that covers the same risk." }
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

function collectTells(q) {
  if (Array.isArray(q.tells) && q.tells.length) return q.tells;
  const hay = (q.stem || "") + "\n" + Object.values(q.options || {}).join("\n") + "\n" + (q.explanation || "");
  const hits = [];
  const seen = new Set();
  TELL_RULES.forEach((rule) => {
    if (rule.re.test(hay) && !seen.has(rule.cue)) {
      seen.add(rule.cue);
      hits.push({ cue: rule.cue, why: rule.why });
    }
  });
  return hits;
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
  const pair = teachPair(q);
  const tells = pair ? [] : collectTells(q);
  const pic = pictureIt(q, parsed);
  let html = "";
  if (parsed.body) {
    html += `<div class="exp-body">${escapeHtml(parsed.body).replace(/\n/g, "<br>")}</div>`;
  }
  html += `<div class="look-for"><div class="kicker">How the words pick the answer</div>`;
  if (pair) {
    html += `<p>${pair}</p>`;
  } else if (tells.length) {
    html += "<ul>" + tells.map((t) => `<li><b>${escapeHtml(t.cue)}</b> — ${escapeHtml(t.why)}</li>`).join("") + "</ul>";
  } else {
    html += "<p>Find the job in the stem (legal, architect, engineer, SOC). Then pick the answer whose words belong to that job. Extra security jargon in the other options is bait.</p>";
  }
  html += "</div>";
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
