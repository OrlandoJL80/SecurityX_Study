const ANALOGY_FIX = {
  277: "A basic firewall only asks what port you used. An NGFW sits in the same place, also looks at which app is talking, and can run several separate VPN setups on one box.",
  414: "Security can patch a chatbot. Legal has to approve using a customer's data to train it."
};

const TELL_RULES = [
  { re: /internal legal|legal team|counsel|office of general counsel/i,
    cue: "internal legal team",
    why: "The question is asking who owns law and privacy, not which bug is the scariest. Pick the issue counsel must bless." },
  { re: /consent|lawful basis|privacy (?:team|office|issue)|GDPR|CCPA|customer data/i,
    cue: "consent / customer data / privacy",
    why: "Using someone's data to train a model is a legal question first. Engineering bugs stay with security." },
  { re: /single footprint|one box|one appliance|collapse of multiple|consolidated|unified threat/i,
    cue: "one box / single footprint",
    why: "They want several security jobs on one device, not three separate tools." },
  { re: /layer[- ]?7|application layer|application-aware|application visibility|inspect(?:ion)? (?:of )?applications/i,
    cue: "Layer-7 / application layer",
    why: "Port filters cannot see the app. The answer has to inspect what the application is doing." },
  { re: /multiple VPNs|security contexts|virtual systems|separate contexts|tenant isolation/i,
    cue: "multiple VPNs / separate contexts",
    why: "One device, several isolated tunnels or policy worlds." },
  { re: /least privilege|need[- ]to[- ]know|minimum (?:necessary|access)/i,
    cue: "least privilege",
    why: "Give only the access the job needs, then stop." },
  { re: /zero trust|never trust|always verify|assume breach/i,
    cue: "zero trust / always verify",
    why: "Do not trust the network path. Check user, device, and request each time." },
  { re: /encryption at rest|data at rest|volume encrypt/i,
    cue: "at rest",
    why: "Protect stored data, not the wire." },
  { re: /in transit|data in motion|TLS|IPsec tunnel/i,
    cue: "in transit",
    why: "Protect data while it moves." },
  { re: /RTO|recovery time/i,
    cue: "RTO",
    why: "How fast the service must be back. Time, not data." },
  { re: /RPO|recovery point|how much data/i,
    cue: "RPO",
    why: "How much data you can afford to lose. Point-in-time, not speed." },
  { re: /tabletop/i,
    cue: "tabletop",
    why: "Talk through the plan. Nobody touches production." },
  { re: /walk[- ]through/i,
    cue: "walk-through",
    why: "People review the steps together. Still not a live failover." },
  { re: /parallel test|parallel processing/i,
    cue: "parallel test",
    why: "Run the backup site beside production. Production stays up." },
  { re: /full (?:interruption|failover) test|cutover/i,
    cue: "full interruption / cutover",
    why: "Production is taken down on purpose to prove the swap." },
  { re: /SIEM/i,
    cue: "SIEM",
    why: "Collect and correlate logs. It is the library, not the lock." },
  { re: /SOAR/i,
    cue: "SOAR",
    why: "Playbooks that act on alerts without a click every time." },
  { re: /EDR/i,
    cue: "EDR",
    why: "Telemetry and response on the laptop or server itself." },
  { re: /SASE/i,
    cue: "SASE",
    why: "Cloud-delivered access plus inspection for users anywhere." },
  { re: /CASB/i,
    cue: "CASB",
    why: "Visibility and control between users and cloud apps." },
  { re: /immutable|WORM|write once/i,
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

function stemBullets(stem) {
  const t = String(stem || "");
  const out = [];
  const re = /(?:^|[\n\u2022]|\s)(?:\u2022|\-|\d{1,2}\.)\s*([^\n\u2022]+)/g;
  let m;
  while ((m = re.exec(t))) {
    const line = m[1].replace(/\s+/g, " ").trim();
    if (line.length > 12 && line.length < 180) out.push(line);
  }
  return out.slice(0, 6);
}

function collectTells(q) {
  if (Array.isArray(q.tells) && q.tells.length) return q.tells;
  const hay = (q.stem || "") + "\n" + (q.explanation || "");
  const hits = [];
  const seen = new Set();
  TELL_RULES.forEach((rule) => {
    if (rule.re.test(hay) && !seen.has(rule.cue)) {
      seen.add(rule.cue);
      hits.push({ cue: rule.cue, why: rule.why });
    }
  });
  if (hits.length) return hits;
  const bullets = stemBullets(q.stem);
  if (bullets.length >= 2) {
    return bullets.map((b) => ({
      cue: b,
      why: "The right answer is the one control that covers this requirement together with the others — not a tool that only covers one bullet."
    }));
  }
  return [];
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
  const tells = collectTells(q);
  const pic = pictureIt(q, parsed);
  let html = "";
  if (parsed.body) {
    html += `<div class="exp-body">${escapeHtml(parsed.body).replace(/\n/g, "<br>")}</div>`;
  }
  if (tells.length) {
    html += `<div class="look-for"><div class="kicker">Look for in the stem</div><ul>` +
      tells.map((t) => `<li><b>${escapeHtml(t.cue)}</b> — ${escapeHtml(t.why)}</li>`).join("") +
      `</ul></div>`;
  } else {
    html += `<div class="look-for"><div class="kicker">Look for in the stem</div><p>Match every constraint in the question. Wrong answers usually fit one phrase and miss the rest.</p></div>`;
  }
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
