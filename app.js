const PIN = "CAS005";
const EXAM_MIX = { 1: 18, 2: 24, 3: 28, 4: 20 };
const STORE = "sx_cas005_study_v2";
const MASTER_STREAK = 3;
const WEAK_MISSES = 2;

const $ = (id) => document.getElementById(id);
const state = {
  data: null,
  queue: [],
  idx: 0,
  selected: new Set(),
  revealed: false,
  results: [],
};

/* Acronyms: what the thing *is*, never which option to pick. */
const GLOSSARY = {
  ABAC: "Attribute-Based Access Control — grants access from tags on the user and the resource (department, data class), not from a job title alone.",
  AES: "Advanced Encryption Standard — the common symmetric cipher for data at rest and in transit.",
  ALE: "Annualized Loss Expectancy — estimated yearly dollar loss for a risk (SLE × ARO).",
  APT: "Advanced Persistent Threat — a patient, often well-funded attacker who stays inside a network.",
  ARO: "Annualized Rate of Occurrence — how many times a year you expect a given loss event.",
  "ATT&CK": "MITRE ATT&CK — a catalog of real attacker tactics and techniques used to plan detections and tests.",
  AUP: "Acceptable Use Policy — written rules for how staff may use company systems and data.",
  BCP: "Business Continuity Plan — how the business keeps operating through a disruption.",
  BIA: "Business Impact Analysis — which processes matter most and what an outage costs.",
  BYOD: "Bring Your Own Device — personal phones or laptops used for work.",
  CA: "Certificate Authority — issues and vouches for digital certificates.",
  CAPEC: "Common Attack Pattern Enumeration and Classification — a library of how attacks are built.",
  CASB: "Cloud Access Security Broker — a control point between users and cloud apps (visibility, DLP, access).",
  CCPA: "California Consumer Privacy Act — California resident privacy rights (know, delete, opt out of sale).",
  CDN: "Content Delivery Network — copies of content at the edge so pages load faster worldwide.",
  CI: "Continuous Integration — automatically build and test code when it is checked in.",
  "CI/CD": "Continuous Integration / Continuous Delivery — automated build, test, and release pipeline.",
  CIA: "Confidentiality, Integrity, Availability — the three classic security properties.",
  CIS: "Center for Internet Security — publishes prioritized Controls and technical Benchmarks.",
  CISO: "Chief Information Security Officer — the executive who owns the security program.",
  CMDB: "Configuration Management Database — inventory of systems and how they relate.",
  COBIT: "Control Objectives for Information and Related Technologies — an IT governance framework.",
  COPPA: "Children's Online Privacy Protection Act — U.S. rules for collecting data from children under 13.",
  COSO: "Committee of Sponsoring Organizations — internal-control / enterprise-risk framework.",
  CRL: "Certificate Revocation List — a published list of certificates that are no longer trusted.",
  CSP: "Cloud Service Provider — AWS, Azure, GCP, and similar platforms.",
  CVE: "Common Vulnerabilities and Exposures — a public ID for a known software flaw.",
  CVSS: "Common Vulnerability Scoring System — a 0–10 scale for how severe a flaw is.",
  DAST: "Dynamic Application Security Testing — probes a running app the way an attacker would.",
  DLP: "Data Loss Prevention — tools and rules that detect or block sensitive data leaving a channel.",
  DORA: "Digital Operational Resilience Act — EU rules for ICT risk in financial firms.",
  DPO: "Data Protection Officer — the privacy role required under some regimes such as GDPR.",
  DR: "Disaster Recovery — restoring IT after a site or system is lost.",
  EDR: "Endpoint Detection and Response — host telemetry and response on laptops and servers.",
  FQDN: "Fully Qualified Domain Name — a complete hostname such as app.company.com.",
  GDPR: "General Data Protection Regulation — EU personal-data law, including erasure and lawful basis.",
  GRC: "Governance, Risk, and Compliance — how policy, risk decisions, and proof of duty stay aligned.",
  HSM: "Hardware Security Module — tamper-resistant box that stores and uses cryptographic keys.",
  IaaS: "Infrastructure as a Service — you rent VMs, networks, and storage; you still secure the OS and apps.",
  IaC: "Infrastructure as Code — servers and networks defined in files (Terraform, Ansible) instead of click-ops.",
  ICS: "Industrial Control System — computers that run plants, pipelines, and factory floors.",
  IdP: "Identity Provider — the system that authenticates a user and issues a token or assertion.",
  IKE: "Internet Key Exchange — the handshake that sets up an IPsec VPN.",
  IoC: "Indicator of Compromise — a fact (hash, IP, host) that suggests an intrusion.",
  IoT: "Internet of Things — cameras, sensors, and other special-purpose networked devices.",
  IPS: "Intrusion Prevention System — inspects traffic and can block known attack patterns.",
  IR: "Incident Response — detect, contain, eradicate, recover, and learn from an event.",
  ISO: "International Organization for Standardization — among other things, publishes ISO/IEC 27001.",
  ITIL: "IT Infrastructure Library — a service-management framework (change, incident, problem).",
  KMS: "Key Management Service — cloud or on-prem service that creates and controls crypto keys.",
  LDAP: "Lightweight Directory Access Protocol — the common way apps query a directory for users and groups.",
  LGPD: "Lei Geral de Proteção de Dados — Brazil's general data-protection law.",
  MAC: "Media Access Control — the hardware address of a network interface; also Mandatory Access Control in other stems.",
  MDM: "Mobile Device Management — policy and inventory control over phones and tablets.",
  MFA: "Multifactor Authentication — more than one factor (something you know, have, or are).",
  MOU: "Memorandum of Understanding — a written statement of intent between organizations, short of a full contract.",
  NAC: "Network Access Control — decides whether a device may join the network.",
  NDA: "Nondisclosure Agreement — a contract that limits sharing of specified information.",
  NIST: "National Institute of Standards and Technology — publishes CSF, RMF, and many 800-series guides.",
  NX: "No-eXecute (XD) — a CPU flag that stops data pages from running as code.",
  OCSP: "Online Certificate Status Protocol — a live check of whether a certificate is still valid.",
  OIDC: "OpenID Connect — identity layer on OAuth 2.0 so an app can learn who the user is.",
  OSINT: "Open-Source Intelligence — information gathered from public sources.",
  OT: "Operational Technology — controllers and networks that run physical processes.",
  OWASP: "Open Worldwide Application Security Project — web and app security guidance (Top 10, SAMM, ASVS).",
  PaaS: "Platform as a Service — you deploy the app; the provider runs the OS and runtime.",
  PBQ: "Performance-Based Question — a lab-style item, not a single multiple-choice pick.",
  PCI: "Payment Card Industry (DSS) — security standard for environments that handle cardholder data.",
  PHI: "Protected Health Information — health data covered by HIPAA.",
  PII: "Personally Identifiable Information — data that can identify a person.",
  PKI: "Public Key Infrastructure — CAs, certificates, and keys used for identity and encryption.",
  PLC: "Programmable Logic Controller — the rugged computer that runs a machine or process line.",
  RACI: "Responsible, Accountable, Consulted, Informed — a chart of who owns which duty.",
  RBAC: "Role-Based Access Control — access follows a job role, not a one-off permission list.",
  RCE: "Remote Code Execution — an attacker can run their own code on your system from the network.",
  RMF: "Risk Management Framework — NIST process for categorize, select, implement, assess, authorize, monitor.",
  RPO: "Recovery Point Objective — how much data (in time) you can afford to lose.",
  RTO: "Recovery Time Objective — how quickly the process must be back.",
  SaaS: "Software as a Service — the vendor runs the application; you configure and use it.",
  SAML: "Security Assertion Markup Language — XML assertions used to federate login between companies.",
  SAMM: "Software Assurance Maturity Model — a scorecard for how mature your SDLC security is.",
  SAN: "Subject Alternative Name — extra DNS names on one TLS certificate. Also Storage Area Network in other stems.",
  SASE: "Secure Access Service Edge — cloud-delivered network and security stack for users anywhere.",
  SAST: "Static Application Security Testing — scans source or bytecode without running the app.",
  SBOM: "Software Bill of Materials — the ingredient list of libraries inside a product.",
  SCA: "Software Composition Analysis — finds known issues and licenses in third-party packages.",
  SDN: "Software-Defined Networking — the control plane that programs how packets are forwarded.",
  "SD-WAN": "Software-Defined Wide Area Network — policy-based paths across internet and private links.",
  SDLC: "Software Development Life Cycle — the path from design through build, test, release, and maintain.",
  SIEM: "Security Information and Event Management — collects logs and correlates alerts.",
  SLE: "Single Loss Expectancy — dollars lost if the event happens once.",
  SOC: "Security Operations Center — the team that watches alerts and runs detections. Also SOC 2, an attestation report.",
  SOAR: "Security Orchestration, Automation, and Response — playbooks that act on alerts without a human click every time.",
  SQL: "Structured Query Language — the language used to ask a relational database for rows.",
  SSO: "Single Sign-On — one login reused across many apps.",
  STRIDE: "Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation of privilege — a design-time threat model.",
  TPRM: "Third-Party Risk Management — how you assess and watch vendors and subprocessors.",
  TTP: "Tactics, Techniques, and Procedures — the playbook an attacker actually uses.",
  TLS: "Transport Layer Security — the protocol that encrypts browser and API connections.",
  USB: "Universal Serial Bus — removable devices that can carry data or malware.",
  VPN: "Virtual Private Network — an encrypted tunnel between two networks or a user and a network.",
  WAF: "Web Application Firewall — filters HTTP(S) attacks against an application.",
  WORM: "Write Once, Read Many — storage that cannot be altered after it is written.",
  XDR: "Extended Detection and Response — correlated detection across email, endpoint, identity, and network.",
  XSS: "Cross-Site Scripting — injecting script into a page other users will run.",
  ZERO: "Zero Trust — never assume the network is friendly; verify user, device, and path continuously.",
};

const THINK = {
  1: "Think like a risk owner: what decision, document, or proof would the board or an auditor accept?",
  2: "Think like an architect: which design choice meets the constraint with the least extra moving parts?",
  3: "Think like an engineer: which control actually changes the system, not just the policy binder?",
  4: "Think like a SOC lead: what evidence or action stops the bleeding first?",
};

/* Some banks spell these differently. Case-sensitive matching keeps "IPs"
   (IP addresses) from being labeled an Intrusion Prevention System. */
const GLOSSARY_VARIANTS = {
  SBOM: ["SBoM"],
  IoC: ["IOC"],
  IdP: ["IDP"],
  IaC: ["IAC"],
  "SD-WAN": ["SDWAN"],
  "CI/CD": ["CI/CD"],
};

/* ---------------------------------------------------------------
   Storage. Safari private browsing throws on setItem, so every call
   is guarded and mirrored to memory. The parsed store is cached so a
   full-bank stats pass does not JSON.parse 1,400 times.
   --------------------------------------------------------------- */
const memStore = {};
let storeCache = null;

function rawGet(area, key) {
  try {
    const v = window[area].getItem(key);
    if (v !== null) return v;
  } catch (e) { /* private mode or disabled storage */ }
  return Object.prototype.hasOwnProperty.call(memStore, area + key) ? memStore[area + key] : null;
}
function rawSet(area, key, val) {
  memStore[area + key] = val;
  try { window[area].setItem(key, val); } catch (e) { /* keep the memory copy */ }
}
function rawRemove(area, key) {
  delete memStore[area + key];
  try { window[area].removeItem(key); } catch (e) { /* nothing to do */ }
}

const EMPTY_REC = Object.freeze({ seen: 0, correct: 0, wrong: 0, streak: 0 });

function loadStore() {
  if (storeCache) return storeCache;
  const raw = rawGet("localStorage", STORE);
  let obj;
  try { obj = raw ? JSON.parse(raw) : {}; } catch (e) { obj = {}; }
  if (!obj || typeof obj !== "object") obj = {};
  if (!obj.history || typeof obj.history !== "object") obj.history = {};
  storeCache = obj;
  return storeCache;
}
function saveStore(obj) {
  storeCache = obj;
  rawSet("localStorage", STORE, JSON.stringify(obj));
}
/* Read-only. Returns a shared empty record for unseen items instead of
   writing 482 blank entries into the store just by rendering the menu. */
function rec(qid) {
  return loadStore().history[qid] || EMPTY_REC;
}
function recordResult(qid, correct) {
  const s = loadStore();
  const prev = s.history[qid] || EMPTY_REC;
  const h = {
    seen: (prev.seen || 0) + 1,
    correct: (prev.correct || 0) + (correct ? 1 : 0),
    wrong: (prev.wrong || 0) + (correct ? 0 : 1),
    streak: correct ? (prev.streak || 0) + 1 : 0,
  };
  s.history[qid] = h;
  saveStore(s);
  return h;
}
function isMastered(q) { return (rec(q.id).streak || 0) >= MASTER_STREAK; }
function isWeak(q) { return (rec(q.id).wrong || 0) >= WEAK_MISSES; }
/* Same test startMissed() uses, so the menu count and the drill agree. */
function isOpenMiss(q) { return (rec(q.id).wrong || 0) > 0 && !isMastered(q); }

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

function renderHome() {
  const st = stats();
  const byD = { 1: [], 2: [], 3: [], 4: [] };
  state.data.questions.forEach((q) => {
    if (byD[q.domain]) byD[q.domain].push(q);
  });
  $("domain-grid").innerHTML = [1, 2, 3, 4].map((d) => {
    const qs = byD[d];
    const live = qs.filter((q) => !isMastered(q)).length;
    const weak = qs.filter(isWeak).length;
    return `<button class="domain-btn" onclick="startDomain(${d})">
      Domain ${d}: ${escapeHtml(state.data.domains[d].short)}
      <small>${qs.length} in bank · ${escapeHtml(state.data.domains[d].weight)} of the real exam<br>${live} still in rotation · ${weak} missed 2+</small>
    </button>`;
  }).join("");
  $("missed-count").textContent = st.missed;
  $("mastered-count").textContent = st.mastered;
  $("weak-count").textContent = st.weak;
}

function startDomain(d) {
  const qs = state.data.questions.filter((q) => q.domain === d && !isMastered(q));
  if (!qs.length) {
    alert("Every item in this domain has a 3-in-a-row streak. Use Active rotation if you want a full refresh.");
    return;
  }
  beginQueue(shuffled(qs), `Domain ${d}: ${domainName(d)}`);
}
function startAll() {
  const live = state.data.questions.filter((q) => !isMastered(q));
  if (!live.length) {
    if (!confirm("Every item has a 3-in-a-row streak. Run the full bank again anyway?")) return;
    beginQueue(shuffled(state.data.questions), "Full bank refresh");
    return;
  }
  beginQueue(shuffled(live), "Active rotation");
}
function startMissed() {
  const qs = state.data.questions.filter(isOpenMiss);
  if (!qs.length) {
    alert("No open misses. Run a domain first, or those misses already have a 3-in-a-row streak.");
    return;
  }
  beginQueue(shuffled(qs), "Missed items still in rotation");
}
function isScoreable(q) {
  const letters = Object.keys(q.options || {});
  const ans = (q.answer || "").split(",").filter(Boolean);
  return !q.pbq && letters.length > 0 && ans.length > 0;
}

function startExam() {
  const byD = { 1: [], 2: [], 3: [], 4: [] };
  state.data.questions.forEach((q) => {
    if (isScoreable(q) && byD[q.domain]) byD[q.domain].push(q);
  });
  const mix = [];
  Object.entries(EXAM_MIX).forEach(([d, n]) => {
    mix.push(...pickForExam(byD[Number(d)] || [], Number(n)));
  });
  // If a domain ran short, backfill from remaining weak items, then anything not mastered.
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
  beginQueue(final, final.length === 90
    ? "90-question practice exam"
    : `Practice exam (${final.length} items available)`);
}

function pickForExam(pool, n) {
  const weak = shuffled(pool.filter((q) => isWeak(q) && !isMastered(q)));
  const fresh = shuffled(pool.filter((q) => !isWeak(q) && !isMastered(q)));
  const out = weak.concat(fresh).slice(0, n);
  if (out.length < n) {
    // Last resort: mastered items so the exam can still fill 90 on a mature deck
    const mastered = shuffled(pool.filter(isMastered));
    out.push(...mastered.slice(0, n - out.length));
  }
  return out;
}

function beginQueue(qs, title) {
  if (!qs || !qs.length) {
    alert("Nothing to study in that selection.");
    return;
  }
  state.queue = qs;
  state.idx = 0;
  state.results = [];
  $("quiz-title").textContent = title;
  show("quiz");
  renderQuestion();
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

/* ---------------------------------------------------------------
   Glossary matching. Case-sensitive, longest key first, and each
   match is blanked out so "CI" cannot fire again inside "CI/CD".
   --------------------------------------------------------------- */
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
      return " ".repeat(m.length); // consume it so shorter keys cannot re-match
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

/* ---------------------------------------------------------------
   Stem formatting. Many stems pack requirement bullets and the
   closing question into one run-on paragraph.
   --------------------------------------------------------------- */
function formatStem(raw) {
  let t = String(raw || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  if (!t) return "See the source exhibit.";

  t = t.replace(/\s*\u2022\s*-?\s*/g, "\n\u2022 ");

  // Numbered instruction lists. Only break on a real run (1, 2, 3... and it
  // may restart at 1), so a stray "at least 8." never reflows the stem.
  const nums = [];
  const NUMBERED = /(^|\s)(\d{1,2})\.\s(?=[A-Za-z])/g;
  t.replace(NUMBERED, (m, pre, n) => { nums.push(Number(n)); return m; });
  let prev = 0, isRun = nums.length >= 3;
  for (const n of nums) {
    if (n !== 1 && n !== prev + 1) { isRun = false; break; }
    prev = n;
  }
  if (isRun) t = t.replace(NUMBERED, (m, pre, n) => `\n${n}. `);

  // Put the closing question on its own line (last occurrence only).
  const LEADIN = /(Which of the following|Which of these|Which two of the following)/g;
  let last = -1, m;
  while ((m = LEADIN.exec(t)) !== null) last = m.index;
  if (last > 0 && t.length - last <= 400) {
    t = t.slice(0, last).replace(/\s+$/, "") + "\n\n" + t.slice(last);
  }

  return t.replace(/\n{3,}/g, "\n\n").trim();
}

/* Bullets and numbered steps get their own block so wrapped lines
   hang-indent instead of sliding back under the marker. */
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
  if (state.revealed) return; // double tap / Enter key must not score twice
  const q = currentQ();
  if (!q) return;
  const official = new Set((q.answer || "").split(",").filter(Boolean));

  if (!official.size || q.pbq) {
    state.revealed = true;
    recordResult(q.id, true);
    state.results.push({ id: q.id, domain: q.domain, correct: true, pbq: true });
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
  const h = recordResult(q.id, correct);
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
  // Terms that only show up in the explanation are safe to define now.
  renderGlossary(findAcronyms(questionText(q) + " \n " + (q.explanation || "")));
  $("btn-next").textContent = state.idx + 1 >= state.queue.length ? "See results" : "Next";
}

function nextQuestion() {
  if (state.idx + 1 >= state.queue.length) {
    renderScore();
    return;
  }
  state.idx += 1;
  renderQuestion();
}

function renderScore() {
  const scored = state.results.filter((r) => !r.pbq);
  const total = scored.length;
  const ok = scored.filter((r) => r.correct).length;
  const pct = total ? Math.round((ok / total) * 100) : 0;
  const pbqN = state.results.filter((r) => r.pbq).length;
  const by = { 1: [0, 0], 2: [0, 0], 3: [0, 0], 4: [0, 0] };
  scored.forEach((r) => {
    if (!by[r.domain]) return;
    by[r.domain][1] += 1;
    if (r.correct) by[r.domain][0] += 1;
  });
  $("score-summary").textContent = total
    ? `${ok} / ${total}  (${pct}%)`
    : (pbqN ? `${pbqN} PBQ item${pbqN === 1 ? "" : "s"} reviewed` : "No scored items");
  const st = stats();
  $("score-rows").innerHTML = [1, 2, 3, 4].map((d) => {
    const [c, n] = by[d];
    if (!n) return "";
    return `<div class="score-row"><span>Domain ${d}: ${escapeHtml(state.data.domains[d].short)}</span><b>${c}/${n}</b></div>`;
  }).join("") +
    (pbqN ? `<div class="score-row"><span>PBQ / lab items reviewed (not scored)</span><b>${pbqN}</b></div>` : "") +
    `<div class="score-row"><span>Mastered (${MASTER_STREAK} in a row)</span><b>${st.mastered}</b></div>` +
    `<div class="score-row"><span>Weak (missed ${WEAK_MISSES}+)</span><b>${st.weak}</b></div>`;
  show("score");
}

function resetProgress() {
  if (!confirm("Clear streaks, misses, and seen counts on this device?")) return;
  rawRemove("localStorage", STORE);
  storeCache = null;
  renderHome();
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
  // Wire the gate first so a data failure cannot leave a dead screen.
  $("pin").addEventListener("keydown", (e) => { if (e.key === "Enter") tryPin(); });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || $("quiz").classList.contains("hidden")) return;
    // A focused button already handles Enter itself; do not act twice.
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

  if (unlocked()) { show("home"); renderHome(); }
  else show("gate");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
