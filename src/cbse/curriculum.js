/* Original study-resource mapping, not a claim of syllabus completion. */
(function (root) {
  'use strict';
  const secondary = 'https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/';
  const senior = 'https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Biology_SecP2_2026-27.pdf';
  const unit = (id, title, topics, gap) => ({id, title, topics, gap, status:'supporting-resources'});
  root.BIO_CBSE_DATA = {
    year:'2026–27', subject:'Biology', courses:{
      '9':{title:'Class 9 · Science: Biology', source:secondary+'ScienceSt_SecP1_2026-27.pdf', note:'Standard Science, not Science at Advanced Level. Earth as a System crosses subject boundaries.', units:[
        unit('cells','Cell — the unit of life',['cell-structure','cell-membrane','osmosis','mitosis','meiosis'],'Full Class 9 outcomes, microscopy activities and cancer context need a dedicated course review.'),
        unit('tissues','Tissues and organisation',['cell-differentiation','plant-tissues','muscle-contraction','nervous-system'],'Animal tissue identification and the complete prescribed practical sequence are not yet a finished course.'),
        unit('reproduction','Reproduction',['plant-reproduction','reproductive-anatomy','gametogenesis','fertilization'],'Asexual mechanisms, life-cycle comparisons and age-appropriate course sequencing remain to be authored.'),
        unit('diversity','Diversity of living organisms',['biodiversity','phylogenetic-trees','bacteria','fungi'],'A full classification survey, specimens and prescribed group characteristics remain to be mapped.'),
        unit('earth','Earth as a system',['ecology','food-webs','carbon-cycle','nitrogen-cycle'],'This biology strand does not replace the full Earth-system, physical-science or chemistry outcomes.')
      ]},
      '10':{title:'Class 10 · Science: Biology', source:secondary+'Science_SecP1_2026-27.pdf', note:'Check assessment scope with your teacher: the syllabus separates formative evolution content, while a broader teacher note about “Heredity and Evolution” is ambiguous. These are study resources, not an exam-selection guarantee.', units:[
        unit('life','Life processes',['photosynthesis','digestive-system','gas-exchange','heart-circulation','plant-transport','kidney'],'A complete Class 10 lesson sequence, all experiments and board-style marking guidance remain to be completed.'),
        unit('control','Control and coordination',['nervous-system','synapses','endocrine-system','plant-hormones','tropisms'],'Reflex-path diagrams, prescribed examples and assessment coverage need further course-specific authoring.'),
        unit('reproduction','Reproduction',['plant-reproduction','pollination','reproductive-anatomy','fertilization'],'Asexual reproduction, reproductive health and all prescribed activities are not a completed unit here.'),
        unit('heredity','Heredity',['mendelian-genetics','sex-linked-inheritance','dna'],'Human sex determination and class-specific evidence questions need a complete reviewed sequence; confirm assessment scope with your teacher.'),
        unit('environment','Our environment',['ecology','food-webs','conservation'],'Waste, ozone depletion and the complete prescribed environmental activities need dedicated lessons.')
      ]},
      '11':{title:'Class 11 · Biology', source:senior, note:'The structural-animal syllabus centres on frog anatomy. Other virtual dissections are enrichment, not substitutes for prescribed practicals. The theory plant family is Solanaceae; approved local alternatives apply to the practical. Digestion and Absorption is formative-only in this syllabus.', units:[
        unit('diversity','Diversity of living organisms',['biodiversity','phylogenetic-trees','bacteria','fungi'],'The complete plant/animal kingdom survey, taxonomic aids and specimen identification are not yet fully authored.'),
        unit('structure','Structural organisation in plants and animals',['plant-tissues','cell-differentiation','plant-reproduction'],'Plant morphology, Solanaceae and the complete frog organ-system account require dedicated reviewed units.'),
        unit('cells','Cell: structure and function',['cell-structure','biomolecules','enzymes','cell-cycle','mitosis','meiosis'],'These concept lessons support the unit; every syllabus outcome and practical is not yet audited as complete.'),
        unit('plants','Plant physiology',['photosynthesis','light-reactions','calvin-cycle','cellular-respiration','plant-hormones','seed-germination'],'Course-specific plant growth/development and integrated experiments remain to be completed.'),
        unit('humans','Human physiology',['gas-exchange','heart-circulation','kidney','muscle-contraction','nervous-system','endocrine-system'],'Full prescribed disorders, diagrams, practicals and board-style assessment coverage remain under review.')
      ]},
      '12':{title:'Class 12 · Biology', source:senior, note:'Resources are mapped to the five official units. A supporting concept is not proof that a chapter, practical or examination requirement is complete. Environmental Issues is formative-only; ecology, ecosystems and biodiversity remain separate core material.', units:[
        unit('reproduction','Reproduction',['plant-reproduction','pollination','reproductive-anatomy','gametogenesis','fertilization'],'Reproductive health and the complete plant/human reproductive sequence need further course-specific authoring.'),
        unit('genetics','Genetics and evolution',['mendelian-genetics','dna-replication','transcription','translation','natural-selection','hardy-weinberg'],'Every inheritance example, molecular evidence task and prescribed evolution outcome is not yet fully mapped.'),
        unit('welfare','Biology and human welfare',['innate-immunity','immunity','immune-memory','microbiome','antibiotic-resistance'],'Prescribed diseases, microbes in human welfare and public-health examples need full reviewed coverage.'),
        unit('biotechnology','Biotechnology and its applications',['recombinant-dna','pcr','gel-electrophoresis'],'Prescribed agricultural/medical applications, biosafety and all assessment tasks need dedicated course lessons.'),
        unit('ecology','Ecology and environment',['population-growth','ecology','food-webs','biodiversity','conservation'],'All prescribed organism interactions, ecosystem outcomes and practical investigations remain to be audited.')
      ]}
    }
  };
})(typeof window === 'undefined' ? globalThis : window);
