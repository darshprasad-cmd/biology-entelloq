/*
 * data.js — the knowledge behind every scale.
 *
 * The stage files own the VISUALS; this file owns the MEANING. Each of the
 * thirteen scales carries: what it is, its physical size, a one-line orientation,
 * a few real facts, the interactive hotspots (each with a name + explanation, and
 * where relevant a disease it underlies), plus research, labs, related concepts
 * and a seed question for the AI. `UNI_ORDER` is the zoom axis, Universe → Atom.
 *
 * Everything here is factual. It is the difference between a pretty zoom and a
 * biology lesson you can fall into.
 */

const UNI_ORDER = [
  'universe', 'earth', 'biome', 'ecosystem', 'organism',
  'organ', 'tissue', 'cell', 'organelle', 'protein',
  'dna', 'nucleotide', 'atom',
];
UNI.ORDER = UNI_ORDER;

const UNI_DATA = {
  universe: {
    title: 'The Universe', size: '~10²⁶ m', scaleLabel: 'observable universe',
    blurb: 'Every atom in you was forged in a star. Life is chemistry that learned to remember itself — and this is the only place we have ever found it.',
    facts: [
      'The observable universe holds ~2 trillion galaxies; life is known on exactly one speck.',
      'The elements of life — carbon, oxygen, nitrogen — were made inside dying stars.',
      'You are, quite literally, a way for the universe to know itself.',
    ],
    hotspots: {
      milkyway: { name: 'The Milky Way', desc: 'Our galaxy — ~100–400 billion stars. One ordinary star, on a quiet arm, warms a small blue world.' },
      elements: { name: 'Stardust', desc: 'Supernovae seeded space with carbon, oxygen and iron. Biology is what those ashes did next.' },
    },
    research: ['Astrobiology: the search for biosignatures on exoplanets'],
    labs: [],
    related: ['earth', 'atom'], ai: 'Why is carbon the backbone of all known life?',
  },
  earth: {
    title: 'Earth', size: '~10⁷ m', scaleLabel: 'a living planet',
    blurb: 'A thin film of life wraps a ball of rock — the biosphere. For 3.8 billion years it has been rewriting the planet, oxygenating the air and painting the continents green.',
    facts: [
      'Earth is the only planet whose atmosphere is kept far from chemical equilibrium — by life.',
      'Photosynthesis put the oxygen in the air; before life, there was almost none.',
      'The biosphere is astonishingly thin — most life lives within a few km of the surface.',
    ],
    hotspots: {
      atmosphere: { name: 'The Atmosphere', desc: '21% oxygen — a signature of life. Cyanobacteria and plants exhale it; you breathe their exhaust.' },
      oceans: { name: 'The Oceans', desc: 'Where life began ~3.8 Gya, and where most photosynthesis still happens, in drifting phytoplankton.' },
      land: { name: 'The Continents', desc: 'Green with forests and grasslands — vast solar collectors turning light into living carbon.' },
    },
    research: ['Earth-system science: life as a planetary force'],
    labs: [],
    related: ['biome', 'universe'], ai: 'How did life change Earth’s atmosphere?',
  },
  biome: {
    title: 'A Biome', size: '~10⁵ m', scaleLabel: 'climate & community',
    blurb: 'Zoom in and the green resolves into biomes — rainforest, savanna, tundra — each a community of life shaped by climate, and each a machine for moving carbon and water.',
    facts: [
      'Tropical rainforests hold over half of all land species on ~6% of the land.',
      'A biome is defined by its climate and dominant plant life, not by geography.',
      'Forests move water: much of the rain over the Amazon is exhaled by the trees themselves.',
    ],
    hotspots: {
      canopy: { name: 'The Canopy', desc: 'The forest’s sunlit roof — the most biodiverse layer, a city of leaves, insects and birds.' },
      soil: { name: 'The Soil', desc: 'A living skin: fungal networks and microbes recycle the dead back into the living.' },
      water: { name: 'The Water Cycle', desc: 'Transpiration lifts water from root to leaf to sky — biology driving weather.' },
    },
    diseases: ['Deforestation & zoonotic spillover — new diseases crossing from wildlife'],
    research: ['Biodiversity & ecosystem stability'],
    labs: [],
    related: ['ecosystem', 'earth'], ai: 'Why are rainforests so biodiverse?',
  },
  ecosystem: {
    title: 'An Ecosystem', size: '~10³ m', scaleLabel: 'the web of life',
    blurb: 'Inside a biome, energy flows through a web — sun to plant to herbivore to predator — and matter cycles endlessly. Pull one thread and the whole web shivers.',
    facts: [
      'Only ~10% of energy passes to the next level of a food chain — why top predators are rare.',
      'Every ecosystem runs on the same currency: energy captured from sunlight.',
      'Keystone species hold whole webs together — remove the wolf and the rivers change.',
    ],
    hotspots: {
      producer: { name: 'Producers', desc: 'Plants and algae — they alone turn sunlight into food, the base of every food web.' },
      herbivore: { name: 'Herbivores', desc: 'Primary consumers that eat producers, passing ~10% of the captured energy upward.' },
      predator: { name: 'Predators', desc: 'Top consumers — few in number, immense in influence, shaping the behaviour of everything below.' },
      decomposer: { name: 'Decomposers', desc: 'Fungi and bacteria that return the dead to the soil, closing the loop of matter.' },
    },
    diseases: ['Trophic collapse when a keystone species is lost'],
    research: ['Food-web ecology & rewilding'],
    labs: ['Predator & prey — the Lotka-Volterra bench'],
    related: ['organism', 'biome'], ai: 'What is a keystone species?',
  },
  organism: {
    title: 'An Organism', size: '~10⁰ m', scaleLabel: 'a single life',
    blurb: 'One node in the web is one life — trillions of cells cooperating as a single self. Every organ, every heartbeat, is that colony keeping itself alive.',
    facts: [
      'A human is ~37 trillion cells, plus as many microbial cells riding along.',
      'Every cell in your body shares one genome, yet a neuron and a muscle cell could not look more different.',
      'You are a temporary alliance of cells — most will be replaced within years.',
    ],
    hotspots: {
      nervous: { name: 'Nervous System', desc: 'The body’s wiring — the brain and ~86 billion neurons coordinating the whole colony in milliseconds.' },
      circulatory: { name: 'Circulatory System', desc: 'A closed loop of ~100,000 km of vessels delivering oxygen and carrying away waste.' },
      skeleton: { name: 'The Skeleton', desc: 'Living scaffolding — 206 bones that also manufacture blood in their marrow.' },
    },
    diseases: ['Systemic disease — when one system’s failure cascades through the whole body'],
    research: ['Systems physiology & whole-body simulation'],
    labs: ['Open the Dissection Lab — take a real specimen apart'],
    related: ['organ', 'ecosystem'], ai: 'How do 37 trillion cells act as one organism?',
  },
  organ: {
    title: 'The Heart', size: '~10⁻¹ m', scaleLabel: 'an organ at work',
    blurb: 'Zoom into the chest and meet the hardest-working muscle you own — a fist-sized pump that beats ~100,000 times a day, moving your entire blood volume every minute.',
    facts: [
      'The heart beats ~2.5 billion times in an average lifetime, without ever resting.',
      'Its own pacemaker — the SA node — fires the rhythm; it needs no signal from the brain to beat.',
      'The left ventricle’s wall is thickest because it pumps blood to the entire body.',
    ],
    hotspots: {
      atrium: { name: 'Atria', desc: 'The receiving chambers — blood returns here before being handed to the ventricles.' },
      ventricle: { name: 'Ventricles', desc: 'The pumping chambers. The left ventricle drives blood through the whole body.' },
      valve: { name: 'Valves', desc: 'One-way doors that snap shut to stop backflow — the "lub-dub" you hear is them closing.' },
      coronary: { name: 'Coronary Arteries', desc: 'The heart’s own supply lines. Block one and the muscle downstream begins to die.' },
    },
    diseases: ['Myocardial infarction (heart attack)', 'Arrhythmia', 'Heart failure'],
    research: ['Cardiac regeneration & lab-grown heart tissue'],
    labs: ['Dissect the heart in the Dissection Lab'],
    related: ['tissue', 'organism'], ai: 'How does the heart beat without the brain telling it to?',
  },
  tissue: {
    title: 'Cardiac Tissue', size: '~10⁻³ m', scaleLabel: 'cells, organised',
    blurb: 'The heart wall resolves into tissue — sheets of muscle cells wired together so tightly that they beat as one. This is where the pump becomes a crowd.',
    facts: [
      'Cardiac muscle cells are joined by intercalated discs that let the signal to contract leap cell-to-cell.',
      'The cells are striped (striated) because their contractile proteins line up in perfect ranks.',
      'A tissue is many cells of one kind doing one job together — muscle, nerve, epithelium, connective.',
    ],
    hotspots: {
      cardiomyocyte: { name: 'Cardiomyocyte', desc: 'A single heart-muscle cell — branched, striped and packed with mitochondria to never tire.' },
      disc: { name: 'Intercalated Disc', desc: 'The electrical handshake between cells that lets a whole sheet contract in unison.' },
      capillary: { name: 'Capillary', desc: 'A vessel one cell wide — where oxygen finally leaves the blood and enters the tissue.' },
    },
    diseases: ['Fibrosis — scar tissue that can’t contract', 'Cardiomyopathy'],
    research: ['Tissue engineering & organs-on-a-chip'],
    labs: ['The virtual microscope — four slides, 40x to 1000x'],
    related: ['cell', 'organ'], ai: 'Why is heart muscle striated?',
  },
  cell: {
    title: 'The Cell', size: '~10⁻⁵ m', scaleLabel: 'the unit of life',
    blurb: 'Cross the membrane and you are inside a single cell — the smallest thing that is unmistakably alive. A whole economy of organelles, humming, building, dividing.',
    facts: [
      'Every one of your ~37 trillion cells carries a full 2-metre copy of your genome, folded into a nucleus 6 µm wide.',
      'A cell runs millions of chemical reactions a second, in near-perfect order.',
      'All cells come from cells — an unbroken chain of division back ~3.8 billion years.',
    ],
    hotspots: {
      membrane: { name: 'Cell Membrane', desc: 'A fluid bilayer that decides what enters and leaves — the border of the self.' },
      nucleus: { name: 'Nucleus', desc: 'The vault of the genome. Zoom in here and we fly through it into the DNA itself.' },
      mito: { name: 'Mitochondrion', desc: 'The powerhouse — burns fuel with oxygen to make ATP. Watch the sparks of energy it releases.' },
      er: { name: 'Endoplasmic Reticulum', desc: 'A folded factory floor — rough ER builds proteins, smooth ER makes lipids.' },
      golgi: { name: 'Golgi Apparatus', desc: 'The packaging and shipping department — proteins are finished and addressed here.' },
      ribosome: { name: 'Ribosomes', desc: 'Machines that read mRNA and build proteins, one amino acid at a time.' },
    },
    diseases: ['Cancer — a cell that forgets to stop dividing', 'Mitochondrial disease'],
    research: ['Single-cell sequencing & the Human Cell Atlas'],
    labs: [],
    related: ['organelle', 'tissue', 'dna'], ai: 'What makes a cell alive rather than just chemistry?',
  },
  organelle: {
    title: 'The Mitochondrion', size: '~10⁻⁶ m', scaleLabel: 'the cell’s power plant',
    blurb: 'Zoom into one organelle — the mitochondrion. Its folded inner membrane is a molecular power station, turning food and oxygen into the ATP that powers everything you do.',
    facts: [
      'Mitochondria were once free-living bacteria, swallowed ~1.5 billion years ago — they still carry their own DNA.',
      'The folds (cristae) pack more membrane in — more surface for making energy.',
      'You inherit all your mitochondria from your mother; they trace a maternal line back through deep time.',
    ],
    hotspots: {
      cristae: { name: 'Cristae', desc: 'The inner-membrane folds — where the electron transport chain builds a proton gradient.' },
      matrix: { name: 'Matrix', desc: 'The inner soup where the Krebs cycle runs, stripping high-energy electrons from food.' },
      atpsynthase: { name: 'ATP Synthase', desc: 'A molecular turbine — protons rushing through it spin a rotor that forges ATP.' },
      mtdna: { name: 'Mitochondrial DNA', desc: 'A tiny circular genome, a relic of the mitochondrion’s bacterial past.' },
    },
    diseases: ['Mitochondrial myopathies', 'Roles in ageing & neurodegeneration'],
    research: ['Mitochondrial replacement therapy'],
    labs: ['Cellular Respiration — a six-lens lesson with a live ATP tally'],
    related: ['protein', 'cell'], ai: 'How does a mitochondrion actually make ATP?',
  },
  protein: {
    title: 'A Protein', size: '~10⁻⁸ m', scaleLabel: 'the machines of life',
    blurb: 'The machines doing all this work are proteins — chains of amino acids folded into exquisite shapes. Here is haemoglobin, the four-part protein that carries your every breath.',
    facts: [
      'A protein’s function is its shape; misfold it and it fails — or turns toxic.',
      'Haemoglobin changes shape as it grabs oxygen, making each grab easier than the last.',
      'Predicting how a protein folds was a 50-year grand challenge — recently cracked by AI (AlphaFold).',
    ],
    hotspots: {
      helix: { name: 'Alpha Helix', desc: 'A common fold — the amino-acid chain coiled into a spring, held by hydrogen bonds.' },
      sheet: { name: 'Beta Sheet', desc: 'Strands laid side by side into a pleated sheet — the other great structural motif.' },
      heme: { name: 'Heme Group', desc: 'An iron-holding ring at haemoglobin’s heart — the exact spot an oxygen molecule binds.' },
      active: { name: 'Active Site', desc: 'The pocket where a protein does its chemistry — shaped to fit one molecule like a lock.' },
    },
    diseases: ['Sickle-cell anaemia — one wrong amino acid in haemoglobin', 'Alzheimer’s & protein misfolding'],
    research: ['AlphaFold & AI protein design'],
    labs: [],
    related: ['dna', 'organelle'], ai: 'Why does a protein’s shape determine what it does?',
  },
  dna: {
    title: 'DNA', size: '~10⁻⁸ m', scaleLabel: 'the code of life',
    blurb: 'Every protein is written here — in DNA, the twisted ladder that stores the instructions for building you. Two metres of it, coiled into every cell.',
    facts: [
      'DNA is written in just four letters — A, T, G, C — yet spells out every living thing.',
      'The two strands are complements: A pairs with T, G with C, so each is a backup of the other.',
      'Your genome is ~3 billion letters; read aloud, it would take over 9 years.',
    ],
    hotspots: {
      helix: { name: 'Double Helix', desc: 'Two strands wound together, 10.5 base-pairs per turn — the iconic spiral staircase.' },
      basepair: { name: 'Base Pair', desc: 'A rung of the ladder: A–T or G–C, held by hydrogen bonds. Zoom in to see one.' },
      backbone: { name: 'Sugar-Phosphate Backbone', desc: 'The rails of the ladder — alternating sugar and phosphate, giving DNA its charge and strength.' },
      gene: { name: 'A Gene', desc: 'A stretch of the code that spells out one protein — a single instruction among ~20,000.' },
    },
    diseases: ['Genetic disease from a single mis-spelled letter', 'Cancer as accumulated DNA damage'],
    research: ['CRISPR gene editing', 'Whole-genome sequencing'],
    labs: ['Zoom the Dissection Lab from tissue to DNA'],
    related: ['nucleotide', 'protein'], ai: 'How can four letters encode an entire organism?',
  },
  nucleotide: {
    title: 'A Nucleotide', size: '~10⁻⁹ m', scaleLabel: 'one letter of the code',
    blurb: 'Zoom into a single rung and letter of the code — a nucleotide. Sugar, phosphate and a nitrogen base: the atoms that spell out life, and the last stop before chemistry itself.',
    facts: [
      'A nucleotide has three parts: a phosphate, a deoxyribose sugar, and one of four bases.',
      'A–T pairs share two hydrogen bonds; G–C shares three — which is why G–C is harder to pull apart.',
      'Change one nucleotide and you can change a protein — the seed of both disease and evolution.',
    ],
    hotspots: {
      base: { name: 'Nitrogenous Base', desc: 'Adenine, thymine, guanine or cytosine — the actual "letter". Its shape decides its partner.' },
      sugar: { name: 'Deoxyribose', desc: 'The five-carbon sugar ring that anchors the base and links to the backbone.' },
      phosphate: { name: 'Phosphate Group', desc: 'The connector that joins one nucleotide to the next and carries DNA’s negative charge.' },
      hbond: { name: 'Hydrogen Bonds', desc: 'The weak, specific bonds holding partner bases together — strong in number, easy to unzip.' },
    },
    diseases: ['Point mutations & single-nucleotide polymorphisms (SNPs)'],
    research: ['DNA synthesis & data storage in DNA'],
    labs: ['DNA Replication — watch the fork run, leading and lagging'],
    related: ['atom', 'dna'], ai: 'Why does adenine only pair with thymine?',
  },
  atom: {
    title: 'The Atom', size: '~10⁻¹⁰ m', scaleLabel: 'the foundation',
    blurb: 'The last step: a single carbon atom. A dense nucleus wrapped in a haze of electrons — mostly empty space, and yet the sole reason chemistry, and therefore you, can exist.',
    facts: [
      'Carbon’s four outer electrons let it bond four ways at once — why it can build the vast molecules of life.',
      'An atom is ~99.9999999999% empty space; the nucleus is a fly in a cathedral.',
      'Every carbon atom in you was made inside a star and is older than the Sun.',
    ],
    hotspots: {
      nucleus: { name: 'Nucleus', desc: 'Six protons and six neutrons, bound impossibly tight — tiny, but nearly all the mass.' },
      electron: { name: 'Electron Cloud', desc: 'Not orbits but probability clouds — where the electrons are likely to be. Chemistry lives here.' },
      valence: { name: 'Valence Electrons', desc: 'Carbon’s four outer electrons — the hands it uses to hold four other atoms and build life.' },
    },
    research: ['Quantum biology — quantum effects in photosynthesis & enzymes'],
    labs: ['Zoom the Dissection Lab all the way to the atom'],
    related: ['nucleotide', 'universe'], ai: 'Why is carbon uniquely suited to build life?',
  },
};
