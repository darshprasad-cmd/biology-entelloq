/* ============================================================================
   Biology Entelloq — "THINK LIKE A BIOLOGIST" reasoning engine.
   Translated from Physics Entelloq's Reason scaffold. Not a quiz — a guided
   reasoning workout: for each scenario you name the principles in play, identify
   what the system REGULATES, find the structure-function link, choose a strategy
   (wrong choices surface the classic misconception), then reveal the worked
   reasoning and generalise. It teaches HOW a biologist thinks, not just answers.
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };

  const STEPS = ["Observe", "Principles", "What's regulated", "Form & function", "Strategy", "Reason", "Generalise"];

  const PROBLEMS = [
    {
      id: "altitude", domain: "Human Physiology", color: "#fb7185",
      title: "The mountaineer's blood",
      prompt: "A climber moves from sea level to a Himalayan base camp at 5,000 m and stays for three weeks. A blood test on arrival is normal; three weeks later her red-blood-cell count is markedly higher. She hasn't trained or taken any drug. Reason through why her body did this.",
      principles: { hint: "Which biological principles are genuinely in play?",
        options: [
          { t: "Homeostasis — the body defends a set point (here, oxygen delivery)", ok: true },
          { t: "Negative feedback — a sensed drop triggers a correcting response", ok: true },
          { t: "Natural selection acting within her lifetime", ok: false },
          { t: "Gas exchange & oxygen transport by haemoglobin", ok: true },
          { t: "The red cells sensed the altitude and decided to divide", ok: false },
        ] },
      regulated: { q: "What is her body actually regulating?", o: ["The number of red blood cells, as an end in itself", "Oxygen delivery to the tissues", "Her blood pressure", "The altitude"], a: 1,
        why: "The set point being defended is OXYGEN DELIVERY. Red-cell count is just one lever the body pulls to defend it. Naming the regulated variable — not the mechanism — is the first move of physiological reasoning." },
      form: { q: "Which structure-function link carries the signal?", o: ["The lungs make more haemoglobin directly", "Kidney cells sense low oxygen and release the hormone erythropoietin (EPO), which tells bone marrow to make more red cells", "The heart pumps harder, creating red cells", "Muscles convert to red cells under stress"], a: 1,
        why: "Specialised oxygen-sensing cells in the KIDNEY release EPO when oxygen falls. EPO travels to the BONE MARROW, whose job is making blood cells. Structure fits function at every step — sensor, messenger, factory." },
      strategy: { q: "What's the soundest way to reason this out?", o: [
        { t: "Start from the STIMULUS (low O₂), follow the feedback loop to the response", ok: true },
        { t: "Assume the body 'wants' more red cells and work backwards", ok: false, why: "Biology has no 'wants'. Teleology feels intuitive but hides the mechanism. Always trace the actual signal, sensor and effector." },
        { t: "Conclude it's a coincidence / measurement error", ok: false, why: "The effect is real and reproducible (it's why athletes altitude-train). Dismissing a consistent result skips the reasoning." },
      ] },
      reason: [
        "Thin air at altitude means each breath delivers less oxygen — arterial O₂ falls.",
        "Oxygen-sensing cells in the kidney detect the drop (the SENSOR).",
        "They secrete more erythropoietin (EPO) — the MESSENGER — into the blood.",
        "EPO reaches the bone marrow (the EFFECTOR) and ramps up red-cell production.",
        "More red cells → more haemoglobin → oxygen delivery is restored toward its set point.",
        "This is negative feedback: the response (more O₂ delivery) removes the original stimulus (low O₂).",
      ],
      reflect: {
        misconception: "The cells did NOT 'sense the altitude and choose to divide.' No single cell knows it's on a mountain — a hormonal loop between kidney and marrow does the work.",
        alternative: "The body also breathes faster and the heart beats harder immediately — fast responses buy time while the slow red-cell response builds over weeks. Real regulation layers fast and slow loops.",
        principle: "GENERAL PRINCIPLE: a homeostatic system defends a regulated variable through sensor → signal → effector negative feedback. Find those three parts and any regulation makes sense.",
      },
    },
    {
      id: "resistance", domain: "Evolution", color: "#f6c667",
      title: "The antibiotic that stopped working",
      prompt: "A patient's bacterial infection is wiped out by an antibiotic. Months later the same infection returns — but now the drug barely works. The bacteria seem to have 'learned' to resist it. Reason through what actually happened.",
      principles: { hint: "Which principles are truly at work?",
        options: [
          { t: "Variation — the bacterial population wasn't genetically identical", ok: true },
          { t: "Differential survival & reproduction (natural selection)", ok: true },
          { t: "Heredity — survivors pass resistance to offspring", ok: true },
          { t: "Individual bacteria adapted by trying harder", ok: false },
          { t: "The antibiotic taught the bacteria to resist", ok: false },
        ] },
      regulated: { q: "What did the antibiotic actually do to the population?", o: ["Made each bacterium tougher", "Acted as a selection pressure — killing the susceptible, sparing the few already resistant", "Created new resistance genes", "Slowed bacterial breathing"], a: 1,
        why: "The drug is a FILTER, not a teacher. Resistant variants existed by chance BEFORE the drug arrived (mutation is random). The antibiotic simply removed everyone else, so the survivors' descendants dominate." },
      form: { q: "Where does the resistance physically come from?", o: ["The bacteria will it into being", "A pre-existing mutation — e.g. a pump that ejects the drug, or an enzyme that breaks it", "The patient's immune system", "The antibiotic mutating"], a: 1,
        why: "Resistance is a molecular structure: an efflux pump, a drug-degrading enzyme, or an altered target the drug can't grip. These arise by random mutation and, once selected, spread — even hopping between bacteria on plasmids." },
      strategy: { q: "How should you reason about the population over time?", o: [
        { t: "Track how ALLELE FREQUENCIES shift under selection, generation by generation", ok: true },
        { t: "Think about what one bacterium does when it meets the drug", ok: false, why: "Evolution acts on POPULATIONS across generations, not on an individual in the moment. The single-bacterium view is the classic Lamarckian trap." },
        { t: "Assume the drug caused the mutations it selects for", ok: false, why: "Mutations are random and pre-exist selection (Luria–Delbrück, 1943). The drug selects; it does not create." },
      ] },
      reason: [
        "A huge bacterial population carries random genetic variation — including, by chance, a few cells with a resistance mutation.",
        "The antibiotic kills the susceptible majority but the resistant few survive (differential survival).",
        "Those survivors reproduce — bacteria divide every ~20 minutes — passing resistance on (heredity).",
        "Within the population, the frequency of the resistance allele climbs from rare to common.",
        "Months later the infection is dominated by descendants of the resistant survivors — the drug now barely works.",
        "No individual 'learned' anything; the population's composition changed. That is evolution by natural selection.",
      ],
      reflect: {
        misconception: "Bacteria don't 'learn' or 'try' to resist, and the antibiotic doesn't 'teach' them. Resistance is selected FROM pre-existing random variation, not induced by the drug.",
        alternative: "Resistance genes also spread horizontally via plasmids passed between bacteria — so selection AND gene transfer both matter. Real evolution is messier than one clean mechanism.",
        principle: "GENERAL PRINCIPLE: variation + heredity + differential reproduction = evolution by natural selection. Selection edits existing variation; it does not create it on demand.",
      },
    },
    {
      id: "glucose", domain: "Human Physiology", color: "#34d399",
      title: "The sugar that came back down",
      prompt: "You eat a large plate of rice. Your blood-glucose concentration spikes within the hour — then, over the next two hours, drifts back to exactly where it started, without you doing anything. Trace the regulation that pulled it back.",
      principles: { hint: "Which principles govern this?",
        options: [
          { t: "Homeostasis — blood glucose is held near a set point", ok: true },
          { t: "Negative feedback via hormones", ok: true },
          { t: "Antagonistic control (two opposing hormones)", ok: true },
          { t: "Diffusion alone brings glucose back to normal", ok: false },
          { t: "The pancreas predicts meals in advance", ok: false },
        ] },
      regulated: { q: "What variable is being defended?", o: ["The amount of insulin", "Blood-glucose concentration", "The size of the meal", "Stomach acidity"], a: 1,
        why: "The regulated variable is BLOOD-GLUCOSE CONCENTRATION (~5 mmol/L). Insulin is just the effector signal used to defend it — don't confuse the lever with the thing being held steady." },
      form: { q: "Which cells sense and respond?", o: ["Liver cells sense glucose and make insulin", "β-cells in the pancreas sense high glucose and secrete insulin, which tells liver & muscle to take glucose up and store it as glycogen", "Red blood cells absorb the excess", "The brain burns it off"], a: 1,
        why: "Pancreatic β-cells are the glucose SENSOR and insulin SOURCE. Insulin's targets have the structure to pull glucose out of the blood — muscle and fat push GLUT4 transporters into the membrane so uptake itself rises, while the liver (whose GLUT2 is open either way) responds by switching on glucokinase and glycogen synthase, trapping glucose as glycogen. Sensor, signal, effector again." },
      strategy: { q: "Best reasoning approach?", o: [
        { t: "Follow the negative-feedback loop: high glucose → insulin → uptake → glucose falls → insulin stops", ok: true },
        { t: "Assume glucose just gets 'used up' by activity", ok: false, why: "At rest, with no exercise, the fall is driven by regulated STORAGE (glycogenesis), not by burning it off. Consumption alone can't explain the precise return to set point." },
        { t: "Think of insulin as always-on", ok: false, why: "Insulin is released in PROPORTION to glucose and switches off as glucose normalises — that's what stops the correction from overshooting." },
      ] },
      reason: [
        "Rice is digested to glucose, which floods into the blood — glucose rises above the set point (the stimulus).",
        "Pancreatic β-cells sense the rise and secrete insulin in proportion (sensor + signal).",
        "Insulin tells liver and muscle to take glucose up and store it as glycogen (effector response).",
        "Blood glucose falls back toward the set point; as it does, insulin secretion winds down.",
        "This is negative feedback — the response removes the stimulus and then quiets itself.",
        "If glucose later drops too low, the antagonistic hormone glucagon does the reverse — releasing stored glucose. Two opposing loops hold the line.",
      ],
      reflect: {
        misconception: "Diffusion doesn't 'even out' blood glucose back to a set point — an active, hormone-driven feedback loop does. And the pancreas reacts to glucose; it doesn't predict your meal.",
        alternative: "Regulation is antagonistic: insulin lowers glucose, glucagon raises it. Many homeostatic variables (glucose, calcium, temperature) are held by such push-pull pairs, not a single hormone.",
        principle: "GENERAL PRINCIPLE: tight homeostasis usually comes from ANTAGONISTIC negative-feedback loops — one to correct each direction of drift. Find both, and the steadiness makes sense.",
      },
    },
  ];

  const app = document.getElementById("reasonApp");
  // These summaries describe the existing worked reasoning, not new assessments.
  const WORKOUT_DETAILS = {
    altitude: { skills: ["Trace feedback loops", "Link structure to function"], outcome: "Connect a change in oxygen delivery to the kidney–marrow response." },
    resistance: { skills: ["Reason across generations", "Separate cause from coincidence"], outcome: "Explain how selection changes a population without individuals ‘learning’ resistance." },
    glucose: { skills: ["Identify regulated variables", "Compare opposing responses"], outcome: "Trace the insulin response and identify the opposing role of glucagon." },
  };
  const STEP_GUIDANCE = [
    "Read the evidence. What changed, and what needs explaining?",
    "Choose the relevant principles, then check your selection.",
    "Distinguish the variable or population change from the mechanism behind it.",
    "Connect a biological structure to the job it performs.",
    "Choose a causal approach. A wrong turn comes with an explanation.",
    "Reveal the worked reasoning and compare it with your own explanation.",
    "Take the general principle into another problem.",
  ];
  let catalogQuery = "";
  let catalogDomain = "all";

  function filterProblems(query, domain) {
    const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return PROBLEMS.filter((p) => {
      const details = WORKOUT_DETAILS[p.id];
      const searchable = [p.title, p.domain, p.prompt, details.outcome, ...details.skills].join(" ").toLocaleLowerCase();
      return (domain === "all" || p.domain === domain) && terms.every((term) => searchable.includes(term));
    });
  }

  function route() {
    const id = location.hash.replace(/^#/, "");
    const p = PROBLEMS.find((x) => x.id === id);
    if (p) renderProblem(p); else renderList();
    scrollTo({ top: 0, behavior: "instant" });
    if (window.__observeReveals) window.__observeReveals();
  }
  addEventListener("hashchange", route);

  function renderList() {
    app.innerHTML = "";
    const head = el("div", "wrap band", `
      <div class="eyebrow">Think like a biologist</div>
      <h1 class="h1" style="margin:16px 0 16px">Don't memorise answers.<br><span class="grad">Build the reasoning.</span></h1>
      <p class="lead" style="max-width:640px">Each workout walks you through how a biologist actually thinks — name the principles, find what's regulated, follow the structure to the function, choose a strategy, then reason it out and generalise.</p>`);
    app.appendChild(head);
    const wrap = el("div", "wrap rz-catalog");
    const tools = el("div", "rz-find");
    tools.innerHTML = `<label class="rz-field" for="rzSearch"><span>Find a workout</span><input id="rzSearch" type="search" placeholder="Try feedback, glucose or evolution" autocomplete="off" aria-controls="rzResults"></label>
      <label class="rz-field" for="rzDomain"><span>Topic</span><select id="rzDomain" aria-controls="rzResults"><option value="all">All topics</option>${[...new Set(PROBLEMS.map((p) => p.domain))].map((domain) => `<option>${domain}</option>`).join("")}</select></label>
      <button type="button" class="btn ghost rz-clear" hidden>Clear filters</button>`;
    const count = el("p", "rz-results-count"); count.id = "rzResultCount"; count.setAttribute("role", "status"); count.setAttribute("aria-live", "polite");
    const g = el("div", "grid g3"); g.id = "rzResults";
    const empty = el("div", "rz-empty"); empty.hidden = true;
    empty.innerHTML = `<h2 class="h3">No matching workouts</h2><p>Try a broader term or show all topics. Your filters do not change your answers.</p><button type="button" class="btn ghost">Show all workouts</button>`;
    wrap.append(tools, count, g, empty);
    const search = $("#rzSearch", tools); const domain = $("#rzDomain", tools); const clear = $(".rz-clear", tools);
    search.value = catalogQuery; domain.value = catalogDomain;
    function updateResults() {
      catalogQuery = search.value; catalogDomain = domain.value;
      const matches = filterProblems(catalogQuery, catalogDomain);
      g.innerHTML = "";
      count.textContent = `${matches.length} of ${PROBLEMS.length} workouts · 7 guided steps each`;
      clear.hidden = !catalogQuery && catalogDomain === "all";
      empty.hidden = matches.length !== 0;
      matches.forEach((p) => {
        const details = WORKOUT_DETAILS[p.id];
        const c = el("a", "card rz-workout"); c.href = "#" + p.id; c.style.setProperty("--lc", p.color);
        c.innerHTML = `<div class="glow"></div><div class="rz-dom" style="color:${p.color}">${p.domain}</div>
          <h2 class="h3" style="margin:6px 0 10px">${p.title}</h2><p>${p.prompt.slice(0, 120)}…</p>
          <div class="rz-skills" aria-label="Reasoning skills">${details.skills.map((skill) => `<span>${skill}</span>`).join("")}</div>
          <p class="rz-outcome"><strong>Work towards</strong>${details.outcome}</p>
          <div class="rz-go" style="color:${p.color}">Reason it through <span aria-hidden="true">→</span></div>`;
        g.appendChild(c);
      });
    }
    function resetFilters() { search.value = ""; domain.value = "all"; updateResults(); search.focus(); }
    search.addEventListener("input", updateResults); domain.addEventListener("change", updateResults);
    clear.addEventListener("click", resetFilters); $("button", empty).addEventListener("click", resetFilters);
    updateResults();
    app.appendChild(wrap);
  }

  function renderProblem(p) {
    app.innerHTML = "";
    const root = el("div", "wrap band rz"); root.style.setProperty("--lc", p.color);
    root.innerHTML = `
      <a class="rz-back" href="#">← All workouts</a>
      <div class="rz-dom" style="color:${p.color}">${p.domain}</div>
      <h1 class="h1" style="margin:10px 0 18px">${p.title}</h1>
      <div class="rz-progress" role="status" aria-live="polite"><strong id="rzProgressLabel"></strong><p id="rzProgressHint"></p></div>
      <ol class="rz-rail" aria-label="Workout stages">${STEPS.map((s, i) => `<li class="rz-node" data-i="${i}" aria-label="${i + 1}. ${s}"><span class="rz-number" aria-hidden="true">${i + 1}</span><span class="rz-node-name" aria-hidden="true">${s}</span></li>`).join("")}</ol>
      <div class="rz-prompt">${p.prompt}</div>
      <div class="rz-steps" id="rzSteps"></div>`;
    app.appendChild(root);
    const host = $("#rzSteps", root);
    const nodes = [...root.querySelectorAll(".rz-node")];
    let step = 0;
    function mark(i) {
      const complete = i === STEPS.length;
      nodes.forEach((n, j) => { n.classList.toggle("on", j === i); n.classList.toggle("done", j < i); if (j === i) n.setAttribute("aria-current", "step"); else n.removeAttribute("aria-current"); n.setAttribute("aria-label", `${j + 1}. ${STEPS[j]}${j < i ? ", reviewed" : j === i ? ", current step" : ""}`); });
      $("#rzProgressLabel", root).textContent = complete ? "All 7 stages reviewed" : `Step ${i + 1} of ${STEPS.length} · ${STEPS[i]}`;
      $("#rzProgressHint", root).textContent = complete ? "Use the principle below in another workout or practise questions. Stages reviewed are not a measure of mastery." : STEP_GUIDANCE[i];
    }
    function advance(event) {
      if (event && event.currentTarget.disabled) return;
      if (event) event.currentTarget.disabled = true;
      if (step >= STEPS.length - 1) return;
      step++; render();
      const heading = host.lastElementChild && $(".rz-sthd", host.lastElementChild);
      if (heading) heading.focus({ preventScroll: true });
      host.lastElementChild.scrollIntoView({ block: "nearest", behavior: "instant" });
    }
    function render() {
      // Observe is step 0 = the prompt is already shown; begin at step 1.
      mark(step);
      if (step === 0) { host.innerHTML = ""; const b = el("div", "rz-step in"); b.innerHTML = `<p class="rz-obs">Read the scenario above, then start reasoning.</p><button class="btn primary rz-next">Begin reasoning →</button>`; b.querySelector(".rz-next").addEventListener("click", advance); host.appendChild(b); return; }
      if (step === 1) return stepMulti(p.principles);
      if (step === 2) return stepMcq("What's regulated", p.regulated);
      if (step === 3) return stepMcq("Form & function", p.form);
      if (step === 4) return stepStrategy(p.strategy);
      if (step === 5) return stepReason(p.reason);
      if (step === 6) return stepReflect(p.reflect);
    }
    function addStep(title, inner) { const s = el("section", "rz-step"); s.innerHTML = `<h2 class="rz-sthd" tabindex="-1">${title}</h2>` + inner; host.appendChild(s); return s; }
    function labelAnswer(button, label) {
      if (button.querySelector(".rz-answer-label")) return;
      button.setAttribute("aria-label", `${button.textContent}. ${label}.`);
      button.appendChild(el("span", "rz-answer-label", label));
    }
    function focusFeedback(section) { const feedback = $(".rz-fb", section); feedback.tabIndex = -1; feedback.focus({ preventScroll: true }); }

    function stepMulti(d) {
      const s = addStep("Which principles are in play?", `<p class="rz-hint">${d.hint} Select every one that applies.</p>
        <div class="rz-multi">${d.options.map((o, i) => `<button type="button" class="rz-mo" data-i="${i}" aria-pressed="false"><span class="rz-check" aria-hidden="true"></span><span>${o.t}</span></button>`).join("")}</div>
        <button class="btn ghost rz-check-btn">Check my selection</button><div class="rz-fb" role="status"></div>`);
      const opts = [...s.querySelectorAll(".rz-mo")]; const sel = new Set();
      opts.forEach((b) => b.addEventListener("click", () => { const i = +b.dataset.i; if (sel.has(i)) { sel.delete(i); b.classList.remove("sel"); } else { sel.add(i); b.classList.add("sel"); } b.setAttribute("aria-pressed", String(sel.has(i))); }));
      s.querySelector(".rz-check-btn").addEventListener("click", () => {
        s.querySelector(".rz-check-btn").disabled = true;
        let right = 0, total = 0, distractors = 0; d.options.forEach((o, i) => { if (o.ok) total++; opts[i].classList.add(o.ok ? "ans-yes" : "ans-no"); opts[i].disabled = true; opts[i].setAttribute("aria-label", `${o.t}. ${o.ok ? "Relevant principle" : "Distractor"}. ${sel.has(i) ? "You selected this" : "Not selected"}.`); opts[i].appendChild(el("span", "rz-answer-label", o.ok ? "Relevant" : "Distractor")); if (o.ok && sel.has(i)) right++; if (!o.ok && sel.has(i)) { distractors++; opts[i].classList.add("miss"); } });
        s.querySelector(".rz-fb").innerHTML = `<div class="rz-verdict">You caught <b>${right}/${total}</b> principles${distractors ? ` and selected ${distractors} distractor${distractors === 1 ? "" : "s"}` : ""}. The genuine ones are labelled — the distractors are the everyday traps (teleology, "cells decide", diffusion-does-everything).</div><button class="btn primary rz-next">Continue →</button>`;
        s.querySelector(".rz-next").addEventListener("click", advance);
        focusFeedback(s);
      });
    }
    function stepMcq(title, d) {
      const s = addStep(title, `<div class="rz-q">${d.q}</div><div class="rz-opts">${d.o.map((o, i) => `<button class="rz-opt" data-i="${i}">${o}</button>`).join("")}</div><div class="rz-fb" role="status"></div>`);
      const opts = [...s.querySelectorAll(".rz-opt")]; let done = false;
      opts.forEach((b) => b.addEventListener("click", () => { if (done) return; done = true; const i = +b.dataset.i; opts.forEach((o, j) => { o.disabled = true; o.classList.add(j === d.a ? "right" : j === i ? "wrong" : "muted"); if (j === d.a) labelAnswer(o, "Correct answer" + (j === i ? " · Your choice" : "")); else if (j === i) labelAnswer(o, "Your choice · Review the explanation"); }); s.querySelector(".rz-fb").innerHTML = `<div class="rz-verdict ${i === d.a ? "ok" : "no"}">${i === d.a ? "✓ Right." : "✗ Look again."}</div><p>${d.why}</p><button class="btn primary rz-next">Continue →</button>`; s.querySelector(".rz-next").addEventListener("click", advance); focusFeedback(s); }));
    }
    function stepStrategy(d) {
      const s = addStep("Choose your strategy", `<div class="rz-q">${d.q}</div><div class="rz-opts">${d.o.map((o, i) => `<button class="rz-opt" data-i="${i}">${o.t}</button>`).join("")}</div><div class="rz-fb" role="status"></div>`);
      const opts = [...s.querySelectorAll(".rz-opt")]; let done = false;
      opts.forEach((b) => b.addEventListener("click", () => { if (done) return; const i = +b.dataset.i; const o = d.o[i]; if (o.ok) { done = true; opts.forEach((x, j) => { x.disabled = true; x.classList.add(d.o[j].ok ? "right" : "muted"); if (d.o[j].ok) labelAnswer(x, "Sound strategy"); }); s.querySelector(".rz-fb").innerHTML = `<div class="rz-verdict ok">✓ That's the biologist's move.</div><button class="btn primary rz-next">Reveal the reasoning →</button>`; s.querySelector(".rz-next").addEventListener("click", advance); } else { b.classList.add("wrong"); b.disabled = true; labelAnswer(b, "A reasoning trap"); s.querySelector(".rz-fb").innerHTML = `<div class="rz-verdict no">✗ A classic trap.</div><p>${o.why}</p><p class="rz-hint">Try another strategy.</p>`; } focusFeedback(s); }));
    }
    function stepReason(steps) {
      const s = addStep("Reason it out", `<button class="btn ghost rz-reveal">Reveal the worked reasoning</button><ol class="rz-reason" id="ro" style="display:none"></ol><div class="rz-fb" role="status"></div>`);
      s.querySelector(".rz-reveal").addEventListener("click", (e) => {
        e.target.style.display = "none"; const ol = s.querySelector("#ro"); ol.style.display = "";
        steps.forEach((t, i) => { const li = el("li", "in"); li.style.animationDelay = i * 0.08 + "s"; li.textContent = t; ol.appendChild(li); });
        s.querySelector(".rz-fb").innerHTML = `<button class="btn primary rz-next" style="margin-top:18px">Generalise →</button>`;
        s.querySelector(".rz-next").addEventListener("click", advance);
        focusFeedback(s);
      });
    }
    function stepReflect(d) {
      addStep("Generalise", `<div class="rz-reflect">
        <div class="rz-rc mis"><span class="rz-rtag">△ Misconception</span><p>${d.misconception}</p></div>
        <div class="rz-rc alt"><span class="rz-rtag">↻ Another angle</span><p>${d.alternative}</p></div>
        <div class="rz-rc pri"><span class="rz-rtag">★ Principle</span><p>${d.principle}</p></div>
      </div>
      <div class="rz-what-next"><strong>Put this reasoning to work</strong><p>Try explaining the scenario without the worked answer, then use the same principle in a new question.</p></div>
      <div class="rz-done"><a class="btn ghost" href="#">More workouts</a><a class="btn primary" href="./solve.html">Practise problems →</a></div>`);
      mark(7);
    }
    mark(0); render();
  }

  route();
})();
