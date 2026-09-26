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

function connectLine(q) {
  if (window.TEACHES && TEACHES[q.id]) return TEACHES[q.id];
  return "";
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
    const start = () => {
      revealPanel = function (q, header, trail) {
        $("explain").classList.remove("hidden");
        $("explain").innerHTML = header + "<div class=\"exp-stack\">" + explainHtml(q) + "</div>" + (trail || "");
        $("btn-submit").classList.add("hidden");
        $("btn-next").classList.remove("hidden");
        renderGlossary(findAcronyms(questionText(q) + " \n " + (q.explanation || "")));
        $("btn-next").textContent = state.idx + 1 >= state.queue.length ? "See results" : "Next";
      };
    };
    if (window.TEACHES) { start(); return; }
    fetch("teaches.json").then((r) => r.json()).then((o) => {
      window.TEACHES = o;
      start();
    }).catch(() => start());
  };
  wait();
})();
