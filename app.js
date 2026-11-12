/* ============================================================
   Quiz Big Data — moteur de l'application
   ============================================================ */
"use strict";

const LS_KEY = "bigdata-quiz-stats-v1";
const EXAM_SECONDS = 30;
const MAX_REASK = 1; // une question ratée est remise au maximum 1 fois en fin de série

const $ = (id) => document.getElementById(id);
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const chapterOf = (id) => CHAPTERS.find((c) => c.id === id);
const questionsOf = (chId) => QUESTIONS.filter((q) => q.ch === chId);

/* ---------------- Statistiques persistantes ---------------- */
function loadStats() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY));
    if (s && typeof s === "object" && s.q) return s;
  } catch (e) { /* ignore */ }
  return { q: {}, best: {} };
}
function saveStats() { localStorage.setItem(LS_KEY, JSON.stringify(STATS)); }
let STATS = loadStats();
function statOf(id) {
  if (!STATS.q[id]) STATS.q[id] = { ok: 0, ko: 0 };
  return STATS.q[id];
}

/* ---------------- Navigation écrans ---------------- */
function showScreen(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $("screen-" + name).classList.add("active");
  window.scrollTo({ top: 0 });
}

/* ---------------- Accueil ---------------- */
function renderHome() {
  $("total-q").textContent = QUESTIONS.length;
  const total = QUESTIONS.length;
  const done = QUESTIONS.filter((q) => statOf(q.id).ok > 0).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  $("gp-fill").style.width = pct + "%";
  $("gp-text").textContent = pct + "% — " + done + "/" + total + " questions vues juste";

  const missed = QUESTIONS.filter((q) => statOf(q.id).ko > 0).length;
  $("desc-all").textContent = "Toutes les questions, mélangées (" + total + ")";
  $("desc-missed").textContent = missed
    ? missed + " question" + (missed > 1 ? "s" : "") + " à retravailler"
    : "Aucune question ratée pour l'instant 🎉";
  $("btn-missed").classList.toggle("disabled", missed === 0);

  const list = $("chapter-list");
  list.innerHTML = "";
  CHAPTERS.forEach((ch) => {
    const qs = questionsOf(ch.id);
    const seen = qs.filter((q) => statOf(q.id).ok + statOf(q.id).ko > 0).length;
    const ok = qs.filter((q) => statOf(q.id).ok > 0).length;
    const p = qs.length ? Math.round((ok / qs.length) * 100) : 0;
    const card = document.createElement("div");
    card.className = "chapter-card";
    card.innerHTML =
      '<div class="chapter-head"><span class="chapter-icon">' + ch.icon + '</span>' +
      '<span class="chapter-title">Cours ' + ch.num + " — " + ch.title.replace(/^.*?: /, "") + '</span>' +
      '<span class="chapter-num" style="background:' + ch.color + '">Cours ' + ch.num + '</span></div>' +
      '<div class="chapter-bar"><div class="chapter-fill" style="width:' + p + '%"></div></div>' +
      '<div class="chapter-foot"><span>' + ok + "/" + qs.length + " justes (" + p + "%)</span>" +
      '<span class="chapter-actions"><button class="mini-btn" data-fiche="' + ch.id + '">📖 Fiche</button>' +
      '<button class="mini-btn" data-play="' + ch.id + '">▶ Jouer</button></span></div>';
    list.appendChild(card);
  });
  list.querySelectorAll("[data-play]").forEach((b) =>
    b.addEventListener("click", () => startQuiz({ mode: "chapter", ch: b.dataset.play })));
  list.querySelectorAll("[data-fiche]").forEach((b) =>
    b.addEventListener("click", () => openFiche(b.dataset.fiche)));
}

function openFiche(chId) {
  const ch = chapterOf(chId);
  $("fiche-title").textContent = ch.icon + " Cours " + ch.num + " — " + ch.title;
  $("fiche-list").innerHTML = ch.summary.map((s) => "<li>" + s + "</li>").join("");
  $("fiche-modal").classList.remove("hidden");
}
$("fiche-close").addEventListener("click", () => $("fiche-modal").classList.add("hidden"));
$("fiche-modal").addEventListener("click", (e) => {
  if (e.target === $("fiche-modal")) $("fiche-modal").classList.add("hidden");
});

/* ---------------- Moteur de quiz ---------------- */
let S = null; // session en cours

function buildQueue(opts) {
  let pool;
  if (opts.mode === "chapter") pool = questionsOf(opts.ch);
  else if (opts.mode === "missed") pool = QUESTIONS.filter((q) => statOf(q.id).ko > 0);
  else pool = QUESTIONS.slice();
  return shuffle(pool);
}

function startQuiz(opts) {
  const queue = buildQueue(opts);
  if (!queue.length) { alert("Aucune question dans cette sélection."); return; }
  S = {
    mode: opts.mode,
    ch: opts.ch || null,
    queue,
    idx: 0,
    reasked: {},
    selected: new Set(),
    answered: false,
    results: [],      // {q, ok}
    streak: 0,
    bestStreak: 0,
    good: 0,
    startTime: Date.now(),
    timer: null,
    timeLeft: 0,
  };
  showScreen("quiz");
  renderQuestion();
}

/* Mélange les options et remappe la bonne réponse */
function shuffledView(q) {
  const order = shuffle(q.options.map((_, i) => i));
  const options = order.map((i) => q.options[i]);
  const mapAns = (a) => (Array.isArray(a) ? a.map((i) => order.indexOf(i)) : order.indexOf(a));
  return { options, answer: mapAns(q.answer) };
}

function renderQuestion() {
  const q = S.queue[S.idx];
  S.selected = new Set();
  S.answered = false;
  q.view = shuffledView(q);

  const ch = chapterOf(q.ch);
  const chip = $("q-chip");
  chip.textContent = ch.icon + " Cours " + ch.num;
  chip.style.borderColor = ch.color;
  chip.style.color = ch.color;
  $("q-type").textContent = q.type === "multi" ? "QCM multiple" : q.type === "vf" ? "Vrai / Faux" : "QCM";
  $("q-reask").classList.toggle("hidden", !S.reasked[q.id]);
  $("q-text").textContent = q.q;

  const box = $("q-options");
  box.innerHTML = "";
  q.view.options.forEach((opt, i) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.innerHTML = '<span class="key">' + (i + 1) + "</span><span>" + opt + "</span>";
    b.addEventListener("click", () => toggleOption(i));
    box.appendChild(b);
  });

  $("q-feedback").className = "q-feedback hidden";
  $("btn-validate").classList.remove("hidden");
  $("btn-validate").disabled = true;
  $("btn-next").classList.add("hidden");
  updateQuizTop();
  startTimerIfExam();
}

function toggleOption(i) {
  if (S.answered) return;
  const q = S.queue[S.idx];
  if (q.type === "multi") {
    S.selected.has(i) ? S.selected.delete(i) : S.selected.add(i);
  } else {
    S.selected = new Set([i]);
  }
  document.querySelectorAll(".opt").forEach((el, j) => el.classList.toggle("selected", S.selected.has(j)));
  $("btn-validate").disabled = S.selected.size === 0;
}

function isCorrect(q, selected) {
  const ans = Array.isArray(q.view.answer) ? q.view.answer : [q.view.answer];
  if (selected.size !== ans.length) return false;
  return ans.every((a) => selected.has(a));
}

function validate() {
  if (S.answered) return next();
  if (S.selected.size === 0) return;
  stopTimer();
  const q = S.queue[S.idx];
  S.answered = true;
  const ok = isCorrect(q, S.selected);

  // coloriage des options
  const ansSet = new Set(Array.isArray(q.view.answer) ? q.view.answer : [q.view.answer]);
  document.querySelectorAll(".opt").forEach((el, j) => {
    el.disabled = true;
    el.classList.remove("selected");
    if (ansSet.has(j)) el.classList.add("correct");
    else if (S.selected.has(j)) el.classList.add("wrong");
    else el.classList.add("dim");
  });

  // feedback + explication
  const fb = $("q-feedback");
  fb.classList.remove("hidden");
  fb.classList.add(ok ? "good" : "bad");
  $("qf-head").textContent = ok ? "✅ Bonne réponse !" : "❌ Mauvaise réponse";
  $("qf-explain").textContent = q.explain;

  // stats
  const st = statOf(q.id);
  if (ok) { st.ok++; S.good++; S.streak++; } else { st.ko++; S.streak = 0; }
  S.bestStreak = Math.max(S.bestStreak, S.streak);
  S.results.push({ q, ok });
  saveStats();

  // répétition espacée : une question ratée revient une fois en fin de série
  if (!ok && !S.reasked[q.id] && S.reasked[q.id] !== MAX_REASK) {
    S.reasked[q.id] = (S.reasked[q.id] || 0) + 1;
    S.queue.push(q);
  }

  if (!ok) {
    const card = $("question-card");
    card.classList.remove("shake");
    void card.offsetWidth;
    card.classList.add("shake");
  }

  $("btn-validate").classList.add("hidden");
  $("btn-next").classList.remove("hidden");
  updateQuizTop();
}

function next() {
  if (!S.answered) return;
  S.idx++;
  if (S.idx >= S.queue.length) return showResults();
  renderQuestion();
}

function updateQuizTop() {
  const total = S.queue.length;
  const done = S.results.length;
  $("qp-fill").style.width = total ? (done / total) * 100 + "%" : "0%";
  $("qp-text").textContent = Math.min(done + 1, total) + " / " + total;
  $("streak-n").textContent = S.streak;
  $("score-n").textContent = S.good;
}

/* ---------------- Timer (mode examen) ---------------- */
function startTimerIfExam() {
  stopTimer();
  if (S.mode !== "exam") { $("timer-wrap").classList.add("hidden"); return; }
  $("timer-wrap").classList.remove("hidden");
  S.timeLeft = EXAM_SECONDS;
  paintTimer();
  S.timer = setInterval(() => {
    S.timeLeft--;
    paintTimer();
    if (S.timeLeft <= 0) { stopTimer(); timeoutQuestion(); }
  }, 1000);
}
function paintTimer() {
  const pct = (S.timeLeft / EXAM_SECONDS) * 100;
  const bar = $("timer-bar");
  bar.style.width = pct + "%";
  bar.classList.toggle("low", S.timeLeft <= 10);
  $("timer-text").textContent = S.timeLeft + " s";
}
function stopTimer() { if (S && S.timer) { clearInterval(S.timer); S.timer = null; } }
function timeoutQuestion() {
  if (S.answered) return;
  S.selected = new Set();
  const q = S.queue[S.idx];
  S.answered = true;
  document.querySelectorAll(".opt").forEach((el, j) => {
    el.disabled = true;
    const ansSet = new Set(Array.isArray(q.view.answer) ? q.view.answer : [q.view.answer]);
    if (ansSet.has(j)) el.classList.add("correct"); else el.classList.add("dim");
  });
  const fb = $("q-feedback");
  fb.classList.remove("hidden");
  fb.classList.add("bad");
  $("qf-head").textContent = "⏱️ Temps écoulé !";
  $("qf-explain").textContent = q.explain;
  const st = statOf(q.id);
  st.ko++; S.streak = 0;
  S.results.push({ q, ok: false });
  saveStats();
  if (!S.reasked[q.id] && S.reasked[q.id] !== MAX_REASK) {
    S.reasked[q.id] = (S.reasked[q.id] || 0) + 1;
    S.queue.push(q);
  }
  $("btn-validate").classList.add("hidden");
  $("btn-next").classList.remove("hidden");
  updateQuizTop();
}

/* ---------------- Résultats ---------------- */
function showResults() {
  stopTimer();
  showScreen("result");
  const total = S.results.length;
  const good = S.results.filter((r) => r.ok).length;
  const pct = total ? Math.round((good / total) * 100) : 0;
  const elapsed = Math.round((Date.now() - S.startTime) / 1000);

  $("result-emoji").textContent = pct >= 90 ? "🏆" : pct >= 70 ? "🎉" : pct >= 50 ? "💪" : "📚";
  $("result-title").textContent = S.mode === "exam" ? "Examen terminé !" : "Série terminée !";
  $("result-pct").textContent = pct + "%";
  $("r-answered").textContent = total;
  $("r-good").textContent = good;
  $("r-bad").textContent = total - good;
  $("r-streak").textContent = S.bestStreak;
  $("r-time").textContent = elapsed >= 60 ? Math.floor(elapsed / 60) + "m" + (elapsed % 60) + "s" : elapsed + "s";

  // record perso par mode
  const key = "best-" + (S.mode === "chapter" ? "ch-" + S.ch : S.mode);
  const prev = STATS.best[key];
  if (!prev || pct > prev) { STATS.best[key] = pct; saveStats(); }
  $("r-best").textContent = (STATS.best[key] || pct) + "%";

  // bilan par chapitre
  const perCh = {};
  S.results.forEach((r) => {
    perCh[r.q.ch] = perCh[r.q.ch] || { ok: 0, n: 0 };
    perCh[r.q.ch].n++;
    if (r.ok) perCh[r.q.ch].ok++;
  });
  const rc = $("result-chapters");
  rc.innerHTML = "";
  CHAPTERS.filter((c) => perCh[c.id]).forEach((c) => {
    const d = perCh[c.id];
    const p = Math.round((d.ok / d.n) * 100);
    const row = document.createElement("div");
    row.className = "rc-row";
    row.innerHTML = '<span style="color:' + c.color + '">' + c.icon + "</span><span class='rc-name'>Cours " + c.num + " — " + c.title + "</span><span class='rc-score' style='color:" + (p >= 70 ? "var(--good)" : p >= 40 ? "var(--accent)" : "var(--bad)") + "'>" + p + "%</span>";
    rc.appendChild(row);
  });

  // questions ratées avec explication (pour réviser)
  const missed = S.results.filter((r) => !r.ok);
  const rm = $("result-missed");
  rm.innerHTML = "";
  if (missed.length) {
    rm.innerHTML = "<h3>🔁 " + missed.length + " question" + (missed.length > 1 ? "s" : "") + " à revoir</h3>";
    missed.forEach((r) => {
      const div = document.createElement("div");
      div.className = "missed-item";
      div.innerHTML = '<div class="mi-q">' + r.q.q + '</div><div class="mi-a">' + r.q.explain + "</div>";
      rm.appendChild(div);
    });
  }
  $("btn-retry-missed").classList.toggle("hidden", missed.length === 0);

  if (pct >= 80) launchConfetti();
  renderHome();
}

function launchConfetti() {
  const layer = $("confetti-layer");
  layer.innerHTML = "";
  const colors = ["#f59e0b", "#38bdf8", "#22c55e", "#a78bfa", "#f87171", "#facc15"];
  for (let i = 0; i < 80; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2 + Math.random() * 2.5 + "s";
    c.style.animationDelay = Math.random() * 0.8 + "s";
    c.style.transform = "rotate(" + Math.random() * 360 + "deg)";
    layer.appendChild(c);
  }
  setTimeout(() => (layer.innerHTML = ""), 6000);
}

/* ---------------- Événements ---------------- */
$("btn-all").addEventListener("click", () => startQuiz({ mode: "all" }));
$("btn-exam").addEventListener("click", () => startQuiz({ mode: "exam" }));
$("btn-missed").addEventListener("click", () => {
  if ($("btn-missed").classList.contains("disabled")) return;
  startQuiz({ mode: "missed" });
});
$("btn-quit").addEventListener("click", () => { stopTimer(); renderHome(); showScreen("home"); });
$("btn-validate").addEventListener("click", validate);
$("btn-next").addEventListener("click", next);
$("btn-again").addEventListener("click", () => startQuiz({ mode: S.mode, ch: S.ch }));
$("btn-home").addEventListener("click", () => { renderHome(); showScreen("home"); });
$("btn-retry-missed").addEventListener("click", () => startQuiz({ mode: "missed" }));
$("btn-reset").addEventListener("click", () => {
  if (confirm("Effacer toutes tes statistiques et records ?")) {
    STATS = { q: {}, best: {} };
    saveStats();
    renderHome();
  }
});

document.addEventListener("keydown", (e) => {
  if (!$("screen-quiz").classList.contains("active")) return;
  if (!$("fiche-modal").classList.contains("hidden")) {
    if (e.key === "Escape") $("fiche-modal").classList.add("hidden");
    return;
  }
  if (e.key >= "1" && e.key <= "9") {
    const i = parseInt(e.key, 10) - 1;
    if (S && S.queue[S.idx] && S.queue[S.idx].view && i < S.queue[S.idx].view.options.length) toggleOption(i);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (S && !S.answered) validate();
    else if (S && S.answered) next();
  }
});

/* ---------------- Init ---------------- */
renderHome();
