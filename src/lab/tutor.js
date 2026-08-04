/*
 * tutor.js — the demonstrator who is actually watching you.
 *
 * narrator.js says what a thing IS. This says "so what is it doing there?" and
 * then waits. The difference between a commentator and an instructor is that an
 * instructor makes you produce the answer, and is willing to be quiet while you
 * think.
 *
 * Four design commitments, each of which is the thing that usually gets this
 * wrong in educational software:
 *
 *  1. QUESTIONS COME FROM THE SPECIMEN, NOT FROM A SCRIPT. Every question is
 *     keyed to an observed event on a named structure. Reflect the skin and you
 *     are asked what layer you are now looking at. Nick the ventral abdominal
 *     vein and you are asked what you would have done differently. Nothing fires
 *     that the student has not just caused. A scripted sequence would ask about
 *     the liver before the student had opened the abdomen, and everyone can tell.
 *
 *  2. GRADING IS LOCAL AND CONCEPTUAL, NOT STRING EQUALITY AND NOT A NETWORK
 *     CALL. Each question carries a rubric of REQUIRED CONCEPTS, each concept
 *     carrying a synonym set, plus DISTRACTORS for the classic misconceptions.
 *     Student text is normalised (abbreviation expansion, light stemming,
 *     negation handling) and matched against them. "The left ventricle is
 *     thicker because it pumps more blood" is not marked wrong — it is marked as
 *     the pressure/volume confusion, BY NAME, with the correction.
 *
 *  3. A WRONG ANSWER IS NEVER ANSWERED. It is met with a smaller question that
 *     leads to the answer. Only after two failures does the tutor explain. This
 *     is the whole of the Socratic method and it is two lines of state.
 *
 *  4. IT SHUTS UP. There is a talk budget that refills slowly, a per-level
 *     minimum gap that STRETCHES when the student is flowing, a hard mute during
 *     an active scalpel stroke, and a quiet window after any moment of high
 *     concentration. Software that talks constantly is the single most hated
 *     property of every teaching tool ever shipped. A question deferred past its
 *     moment is dropped, not banked — asking about the liver forty seconds after
 *     the student moved on is exactly what makes a tutor feel like a machine.
 *
 * No network, no storage, no telemetry. Everything below runs on the device.
 */

const TUT_LEVELS = ['school', 'alevel', 'undergrad', 'medical'];
const TUT_LEVEL_IDX = { school: 0, alevel: 1, undergrad: 2, medical: 3 };

/* ── text normalisation ───────────────────────────────────────────────────
 * Students type "the LV is thicker cos its got 2 push blood round the body".
 * Grading has to survive that without becoming so loose it accepts anything.
 * The pipeline is: strip punctuation -> expand abbreviations -> light stem.
 * Both the student text and the rubric synonyms go through the SAME pipeline,
 * which is why "arteries" matches a rubric written as "artery".
 */
const TUT_ABBR = [
  [/\blv\b/g, 'left ventricle'], [/\brv\b/g, 'right ventricle'],
  [/\bla\b/g, 'left atrium'], [/\bra\b/g, 'right atrium'],
  [/\bsvc\b/g, 'superior vena cava'], [/\bivc\b/g, 'inferior vena cava'],
  [/\blad\b/g, 'left anterior descending'], [/\brca\b/g, 'right coronary artery'],
  [/\bcx\b/g, 'circumflex'], [/\blcx\b/g, 'circumflex'],
  [/\bhpv\b/g, 'hepatic portal vein'], [/\bpda\b/g, 'posterior descending artery'],
  [/\bo2\b/g, 'oxygen'], [/\bco2\b/g, 'carbon dioxide'],
  [/\brbcs?\b/g, 'red blood cell'], [/\bmis?\b/g, 'myocardial infarction'],
  [/\bvsd\b/g, 'ventricular septal defect'], [/\bavn?\b/g, 'atrioventricular'],
  [/\bsan?\b/g, 'sinoatrial'], [/\bdeoxy\b/g, 'deoxygenated'], [/\boxy\b/g, 'oxygenated'],
  [/\bcuz\b|\bcos\b|\bcus\b/g, 'because'], [/\bthru\b/g, 'through'],
  [/\bgi\b/g, 'gut'], [/\bmmhg\b/g, 'millimetres of mercury'],
];

// Words that flip the meaning of whatever follows. Without this, "it is NOT the
// hepatic artery" would score the hepatic-artery concept as present, and the
// misconception detector would fire on a student who is explicitly rejecting the
// misconception — the most infuriating possible false positive.
const TUT_NEG = /\b(not|no|never|isnt|arent|wasnt|dont|doesnt|didnt|cannot|cant|rather|instead|without|unlike|except)\b/;

function TUT_stem(w) {
  if (w.length <= 3) return w;
  if (/ies$/.test(w)) return w.slice(0, -3) + 'y';
  if (/sses$/.test(w)) return w.slice(0, -2);
  if (/[^su]s$/.test(w)) return w.slice(0, -1);
  return w;
}

function TUT_norm(s) {
  let t = String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  for (let i = 0; i < TUT_ABBR.length; i++) t = t.replace(TUT_ABBR[i][0], TUT_ABBR[i][1]);
  t = t.split(/\s+/).map(TUT_stem).join(' ');
  return ' ' + t + ' ';                       // padded so ' phrase ' cannot match mid-word
}

// Rubric synonyms are authored once and normalised many times; cache them.
const TUT_synCache = new Map();
function TUT_nsyn(s) {
  let v = TUT_synCache.get(s);
  if (v === undefined) { v = TUT_norm(s).slice(1, -1); TUT_synCache.set(s, v); }
  return v;
}

/*
 * How far back a negation reaches. This has to be tight. At 30 characters the
 * word "not" in "not the hepatic artery, the hepatic portal vein" still sits
 * inside the window of the SECOND vessel and suppresses it — the exact false
 * negative this machinery exists to prevent. Sixteen characters is about three
 * words: enough to cover "it is NOT the hepatic artery" (an eight-character gap),
 * short enough that the next clause is out of reach.
 */
const TUT_NEG_SPAN = 16;

/*
 * What is allowed to follow a stem for the match to still count as the same word.
 * An unconstrained prefix match reads "the thing over there" as the concept
 * *thin*, which is how a student who wrote nothing relevant gets credit — the
 * exact failure a rubric-based grader exists to avoid. Constraining the tail to
 * real inflectional and derivational endings keeps 'coronar' -> "coronary",
 * 'hibernat' -> "hibernation", 'breath' -> "breathes", while rejecting
 * 'thin' -> "thing" and 'thin' -> "think".
 *
 * The optional leading consonant absorbs the doubling English does before a
 * suffix — "wrapped" is 'wrap' + p + ed, "thinner" is 'thin' + n + er — while
 * still rejecting a bare "g", which is all that separates thin from thing.
 * Note the endings are matched AFTER TUT_stem has run, so 'peristal' meets the
 * stemmed "peristalsi" and needs 'si' rather than 'sis'.
 */
const TUT_SUFFIX = new RegExp('^[bdglmnprt]?(' + [
  's', 'es', 'd', 'ed', 'ing', 'ings', 'e', 'er', 'ers', 'est',
  'y', 'ies', 'ied', 'ly', 'al', 'ally', 'ic', 'ics', 'ical', 'tic', 'tics', 'tical',
  'ion', 'ions', 'sion', 'sions', 'tion', 'tions', 'ption', 'ptions',
  'ication', 'ications', 'ial', 'ile', 'ia', 'iae', 'ae', 'o', 'os', 'us', 'um',
  'ate', 'ated', 'ates', 'ise', 'ised', 'ises', 'ize', 'ized', 'izes',
  'si', 'sis', 'ses', 'sed', 'zed', 'ous', 'ar', 'ary', 'ative', 'atory',
  'ance', 'ancy', 'ant', 'ants', 'ence', 'ency', 'ent', 'ents', 't', 'ts', 'ce', 'cy',
  'tive', 'ives', 'ive', 'b', 'bs', 'bed', 'bing', 'ure', 'ular', 'ism', 'ist',
  'ogen', 'oglobin', 'oid', 'oids', 'ium',
].join('|') + ')$');

/*
 * Does the haystack contain any of these concepts, UNNEGATED? Scans every
 * occurrence rather than the first, because "not the hepatic artery, the hepatic
 * portal vein" mentions two vessels and only one of them is negated.
 *
 * Matching is PREFIX matching at a word start. The rubric throughout this file is
 * authored as stems — 'coronar', 'breath', 'hibernat', 'emulsif' — because that is
 * the only sane way to cover the inflections a student will actually type. A
 * both-ends-padded ' coronar ' can never match "coronary", which would silently
 * void most of the bank; a leading-space ' coronar ' prefix matches "coronary",
 * "coronaries" and "coronary artery" while still refusing to match mid-word.
 * Tokens shorter than four characters ('no', 'fat', '3', '85') are far too greedy
 * as prefixes, so those keep the strict whole-word form.
 */
function TUT_hasAny(hay, list) {
  if (!list) return false;
  for (let i = 0; i < list.length; i++) {
    const syn = TUT_nsyn(list[i]);
    if (!syn) continue;
    const prefix = syn.length >= 4;
    const needle = prefix ? ' ' + syn : ' ' + syn + ' ';
    let at = hay.indexOf(needle);
    while (at >= 0) {
      let ok = true;
      if (prefix) {
        // Everything from the end of the stem to the end of that word must be a
        // legal ending, or this is a different word that merely starts the same.
        const end = at + needle.length;
        let stop = hay.indexOf(' ', end);
        if (stop < 0) stop = hay.length;
        ok = TUT_SUFFIX.test(hay.slice(end, stop)) || end === stop;
      }
      if (ok) {
        const before = hay.slice(Math.max(0, at - TUT_NEG_SPAN), at + 1);
        if (!TUT_NEG.test(before)) return true;    // an unnegated hit is a real hit
      }
      at = hay.indexOf(needle, at + 1);
    }
  }
  return false;
}

// Pick the level-appropriate string from {school,alevel,undergrad,medical} or a
// bare string. Walks DOWN first (a medical student should get the undergrad
// phrasing if no medical one exists), then up.
function TUT_pick(v, li) {
  if (typeof v === 'string' || v == null) return v || '';
  for (let i = li; i >= 0; i--) if (v[TUT_LEVELS[i]]) return v[TUT_LEVELS[i]];
  for (let i = li + 1; i < TUT_LEVELS.length; i++) if (v[TUT_LEVELS[i]]) return v[TUT_LEVELS[i]];
  return '';
}

function TUT_join(list) {
  // An empty list produced " and undefined" in the feedback line — the sort of
  // thing that only appears in front of a class. Callers should not reach here
  // with nothing, but feedback text is not worth throwing over.
  if (!list || !list.length) return 'nothing';
  if (list.length === 1) return list[0];
  return list.slice(0, -1).join(', ') + ' and ' + list[list.length - 1];
}

/* ── the question bank ────────────────────────────────────────────────────
 *
 * Schema, and why each field exists:
 *   on       trigger. {kind, part} — kind/part may be a string or array. The
 *            tutor only ever asks about something the student has just done.
 *   lv       [minLevelIdx, maxLevelIdx]. This is what makes setLevel real: a
 *            14-year-old is never shown the coronary dominance question, and a
 *            medical student is never asked to count the chambers.
 *   q        the question, per level. Same structure, different demand.
 *   need     the rubric. Each concept has `from`: the level at which it becomes
 *            REQUIRED. So one question grades four different ways — a school
 *            student saying "it's full of blood" is fully correct; a medic must
 *            name both vessels of the dual supply.
 *   trap     classic misconceptions. Named in the feedback, never just "wrong".
 *   socratic the smaller questions. Each has its own one-concept rubric, so the
 *            escalation is genuinely graded rather than rhetorical.
 *   answer   the direct explanation. Used after two failures, AND as the
 *            consolidating sentence after a correct answer — a student who got
 *            it right still deserves the crisp version.
 *   tag      mastery bucket for progress().
 */
const TUT_BANK = [

  /* ══════════════════ FROG — technique and the body wall ══════════════════ */
  {
    id: 'f-pin', spec: 'frog', tag: 'technique', lv: [0, 3],
    on: { kind: 'pin' }, when: (e, s) => s && s.pinned && s.pinned.size >= 4,
    q: {
      school: 'All four limbs are pinned. Why bother — what does pinning actually do for the cut you are about to make?',
      undergrad: 'The specimen is pinned out. State the mechanical reason, in terms of what the body wall does under a blade if it is not anchored.',
    },
    need: [
      { label: 'holding the specimen still', from: 0, any: ['still', 'immobil', 'stop it moving', 'doesnt move', 'not move', 'steady', 'fix', 'secure', 'anchor'] },
      { label: 'putting the body wall under tension', from: 1, any: ['tension', 'taut', 'tight', 'stretch', 'tense', 'under strain'] },
      { label: 'a tensioned wall takes a clean drawn cut instead of skidding', from: 2, any: ['clean cut', 'skid', 'slide', 'drag', 'tear', 'clean incision', 'blade bite', 'controlled'] },
    ],
    trap: [{ name: 'pinning as restraint of a living animal', any: ['alive', 'escape', 'struggl', 'pain', 'kick'], say: 'This specimen is preserved — nothing here is alive. Pinning is a mechanical requirement, not a restraint.' }],
    socratic: [
      { q: 'Put your finger on unpinned skin and push a blade at it. Does it cut, or does it move away?', need: [{ label: 'it moves away', any: ['move', 'slide', 'skid', 'away', 'push', 'give', 'stretch'] }] },
      { q: 'So what do the pins give the wall that it did not have before?', need: [{ label: 'tension', any: ['tension', 'taut', 'tight', 'stretch', 'tense'] }] },
    ],
    answer: 'Pinning holds the specimen still AND stretches the body wall taut. Loose tissue moves ahead of the blade and tears; tensioned tissue takes a single clean drawn stroke. That is why you pin before you ever pick up the scalpel.',
  },
  {
    id: 'f-skin-id', spec: 'frog', tag: 'physiology', lv: [0, 3],
    on: { kind: 'discover', part: 'skin' },
    q: {
      school: 'This is frog skin. It is doing a job that your skin does not do at all. What job?',
      alevel: 'Frog skin performs a function human skin does not. Name it, and name the two properties that make it possible.',
      undergrad: 'Account for cutaneous gas exchange in an anuran: what structural features of the integument permit it, and when does the animal depend on it most?',
    },
    need: [
      { label: 'breathing / gas exchange through the skin', from: 0, any: ['breath', 'gas exchange', 'respiration', 'respire', 'oxygen', 'cutaneous'] },
      { label: 'moist and permeable', from: 1, any: ['moist', 'wet', 'damp', 'permeable', 'mucus', 'thin'] },
      { label: 'a dense capillary bed just under the surface', from: 2, any: ['capillar', 'vascular', 'blood vessel', 'blood supply', 'rich supply'] },
      { label: 'dependence underwater and in hibernation', from: 3, any: ['hibernat', 'underwater', 'submerged', 'overwinter', 'under water', 'in water'] },
    ],
    trap: [{ name: 'skin as waterproofing', any: ['waterproof', 'keeps water out', 'barrier to water'], say: 'That is the mammalian answer. Frog skin is the opposite of waterproof — its permeability is the whole point, and it is also why frogs dehydrate so fast out of water.' }],
    socratic: [
      { q: 'The skin is always damp and it is packed with capillaries right under the surface. What can cross a thin wet membrane with blood on the other side?', need: [{ label: 'gases', any: ['oxygen', 'gas', 'carbon dioxide', 'air'] }] },
      { q: 'So a frog sitting at the bottom of a pond all winter with its mouth shut is doing what?', need: [{ label: 'breathing through the skin', any: ['breath', 'skin', 'cutaneous', 'gas exchange'] }] },
    ],
    answer: 'Cutaneous respiration. The skin is thin, permanently moist with mucus, and carries a dense subepidermal capillary bed, so oxygen and carbon dioxide diffuse straight across it. Submerged or hibernating frogs rely on it almost entirely.',
  },
  {
    id: 'f-skin-peel', spec: 'frog', tag: 'anatomy', lv: [0, 3],
    on: { kind: 'peel', part: 'skin' },
    q: {
      school: 'The skin is reflected back. What are you looking at now — and is the body cavity open yet?',
      alevel: 'You have reflected the skin. Name the layer now exposed, and say whether the coelom is open.',
      undergrad: 'The integument is reflected. Identify the exposed layer and the midline landmark you will use for the next incision.',
    },
    need: [
      { label: 'the muscle of the body wall', from: 0, any: ['muscle', 'muscular', 'body wall', 'abdominal wall', 'rectu'] },
      { label: 'the cavity is still closed', from: 1, any: ['still closed', 'not open', 'not yet', 'closed', 'another layer', 'second cut', 'still intact'] },
      { label: 'the linea alba as the midline landmark', from: 2, any: ['linea alba', 'midline', 'white line', 'raphe'] },
    ],
    trap: [
      { name: 'confusing the muscle wall with the peritoneum', any: ['peritoneum', 'serosa', 'membrane over the organ'], say: 'Not yet — that is the confusion between the muscular body wall and the peritoneum lining it. You are on the OUTSIDE of the muscle; the peritoneum is the glistening film on its inner face, which you will only see once you have cut through.' },
      { name: 'believing one cut opens the cavity', any: ['organ', 'liver', 'gut', 'cavity is open', 'inside now'], say: 'That is the classic first-dissection error: assuming skin and body wall are one layer. They are two, and the frog gives you a subcutaneous lymph space between them. You have not entered the coelom yet.' },
    ],
    socratic: [
      { q: 'Look at the colour and the fibre direction of what is exposed. Is that connective tissue, or is it contractile?', need: [{ label: 'muscle', any: ['muscle', 'muscular', 'contract', 'fibre'] }] },
      { q: 'Can you see any organs through it — or is something still in the way?', need: [{ label: 'still in the way / closed', any: ['in the way', 'closed', 'cant see', 'no', 'covered', 'still'] }] },
    ],
    answer: 'The abdominal muscle wall — a separate layer from the skin, which in a frog is only loosely attached over subcutaneous lymph sacs. The coelom is still shut. Your next stroke goes along the linea alba, the pale avascular midline.',
  },
  {
    id: 'f-wall-where', spec: 'frog', tag: 'technique', lv: [0, 3],
    on: { kind: 'discover', part: 'muscle-wall' },
    q: {
      school: 'You are about to cut this muscle wall. Where exactly should the cut go, and what are you trying not to hit?',
      undergrad: 'Specify the line of your incision through the abdominal wall and justify it anatomically.',
    },
    need: [
      { label: 'along the midline', from: 0, any: ['midline', 'middle', 'centre', 'center', 'linea alba', 'down the middle'] },
      { label: 'avoiding the ventral abdominal vein', from: 0, any: ['vein', 'ventral abdominal', 'blood vessel', 'vessel'] },
      { label: 'shallow, lifting the wall away from the viscera', from: 2, any: ['shallow', 'lift', 'tent', 'raise', 'pull up', 'blunt', 'point up', 'away from'] },
    ],
    trap: [{ name: 'cutting exactly on the midline', any: ['exactly on the midline', 'straight down the middle of the vein', 'through the middle'], say: 'Careful — the linea alba IS the midline, but the ventral abdominal vein runs immediately deep to it. The usual teaching is to lift the wall and cut just off-centre, or to open a small window first and cut under direct vision.' }],
    socratic: [
      { q: 'What runs in the midline of the ventral body wall, just under the muscle?', need: [{ label: 'the ventral abdominal vein', any: ['ventral abdominal vein', 'vein', 'vessel'] }] },
      { q: 'If a vessel is directly under your line, how do you get the blade in without reaching it?', need: [{ label: 'lift the wall / stay shallow', any: ['lift', 'shallow', 'tent', 'raise', 'pull up', 'small cut', 'careful', 'off to the side', 'off centre'] }] },
    ],
    answer: 'Along the linea alba, the avascular midline raphe — but lifted. The ventral abdominal vein runs in the midline immediately deep to the wall, so you tent the wall with forceps, nick a small window, and extend the cut with the blade angled up and away from the viscera.',
  },

  /* ══════════════════ FROG — the vein everybody cuts ══════════════════════ */
  {
    id: 'f-vav-id', spec: 'frog', tag: 'anatomy', lv: [1, 3],
    on: { kind: 'discover', part: 'ventral-abdominal-vein' },
    q: {
      alevel: 'You have found the ventral abdominal vein intact — well done. Where is it taking its blood?',
      undergrad: 'Trace the ventral abdominal vein. Which venous system does it belong to, and what is the functional consequence of that?',
    },
    need: [
      { label: 'to the liver', from: 1, any: ['liver', 'hepatic'] },
      { label: 'the hepatic portal system', from: 2, any: ['hepatic portal', 'portal system', 'portal vein', 'portal'] },
      { label: 'blood passes a second capillary bed before returning to the heart', from: 3, any: ['second capillary', 'two capillary', 'capillary bed', 'before the heart', 'not straight to the heart', 'sinusoid', 'processed'] },
    ],
    trap: [{ name: 'assuming every vein returns straight to the heart', any: ['to the heart', 'back to the heart', 'vena cava', 'straight to the heart'], say: 'That is the standard vein assumption, and a portal vein is the exception that defines the rule. A portal vessel begins in capillaries and ENDS in capillaries — this one delivers to the liver sinusoids, not to the heart.' }],
    socratic: [
      { q: 'Follow it forward with the probe. Which organ does it disappear into?', need: [{ label: 'the liver', any: ['liver', 'hepatic'] }] },
      { q: 'A vein that ends in an organ rather than the heart has a special name. What kind of vein is it?', need: [{ label: 'a portal vein', any: ['portal'] }] },
    ],
    answer: 'It is a portal vein. It runs in the ventral midline and joins the hepatic portal system, so its blood is delivered to the liver sinusoids — a second capillary bed — and is processed before any of it reaches the heart.',
  },
  {
    id: 'f-vav-damage', spec: 'frog', tag: 'technique', lv: [0, 3], urgent: true,
    on: { kind: 'damage', part: 'ventral-abdominal-vein' },
    q: {
      school: 'You have cut the ventral abdominal vein. Almost everyone does it once. Tell me what you would do differently if you started again.',
      undergrad: 'The ventral abdominal vein is divided. Describe the technique that would have preserved it.',
    },
    need: [
      { label: 'lifting or tenting the wall before cutting', from: 0, any: ['lift', 'tent', 'raise', 'pull up', 'forcep', 'pinch it up', 'hold it up'] },
      { label: 'a shallow first stroke rather than a plunge', from: 0, any: ['shallow', 'not so deep', 'less deep', 'gentle', 'light', 'slow', 'careful', 'small cut', 'thin'] },
      { label: 'cutting slightly off the midline or under direct vision', from: 2, any: ['off the midline', 'off centre', 'to one side', 'beside', 'under vision', 'see the vein', 'blade upward', 'point up', 'away from'] },
    ],
    trap: [{ name: 'blaming the tool', any: ['blade was sharp', 'scalpel is bad', 'tool', 'the mouse', 'not my fault'], say: 'The blade did exactly what you asked it to. This is a depth-control problem, not an instrument problem — and depth is the one thing a dissector is entirely responsible for.' }],
    socratic: [
      { q: 'The vein sits immediately deep to the wall. How deep did your first stroke go?', need: [{ label: 'too deep', any: ['too deep', 'deep', 'far', 'through', 'all the way'] }] },
      { q: 'If you cannot make the blade shallower, what could you do to the wall instead?', need: [{ label: 'lift it away from the vein', any: ['lift', 'tent', 'raise', 'pull', 'forcep', 'away'] }] },
    ],
    answer: 'Tent the wall up with forceps first, so there is air between the muscle and the vein, then take a shallow nick with the blade pointing UP and away from the viscera and extend it under direct vision. Depth is the dissector\'s responsibility, not the blade\'s.',
  },

  /* ══════════════════ FROG — liver and biliary ═══════════════════════════ */
  {
    id: 'f-liver-colour', spec: 'frog', tag: 'histology', lv: [0, 3],
    on: { kind: 'discover', part: ['liver-right', 'liver-left', 'liver-median'] },
    q: {
      school: 'That is the liver, and it is the darkest thing in the whole animal. Why is it that colour?',
      alevel: 'Explain the liver\'s deep maroon colour in terms of its structure.',
      undergrad: 'Account for hepatic colour histologically — what fraction of liver volume is blood, and in what compartment does it sit?',
    },
    need: [
      { label: 'it is full of blood', from: 0, any: ['blood', 'bloody', 'red cell', 'haemoglobin', 'hemoglobin', 'haem', 'heme'] },
      { label: 'the blood sits in sinusoids, not ordinary capillaries', from: 2, any: ['sinusoid', 'sinus', 'wide capillar', 'fenestrat', 'open vessel'] },
      { label: 'very high blood volume for its size', from: 2, any: ['high volume', 'lot of blood', 'blood reservoir', 'store blood', 'perfus', 'quarter', 'large proportion', 'packed'] },
    ],
    trap: [
      { name: 'colour from bile', any: ['bile', 'green pigment', 'bilirubin make'], say: 'That is the liver/bile mix-up. The liver MAKES bile, but bile is green-yellow and lives in the ducts and gall bladder. The organ\'s maroon comes from blood, not from what it secretes.' },
      { name: 'colour from muscle', any: ['muscle', 'myoglobin'], say: 'No — that is the confusion with dark muscle. The liver has no contractile tissue at all; it is a parenchymal gland whose colour is entirely the blood inside it.' },
    ],
    socratic: [
      { q: 'Press the probe into it and think about what leaks. What is the organ mostly full of?', need: [{ label: 'blood', any: ['blood', 'red cell', 'haem', 'hem'] }] },
      { q: 'Those blood spaces are not normal narrow capillaries. What are the wide leaky ones called?', need: [{ label: 'sinusoids', any: ['sinusoid', 'sinus'] }] },
    ],
    answer: 'Because it is essentially a blood-filled sponge. Hepatocyte plates are separated by wide fenestrated sinusoids rather than tight capillaries, so a very large fraction of liver volume is blood at any moment. The colour is haemoglobin, seen through a thin capsule.',
  },
  {
    id: 'f-liver-supply', spec: 'frog', tag: 'physiology', lv: [1, 3],
    on: { kind: 'discover', part: ['liver-right', 'liver-median'] }, after: 'f-liver-colour',
    q: {
      alevel: 'Where does the liver\'s blood come from? There is more than one answer.',
      undergrad: 'The liver has a dual blood supply. Name both sources, say what each contributes, and say why the arrangement exists.',
      medical: 'Describe hepatic perfusion: the two afferent vessels, their approximate contributions to flow and to oxygen delivery, and the teleology of the portal arrangement.',
    },
    need: [
      { label: 'the hepatic portal vein from the gut', from: 1, any: ['portal', 'hepatic portal', 'from the gut', 'from the intestine', 'from the stomach', 'digestive system'] },
      { label: 'the hepatic artery carrying oxygenated blood', from: 1, any: ['hepatic artery', 'artery', 'arterial'] },
      { label: 'the portal blood is nutrient-rich but oxygen-poor', from: 2, any: ['nutrient', 'food', 'absorbed', 'glucose', 'amino acid', 'digested', 'low oxygen', 'deoxygenated'] },
      { label: 'everything absorbed passes the liver before the rest of the body', from: 2, any: ['first pass', 'before the body', 'filter', 'process', 'detox', 'screen', 'checked', 'before the heart'] },
    ],
    trap: [{ name: 'a single arterial supply like any other organ', any: ['only the artery', 'just the artery', 'like any other organ', 'one supply'], say: 'That is the single-supply assumption. The liver is the exception: most of its inflow is VENOUS, straight from the gut, precisely so that everything absorbed is inspected before it enters the general circulation.' }],
    socratic: [
      { q: 'One supply is an artery, as usual. The other is unusual — where has that blood just been?', need: [{ label: 'the gut', any: ['gut', 'intestine', 'stomach', 'digestive', 'bowel'] }] },
      { q: 'Why would evolution route gut blood through the liver before the heart gets it?', need: [{ label: 'to process or filter it first', any: ['process', 'filter', 'detox', 'store', 'check', 'sort', 'convert', 'first'] }] },
    ],
    answer: 'Dual supply. The hepatic portal vein brings nutrient-rich, oxygen-poor blood from the gut — the majority of the flow — and the hepatic artery brings oxygenated blood, most of the oxygen. The point of the portal arrangement is first-pass processing: nothing absorbed reaches the systemic circulation unexamined. In the frog the ventral abdominal vein joins this system.',
  },
  {
    id: 'f-gall', spec: 'frog', tag: 'physiology', lv: [0, 3],
    on: { kind: 'discover', part: 'gall-bladder' },
    q: {
      school: 'The gall bladder. What is in it, where did that come from, and what does it do to your food?',
      undergrad: 'Bile: site of production, site of storage, and its mode of action on dietary lipid.',
    },
    need: [
      { label: 'bile', from: 0, any: ['bile'] },
      { label: 'made by the liver, only stored here', from: 0, any: ['liver make', 'from the liver', 'liver produce', 'made in the liver', 'store', 'liver'] },
      { label: 'it emulsifies fat', from: 1, any: ['emulsif', 'fat', 'lipid', 'break up fat', 'droplet', 'surface area'] },
      { label: 'emulsification is physical, increasing surface area for lipase', from: 2, any: ['surface area', 'lipase', 'physical', 'not an enzyme', 'not chemical', 'smaller droplet'] },
    ],
    trap: [{ name: 'bile as a digestive enzyme', any: ['enzyme', 'digest the fat', 'break down fat chemical', 'catalys'], say: 'That is the single most common bile misconception — bile is NOT an enzyme. It contains no protein catalyst. Bile salts are detergents: they physically break large fat globules into small droplets, and it is lipase, an actual enzyme, that then does the chemistry.' }],
    socratic: [
      { q: 'Washing-up liquid on a greasy pan does something to the grease. What?', need: [{ label: 'breaks it into droplets', any: ['break', 'droplet', 'disperse', 'small', 'separate', 'emulsif', 'lift'] }] },
      { q: 'If the fat is now in tiny droplets instead of one blob, what has increased for the enzymes to work on?', need: [{ label: 'surface area', any: ['surface area', 'area', 'more contact'] }] },
    ],
    answer: 'Bile, made continuously by the liver and merely concentrated and stored here. Bile salts are detergents, not enzymes: they emulsify fat into fine droplets, multiplying the surface area available to pancreatic lipase, which does the actual hydrolysis.',
  },

  /* ══════════════════ FROG — the three-chambered heart ═══════════════════ */
  {
    id: 'f-heart-chambers', spec: 'frog', tag: 'anatomy', lv: [0, 3],
    on: { kind: 'discover', part: 'frog-heart' },
    q: {
      school: 'Count the chambers of this heart. Now compare that number with yours — what is different?',
      alevel: 'Describe the chamber arrangement of the anuran heart and name the functional problem it creates.',
      undergrad: 'The amphibian heart is three-chambered. Explain the consequences for oxygen delivery, and the features that mitigate them.',
    },
    need: [
      { label: 'three chambers: two atria, one ventricle', from: 0, any: ['three', '3', 'two atria one ventricle', 'single ventricle', 'one ventricle'] },
      { label: 'oxygenated and deoxygenated blood can mix', from: 1, any: ['mix', 'mixing', 'mixed', 'blend', 'combine', 'together'] },
      { label: 'trabeculae and the spiral valve limit the mixing', from: 2, any: ['spiral valve', 'trabecul', 'ridge', 'conus', 'stream', 'separate', 'laminar', 'partial'] },
      { label: 'cutaneous respiration makes the cost tolerable', from: 3, any: ['skin', 'cutaneous', 'through the skin', 'low metabolic', 'ectotherm', 'cold blooded', 'low demand'] },
    ],
    trap: [
      { name: 'reading the mammalian four-chamber plan onto an amphibian', any: ['four', '4', 'like ours', 'same as human', 'two ventricle'], say: 'That is the mammalian template being projected onto an amphibian. There is exactly ONE ventricle here — look at the single conical mass below the two atria. Four chambers is birds and mammals; three is the amphibian plan.' },
      { name: 'assuming total mixing', any: ['completely mix', 'totally mix', 'all mixed', 'no separation'], say: 'Careful — "one ventricle so everything mixes" overstates it. Ventricular trabeculae and the spiral valve in the conus arteriosus keep the streams substantially separate, so pulmocutaneous and systemic outflows differ in saturation.' },
    ],
    socratic: [
      { q: 'How many separate collecting chambers at the top, and how many pumping chambers below?', need: [{ label: 'two above, one below', any: ['two', '2', 'one', '1', 'single'] }] },
      { q: 'If lung blood and body blood arrive in the same pumping chamber, what can happen to them?', need: [{ label: 'they can mix', any: ['mix', 'blend', 'combine', 'together', 'same'] }] },
    ],
    answer: 'Three: right and left atria, and a single undivided ventricle. Blood returning from the lungs and skin and blood returning from the body therefore enter the same pump. Mixing is real but incomplete — ventricular trabeculae and the spiral valve of the conus arteriosus hold the streams apart well enough that the systemic arches get the better blood.',
  },
  {
    id: 'f-conus', spec: 'frog', tag: 'anatomy', lv: [2, 3],
    on: { kind: 'discover', part: 'frog-heart' }, after: 'f-heart-chambers',
    q: { undergrad: 'A thick tube leaves the front of the ventricle. Name it and say what is inside it that mammals lack.' },
    need: [
      { label: 'the conus arteriosus (truncus)', from: 2, any: ['conus arteriosus', 'conus', 'truncus', 'bulbus'] },
      { label: 'a spiral valve dividing the outflow', from: 2, any: ['spiral valve', 'spiral fold', 'spiral', 'divide the flow', 'two stream'] },
    ],
    trap: [{ name: 'calling the conus an aorta', any: ['aorta', 'aortic arch only', 'pulmonary trunk'], say: 'Not quite — that is the mammalian naming applied one step too early. The conus arteriosus is a contractile outflow segment that mammals lose in development; the arches arise FROM it.' }],
    socratic: [{ q: 'It is contractile and it splits one ventricular output into separate destinations. What kind of structure achieves that inside a tube?', need: [{ label: 'a valve or fold', any: ['valve', 'fold', 'ridge', 'septum', 'divider', 'spiral'] }] }],
    answer: 'The conus arteriosus. Its spiral valve is a longitudinal fold that partitions the single ventricular output between the pulmocutaneous arch and the systemic and carotid arches — the anatomical solution to having only one ventricle.',
  },

  /* ══════════════════ FROG — respiration and viscera ═════════════════════ */
  {
    id: 'f-lung-vent', spec: 'frog', tag: 'physiology', lv: [1, 3],
    on: { kind: 'discover', part: ['lung-left', 'lung-right'] },
    q: {
      alevel: 'Frogs have no ribs and no diaphragm. So how does air get into these lungs?',
      undergrad: 'Describe buccal pump ventilation and contrast the pressure sign with mammalian ventilation.',
    },
    need: [
      { label: 'the mouth floor pumps air in', from: 1, any: ['mouth', 'buccal', 'throat', 'floor of the mouth', 'gular', 'swallow', 'gulp', 'pump'] },
      { label: 'it is positive pressure — air is pushed in', from: 2, any: ['positive pressure', 'push', 'force', 'forced in', 'pressuri'] },
      { label: 'mammals use negative pressure suction', from: 2, any: ['negative pressure', 'suck', 'suction', 'we pull', 'expand', 'draw in'] },
    ],
    trap: [{ name: 'assuming mammalian negative-pressure breathing', any: ['ribcage', 'rib cage', 'diaphragm', 'chest expand', 'lung expand and suck'], say: 'That is our own mechanism read onto a frog. There is no diaphragm and the ribs are absent or vestigial — nothing here can generate suction. The frog does the opposite: it forces air in under positive pressure.' }],
    socratic: [
      { q: 'Watch a live frog and the only thing that moves is under the chin. What is that doing?', need: [{ label: 'pumping', any: ['pump', 'move air', 'push', 'squeeze', 'gulp', 'expand', 'fill'] }] },
      { q: 'If the floor of the mouth rises with the nostrils shut, is the air pushed or pulled into the lungs?', need: [{ label: 'pushed', any: ['push', 'force', 'positive', 'in'] }] },
    ],
    answer: 'Buccal pumping. The frog lowers the floor of its mouth to draw air in through the nostrils, closes them, then raises the floor to FORCE air into the lungs — positive pressure, the exact inverse of our negative-pressure thoracic suction. The lungs themselves are simple sacs with little internal surface, which is why the skin does so much of the work.',
  },
  {
    id: 'f-stomach', spec: 'frog', tag: 'anatomy', lv: [0, 2],
    on: { kind: ['discover', 'lift'], part: 'stomach' },
    q: {
      school: 'You could not see the stomach until you moved something. What was covering it, and what does that tell you about the order of the layers?',
      undergrad: 'State the topographical relationship of the frog stomach to the liver and the practical consequence for dissection order.',
    },
    need: [
      { label: 'the liver was covering it', from: 0, any: ['liver'] },
      { label: 'the liver lies ventral / in front', from: 1, any: ['in front', 'ventral', 'above', 'on top', 'anterior', 'over it', 'superficial'] },
    ],
    trap: [{ name: 'assuming organs sit side by side', any: ['next to', 'beside', 'side by side'], say: 'The cavity is layered in depth, not laid out flat. That habit of thinking in a single plane is exactly what makes people cut through the second layer while aiming at the first.' }],
    socratic: [{ q: 'Which organ did you have to lift out of the way?', need: [{ label: 'the liver', any: ['liver'] }] }],
    answer: 'The liver. It lies ventral to the stomach and fills the anterior cavity, so the stomach is a second-layer structure — you find it by reflecting the liver, not by cutting deeper.',
  },
  {
    id: 'f-mesentery', spec: 'frog', tag: 'anatomy', lv: [1, 3],
    on: { kind: 'discover', part: 'small-intestine' },
    q: {
      alevel: 'That transparent sheet holding the gut coils together is the mesentery. Why does a demonstrator tell you to tease it apart rather than cut it?',
      undergrad: 'Justify blunt separation of mesentery in terms of what it transmits.',
    },
    need: [
      { label: 'it carries the blood vessels', from: 1, any: ['blood vessel', 'artery', 'vein', 'blood supply', 'vascular', 'capillar'] },
      { label: 'cutting it devascularises the gut and floods the field', from: 2, any: ['bleed', 'blood everywhere', 'lose the supply', 'devasculari', 'obscure', 'cut off', 'ischaem', 'ruin'] },
    ],
    trap: [{ name: 'treating mesentery as packing material', any: ['just fat', 'holds it', 'only support', 'just connective', 'nothing important'], say: 'It does suspend the gut, but that is the smaller half. The mesentery is the gut\'s conduit — every vessel, nerve and lymphatic reaches the intestine through it, which is why a careless snip costs you the blood supply and fills the field.' }],
    socratic: [
      { q: 'Hold it up to the light. Those fine dark lines running through it — what are they?', need: [{ label: 'blood vessels', any: ['vessel', 'artery', 'vein', 'blood', 'capillar'] }] },
      { q: 'So what happens to your field of view if you cut across them?', need: [{ label: 'bleeding, obscured view', any: ['bleed', 'blood', 'mess', 'cover', 'obscure', 'cant see', 'ruin'] }] },
    ],
    answer: 'Because it is the gut\'s lifeline, not packing. Vessels, nerves and lymphatics all run to the intestine between its two peritoneal leaves. Blunt separation preserves them; a cut across them devascularises the segment and floods your field with blood you cannot mop out of a preserved specimen.',
  },
  {
    id: 'f-ileum-absorb', spec: 'frog', tag: 'physiology', lv: [0, 2],
    on: { kind: 'discover', part: 'small-intestine' }, after: 'f-mesentery',
    q: {
      school: 'This is the small intestine. It is long and coiled for a reason. What is it doing along its length?',
      undergrad: 'Relate small intestinal length and mucosal architecture to its function.',
    },
    need: [
      { label: 'absorption of digested food', from: 0, any: ['absor', 'take in', 'into the blood', 'nutrient', 'uptake'] },
      { label: 'length and villi maximise surface area', from: 1, any: ['surface area', 'villi', 'villus', 'microvilli', 'fold', 'long', 'coil'] },
    ],
    trap: [{ name: 'the small intestine as the main site of water uptake', any: ['water', 'reabsorb water', 'dry out the food'], say: 'Some water is absorbed here, but that is the confusion with the large intestine. The small intestine is about absorbing DIGESTED NUTRIENTS; bulk water recovery is downstream in the rectum.' }],
    socratic: [{ q: 'What has been broken down upstream that now has to get out of the gut and into the blood?', need: [{ label: 'digested nutrients', any: ['nutrient', 'food', 'sugar', 'glucose', 'amino', 'fat', 'digested'] }] }],
    answer: 'Absorption. The duodenum runs forward in a U off the pylorus and the ileum coils; the length, the internal folding and the villous surface together give a mucosal area far larger than the animal\'s outside, which is what makes uptake into the portal blood efficient.',
  },
  {
    id: 'f-rectum', spec: 'frog', tag: 'physiology', lv: [0, 2],
    on: { kind: 'discover', part: 'large-intestine' },
    q: { school: 'The rectum is wider than the intestine before it. What is happening to the contents here?' },
    need: [{ label: 'water is reabsorbed', from: 0, any: ['water', 'dry', 'reabsor', 'absorb water', 'solid', 'firm'] }],
    trap: [{ name: 'digestion continuing in the rectum', any: ['digest', 'enzyme', 'break down food'], say: 'Digestion is essentially finished upstream — that is the classic overreach of "the gut digests everywhere". The rectum\'s job is recovery of water and storage, not chemistry.' }],
    socratic: [{ q: 'Compare what leaves the frog with the soup that leaves the small intestine. What has been taken back?', need: [{ label: 'water', any: ['water', 'liquid', 'fluid'] }] }],
    answer: 'Water recovery and storage. Digestion and nutrient uptake are done by the end of the ileum; the rectum reabsorbs water, consolidates the residue, and delivers it to the cloaca.',
  },
  {
    id: 'f-cloaca', spec: 'frog', tag: 'anatomy', lv: [0, 3],
    on: { kind: 'discover', part: 'cloaca' },
    q: {
      school: 'The cloaca is one opening that serves three different systems. Name them.',
      undergrad: 'The cloaca receives three tracts. Name them and state the developmental reason a single common chamber exists.',
    },
    need: [
      { label: 'digestive', from: 0, any: ['digestive', 'gut', 'intestine', 'faeces', 'feces', 'rectum', 'food waste'] },
      { label: 'urinary', from: 0, any: ['urinary', 'urine', 'kidney', 'bladder', 'excretory'] },
      { label: 'reproductive', from: 0, any: ['reproductive', 'sperm', 'egg', 'gonad', 'gamete', 'genital', 'testes', 'ovary'] },
    ],
    trap: [{ name: 'assuming mammalian separate orifices', any: ['separate', 'three opening', 'different hole', 'like us'], say: 'That is the mammalian arrangement projected backwards. Separate urinary and alimentary openings are a eutherian innovation; the cloaca — one chamber, one vent — is the ancestral vertebrate condition, kept by amphibians, reptiles and birds.' }],
    socratic: [{ q: 'The rectum ends here. What else in the abdomen has to get its product out of the animal?', need: [{ label: 'kidneys and gonads', any: ['kidney', 'urine', 'sperm', 'egg', 'gonad', 'bladder'] }] }],
    answer: 'Digestive, urinary and reproductive. The cloaca is the ancestral vertebrate arrangement — a single common chamber and vent for all three — retained by amphibians, reptiles and birds and lost only in eutherian mammals.',
  },
  {
    id: 'f-spleen', spec: 'frog', tag: 'physiology', lv: [1, 3],
    on: { kind: 'discover', part: 'spleen' },
    q: {
      alevel: 'That dark red bead in the mesentery is the spleen. It is not part of the gut — so what is it for?',
      undergrad: 'State the two principal functions of the spleen and the tissue compartment responsible for each.',
    },
    need: [
      { label: 'filtering blood / removing old red cells', from: 1, any: ['filter', 'old red cell', 'red blood cell', 'remove', 'destroy', 'recycl', 'breakdown', 'worn out', 'blood'] },
      { label: 'immune / lymphoid function', from: 1, any: ['immune', 'lymphoid', 'lymphocyte', 'antibody', 'defence', 'defense', 'white blood cell', 'infection'] },
      { label: 'red pulp filters, white pulp is lymphoid', from: 3, any: ['red pulp', 'white pulp', 'pulp'] },
    ],
    trap: [{ name: 'the spleen as a digestive organ', any: ['digest', 'bile', 'enzyme', 'absorb food', 'part of the gut'], say: 'It sits in the mesentery, so people file it with the gut — but the spleen has no digestive role whatsoever. It is a blood organ that happens to live in the abdomen.' }],
    socratic: [
      { q: 'It is packed with blood and full of white cells. Which two body systems does that suggest?', need: [{ label: 'circulatory and immune', any: ['blood', 'circulat', 'immune', 'lymph'] }] },
    ],
    answer: 'Blood filtration and immunity. Red pulp removes senescent erythrocytes and recycles their iron; white pulp is organised lymphoid tissue mounting responses to blood-borne antigen. In amphibians it is also a significant site of haematopoiesis.',
  },
  {
    id: 'f-fat-body', spec: 'frog', tag: 'physiology', lv: [0, 3],
    on: { kind: 'discover', part: ['fat-body-left', 'fat-body-right'] },
    q: {
      school: 'Those bright yellow finger-like lobes are fat bodies. If you caught this frog in October they would be huge; in April, tiny. Why?',
      undergrad: 'Explain the seasonal cycle of anuran fat bodies and the two demands they fund.',
    },
    need: [
      { label: 'they are an energy store', from: 0, any: ['energy', 'store', 'fuel', 'reserve', 'food store', 'fat'] },
      { label: 'used up over hibernation / winter', from: 0, any: ['hibernat', 'winter', 'overwinter', 'not eating', 'no food', 'cold'] },
      { label: 'also fund gamete production in spring', from: 2, any: ['gamete', 'sperm', 'egg', 'breed', 'reproduc', 'spawn', 'gonad', 'spring'] },
    ],
    trap: [{ name: 'fat as insulation', any: ['insulat', 'keep warm', 'warmth', 'heat'], say: 'That is the mammalian answer, and it cannot apply here — a frog is an ectotherm, so there is no internal heat to insulate. These are metabolic reserves, nothing to do with temperature.' }],
    socratic: [
      { q: 'A frog underground all winter is not eating. Where is its energy coming from?', need: [{ label: 'stored fat', any: ['fat', 'store', 'reserve', 'energy'] }] },
      { q: 'It emerges in spring and immediately breeds without feeding. What else is that store paying for?', need: [{ label: 'gametes / breeding', any: ['egg', 'sperm', 'breed', 'reproduc', 'gamete', 'spawn'] }] },
    ],
    answer: 'They are lipid reserves attached near the gonads, and they run on an annual cycle: laid down through late summer, drawn down through hibernation, and spent again on gametogenesis and breeding in spring — before the animal has fed. Ectotherms do not insulate; they bank.',
  },
  {
    id: 'f-kidney', spec: 'frog', tag: 'anatomy', lv: [1, 3],
    on: { kind: 'discover', part: ['kidney-left', 'kidney-right'] },
    q: {
      alevel: 'When you lifted the gut, everything moved except these. Why did the kidneys stay put?',
      undergrad: 'Account for the fixed position of the anuran kidney, and name the kidney type present in the adult.',
    },
    need: [
      { label: 'they are behind the peritoneum / stuck to the dorsal wall', from: 1, any: ['retroperitoneal', 'behind the peritoneum', 'dorsal wall', 'body wall', 'stuck', 'attached', 'back wall', 'outside the cavity'] },
      { label: 'the adult kidney is mesonephric (opisthonephros)', from: 3, any: ['mesonephr', 'opisthonephr'] },
    ],
    trap: [{ name: 'assuming the kidneys hang in the cavity like gut', any: ['mesentery', 'hang', 'suspend', 'float', 'in the cavity'], say: 'That is the intraperitoneal assumption. The gut hangs on mesentery inside the peritoneum; the kidneys were never in the cavity at all — they lie behind its lining, which is why they do not move when you lift the viscera.' }],
    socratic: [{ q: 'Run the probe over one. Is the peritoneum in front of it or behind it?', need: [{ label: 'in front — the kidney is behind the lining', any: ['in front', 'over', 'covering', 'behind', 'retroperiton', 'outside'] }] }],
    answer: 'They are retroperitoneal — plastered to the dorsal body wall behind the peritoneal lining, so lifting the viscera does not disturb them. In the adult frog these are mesonephric kidneys (an opisthonephros), not the metanephros of an amniote.',
  },
  {
    id: 'f-aorta-id', spec: 'frog', tag: 'anatomy', lv: [1, 3],
    on: { kind: 'discover', part: 'dorsal-aorta' },
    q: {
      alevel: 'You have found a large vessel running between the kidneys. How can you tell an artery from a vein by looking at the wall alone?',
      undergrad: 'Distinguish artery from vein on gross and histological grounds, and say why the difference exists.',
    },
    need: [
      { label: 'artery walls are thicker', from: 1, any: ['thick', 'thicker wall', 'stout', 'muscular wall', 'stiff'] },
      { label: 'arteries stay open, veins collapse', from: 1, any: ['stay open', 'round', 'patent', 'hold its shape', 'collapse', 'flat', 'flatten'] },
      { label: 'because arteries carry pressure from the heart', from: 2, any: ['pressure', 'high pressure', 'pulse', 'from the heart', 'elastic', 'recoil'] },
    ],
    trap: [{ name: 'artery = oxygenated blood', any: ['oxygenated', 'carries oxygen', 'oxygen rich'], say: 'That is the biggest single misconception in circulatory anatomy. Artery means AWAY FROM THE HEART, not oxygenated — the pulmonary artery carries deoxygenated blood, and the pulmonary veins carry oxygenated blood. Wall structure, not oxygen, is the identifying feature.' }],
    socratic: [
      { q: 'Squeeze both between the forceps. Which one springs back into a circle?', need: [{ label: 'the artery', any: ['artery', 'arterial', 'thick', 'round', 'first'] }] },
      { q: 'What is the artery holding back that the vein does not have to?', need: [{ label: 'pressure', any: ['pressure', 'force', 'pulse', 'push'] }] },
    ],
    answer: 'By the wall. Arteries have thick muscular and elastic media, hold a round patent lumen, and do not collapse; veins are thin-walled, flattened, and often valved. The difference exists because arteries contain the pressure the ventricle generates. Note that "artery" defines DIRECTION — away from the heart — not oxygen content.',
  },
  {
    id: 'f-bladder', spec: 'frog', tag: 'physiology', lv: [2, 3],
    on: { kind: 'discover', part: 'urinary-bladder' },
    q: { undergrad: 'The frog\'s bladder does something a mammalian bladder does not. What, and why does a frog need it?' },
    need: [
      { label: 'it reabsorbs water from the stored urine', from: 2, any: ['reabsorb', 'water back', 'recover water', 'take water', 'absorb water', 'water store'] },
      { label: 'water conservation on land', from: 2, any: ['dehydrat', 'dry', 'on land', 'terrestrial', 'conserve', 'water balance', 'osmo'] },
    ],
    trap: [{ name: 'the bladder as a passive bag', any: ['just store', 'only store', 'holds urine', 'waits'], say: 'For us, yes — mammalian urothelium is essentially impermeable. The amphibian bladder is a physiological organ: it is a water reservoir the frog can draw back on, which is why the wall is thin and vascular.' }],
    socratic: [{ q: 'A frog stuck on dry land with a full bladder is carrying a lot of water. What would be useful to do with it?', need: [{ label: 'take it back', any: ['take back', 'reabsorb', 'reuse', 'recover', 'use it', 'absorb'] }] }],
    answer: 'It reabsorbs water. Under vasotocin the bladder epithelium becomes permeable and the frog recovers stored water into the blood — a portable reservoir for a permeable-skinned animal on land. A mammalian bladder is a sealed holding tank by comparison.',
  },
  {
    id: 'f-vertebrae', spec: 'frog', tag: 'anatomy', lv: [2, 3],
    on: { kind: 'discover', part: 'vertebral-column' },
    q: { undergrad: 'Count the vertebrae. The number is startlingly low and there is a fused rod behind them — what is it, and what is the whole arrangement for?' },
    need: [
      { label: 'about nine vertebrae', from: 2, any: ['nine', '9', 'few', 'short'] },
      { label: 'the urostyle', from: 2, any: ['urostyle', 'fused rod', 'coccyx'] },
      { label: 'a rigid column that transmits jumping force', from: 2, any: ['jump', 'leap', 'saltat', 'stiff', 'rigid', 'transmit', 'force', 'thrust'] },
    ],
    trap: [{ name: 'expecting a flexible mammalian spine', any: ['flexib', 'bend', 'like ours', 'many vertebra'], say: 'That is the mammalian spine template. An anuran column is specialised for the opposite of flexibility: it is short and stiff so hindlimb thrust reaches the front of the animal without the body folding.' }],
    socratic: [{ q: 'A frog launches with its hind legs. If the spine bent freely, where would that force go?', need: [{ label: 'lost / absorbed', any: ['lost', 'absorb', 'waste', 'bend', 'nowhere', 'dissipat'] }] }],
    answer: 'Nine presacral and sacral vertebrae plus the urostyle, a fused rod of caudal vertebrae. The column is short and rigid precisely so hindlimb thrust is transmitted through the body rather than absorbed by spinal flexion — the skeleton of a jumper.',
  },
  {
    id: 'f-oeso', spec: 'frog', tag: 'anatomy', lv: [0, 2],
    on: { kind: 'discover', part: 'oesophagus' },
    q: { school: 'The oesophagus. Food does not fall down it — something moves it. What, and how?' },
    need: [
      { label: 'peristalsis', from: 0, any: ['peristal', 'wave', 'squeeze', 'push', 'contract', 'muscle move'] },
      { label: 'circular and longitudinal smooth muscle', from: 2, any: ['circular', 'longitudinal', 'smooth muscle', 'two layer'] },
    ],
    trap: [{ name: 'gravity as the transport mechanism', any: ['gravity', 'falls', 'drops down'], say: 'Gravity is not the mechanism — that is why an astronaut can swallow and why a frog, whose oesophagus is horizontal, manages at all. Peristalsis is active muscular propulsion.' }],
    socratic: [{ q: 'A frog\'s body is horizontal. What is pushing the food along?', need: [{ label: 'muscle contraction', any: ['muscle', 'contract', 'squeeze', 'peristal', 'push', 'wave'] }] }],
    answer: 'Peristalsis: sequential contraction of circular muscle behind the bolus with longitudinal shortening ahead of it, driving a wave along the tube regardless of orientation.',
  },

  /* ══════════════════ FROG — consequence questions ═══════════════════════ */
  {
    id: 'f-sawing', spec: 'frog', tag: 'technique', lv: [0, 3], urgent: true,
    on: { kind: 'damage' }, meta: (m) => m && m.kind === 'sawn',
    q: {
      school: 'That cut was sawed rather than drawn. Beyond looking untidy — what has a ragged cut face actually cost you?',
      undergrad: 'A sawing stroke has produced a ragged incision. State the consequence for subsequent identification.',
    },
    need: [
      { label: 'you can no longer read the layers at the cut edge', from: 0, any: ['layer', 'edge', 'cant tell', 'identif', 'recognis', 'recogniz', 'see what', 'boundary', 'landmark', 'structure'] },
      { label: 'a single drawn stroke instead of repeated passes', from: 0, any: ['one stroke', 'single', 'draw', 'one pass', 'smooth', 'continuous', 'once'] },
    ],
    trap: [{ name: 'treating tidiness as cosmetic', any: ['just looks', 'cosmetic', 'doesnt matter', 'still works', 'fine'], say: 'It is not cosmetic. In dissection the cut face IS your evidence — a clean edge shows you the layers in order, and a shredded one destroys the very information you cut to obtain.' }],
    socratic: [{ q: 'Look at the cut edge. Can you still count the layers you have been through?', need: [{ label: 'no', any: ['no', 'cant', 'hard', 'difficult', 'mush', 'shred', 'not really'] }] }],
    answer: 'A clean cut face is data: it shows the layers in order and in register. Sawing shreds that record, so you lose the very evidence the incision was made to reveal. One drawn stroke, blade angle constant, no repeated passes.',
  },
  {
    id: 'f-refused', spec: 'frog', tag: 'technique', lv: [0, 2],
    on: { kind: 'incise' }, meta: (m) => m && m.refused,
    q: { school: 'The blade would not take. What is missing before this specimen can be cut?' },
    need: [{ label: 'pins / tension', from: 0, any: ['pin', 'tension', 'taut', 'anchor', 'secure', 'still', 'fix'] }],
    trap: [],
    socratic: [{ q: 'What have you not done to the limbs yet?', need: [{ label: 'pinned them', any: ['pin', 'anchor', 'fix', 'secure'] }] }],
    answer: 'Pins. Until all four limbs are anchored the wall is loose, and loose tissue slides ahead of the blade instead of parting under it.',
  },
  {
    id: 'f-open-order', spec: 'frog', tag: 'anatomy', lv: [0, 2],
    on: { kind: 'discover', layer: 2 },
    q: {
      school: 'The cavity is open. Before you touch anything — which organ dominates the view, and what does that tell you about what it is hiding?',
      undergrad: 'The coelom is open. Describe the ventral-to-dorsal order of the viscera you can now predict.',
    },
    need: [
      { label: 'the liver dominates', from: 0, any: ['liver'] },
      { label: 'it conceals the stomach and gut behind it', from: 1, any: ['stomach', 'gut', 'intestine', 'behind', 'under', 'hidden', 'beneath', 'covers'] },
    ],
    trap: [],
    socratic: [{ q: 'What is the biggest, darkest thing in the field?', need: [{ label: 'the liver', any: ['liver', 'dark', 'maroon', 'big'] }] }],
    answer: 'The liver, filling the anterior cavity in three lobes. Everything digestive behind it — stomach, duodenum, gall bladder — is found by reflecting it, so plan to lift rather than cut deeper.',
  },

  /* ══════════════════ HEART — coverings ══════════════════════════════════ */
  {
    id: 'h-pericardium', spec: 'heart', tag: 'anatomy', lv: [0, 3],
    on: { kind: ['discover', 'peel'], part: 'pericardium' },
    q: {
      school: 'This tough bag around the heart is the pericardium. What is a bag around a beating pump actually for?',
      undergrad: 'Name the layers of the pericardium and give two functions of the fibrous layer.',
      medical: 'Describe the pericardial layers, the normal fluid volume, and why the fibrous layer\'s non-compliance is clinically decisive.',
    },
    need: [
      { label: 'it holds the heart in position', from: 0, any: ['hold', 'position', 'anchor', 'in place', 'attach', 'stabil', 'fix'] },
      { label: 'it lets the heart move without friction', from: 0, any: ['friction', 'lubricat', 'slide', 'smooth', 'rub', 'fluid'] },
      { label: 'the fibrous layer limits overfilling', from: 2, any: ['overfill', 'overdisten', 'over disten', 'stretch too', 'limit', 'restrain', 'non compliant', 'inelastic', 'wont stretch'] },
      { label: 'that non-compliance causes tamponade physiology', from: 3, any: ['tamponade', 'compress', 'cant fill', 'diastolic collapse', 'equalis', 'equaliz'] },
    ],
    trap: [{ name: 'the pericardium as simple padding', any: ['cushion', 'padding', 'protect from impact', 'shock absorb', 'armour'], say: 'It is tougher than a cushion and its stiffness is the point. Because the fibrous layer will not stretch acutely, a small volume of fluid inside it compresses the heart — that same "protective" inelasticity is what makes tamponade lethal.' }],
    socratic: [
      { q: 'The heart moves violently, several times a second, against lung and diaphragm. What does it need between it and them?', need: [{ label: 'a lubricated surface', any: ['fluid', 'lubricat', 'slip', 'slide', 'smooth', 'friction'] }] },
      { q: 'And the sac itself will not stretch. What does that stop the ventricles doing?', need: [{ label: 'overfilling', any: ['overfill', 'too much', 'stretch', 'expand', 'disten', 'big'] }] },
    ],
    answer: 'Two layers: a tough outer fibrous pericardium and an inner serous pericardium whose visceral leaf is the epicardium, with 15-50 ml of fluid between. It anchors the heart to the diaphragm and great vessels, provides a frictionless surface, and — because the fibrous layer is acutely non-compliant — limits sudden overdistension. That same inelasticity is why rapid effusion causes tamponade.',
  },
  {
    id: 'h-epifat', spec: 'heart', tag: 'anatomy', lv: [0, 3],
    on: { kind: 'discover', part: 'epicardial-fat' },
    q: {
      school: 'Yellow fat fills the grooves on the surface. Why should you trim it carefully rather than pull it off?',
      undergrad: 'What structures run within epicardial fat, and what does that imply about the grooves themselves?',
    },
    need: [
      { label: 'the coronary arteries run in it', from: 0, any: ['coronar', 'artery', 'blood vessel', 'vessel', 'blood supply'] },
      { label: 'the grooves mark the internal chamber boundaries', from: 2, any: ['groove', 'sulcus', 'boundary', 'septum', 'divide', 'between the chamber', 'interventricular', 'atrioventricular'] },
    ],
    trap: [{ name: 'fat as inert packing', any: ['just fat', 'nothing', 'insulat', 'unimportant', 'remove it all'], say: 'Epicardial fat is where the coronaries live. Stripping it enthusiastically is how students arrive at a heart with no visible coronary arteries and then conclude the specimen did not have any.' }],
    socratic: [{ q: 'Something has to bring blood to the heart muscle itself. Where would you expect those vessels to run?', need: [{ label: 'on the surface, in the grooves', any: ['surface', 'groove', 'outside', 'fat', 'sulcus', 'epicard'] }] }],
    answer: 'The coronary arteries and cardiac veins run in it. The grooves it fills are not decorative either — the atrioventricular and interventricular sulci mark exactly where the internal septa attach, so they let you read the chamber boundaries from outside.',
  },

  /* ══════════════════ HEART — the wall thickness question ════════════════ */
  {
    id: 'h-lv-thick', spec: 'heart', tag: 'physiology', lv: [0, 3],
    on: { kind: 'discover', part: 'lv-free-wall' },
    q: {
      school: 'Feel the difference: this left ventricle wall is about three times thicker than the right. Why?',
      alevel: 'Explain the difference in wall thickness between the two ventricles. Be precise about what the wall is generating.',
      undergrad: 'Justify the LV:RV wall thickness ratio quantitatively, in terms of the two circuits\' pressures and their resistances.',
      medical: 'Relate LV wall thickness to systemic afterload via Laplace, and state why stroke volumes remain equal despite it.',
    },
    need: [
      { label: 'the left ventricle must generate much higher pressure', from: 0, any: ['pressure', 'harder', 'stronger', 'force', 'high pressure'] },
      { label: 'it supplies the whole body; the right only the lungs', from: 0, any: ['whole body', 'systemic', 'all the body', 'round the body', 'lung', 'pulmonary'] },
      { label: 'the systemic circuit has far higher resistance', from: 2, any: ['resistance', 'afterload', 'impedance', 'vascular resistance'] },
      { label: 'wall stress by Laplace scales with pressure and radius over thickness', from: 3, any: ['laplace', 'wall stress', 'wall tension', 'radius over thickness', 'hypertroph'] },
    ],
    trap: [{ name: 'the pressure/volume confusion', any: ['more blood', 'greater volume', 'pump more', 'bigger volume', 'more output', 'larger amount'], say: 'That is the classic pressure/volume confusion, and it is worth getting right: the two ventricles pump the SAME stroke volume — they are in series, so they must. What differs is the pressure needed to move it: about 120 mmHg into the systemic circuit against roughly 25 into the pulmonary. Thickness buys pressure, not volume.' }],
    socratic: [
      { q: 'The two ventricles are in series — every drop through one must pass the other. So can they be moving different VOLUMES per beat?', need: [{ label: 'no, the volumes are equal', any: ['no', 'same', 'equal', 'identical', 'cant'] }] },
      { q: 'If the volume is the same, what else could the thicker wall be producing?', need: [{ label: 'pressure / force', any: ['pressure', 'force', 'push', 'strength', 'power'] }] },
    ],
    answer: 'Pressure, not volume. The two ventricles are in series and eject the same stroke volume, but the left drives it into a high-resistance systemic circuit at around 120 mmHg while the right only has to reach roughly 25 mmHg through the lungs. By Laplace, wall stress rises with pressure and radius and falls with thickness — so the high-pressure chamber is the thick-walled one.',
  },
  {
    id: 'h-rv', spec: 'heart', tag: 'physiology', lv: [1, 3],
    on: { kind: 'discover', part: 'rv-free-wall' },
    q: {
      alevel: 'The right ventricle is thin and crescent-shaped in cross section rather than round. What is it built to do?',
      undergrad: 'Explain the RV\'s geometry in terms of the load it faces, and what happens to it under chronic pulmonary hypertension.',
    },
    need: [
      { label: 'move a large volume at low pressure', from: 1, any: ['low pressure', 'volume', 'lung', 'pulmonary', 'less pressure', 'easy'] },
      { label: 'it wraps around and is a poor pressure generator', from: 2, any: ['crescent', 'wrap', 'bellows', 'shape', 'poorly suited', 'not built for pressure', 'thin'] },
      { label: 'chronic pressure load causes RV hypertrophy then failure', from: 3, any: ['hypertroph', 'fail', 'cor pulmonale', 'dilat', 'thicken'] },
    ],
    trap: [{ name: 'thin wall as weakness or damage', any: ['weak', 'damaged', 'underdevelop', 'faulty', 'less important'], say: 'Thin is not weak, it is matched. The RV faces about a fifth of the systemic pressure, so a thick wall would be wasted muscle and wasted oxygen. It is optimised for volume at low pressure — which is exactly why it copes badly when pressure is suddenly imposed on it.' }],
    socratic: [{ q: 'The lungs sit right next to the heart and their vessels are wide and compliant. Does that circuit need much pressure?', need: [{ label: 'no', any: ['no', 'low', 'little', 'less', 'not much'] }] }],
    answer: 'It is a volume pump, not a pressure pump. It moves the same stroke volume as the left ventricle into a low-resistance pulmonary circuit, so a thin crescentic wall wrapping the septum is sufficient and efficient. That design is why acute pulmonary hypertension fails it so quickly, and why chronic load makes it hypertrophy into cor pulmonale.',
  },

  /* ══════════════════ HEART — great vessels ══════════════════════════════ */
  {
    id: 'h-aorta-vs-pt', spec: 'heart', tag: 'anatomy', lv: [1, 3],
    on: { kind: 'discover', part: ['aorta', 'pulmonary-trunk'] },
    q: {
      alevel: 'Two great arteries leave the ventricles and both look like a stump from above. How do you tell the aorta from the pulmonary trunk?',
      undergrad: 'Give three independent ways of distinguishing aorta from pulmonary trunk on an isolated heart.',
    },
    need: [
      { label: 'trace where it goes rather than judge the stump', from: 1, any: ['trace', 'follow', 'probe', 'where it goes', 'seeker', 'run it', 'which chamber'] },
      { label: 'the pulmonary trunk is anterior and bifurcates early', from: 1, any: ['anterior', 'in front', 'bifurcat', 'splits', 'divides', 'two branch', 'left and right'] },
      { label: 'the aorta gives off the coronary arteries at its root', from: 2, any: ['coronar', 'root', 'sinus of valsalva', 'ostia', 'first branch'] },
      { label: 'the aortic wall is thicker and it arches', from: 2, any: ['thicker', 'arch', 'stiff', 'tougher', 'wall'] },
    ],
    trap: [{ name: 'identifying a vessel by the stump\'s appearance', any: ['bigger', 'looks like', 'size', 'wider', 'by eye'], say: 'Size alone will betray you on a fixed heart — that is precisely why demonstrators say "never name a vessel from its stump". Identity comes from where a vessel GOES: which ventricle it leaves, whether it bifurcates, and whether it gives coronaries.' }],
    socratic: [
      { q: 'Put the seeker down each one. Which ventricle does each open into?', need: [{ label: 'left ventricle for the aorta, right for the trunk', any: ['left ventricle', 'right ventricle', 'left', 'right'] }] },
      { q: 'One of them divides into two within a couple of centimetres. Which, and going where?', need: [{ label: 'the pulmonary trunk, to the lungs', any: ['pulmonary', 'lung', 'trunk', 'divide', 'bifurcat'] }] },
    ],
    answer: 'Three ways, all structural. One: trace it — the aorta arises from the left ventricle behind and to the right, the pulmonary trunk from the right ventricle in front, and they spiral around each other. Two: the pulmonary trunk bifurcates within about 5 cm; the aorta arches and gives the head and arm vessels. Three: only the aorta gives coronary arteries, from the sinuses just above its valve.',
  },
  {
    id: 'h-pulm-veins', spec: 'heart', tag: 'physiology', lv: [0, 3],
    on: { kind: 'discover', part: 'pulmonary-veins' },
    q: {
      school: 'These are the pulmonary veins. What kind of blood is in them — and does that surprise you?',
      undergrad: 'State the oxygen content of pulmonary venous blood and explain why the naming convention is not about oxygen.',
    },
    need: [
      { label: 'oxygenated blood', from: 0, any: ['oxygenated', 'oxygen rich', 'full of oxygen', 'high oxygen', 'red', 'fresh'] },
      { label: 'because vein means towards the heart, not deoxygenated', from: 1, any: ['toward', 'to the heart', 'direction', 'into the heart', 'returning', 'not about oxygen', 'definition'] },
    ],
    trap: [{ name: 'veins always carry deoxygenated blood', any: ['deoxygenated', 'low oxygen', 'used blood', 'no oxygen', 'blue'], say: 'That is THE textbook misconception, and this vessel is the counterexample that fixes it. Artery and vein describe DIRECTION relative to the heart, never oxygen. Pulmonary veins carry the most oxygenated blood in the body; pulmonary arteries carry the least.' }],
    socratic: [
      { q: 'Where have these vessels just come from?', need: [{ label: 'the lungs', any: ['lung', 'pulmonary', 'alveol'] }] },
      { q: 'And what happens to blood in the lungs?', need: [{ label: 'it picks up oxygen', any: ['oxygen', 'oxygenat', 'gas exchange', 'load'] }] },
    ],
    answer: 'The most oxygenated blood in the body. Four pulmonary veins return it from the lungs to the left atrium. The naming rule is directional and has nothing to do with oxygen: arteries lead away from the heart, veins return to it — which makes the pulmonary vessels the exception that proves it.',
  },
  {
    id: 'h-svc', spec: 'heart', tag: 'anatomy', lv: [0, 2],
    on: { kind: 'discover', part: 'svc' },
    q: { school: 'The superior vena cava. Which chamber does it enter, and what part of the body has it drained?' },
    need: [
      { label: 'the right atrium', from: 0, any: ['right atrium', 'right atria'] },
      { label: 'head, neck, arms and upper chest', from: 0, any: ['head', 'neck', 'arm', 'upper', 'top half', 'above'] },
    ],
    trap: [{ name: 'venae cavae entering the ventricle directly', any: ['right ventricle', 'ventricle'], say: 'Not the ventricle — that is the shortcut of forgetting the atria exist. Systemic venous return always enters an ATRIUM first; the atrium then fills the ventricle across the tricuspid valve.' }],
    socratic: [{ q: 'Follow it with the probe. Is the chamber it enters thin-walled and floppy, or thick and muscular?', need: [{ label: 'thin — an atrium', any: ['thin', 'atrium', 'floppy', 'soft', 'top'] }] }],
    answer: 'The right atrium, from above. It drains everything above the diaphragm except the heart wall itself — head, neck, upper limbs and thoracic wall — via the brachiocephalic veins and the azygos system.',
  },
  {
    id: 'h-ivc', spec: 'heart', tag: 'anatomy', lv: [1, 3],
    on: { kind: 'discover', part: 'ivc' },
    q: {
      alevel: 'The inferior vena cava is larger than the superior. Why should the lower half of the body return more blood?',
      undergrad: 'Account for the greater calibre of the IVC and name what it receives immediately before entering the atrium.',
    },
    need: [
      { label: 'the lower body has more mass and higher flow organs', from: 1, any: ['more mass', 'bigger', 'larger area', 'more tissue', 'liver', 'kidney', 'gut', 'more blood', 'more of the body'] },
      { label: 'it receives the hepatic veins just below the diaphragm', from: 2, any: ['hepatic vein', 'liver', 'from the liver'] },
    ],
    trap: [{ name: 'assuming symmetry of upper and lower return', any: ['same', 'equal', 'symmetr'], say: 'Return is not symmetrical: the abdomen and legs are far more massive than the head and arms, and the abdominal viscera are high-flow organs. Cardiac output is distributed by demand, not by geometry.' }],
    socratic: [{ q: 'Which half of the body contains the liver, kidneys, gut and the largest muscles?', need: [{ label: 'the lower half', any: ['lower', 'bottom', 'abdomen', 'below', 'inferior'] }] }],
    answer: 'Because the territory it drains is far larger and contains the highest-flow organs in the body — the liver receives roughly a quarter of cardiac output and the kidneys a fifth. It picks up the hepatic veins immediately below the diaphragm and enters the right atrium low and posteriorly.',
  },

  /* ══════════════════ HEART — coronaries ═════════════════════════════════ */
  {
    id: 'h-lad', spec: 'heart', tag: 'clinical', lv: [1, 3],
    on: { kind: 'discover', part: 'lad' },
    q: {
      alevel: 'The left anterior descending artery, in the anterior interventricular groove. Which part of the heart depends on it?',
      undergrad: 'Define the LAD territory and explain why its occlusion is called the widow-maker.',
      medical: 'Give the LAD territory, the ECG leads that reflect it, and the mechanical complication of a large anterior infarct.',
    },
    need: [
      { label: 'the anterior wall of the left ventricle and the apex', from: 1, any: ['anterior', 'front', 'left ventricle', 'apex'] },
      { label: 'the anterior two-thirds of the interventricular septum', from: 2, any: ['septum', 'interventricular', 'two third', 'anterior septum'] },
      { label: 'it supplies the largest mass of working myocardium', from: 2, any: ['largest', 'most muscle', 'big territory', 'large area', 'biggest', 'widow'] },
    ],
    trap: [{ name: 'territory judged by vessel calibre alone', any: ['small', 'thin', 'not much', 'minor'], say: 'Calibre is not territory. The LAD is unremarkable to look at and supplies more working myocardium than any other single vessel — which is exactly why a proximal occlusion is catastrophic while a larger-looking vessel elsewhere may be expendable.' }],
    socratic: [
      { q: 'Follow it down the groove with your eye. What lies immediately deep to that groove?', need: [{ label: 'the interventricular septum', any: ['septum', 'wall between', 'divide'] }] },
      { q: 'So an occlusion here kills the front wall AND what else?', need: [{ label: 'the septum', any: ['septum', 'wall between', 'apex'] }] },
    ],
    answer: 'The anterior wall of the left ventricle, the apex, and the anterior two-thirds of the interventricular septum — the single largest myocardial territory of any coronary artery. Proximal occlusion infarcts all of it at once, which is why it earns its nickname; late complications include septal rupture and apical aneurysm.',
  },
  {
    id: 'h-rca-dominance', spec: 'heart', tag: 'clinical', lv: [2, 3],
    on: { kind: 'discover', part: 'rca' },
    q: {
      undergrad: 'Follow the right coronary artery round to the crux. What are you looking for there, and what does it define?',
      medical: 'Define coronary dominance, give the population distribution, and name the conduction structures usually supplied by the RCA.',
    },
    need: [
      { label: 'which artery gives the posterior descending branch', from: 2, any: ['posterior descending', 'posterior interventricular', 'pda', 'which artery gives'] },
      { label: 'that defines dominance', from: 2, any: ['dominan'] },
      { label: 'about 85 per cent are right dominant', from: 3, any: ['85', '80', '90', 'majority', 'most people', 'right dominant'] },
      { label: 'the RCA usually supplies the SA and AV nodes', from: 3, any: ['sinoatrial', 'atrioventricular', 'node', 'conduction'] },
    ],
    trap: [{ name: 'dominance meaning the bigger or busier artery', any: ['bigger', 'larger', 'more blood', 'main artery', 'supplies more'], say: 'Dominance is a definition, not a judgement of size or workload: it names whichever artery gives off the posterior descending branch. In most people that is the right coronary even though the LEFT system supplies far more muscle.' }],
    socratic: [
      { q: 'At the crux, one artery turns down into the posterior interventricular groove. Does that matter more for size or for definition?', need: [{ label: 'definition', any: ['defin', 'name', 'classif', 'dominan', 'term'] }] },
    ],
    answer: 'Which vessel reaches the crux and gives the posterior descending artery — that, by definition, is the dominant one. Roughly 85% of hearts are right-dominant, 8% left, the rest co-dominant. The RCA also usually supplies the sinoatrial node and, in right dominance, the atrioventricular node, which is why inferior infarcts so often present with bradyarrhythmia.',
  },
  {
    id: 'h-circumflex', spec: 'heart', tag: 'anatomy', lv: [2, 3],
    on: { kind: 'discover', part: 'circumflex' },
    q: { undergrad: 'The circumflex runs in the left atrioventricular groove. What does that groove tell you about the wall it supplies?' },
    need: [
      { label: 'the lateral and posterolateral left ventricle', from: 2, any: ['lateral', 'side', 'posterolateral', 'left ventricle', 'back'] },
      { label: 'the groove marks the atrioventricular junction', from: 2, any: ['atrioventricular', 'between the atrium and ventricle', 'junction', 'annulus', 'valve ring'] },
    ],
    trap: [{ name: 'confusing the AV groove with the interventricular groove', any: ['interventricular', 'septum', 'between the ventricle'], say: 'Two different grooves, and mixing them is how territories get mis-assigned. The INTERventricular groove separates the two ventricles and carries the LAD or PDA; the ATRIOventricular groove separates atrium from ventricle and carries the circumflex and RCA.' }],
    socratic: [{ q: 'A groove on the surface overlies an internal junction. Which two chambers are meeting under this one?', need: [{ label: 'atrium and ventricle', any: ['atrium', 'ventricle', 'atrioventricular'] }] }],
    answer: 'It runs in the left atrioventricular groove, which overlies the mitral annulus, so it supplies the lateral and posterolateral walls of the left ventricle and, in the 8% who are left-dominant, continues to give the posterior descending artery.',
  },
  {
    id: 'h-cor-sinus', spec: 'heart', tag: 'anatomy', lv: [2, 3],
    on: { kind: 'discover', part: 'coronary-sinus' },
    q: { undergrad: 'Venous blood from the heart wall has to go somewhere. Where does the coronary sinus deliver it, and why is that odd?' },
    need: [
      { label: 'into the right atrium', from: 2, any: ['right atrium'] },
      { label: 'it drains the heart wall itself', from: 2, any: ['heart wall', 'myocard', 'cardiac vein', 'heart muscle', 'coronary'] },
    ],
    trap: [{ name: 'assuming cardiac veins join the venae cavae', any: ['vena cava', 'superior', 'inferior', 'join the cava'], say: 'A reasonable guess and wrong: the heart drains itself directly. The coronary sinus opens into the right atrium in its own right, between the IVC orifice and the tricuspid valve, guarded by the Thebesian valve.' }],
    socratic: [{ q: 'It sits in the posterior atrioventricular groove and runs toward the right side. Which chamber is it heading for?', need: [{ label: 'the right atrium', any: ['right atrium', 'right', 'atrium'] }] }],
    answer: 'Straight into the right atrium, between the inferior vena caval orifice and the tricuspid annulus. It is the main venous return of the myocardium itself — the heart bypasses the caval system entirely and empties into the atrium directly.',
  },

  /* ══════════════════ HEART — inside ═════════════════════════════════════ */
  {
    id: 'h-septum', spec: 'heart', tag: 'anatomy', lv: [0, 3],
    on: { kind: 'discover', part: 'septum' },
    q: {
      school: 'Push the probe from the right ventricle towards the left. It will not go through. What is stopping it, and why does that matter?',
      undergrad: 'Describe the parts of the interventricular septum and state the developmental significance of its completeness.',
      medical: 'Which part of the interventricular septum is most often defective, and why is that part vulnerable?',
    },
    need: [
      { label: 'the interventricular septum, and it is complete', from: 0, any: ['septum', 'wall between', 'divide', 'complete', 'solid', 'no hole'] },
      { label: 'it keeps oxygenated and deoxygenated blood apart', from: 0, any: ['mix', 'separate', 'oxygenated', 'deoxygenated', 'apart', 'keeps'] },
      { label: 'a large muscular part and a small membranous part', from: 2, any: ['membranous', 'muscular part', 'two part'] },
      { label: 'the membranous part is where defects usually occur', from: 3, any: ['membranous', 'perimembranous', 'defect', 'ventricular septal defect'] },
    ],
    trap: [{ name: 'the amphibian pattern read onto a mammal', any: ['some mixing', 'a bit mixes', 'partly', 'hole', 'not complete', 'incomplete'], say: 'You may be carrying the frog\'s heart across. In the mammal the septum is COMPLETE — the two circuits are fully separated, which is what allows the systemic side to run at high pressure without exposing the lungs to it. A hole here is a pathological finding, not the normal plan.' }],
    socratic: [
      { q: 'If the probe could cross, what would happen to the blood on each side?', need: [{ label: 'it would mix', any: ['mix', 'blend', 'cross', 'shunt', 'combine'] }] },
      { q: 'And the left side runs at five times the right\'s pressure. Which way would blood be pushed?', need: [{ label: 'left to right', any: ['left to right', 'left', 'high to low', 'into the right'] }] },
    ],
    answer: 'A complete interventricular septum — a large muscular portion and a small membranous portion up near the aortic valve. Completeness is what lets mammals run a high-pressure systemic circuit alongside a low-pressure pulmonary one. Defects are almost always in the membranous part, where the embryonic closure is last and thinnest, and they shunt left to right.',
  },
  {
    id: 'h-mitral', spec: 'heart', tag: 'physiology', lv: [0, 3],
    on: { kind: 'discover', part: 'mitral-leaflet' },
    q: {
      school: 'The mitral valve. Ventricular pressure will get enormous in a moment. What actually stops these thin flaps being blown inside out?',
      undergrad: 'Explain how the mitral apparatus resists systolic pressure. Name every component of the apparatus.',
    },
    need: [
      { label: 'the chordae tendineae tether the leaflet edges', from: 0, any: ['chord', 'cord', 'string', 'tendine', 'tether', 'attach'] },
      { label: 'the papillary muscles anchor the chordae', from: 0, any: ['papillar', 'muscle in the ventricle', 'anchor'] },
      { label: 'the papillaries contract during systole to keep tension constant', from: 2, any: ['contract', 'shorten', 'tension', 'during systole', 'same time', 'tighten'] },
      { label: 'closure itself is driven by pressure, not by the valve', from: 2, any: ['pressure close', 'blood pressure', 'pressure gradient', 'passive', 'pushed shut', 'backflow'] },
    ],
    trap: [{ name: 'the valve closing itself by contracting', any: ['valve contract', 'valve muscle', 'leaflet contract', 'valve close itself', 'muscle in the valve'], say: 'A very common one: heart valves have no muscle and cannot close themselves. They are passive flaps — pressure shuts them. The muscle involved, the papillary, does not close the valve at all; it stops the closed valve from everting.' }],
    socratic: [
      { q: 'Pull gently on a papillary muscle and watch the leaflet. Does it close, or does it stop moving further?', need: [{ label: 'it stops it everting', any: ['stop', 'tense', 'hold', 'evert', 'prolapse', 'tight', 'limit'] }] },
      { q: 'So if the chordae are not closing it, what force is?', need: [{ label: 'blood pressure', any: ['pressure', 'blood', 'flow', 'backflow', 'push'] }] },
    ],
    answer: 'Nothing in the valve closes it — rising ventricular pressure does, passively. The apparatus that stops it everting is mechanical: annulus, two leaflets, chordae tendineae, papillary muscles and the ventricular wall they arise from. The papillaries contract during systole to shorten by the same amount the ventricle does, holding chordal tension constant as the chamber changes shape.',
  },
  {
    id: 'h-papillary', spec: 'heart', tag: 'clinical', lv: [2, 3],
    on: { kind: 'discover', part: ['papillary-a', 'papillary-b'] },
    q: {
      undergrad: 'If a papillary muscle ruptured — say after an infarct — what would happen to the valve, and what would you hear?',
      medical: 'Which papillary muscle is more vulnerable to ischaemic rupture, and why?',
    },
    need: [
      { label: 'the leaflet flails and the valve leaks', from: 2, any: ['regurgitat', 'leak', 'flail', 'prolapse', 'incompeten', 'backflow', 'back into the atrium'] },
      { label: 'a systolic murmur, and acute pulmonary oedema', from: 2, any: ['murmur', 'systolic', 'pulmonary oedema', 'pulmonary edema', 'breathless', 'shock', 'heart failure'] },
      { label: 'the posteromedial has a single blood supply', from: 3, any: ['posteromedial', 'single', 'one supply', 'dual', 'both supply', 'blood supply'] },
    ],
    trap: [{ name: 'confusing regurgitation with stenosis', any: ['stenosis', 'narrow', 'blocked', 'obstruct', 'wont open'], say: 'That is the regurgitation/stenosis confusion, and it inverts the physiology. A ruptured papillary makes the valve fail to CLOSE — an incompetent, leaking valve. Stenosis is failure to OPEN, and comes from fusion or calcification of the leaflets instead.' }],
    socratic: [
      { q: 'Cut a guy rope on a tent flap. Does the flap now fail to open, or fail to stay shut?', need: [{ label: 'fails to stay shut', any: ['shut', 'close', 'stay', 'flap', 'open too far', 'blow'] }] },
      { q: 'So blood in systole goes forward into the aorta and also where?', need: [{ label: 'back into the left atrium', any: ['atrium', 'back', 'backward', 'lung', 'regurgitat'] }] },
    ],
    answer: 'Acute mitral regurgitation. The leaflet flails, blood is driven back into the left atrium in systole, and because that atrium has had no time to dilate the pressure goes straight to the lungs — a loud pansystolic murmur and flash pulmonary oedema. The posteromedial papillary is the one that goes: it usually has a single blood supply from the dominant artery, while the anterolateral has dual supply from the LAD and circumflex.',
  },
  {
    id: 'h-chordae', spec: 'heart', tag: 'anatomy', lv: [1, 3],
    on: { kind: 'discover', part: [/^chordae-/] },
    q: { alevel: 'The chordae tendineae are pure tensile cords — they can pull but never push. Given that, what can they possibly be doing?' },
    need: [
      { label: 'they restrain the leaflet from everting into the atrium', from: 1, any: ['stop', 'restrain', 'hold', 'prevent', 'evert', 'prolapse', 'blow back', 'inside out', 'into the atrium'] },
    ],
    trap: [{ name: 'chordae opening or closing the valve', any: ['open the valve', 'pull it open', 'close the valve', 'pull it shut'], say: 'A cord can only pull, and these pull DOWNWARD, away from the atrium — so they cannot open the valve and cannot pull it closed either. Their only possible action is to arrest the leaflet at the closed position.' }],
    socratic: [{ q: 'They run from the leaflet edge down to the ventricle floor. Which direction of leaflet movement can a downward cord stop?', need: [{ label: 'upward, into the atrium', any: ['up', 'atrium', 'back', 'evert', 'prolapse', 'inside out'] }] }],
    answer: 'They are the tethers. Running from the free edges and undersurfaces of the leaflets down to the papillary muscles, they arrest the leaflet exactly at the closed position, so systolic pressure seals the valve instead of inverting it into the atrium.',
  },
  {
    id: 'h-aortic-cusp', spec: 'heart', tag: 'physiology', lv: [2, 3],
    on: { kind: 'discover', part: [/^aortic-cusp-/] },
    q: {
      undergrad: 'The aortic valve has three semilunar cusps and behind them are the sinuses. What happens in those sinuses when the valve shuts, and what is fed as a result?',
      medical: 'Explain why left coronary perfusion is a diastolic phenomenon and what that predicts in tachycardia and in aortic stenosis.',
    },
    need: [
      { label: 'the cusps close in diastole under backpressure', from: 2, any: ['diastole', 'close', 'backpressure', 'back pressure', 'recoil', 'shut'] },
      { label: 'that pressurises the sinuses and fills the coronary ostia', from: 2, any: ['coronar', 'sinus', 'ostia', 'fill', 'perfus'] },
      { label: 'systolic compression means the LV is perfused in diastole', from: 3, any: ['systole', 'compress', 'squeeze', 'intramural', 'during diastole', 'only diastole'] },
    ],
    trap: [{ name: 'assuming the heart is perfused during systole with everything else', any: ['systole', 'when it pump', 'same time as the body', 'when it contract'], say: 'The opposite, for the left ventricle at least — and that inversion is the point. During systole the contracting myocardium squeezes its own intramural vessels shut. The left ventricle is therefore perfused in DIASTOLE, which is why tachycardia, by shortening diastole, provokes angina.' }],
    socratic: [
      { q: 'The coronary ostia sit just above the cusps. When the valve is open in systole, where are the cusps pressed?', need: [{ label: 'against the wall, over the ostia', any: ['wall', 'aside', 'over', 'against', 'cover', 'flat'] }] },
      { q: 'So the ostia are best exposed and pressurised when?', need: [{ label: 'diastole', any: ['diastole', 'relax', 'closed', 'between beat', 'after'] }] },
    ],
    answer: 'Elastic recoil of the aorta drives blood back, the three cusps catch it and seal, and the sinuses of Valsalva behind them become a pressurised reservoir sitting directly over the coronary ostia. Combined with the fact that systolic contraction compresses intramural vessels, this makes left coronary flow overwhelmingly diastolic — hence angina on tachycardia and the danger of a low diastolic pressure in aortic stenosis.',
  },
  {
    id: 'h-tricuspid', spec: 'heart', tag: 'anatomy', lv: [0, 2],
    on: { kind: 'discover', part: 'tricuspid-leaflet' },
    q: { school: 'How many cusps has this valve, which two chambers does it sit between, and which way is it allowed to let blood pass?' },
    need: [
      { label: 'three cusps', from: 0, any: ['three', '3'] },
      { label: 'between right atrium and right ventricle', from: 0, any: ['right atrium', 'right ventricle', 'right side'] },
      { label: 'atrium to ventricle only', from: 0, any: ['atrium to ventricle', 'downward', 'one way', 'one direction', 'into the ventricle', 'forward'] },
    ],
    trap: [{ name: 'placing the tricuspid on the left', any: ['left atrium', 'left ventricle', 'left side'], say: 'Left/right swap — easy to do on an isolated heart because your left is its right. Anchor on wall thickness: the thick-walled ventricle is the LEFT one, and it carries the two-cusped mitral valve. Three cusps means right.' }],
    socratic: [{ q: 'Feel the wall of the ventricle below this valve. Thick or thin?', need: [{ label: 'thin — so right', any: ['thin', 'right', 'thinner'] }] }],
    answer: 'Three cusps, between right atrium and right ventricle, and it opens one way only — atrium to ventricle. Two cusps on the thick-walled side is mitral, three on the thin-walled side is tricuspid.',
  },
  {
    id: 'h-moderator', spec: 'heart', tag: 'clinical', lv: [3, 3],
    on: { kind: 'discover', part: 'moderator-band' },
    q: { medical: 'The moderator band. Give its formal name, its content, and the functional reason for its existence.' },
    need: [
      { label: 'the septomarginal trabecula', from: 3, any: ['septomarginal', 'trabecula'] },
      { label: 'it carries the right bundle branch', from: 3, any: ['right bundle', 'bundle branch', 'purkinje', 'conduction'] },
      { label: 'it pre-excites the anterior papillary muscle', from: 3, any: ['anterior papillar', 'papillar', 'pre excit', 'before', 'early', 'ahead'] },
    ],
    trap: [{ name: 'the band as a mechanical brake on overdistension', any: ['stop', 'prevent overdisten', 'limit', 'brace', 'strut', 'moderate the'], say: 'That is where the name comes from and it is the historical error preserved in the word — it was thought to "moderate" RV distension. Its real significance is electrical: it is a conduction shortcut that fires the anterior papillary muscle before the free wall contracts.' }],
    socratic: [{ q: 'It runs from the septum to the base of the anterior papillary muscle. Which system does a shortcut between those two points serve?', need: [{ label: 'conduction', any: ['conduct', 'electric', 'bundle', 'purkinje', 'impulse', 'signal'] }] }],
    answer: 'The septomarginal trabecula. It carries the right bundle branch from the septum across the cavity to the anterior papillary muscle, so that papillary is excited slightly ahead of the free wall and chordal tension is established before ventricular pressure rises. Its identification is also how you recognise a morphological right ventricle.',
  },
  {
    id: 'h-atrium-pectinate', spec: 'heart', tag: 'anatomy', lv: [2, 3],
    on: { kind: 'discover', part: ['right-atrium', 'right-auricle'] },
    q: {
      undergrad: 'Inside the right atrium, part of the wall is ridged and part is glass-smooth. What is the boundary called, and why are the two halves different?',
      medical: 'Explain the crista terminalis embryologically, and give its clinical relevance.',
    },
    need: [
      { label: 'the crista terminalis divides them', from: 2, any: ['crista terminalis', 'crista', 'terminal crest', 'sulcus terminalis'] },
      { label: 'ridged pectinate muscle versus smooth sinus venarum', from: 2, any: ['pectinate', 'smooth', 'sinus venarum', 'ridge'] },
      { label: 'the smooth part is absorbed sinus venosus', from: 3, any: ['sinus venosus', 'absorb', 'incorporat', 'embryolog', 'develop'] },
    ],
    trap: [{ name: 'reading the ridges as damage or as trabeculae carneae', any: ['trabeculae carneae', 'damage', 'tear', 'artefact', 'ventricle'], say: 'Different structures with different names: trabeculae carneae are the coarse ridges of the VENTRICLE. In the atrium the fine parallel combs are pectinate muscles, and they are confined to the part derived from the true embryonic atrium.' }],
    socratic: [{ q: 'The venae cavae open into the smooth part. What might that part have been before it became atrium?', need: [{ label: 'a venous structure', any: ['vein', 'venous', 'sinus', 'vena cava', 'venosus'] }] }],
    answer: 'The crista terminalis, a muscular ridge marked externally by the sulcus terminalis. Posterior to it, the smooth sinus venarum is absorbed embryonic sinus venosus receiving the cavae; anterior to it, the true atrium retains its pectinate muscles. It matters clinically because the crista harbours the sinoatrial node at its upper end and is a substrate for atrial flutter re-entry.',
  },
  {
    id: 'h-coronary-damage', spec: 'heart', tag: 'clinical', lv: [1, 3], urgent: true,
    on: { kind: 'damage', part: ['lad', 'rca', 'circumflex'] },
    q: {
      alevel: 'You have divided a coronary artery. In a living heart, what would the muscle downstream of that cut do, and how quickly?',
      undergrad: 'A coronary is transected. Describe the downstream sequence and its time course.',
    },
    need: [
      { label: 'the muscle it supplies becomes ischaemic and dies', from: 1, any: ['ischaem', 'ischem', 'die', 'death', 'infarct', 'necro', 'no oxygen', 'starve'] },
      { label: 'within minutes, and irreversibly', from: 2, any: ['minute', 'quick', 'fast', 'irreversib', 'permanent', 'twenty', '20', 'soon'] },
      { label: 'there is little collateral supply to rescue it', from: 2, any: ['collateral', 'no other supply', 'end artery', 'only supply', 'no backup', 'functional end'] },
    ],
    trap: [{ name: 'assuming redundant supply', any: ['another artery', 'other vessel', 'anastomos', 'backup', 'compensat', 'fine'], say: 'That is the anastomosis assumption, and the coronaries are where it fails. They behave as functional end arteries — the anastomoses that exist are too small to rescue an acutely occluded territory, which is exactly why coronary occlusion causes infarction rather than a shrug.' }],
    socratic: [
      { q: 'Cardiac muscle contracts continuously and cannot repay an oxygen debt. What happens to it seconds after its supply stops?', need: [{ label: 'it stops working, then dies', any: ['stop', 'die', 'fail', 'ischaem', 'ischem', 'necro', 'infarct'] }] },
    ],
    answer: 'Ischaemia within seconds, contractile failure within about a minute, and irreversible necrosis of the subendocardium from roughly twenty minutes onward, spreading outward as a wavefront. Coronaries behave as functional end arteries: their anastomoses are too fine to rescue an acute occlusion, which is why the territory is lost rather than shared.',
  },
  {
    id: 'h-lift-consequence', spec: 'heart', tag: 'technique', lv: [1, 3],
    on: { kind: 'lift', part: ['lv-free-wall', 'rv-free-wall', 'left-atrium', 'right-atrium'] },
    q: { alevel: 'You have taken a chamber wall off the specimen. What have you permanently lost the ability to demonstrate?' },
    need: [
      { label: 'the relationships between structures', from: 1, any: ['relationship', 'position', 'context', 'where it sit', 'compare', 'in situ', 'relative', 'connect'] },
    ],
    trap: [{ name: 'treating removal as free', any: ['nothing', 'can put it back', 'no problem', 'fine'], say: 'Removal is never free. Position is information — once a part is on the tray you can still describe it, but you can no longer show what it was touching, and in a dissection that relationship is often the whole answer.' }],
    socratic: [{ q: 'You can still describe the piece in your hand. What can you no longer point at?', need: [{ label: 'what it was next to', any: ['next to', 'relation', 'around', 'position', 'attach', 'connect', 'neighbour'] }] }],
    answer: 'Its relationships. An isolated structure can be named and described, but the thing dissection uniquely teaches — what lies deep to what, and what runs between them — is destroyed the moment the piece leaves its bed. Remove last, and only when the relationship has already been recorded.',
  },
];

/* Index the bank by event kind once, at load. Scanning fifty questions on every
   hover event is exactly the kind of per-frame waste this codebase avoids. */
const TUT_INDEX = (() => {
  const m = new Map();
  TUT_BANK.forEach((q) => {
    // This runs at module-evaluation time inside the concatenated bundle, so a
    // throw here is a BLANK PAGE, not a broken tutor. A malformed entry is
    // skipped rather than allowed to take the whole app down with it.
    if (!q || !q.on || q.on.kind == null) return;
    const kinds = Array.isArray(q.on.kind) ? q.on.kind : [q.on.kind];
    kinds.forEach((k) => {
      if (k == null) return;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(q);
    });
  });
  return m;
})();

function TUT_partMatches(want, id) {
  if (want == null) return true;
  if (!id) return false;
  const list = Array.isArray(want) ? want : [want];
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    if (w instanceof RegExp) { if (w.test(id)) return true; }
    else if (w === id) return true;
  }
  return false;
}

/* Per-level pacing. A 14-year-old benefits from being prodded more often; a
   medical student working through valve anatomy resents it. These are minimum
   gaps in ms and they get stretched further when the student is flowing. */
const TUT_GAP = [15000, 20000, 26000, 30000];

const TUT_PRAISE = [
  'Yes. That is exactly it.',
  'Correct, and cleanly put.',
  'That is the answer. Good.',
  'Right — and you gave the reason, not just the name.',
];
const TUT_PARTIAL = [
  'Partly there.',
  'You have the first half.',
  'Right as far as it goes.',
];
const TUT_REDIRECT = [
  'Not that — but the question is a fair one to get wrong. Let me make it smaller.',
  'No. Stay with the specimen and try a narrower version.',
  'That is not it. Try this instead.',
];

export function createTutor() {
  /* ---- configuration ---------------------------------------------------- */
  let active = true;
  let levelIdx = TUT_LEVEL_IDX.alevel;
  let specimen = 'frog';

  /* ---- listeners -------------------------------------------------------- */
  const listeners = [];
  function emit(kind, text) {
    if (!text) return;
    for (let i = 0; i < listeners.length; i++) {
      try { listeners[i]({ text, kind }); } catch (e) { /* a bad listener must not kill the tutor */ }
    }
  }

  /* ---- session state ---------------------------------------------------- */
  const asked = new Set();          // question ids already used this session
  const log = [];                   // the transcript
  const mastery = new Map();        // tag -> {asked, correct}
  let pending = null;               // {q, step, attempts, hinted, askedAt}
  let queued = null;                // {q, at} — a question waiting for a quiet moment
  const seenParts = new Set();      // what the student has actually met

  /* ---- the silence machinery -------------------------------------------- */
  // Budget is the honest version of "do not talk too much": questions cost, the
  // budget refills slowly, and engagement earns it back. It cannot be gamed by a
  // burst of events because it is time-based, not event-based.
  let budget = 2;
  const BUDGET_CAP = 3;
  let lastRefill = 0;
  let lastQuestionAt = -1e9;
  let quietUntil = 0;               // set after high-concentration moments
  let flow = 0;                     // consecutive clean, competent acts
  let correctStreak = 0;
  let busy = { tool: 'probe', gripping: false };
  let selfTimer = 0;                // fallback pump if main.js never calls update()
  let disposed = false;             // late events after dispose() must be inert

  const stats = { asked: 0, answered: 0, correct: 0, partial: 0, wrong: 0, skipped: 0, hints: 0 };

  function nowMs() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); }

  function gapMs() {
    // A student who is getting it right and doing clean work is left alone for
    // progressively longer. This is the single most important behaviour here.
    const stretch = Math.min(2.2, 1 + flow * 0.3 + correctStreak * 0.15);
    return TUT_GAP[levelIdx] * stretch;
  }

  function midStroke() {
    // Never interrupt a cutting or peeling gesture. A question that appears while
    // the blade is moving is worse than useless — it splits attention at the exact
    // moment the student most needs it whole.
    return busy.gripping && (busy.tool === 'scalpel' || busy.tool === 'forceps' || busy.tool === 'retractor');
  }

  // `urgent` is reserved for consequence questions — you have just cut something
  // you should not have. Those ignore the budget and the gap, and they preempt an
  // open question, because a mistake has to be discussed at the moment it is made
  // or it is not learned from. They still refuse to talk over a live stroke.
  function canAsk(t, urgent) {
    if (!active) return false;
    if (pending && !urgent) return false;
    if (midStroke()) return false;
    if (t < quietUntil) return false;
    if (!urgent && t - lastQuestionAt < gapMs()) return false;
    return urgent || budget >= 1;
  }

  function refill(t) {
    if (!lastRefill) { lastRefill = t; return; }
    const dt = t - lastRefill;
    if (dt > 22000) {
      budget = Math.min(BUDGET_CAP, budget + Math.floor(dt / 22000));
      lastRefill = t;
    }
  }

  /* ---- asking ----------------------------------------------------------- */
  function eligible(q) {
    if (asked.has(q.id)) return false;
    if (q.spec !== specimen) return false;
    if (levelIdx < q.lv[0] || levelIdx > q.lv[1]) return false;
    // `after` sequences two questions on the same structure so the second only
    // fires once the first has been dealt with. Without it the tutor would ask
    // about hepatic blood supply before the student had even named the liver.
    if (q.after && !asked.has(q.after)) return false;
    return true;
  }

  function fire(q, t, lead) {
    pending = { q, step: 0, attempts: 0, hinted: false, askedAt: t };
    asked.add(q.id);
    stats.asked++;
    const bucket = mastery.get(q.tag) || { asked: 0, correct: 0 };
    bucket.asked++; mastery.set(q.tag, bucket);
    lastQuestionAt = t;
    budget = Math.max(0, budget - 1);
    const text = TUT_pick(q.q, levelIdx);
    log.push({ t, kind: 'question', qid: q.id, tag: q.tag, level: TUT_LEVELS[levelIdx],
               specimen, text });
    emit('question', lead ? lead + ' ' + text : text);
  }

  // The queue holds at most one question and it EXPIRES. A tutor that saves up
  // questions and delivers them late is the thing that makes this software feel
  // like a machine reading from a list.
  function flush(t) {
    if (!queued) return;
    const urgent = !!queued.q.urgent;
    if (t - queued.at > (urgent ? 25000 : 14000)) { queued = null; return; }
    if (!canAsk(t, urgent)) return;
    const q = queued.q;
    queued = null;
    if (!eligible(q)) return;
    let lead = null;
    if (pending) {
      // Preemption is visible, not silent. Swapping the question under the
      // student without saying so is how a tutor loses their trust.
      log.push({ t, kind: 'abandoned', qid: pending.q.id });
      lead = 'Leave that for a moment.';
      pending = null;
    }
    fire(q, t, lead);
  }

  function queue(q, t, delay) {
    if (!eligible(q)) return;
    // Prefer the more specific/urgent candidate if one is already waiting.
    if (queued && queued.q.urgent && !q.urgent) return;
    queued = { q, at: t };
    if (delay) quietUntil = Math.max(quietUntil, t + delay);
  }

  /* ---- grading ---------------------------------------------------------- */
  function rubricFor(p) {
    const q = p.q;
    if (p.step > 0) {
      const s = q.socratic && q.socratic[p.step - 1];
      if (s && s.need) return s.need;
    }
    return q.need || [];
  }

  // The prompt CURRENTLY on the table. Once the ladder has been descended the
  // open question is the socratic sub-step, not the original — and `pending` is
  // what main.js puts in the answer box. Showing the parent question there while
  // grading against the sub-step's rubric is a trap of our own making.
  function promptText(p) {
    if (!p) return null;
    if (p.step > 0) {
      const s = (p.q.socratic || [])[p.step - 1];
      if (s) return typeof s === 'string' ? s : s.q;
    }
    return TUT_pick(p.q.q, levelIdx);
  }

  function requiredNeeds(needs) {
    // `from` is the level at which a concept becomes required. This is how one
    // question grades a 14-year-old and a medical student against different bars
    // without duplicating the content.
    const req = needs.filter((n) => (n.from == null ? 0 : n.from) <= levelIdx);
    return req.length ? req : needs;
  }

  function assess(text, p) {
    const hay = TUT_norm(text);
    const needs = requiredNeeds(rubricFor(p));
    const hit = [], miss = [];
    needs.forEach((n) => { (TUT_hasAny(hay, n.any) ? hit : miss).push(n.label); });

    // Distractors are only checked on the main question — a socratic sub-step is
    // deliberately narrow and naming a misconception there muddies the ladder.
    let trap = null;
    if (p.step === 0 && p.q.trap) {
      for (let i = 0; i < p.q.trap.length; i++) {
        if (TUT_hasAny(hay, p.q.trap[i].any)) { trap = p.q.trap[i]; break; }
      }
    }
    // A trap phrase inside an otherwise complete answer is usually the student
    // mentioning it to dismiss it; only let it override when concepts are missing.
    if (trap && hit.length && !miss.length) trap = null;

    let verdict;
    if (!hit.length) verdict = 'incorrect';
    else if (miss.length) verdict = 'partial';
    else verdict = 'correct';
    return { verdict, hit, miss, trap, empty: hay.trim().length < 2 };
  }

  function escalate(p, t, lead) {
    // The whole Socratic contract lives in these fifteen lines: a wrong answer is
    // met with a SMALLER QUESTION, never with the answer, until two failures.
    const socratic = p.q.socratic || [];
    if (p.attempts >= 2 || p.step >= socratic.length) {
      const direct = TUT_pick(p.q.answer, levelIdx);
      emit('feedback', (lead ? lead + ' ' : '') + 'Here it is directly: ' + direct);
      log.push({ t, kind: 'explanation', qid: p.q.id, text: direct });
      closePending('explained');
      return;
    }
    const s = socratic[p.step];
    p.step++;
    const qt = typeof s === 'string' ? s : s.q;
    emit('question', (lead ? lead + ' ' : '') + qt);
    log.push({ t, kind: 'socratic', qid: p.q.id, step: p.step, text: qt });
  }

  function closePending(outcome) {
    if (!pending) return;
    // Engagement buys airtime back: a student answering questions has invited the
    // conversation, so the tutor is allowed to continue it sooner.
    if (outcome === 'correct') budget = Math.min(BUDGET_CAP, budget + 0.75);
    pending = null;
  }

  function answer(text) {
    const t = nowMs();
    // The documented contract is answer() -> {verdict, missing, trap}. It never
    // returns null and never returns a partial shape: a caller destructuring
    // `missing` must not have to null-check first.
    if (!pending) {
      emit('feedback', 'There is no question open. Ask me for one and I will find something on this specimen worth asking.');
      return { verdict: 'empty', missing: [], trap: null };
    }
    const p = pending;
    const res = assess(text, p);

    // Empty is checked BEFORE the counters move. An unanswered prompt is not an
    // answer, and counting it as one quietly corrupts the score in grade().
    if (res.empty) {
      emit('feedback', 'I need something to work with — even a guess. What is your instinct?');
      return { verdict: 'empty', missing: [], trap: null };
    }

    stats.answered++;
    log.push({ t, kind: 'answer', qid: p.q.id, step: p.step, text: String(text || ''),
               verdict: res.verdict, missing: res.miss.slice(), trap: res.trap ? res.trap.name : null });

    if (res.verdict === 'correct') {
      stats.correct++; correctStreak++; flow++;
      const bucket = mastery.get(p.q.tag) || { asked: 1, correct: 0 };
      // Partial credit only if they got there unaided; a hinted answer still
      // counts as progress but must not read as mastery in the report.
      bucket.correct += p.hinted || p.step > 0 ? 0.5 : 1;
      mastery.set(p.q.tag, bucket);
      const praise = TUT_PRAISE[stats.correct % TUT_PRAISE.length];
      const consolidate = p.step === 0 ? ' ' + TUT_pick(p.q.answer, levelIdx) : '';
      emit('praise', praise + consolidate);
      closePending('correct');
      return { verdict: 'correct', missing: [], trap: null };
    }

    correctStreak = 0;
    p.attempts++;

    if (res.verdict === 'partial') {
      stats.partial++;
      const lead = TUT_PARTIAL[stats.partial % TUT_PARTIAL.length] + ' You have '
        + TUT_join(res.hit) + '. What you have not said is ' + TUT_join(res.miss) + '.';
      // A partial answer is close enough that a nudge is fairer than a new ladder
      // rung — but a second partial escalates like any other failure.
      if (p.attempts < 2 && (p.q.socratic || []).length > p.step) escalate(p, t, lead);
      else { emit('feedback', lead + ' ' + TUT_pick(p.q.answer, levelIdx)); log.push({ t, kind: 'explanation', qid: p.q.id }); closePending('explained'); }
      return { verdict: 'partial', missing: res.miss, trap: null };
    }

    stats.wrong++;
    let lead;
    if (res.trap) {
      // NAME the misconception. "Wrong" teaches nothing; "that is the pressure /
      // volume confusion, and here is the difference" is the entire lesson.
      lead = res.trap.say;
    } else {
      lead = TUT_REDIRECT[stats.wrong % TUT_REDIRECT.length];
    }
    escalate(p, t, lead);
    return { verdict: 'incorrect', missing: res.miss, trap: res.trap ? res.trap.name : null };
  }

  /* ---- observing -------------------------------------------------------- */
  // Wrapped whole. observe() runs `when` and `meta` predicates authored in the
  // bank above, and it is called from main.js's onEvent — which is itself called
  // from dissect.update() inside the render loop. Same reasoning as update():
  // a bad predicate must cost us one question, not the frame.
  function observe(evt, state) {
    try { observeInner(evt, state); } catch (e) { /* one lost question, no more */ }
  }

  function observeInner(evt, state) {
    if (!evt || disposed) return;
    const t = nowMs();
    refill(t);

    if (evt.kind === 'hover') return;      // far too chatty to be a trigger
    if (evt.partId) seenParts.add(evt.partId);

    // Concentration windows. The student has just done something and is looking
    // at the result; a question landing now is an interruption, not a prompt.
    if (evt.kind === 'incise') quietUntil = Math.max(quietUntil, t + 2600);
    if (evt.kind === 'discover' && !evt.partId) quietUntil = Math.max(quietUntil, t + 1400);
    if (evt.kind === 'peel' || evt.kind === 'lift') quietUntil = Math.max(quietUntil, t + 1200);

    // Flow bookkeeping. Clean, purposeful work earns silence; damage and refusals
    // spend it. Damage also bypasses the budget entirely — a consequence must be
    // named at the moment it happens or it teaches nothing.
    if (evt.kind === 'damage') {
      flow = 0;
      budget = Math.min(BUDGET_CAP, budget + 1);
      quietUntil = Math.max(quietUntil, t + 900);
    } else if (evt.kind === 'incise' && evt.meta && evt.meta.refused) {
      flow = 0;
    } else if (evt.kind === 'peel' || evt.kind === 'lift' || evt.kind === 'incise') {
      flow++;
      // Rare, earned, and never during a stroke: a single line of recognition for
      // a clean piece of work. Praise on every action is worth nothing.
      if (flow === 4 && !pending && !midStroke() && t - lastQuestionAt > 8000) {
        emit('praise', 'That is good, controlled work. I will leave you to it.');
        quietUntil = Math.max(quietUntil, t + 12000);
      }
    }

    if (!active) return;

    const pool = TUT_INDEX.get(evt.kind);
    if (!pool) { flush(t); return; }

    let best = null, bestScore = -1;
    for (let i = 0; i < pool.length; i++) {
      const q = pool[i];
      if (!eligible(q)) continue;
      if (!TUT_partMatches(q.on.part, evt.partId)) continue;
      if (q.on.layer != null && !(evt.meta && evt.meta.layer === q.on.layer)) continue;
      if (q.meta && !q.meta(evt.meta)) continue;
      if (q.when && !q.when(evt, state)) continue;
      // Specificity: a question keyed to this exact structure beats a generic one
      // keyed only to the event kind, and an urgent one beats both.
      const score = (q.on.part ? 2 : 0) + (q.urgent ? 3 : 0) + (q.meta ? 1 : 0);
      if (score > bestScore) { bestScore = score; best = q; }
    }

    if (best) queue(best, t, best.urgent ? 2400 : 0);
    flush(t);
  }

  /* ---- the public surface ----------------------------------------------- */
  function ask() {
    const t = nowMs();
    // An explicit request bypasses budget and gap — the student asked, so silence
    // policy does not apply. It still refuses to talk over a live stroke.
    if (pending) { emit('question', promptText(pending)); return true; }
    if (midStroke()) return false;
    // Prefer something the student has actually met; fall back to anything valid
    // for this specimen and level so `ask()` is never a dead end.
    let pick = null;
    for (let i = 0; i < TUT_BANK.length; i++) {
      const q = TUT_BANK[i];
      if (!eligible(q)) continue;
      const parts = q.on.part == null ? null : (Array.isArray(q.on.part) ? q.on.part : [q.on.part]);
      const met = parts && parts.some((w) => {
        if (w instanceof RegExp) { let ok = false; seenParts.forEach((id) => { if (w.test(id)) ok = true; }); return ok; }
        return seenParts.has(w);
      });
      if (met) { pick = q; break; }
      if (!pick && !parts) pick = q;
    }
    if (!pick) {
      emit('feedback', 'Nothing new to ask yet — open something up and I will have plenty.');
      return false;
    }
    budget = Math.max(budget, 1);
    fire(pick, t);
    return true;
  }

  function hint() {
    const t = nowMs();
    if (!pending) { emit('hint', 'No question open. Press the ask key and I will find you one.'); return null; }
    stats.hints++;
    pending.hinted = true;
    const socratic = pending.q.socratic || [];
    const s = socratic[pending.step];
    // A hint is the next rung of the SAME ladder, not a different kind of help —
    // so the student who takes a hint and the student who fails once end up in
    // the same place, which keeps the escalation honest.
    const text = s ? (typeof s === 'string' ? s : s.q)
                   : 'Think about what the structure is physically connected to, and what has to pass through it.';
    if (s) pending.step++;
    emit('hint', text);
    log.push({ t, kind: 'hint', qid: pending.q.id, text });
    return text;
  }

  function skip() {
    const t = nowMs();
    if (!pending) return null;
    stats.skipped++;
    correctStreak = 0;
    const direct = TUT_pick(pending.q.answer, levelIdx);
    emit('feedback', 'Leaving it. For the record: ' + direct);
    log.push({ t, kind: 'skipped', qid: pending.q.id, text: direct });
    closePending('skipped');
    return direct;
  }

  function grade() {
    // The running scorecard, not a single answer's mark — answer() returns that.
    const byTag = {};
    mastery.forEach((v, k) => { byTag[k] = v.asked ? +(v.correct / v.asked).toFixed(2) : 0; });
    const scored = stats.correct + stats.partial * 0.5;
    return {
      level: TUT_LEVELS[levelIdx],
      specimen,
      asked: stats.asked,
      answered: stats.answered,
      correct: stats.correct,
      partial: stats.partial,
      incorrect: stats.wrong,
      skipped: stats.skipped,
      hints: stats.hints,
      score: stats.answered ? +(scored / Math.max(1, stats.asked)).toFixed(2) : 0,
      mastery: byTag,
    };
  }

  function progress() {
    return {
      level: TUT_LEVELS[levelIdx],
      specimen,
      asked: stats.asked,
      answered: stats.answered,
      correct: stats.correct,
      streak: correctStreak,
      flow,
      pending: pending ? { id: pending.q.id, step: pending.step, attempts: pending.attempts,
                           text: promptText(pending) } : null,
      budget: +budget.toFixed(2),
      remaining: TUT_BANK.filter(eligible).length,
      active,
    };
  }

  function transcript() { return log.slice(); }

  // An abandoned question must be RELEASED, not burned. `fire()` marks a question
  // asked so it never repeats; if we drop it unanswered without undoing that, the
  // one question the student was actually engaged with is the one they can never
  // be shown again. Only release it if it was never answered at all.
  function releasePending() {
    if (!pending) return;
    if (pending.step === 0 && pending.attempts === 0 && !pending.hinted) asked.delete(pending.q.id);
    pending = null;
  }

  function setLevel(l) {
    if (TUT_LEVEL_IDX[l] === undefined) return;
    levelIdx = TUT_LEVEL_IDX[l];
    // Questions already answered stay asked, but an open question is abandoned:
    // grading a medical rubric against an answer written for a school question
    // would be unfair in exactly the direction that destroys trust.
    releasePending();
    queued = null;
  }

  function setActive(on) {
    active = !!on;
    if (!active) { releasePending(); queued = null; }
  }

  function setSpecimen(id) {
    if (!id || id === specimen) return;
    specimen = id;
    pending = null; queued = null;
    flow = 0; correctStreak = 0;
    seenParts.clear();
    // `asked` deliberately persists: swapping specimens mid-session should not
    // reset the student's record, and no question spans both specimens anyway.
  }

  // `lastDriveAt` records WHEN main.js last pumped us, not merely whether it ever
  // did. A boolean latch was wrong: the host calls update() from the render loop,
  // and that loop stops on specimen teardown, on a backgrounded tab, or on any
  // exception thrown elsewhere in the frame. A latched flag would then leave the
  // queue permanently unattended and the tutor silent for the rest of the session.
  let lastDriveAt = -1e9;
  function update(dt, ctx) {
    // update() is called from inside main.js's requestAnimationFrame loop. A throw
    // here does not degrade the tutor — it kills the render loop and freezes the
    // whole app. Nothing this module does is worth that.
    try {
      if (disposed) return;
      lastDriveAt = nowMs();
      if (ctx) { busy.tool = ctx.tool || busy.tool; busy.gripping = !!ctx.gripping; }
      refill(lastDriveAt);
      flush(lastDriveAt);
    } catch (e) { /* a silent tutor beats a frozen lab */ }
  }
  if (typeof setInterval === 'function') {
    selfTimer = setInterval(() => {
      try {
        if (disposed) return;
        const t = nowMs();
        if (t - lastDriveAt < 1200) return;   // the host is pumping; never double-pump
        refill(t);
        flush(t);
      } catch (e) { /* likewise */ }
    }, 400);
  }

  function onSay(cb) {
    if (typeof cb === 'function') listeners.push(cb);
    return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); };
  }

  function dispose() {
    disposed = true;
    if (selfTimer) { clearInterval(selfTimer); selfTimer = 0; }
    listeners.length = 0;
    pending = null; queued = null;
    // `log` and `mastery` are deliberately kept: main.js feeds transcript() and
    // grade() into the viva panel, which is shown AFTER the lab is torn down.
  }

  return {
    observe, ask, answer, grade, hint, skip,
    setActive, setLevel, setSpecimen, progress, transcript, onSay, dispose, update,
    get level() { return TUT_LEVELS[levelIdx]; },
    get isActive() { return active; },
    get pending() { return promptText(pending); },
  };
}
