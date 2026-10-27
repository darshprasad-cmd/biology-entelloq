/* Original virtual-slide teaching model, not a microscope calibration.
 * A selected 18 mm eyepiece field number and 10x eyepiece give specimen-plane
 * field diameter (micrometres) = 18000 / objective magnification. Total optical
 * magnification = eyepiece magnification * objective magnification. Display
 * size/zoom is NOT an additional calibrated optical magnification.
 * Focus, illumination and preparation effects below are illustrative controls,
 * not measured optics, measured cell sizes or simulated laboratory competence.
 * Curriculum: CBSE 2026-27 Class IX standard Science, practical 4:
 * https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/ScienceSt_SecP1_2026-27.pdf
 * Preparation/comparison: NCERT Class IX Science Lab Manual, Experiments
 * 18-19, printed pp. 69-74 (PDF pp. 1-6). Its teacher note on p. 74 explicitly
 * limits small-organelle identification in these temporary mounts:
 * https://www.ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classIX/science/ielm103.pdf
 * Optical relationships and resolution limits:
 * https://www.microscopyu.com/microscopy-basics/field-of-view
 * https://www.microscopyu.com/microscopy-basics/resolution
 * Ordinary onion-bulb epidermis lacks chloroplasts, unlike green leaf tissue:
 * https://vml.cad.rit.edu/microscopes/onionepidermis.html
 * No specimen collection, camera, network, clock or storage is used here.
 */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BioMicroscopyModel = api;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';

  const constants = Object.freeze({
    SPECIMENS: Object.freeze(['onion', 'cheek']),
    OBJECTIVES: Object.freeze([4, 10, 40]),
    MOUNTS: Object.freeze(['flat', 'bubbles', 'fold']),
    EYEPIECE_MAGNIFICATION: 10,
    FIELD_NUMBER_MM: 18,
    STAGE_LIMIT_UM: 1500,
    MIN_USABLE_LIGHT: 25,
    MAX_USABLE_LIGHT: 85,
    MAX_OBSERVATION_LENGTH: 600,
    NOTICE: 'Illustrative virtual slides, not photographs, calibrated microscopy, experimental data or proof of practical competence.'
  });
  const limits = Object.freeze([
    'Cell shapes, sizes, spacing, stain colours and control responses are original schematic choices, not measured specimens or diagnostic images.',
    'The 18 mm field number is a chosen instrument specification. Actual field diameter requires the real eyepiece field number and objective, or calibration with a stage micrometer.',
    'The focus dial has arbitrary units. A narrower usable band at higher power illustrates focusing difficulty; it is not a calculation of depth of field or optical resolution.',
    'This model does not resolve the plasma-membrane bilayer, bacteria, mitochondria or other ultrastructure. More magnification alone does not provide more resolution.',
    'Virtual preparation and a usable model view do not certify correct slide preparation, biological identification or completion of a supervised practical. Cheek sampling and stains require school supervision and hygiene precautions.'
  ]);
  const stateKeys = ['specimen', 'prepared', 'stain', 'mount', 'objective', 'focus', 'light', 'x', 'y'];
  const focusTargets = Object.freeze({ onion: 52, cheek: 46 });
  const focusTolerances = Object.freeze({ 4: 12, 10: 7, 40: 3 });

  // Copy only declared own data properties; neither accessors nor stored
  // conclusions are accepted as model inputs. Do not coerce strings to numbers.
  function dataProperties(value, allowed) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    try {
      const names = Reflect.ownKeys(value);
      if (names.some(key => typeof key !== 'string' || !allowed.includes(key))) return null;
      const copied = {};
      for (const key of names) {
        const descriptor = Object.getOwnPropertyDescriptor(value, key);
        if (!descriptor || !Object.prototype.hasOwnProperty.call(descriptor, 'value')) return null;
        copied[key] = descriptor.value;
      }
      return copied;
    } catch (_) { return null; }
  }
  function bounded(value, min, max) {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  }
  function defaults(specimen = 'onion') {
    if (!constants.SPECIMENS.includes(specimen)) return null;
    return { specimen, prepared: false, stain: false, mount: 'flat', objective: 4, focus: 30, light: 65, x: 0, y: 0 };
  }
  function normalize(input = {}) {
    const data = dataProperties(input, stateKeys);
    if (!data) return null;
    const specimen = Object.hasOwn(data, 'specimen') ? data.specimen : 'onion';
    if (!constants.SPECIMENS.includes(specimen)) return null;
    const initial = defaults(specimen);
    if (!initial) return null;
    const state = { ...initial, ...data };
    if (typeof state.prepared !== 'boolean' || typeof state.stain !== 'boolean' ||
        !constants.MOUNTS.includes(state.mount) || !constants.OBJECTIVES.includes(state.objective) ||
        !bounded(state.focus, 0, 100) || !bounded(state.light, 0, 100) ||
        !bounded(state.x, -constants.STAGE_LIMIT_UM, constants.STAGE_LIMIT_UM) ||
        !bounded(state.y, -constants.STAGE_LIMIT_UM, constants.STAGE_LIMIT_UM)) return null;
    // Canonical positive zero keeps serialized observations deterministic.
    for (const key of ['focus', 'light', 'x', 'y']) if (state[key] === 0) state[key] = 0;
    return state;
  }
  function optics(input = {}) {
    const state = normalize(input);
    if (!state) return null;
    const targetFocus = focusTargets[state.specimen];
    const focusTolerance = focusTolerances[state.objective];
    const focusError = Math.abs(state.focus - targetFocus);
    const sharp = focusError <= focusTolerance;
    const lightOK = state.light >= constants.MIN_USABLE_LIGHT && state.light <= constants.MAX_USABLE_LIGHT;
    const issues = [];
    if (!state.prepared) issues.push('Place the virtual specimen on the slide before interpreting a field.');
    if (!state.stain) issues.push('Apply the virtual stain to increase contrast for this identification exercise; unstained cells do not disappear in a real microscope.');
    if (state.mount === 'bubbles') issues.push('Remount without trapped air: rounded, strongly outlined bubbles are preparation artefacts, not cell nuclei.');
    if (state.mount === 'fold') issues.push(state.specimen === 'onion'
      ? 'Flatten the onion peel to one layer; folded, overlapping tissue makes cell boundaries harder to distinguish.'
      : 'Spread the cheek sample as a thin smear; crowded, overlapping cells make boundaries harder to distinguish.');
    if (!lightOK) issues.push(state.light < constants.MIN_USABLE_LIGHT
      ? 'Increase the illumination: this virtual field is too dim for a usable observation.'
      : 'Reduce the illumination: this virtual field is washed out and loses contrast.');
    if (!sharp) issues.push('Adjust focus until the cell outlines and stained nuclei become sharp. Start at low power; use fine focus at high power.');
    const ready = issues.length === 0;
    return {
      total: constants.EYEPIECE_MAGNIFICATION * state.objective,
      fovUm: constants.FIELD_NUMBER_MM * 1000 / state.objective,
      targetFocus, focusTolerance, focusError, sharp, lightOK, ready,
      // A compound light microscope reverses apparent motion relative to a
      // translated slide. Coordinates are stage displacement in micrometres.
      imageOffsetUm: { x: state.x === 0 ? 0 : -state.x, y: state.y === 0 ? 0 : -state.y },
      feedback: ready
        ? 'Usable illustrative field. Compare cell outlines and stained nuclei, then write what you actually observe; this is not a practical-completion award.'
        : issues.join(' '),
      issues
    };
  }

  const questions = Object.freeze([
    {
      id: 'total-magnification',
      prompt: 'With a 10x eyepiece and a 40x objective, what is the total optical magnification?',
      options: ['40x', '50x', '400x', '4000x'], answer: 2,
      explanation: 'Multiply eyepiece by objective: 10 x 40 = 400x. Adding the two values is incorrect. Making the browser picture larger does not change the instrument magnification.'
    },
    {
      id: 'field-diameter',
      prompt: 'Keeping the same eyepiece, you change from a 10x objective to a 40x objective. What happens to the field diameter?',
      options: ['It becomes four times larger.', 'It becomes one quarter as large.', 'It becomes one sixteenth as large.', 'It stays the same.'], answer: 1,
      explanation: 'Field diameter is inversely proportional to objective magnification for a fixed eyepiece: 1800 micrometres becomes 450 micrometres in this chosen instrument. Diameter falls by four; field area falls by sixteen.'
    },
    {
      id: 'onion-chloroplasts',
      prompt: 'Why are chloroplasts not shown in the ordinary inner epidermis of an onion bulb scale?',
      options: ['Plant cells never have chloroplasts.', 'Staining always destroys chloroplasts.', 'The usual underground bulb-scale epidermis is not photosynthetic green leaf tissue.', 'The cell wall prevents all light from entering.'], answer: 2,
      explanation: 'The inner epidermis used from an ordinary onion bulb scale normally lacks chloroplasts. This does not mean that every plant cell lacks chloroplasts: green leaf tissues provide a different comparison.'
    },
    {
      id: 'cell-boundary',
      prompt: 'Which comparison of the onion and cheek cell boundaries is justified?',
      options: ['Both have cellulose cell walls.', 'Onion cells have walls; cheek cells lack a wall and their outline marks the cell boundary.', 'Cheek cells have walls, but onion cells do not.', 'The plasma-membrane bilayer is resolved as two separate lines in both slides.'], answer: 1,
      explanation: 'Onion epidermal cells have cellulose walls outside their plasma membranes; cheek epithelial cells have no cell wall. Ordinary bright-field viewing can locate the cheek-cell outline, but cannot resolve the membrane bilayer itself.'
    },
    {
      id: 'air-bubbles',
      prompt: 'A preparation shows large rounded rings with dark rims, without the cell outlines and stained nuclei around them. What is the best next step?',
      options: ['Count each ring as a nucleus.', 'Treat every rounded shape as a cheek cell.', 'Remount carefully and compare: trapped air can make strongly outlined rings.', 'Increase magnification and assume that proves the identity.'], answer: 2,
      explanation: 'Air trapped under a coverslip can appear as strongly outlined rings. Shape alone does not identify a cell or organelle. Reduce bubbles during supervised preparation and compare multiple focused fields rather than counting rings as nuclei.'
    },
    {
      id: 'stage-motion',
      prompt: 'You move the slide to the right on the stage of a conventional compound microscope. Which apparent image motion should you expect?',
      options: ['Right, by the same apparent direction.', 'Left, opposite to slide motion.', 'No motion at all.', 'A change in cell structure rather than position.'], answer: 1,
      explanation: 'The viewed image is inverted relative to the specimen. Translating the slide right therefore moves the apparent image left. Recentring at low power helps you find the feature before using high power.'
    }
  ].map(question => Object.freeze({ ...question, options: Object.freeze(question.options) })));

  function grade(id, choice) {
    if (typeof id !== 'string' || !Number.isInteger(choice)) return null;
    const question = questions.find(item => item.id === id);
    if (!question || choice < 0 || choice >= question.options.length) return null;
    return { correct: choice === question.answer, answer: question.answer, explanation: question.explanation };
  }
  function record(input, observation) {
    const state = normalize(input);
    if (!state || typeof observation !== 'string' || observation.length > constants.MAX_OBSERVATION_LENGTH) return null;
    const text = observation.trim();
    if (!text || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text)) return null;
    const view = optics(state);
    if (!view.ready) return null;
    return { state, observation: text, total: view.total, fovUm: view.fovUm, dataKind: 'illustrative_virtual_slide' };
  }

  return Object.freeze({ constants, limits, defaults, normalize, optics, questions, grade, record });
});
