/* Small, inspectable biological models. SVG keeps labels crisp and accessible. */
(function () {
  'use strict';
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const colors = {a:'var(--cy)', b:'var(--indigo)', c:'var(--amber)', d:'var(--rose)', muted:'var(--dim)', ink:'var(--ink)'};
  const T = (x,y,text,size=13,fill='var(--ink)',anchor='middle') => `<text x="${x}" y="${y}" text-anchor="${anchor}" font-size="${size}" style="fill:${fill}">${esc(text)}</text>`;
  const circle = (x,y,r,color,opacity=1) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" opacity="${opacity}"/>`;
  const line = (x1,y1,x2,y2,color='var(--cy)',arrow=false,width=2) => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" ${arrow ? 'marker-end="url(#bl-arrow)"' : ''}/>`;
  const box = (x,y,w,h,color='var(--cy)',r=12) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${color}" fill-opacity=".09" stroke="${color}" stroke-opacity=".6"/>`;
  const wrapSVG = (title, body) => `<svg viewBox="0 0 600 330" role="img" aria-label="${esc(title)}"><defs><marker id="bl-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M1 1L9 5L1 9" fill="none" stroke="var(--cy)" stroke-width="1.5"/></marker></defs>${body}</svg>`;
  const pathway = (labels, active, y=255) => {
    const gap = 530 / Math.max(labels.length, 1);
    return labels.map((label,i) => { const x = 35 + gap * i + gap / 2; return (i < labels.length - 1 ? line(x + 13,y,x + gap - 13,y,'var(--line)',false) : '') + circle(x,y,active === i ? 8 : 4,active === i ? 'var(--cy)' : 'var(--dim)',active === i ? 1 : .4) + T(x,y + 25,label,10,active === i ? 'var(--cy)' : 'var(--dim)'); }).join('');
  };
  const chromosome = (x,y,color,scale=1,split=false) => `<g transform="translate(${x},${y}) scale(${scale})" stroke="${color}" stroke-width="7" stroke-linecap="round">${split ? '<path d="M-7 -17L2 0L-7 17" fill="none"/>' : '<path d="M-11 -20L11 20M11 -20L-11 20"/>'}</g>`;
  const organelles = [
    {id:'nucleus', name:'Nucleus', detail:'The nuclear envelope separates most DNA from the cytoplasm. Nuclear pores control traffic; gene transcription begins inside.'},
    {id:'mitochondria', name:'Mitochondria', detail:'The inner membrane folds into cristae. Electron transport builds a proton gradient; ATP synthase uses its energy to make ATP.'},
    {id:'ribosomes', name:'Ribosomes', detail:'These RNA–protein machines read mRNA codons and join amino acids. Free ribosomes and ER-bound ribosomes build different destinations of protein.'},
    {id:'rough-er', name:'Rough ER', detail:'Ribosomes on the rough endoplasmic reticulum feed new proteins into a membrane network, where folding and early processing occur.'},
    {id:'golgi-apparatus', name:'Golgi apparatus', detail:'Stacks of membrane modify and sort proteins and lipids. Vesicles carry selected cargo to its next destination.'},
    {id:'lysosomes', name:'Lysosomes', detail:'An acidic interior allows digestive enzymes to break down selected cellular material, supporting recycling and defence.'},
    {id:'cell-membrane', name:'Cell membrane', detail:'A dynamic phospholipid bilayer with proteins makes the cell selectively permeable and receives signals from its surroundings.'},
    {id:'cytoskeleton', name:'Cytoskeleton', detail:'Protein filaments organise the cell, provide tracks for transport, and generate movement. The architecture is constantly rebuilt.'},
    {id:'nucleolus', name:'Nucleolus', detail:'Within the nucleus, the nucleolus brings together the production of ribosomal RNA and early ribosome assembly. It has no surrounding lipid membrane.'},
    {id:'smooth-er', name:'Smooth ER', detail:'Regions of endoplasmic reticulum without bound ribosomes support lipid synthesis, selected detoxification reactions, and calcium storage, depending on the cell.'},
    {id:'peroxisomes', name:'Peroxisomes', detail:'Selected oxidation reactions occur here. Catalase helps handle hydrogen peroxide; peroxisomes differ from lysosomes and mitochondria.'},
    {id:'centrosomes', name:'Centrosome', detail:'A major microtubule-organising centre in many animal cells. It contains centrioles and pericentriolar material; most higher plants use other arrangements.'},
    {id:'chloroplasts', name:'Chloroplasts', detail:'In photosynthetic plant cells, thylakoid membranes capture light energy. The stroma contains enzymes that incorporate carbon dioxide into organic molecules.'},
    {id:'vacuoles', name:'Central vacuole', detail:'The central vacuole stores water and solutes. Its membrane, the tonoplast, regulates transport; turgor against the cell wall helps support the plant cell.'},
    {id:'cell-wall', name:'Cell wall', detail:'The plant cell wall lies outside the selectively permeable membrane. Cellulose-rich walls support shape and resist excessive expansion as water enters.'}
  ];
  const stageSets = {
    mitochondria:[{title:'Outer membrane',detail:'The outer membrane surrounds the organelle. Small-solute permeability through porins differs from the tightly regulated inner membrane.'},{title:'Inner membrane & cristae',detail:'The inner membrane folds into cristae, providing a surface for respiratory complexes and ATP synthase.'},{title:'Intermembrane space',detail:'Electron transport pumps protons from the matrix toward the intermembrane space. The resulting electrochemical gradient stores usable energy.'},{title:'Matrix',detail:'The matrix contains enzymes for pyruvate oxidation and the citric acid cycle, along with mitochondrial DNA and ribosomes. Protons return to this side through ATP synthase.'}],
    calvin:[{title:'Fix carbon',detail:'For three incoming carbon dioxide molecules, RuBisCO combines CO₂ with three five-carbon RuBP molecules. The unstable products yield six three-carbon 3-PGA molecules.'},{title:'Reduce 3-PGA',detail:'ATP and NADPH from the light reactions convert six 3-PGA molecules into six G3P molecules. NADPH provides reducing power; ATP supports energetic coupling.'},{title:'Export a net product',detail:'One of the six G3P molecules can leave as the net three-carbon product. It can contribute to sugars and other organic molecules; the cycle does not directly release a glucose on every turn.'},{title:'Regenerate RuBP',detail:'Five G3P molecules, containing fifteen carbons in total, regenerate three five-carbon RuBP molecules. The overall accounting per net G3P uses nine ATP and six NADPH.'}],
    photosynthesis:[{title:'Leaf',detail:'The leaf presents a large surface to sunlight. Stomata allow carbon dioxide to enter, while veins deliver water.'},{title:'Mesophyll',detail:'Between the leaf surfaces, mesophyll cells contain many chloroplasts. Air spaces connect the cells to stomata.'},{title:'Plant cell',detail:'A plant cell has a wall, a large vacuole, and chloroplasts. Photosynthesis happens within those chloroplasts.'},{title:'Chloroplast',detail:'Thylakoid stacks sit in the stroma. Light reactions occur in thylakoid membranes; the Calvin cycle incorporates carbon in the stroma.'},{title:'Thylakoid',detail:'Light-driven electron transfer helps build a proton gradient across the thylakoid membrane. ATP and NADPH provide energy and reducing power.'},{title:'Photosystems',detail:'Photosystem II replaces lost electrons by oxidising water, releasing oxygen. Electrons travel toward photosystem I and ultimately reduce NADP⁺.'}],
    mitosis:[{title:'Prophase',detail:'After DNA replication in S phase, each chromosome contains two sister chromatids. Chromosomes condense as the spindle forms.'},{title:'Metaphase',detail:'Duplicated chromosomes align individually at the metaphase plate. Sister kinetochores attach to opposite spindle poles.'},{title:'Anaphase',detail:'Sister chromatids separate and become daughter chromosomes. The spindle moves them toward opposite poles.'},{title:'Telophase & cytokinesis',detail:'Nuclei reform and the cytoplasm divides. Two daughter cells normally retain the parental chromosome set.'}],
    meiosis:[{title:'Pair & exchange',detail:'Homologous chromosomes pair in prophase I. Crossing over occurs between non-sister chromatids and exchanges corresponding DNA segments.'},{title:'Separate homologues',detail:'Meiosis I separates homologous chromosomes. Each resulting cell has one chromosome of each homologous pair; sisters remain together.'},{title:'Separate sisters',detail:'Without another round of DNA replication, meiosis II separates sister chromatids.'},{title:'Four haploid products',detail:'Four haploid products arise, usually genetically different. Their developmental fates depend on the organism and type of gametogenesis.'}],
    protein:[{title:'Transcribe DNA',detail:'RNA polymerase copies the information in one DNA template strand into an RNA transcript. DNA stays in the nucleus in this eukaryotic model.'},{title:'Process & export RNA',detail:'A eukaryotic pre-mRNA receives a cap and poly(A) tail, and introns are removed. Mature mRNA exits through a nuclear pore.'},{title:'Read codons',detail:'The ribosome reads the mRNA 5′ → 3′. Each tRNA links a matching codon to its amino acid; AUG establishes the reading frame.'},{title:'Build a protein',detail:'The ribosome catalyses peptide-bond formation. A stop codon recruits release factors, releasing a chain that can fold and be modified.'}],
    heart:[{title:'Body → right heart',detail:'Oxygen-poor blood returns through the venae cavae to the right atrium, then crosses the tricuspid valve into the right ventricle.'},{title:'Right heart → lungs',detail:'The right ventricle sends blood through the pulmonary valve and pulmonary arteries to the lungs. Arteries carry blood away from the heart.'},{title:'Lungs → left heart',detail:'Blood takes up oxygen and releases carbon dioxide in lung capillaries. Pulmonary veins return it to the left atrium, then it enters the left ventricle.'},{title:'Left heart → body',detail:'The left ventricle pumps through the aortic valve into the systemic circulation. Valves prevent backflow; pressure drives flow.'}],
    neuron:[{title:'Resting membrane',detail:'Ion gradients and selective membrane permeability establish a negative resting potential. The sodium–potassium pump maintains gradients over time.'},{title:'Depolarisation',detail:'Above threshold, voltage-gated sodium channels open and sodium enters. Positive feedback creates the rapid rising phase.'},{title:'Repolarisation',detail:'Sodium channels inactivate while potassium conductance rises. Potassium leaves, bringing the membrane potential downward.'},{title:'Recovery',detail:'Potassium channels close more slowly, allowing an after-hyperpolarisation. Sodium channels recover; refractoriness limits repeat firing.'}],
    ecology:[{title:'Producers',detail:'Plants capture light energy and fix carbon. They provide organic material for the rest of this simplified food web.'},{title:'Primary consumers',detail:'Herbivores gain matter and chemical energy by eating plants. Arrows point from the food source toward the consumer.'},{title:'Predators',detail:'Predators obtain chemical energy from prey. They also respire, so less energy remains available for higher trophic levels.'},{title:'Decomposers',detail:'Decomposers process dead material from every trophic level. Nutrients cycle back; energy ultimately leaves the system as heat.'}],
    transport:[{title:'Simple diffusion',detail:'Small non-polar molecules can move through the bilayer. Net movement follows the concentration gradient and requires no direct ATP input.'},{title:'Facilitated diffusion',detail:'A channel or carrier provides a route for selected solutes down their electrochemical gradient.'},{title:'Active transport',detail:'A transport protein uses energy, directly or through a coupled gradient, to move solute against its electrochemical gradient.'},{title:'Osmosis',detail:'Water crosses a selectively permeable membrane toward lower water potential. This model assumes equal pressure on both sides.'}],
    respiration:[{title:'Glycolysis',detail:'In the cytosol, glucose becomes two pyruvate molecules, with a net gain of two ATP and two NADH per glucose.'},{title:'Matrix reactions',detail:'Pyruvate oxidation and the citric acid cycle release carbon dioxide and supply NADH and FADH₂. In eukaryotes, these reactions occur mainly in the mitochondrial matrix.'},{title:'Electron transport',detail:'Electrons move through respiratory complexes to oxygen, the terminal acceptor. Released energy drives proton pumping across the inner membrane.'},{title:'ATP synthase',detail:'Protons flow back down their electrochemical gradient through ATP synthase. This couples the gradient to ATP production.'}],
    dna:[{title:'Complementary strands',detail:'A pairs with T and G with C. The two sugar–phosphate backbones run in opposite directions.'},{title:'Separate templates',detail:'During replication, helicase separates the strands. Each parental strand can act as a template for a new complementary strand.'},{title:'Build 5′ → 3′',detail:'DNA polymerases extend from an existing primer by adding nucleotides to the 3′ end. The lagging strand is made in fragments.'},{title:'Semiconservative copies',detail:'Each completed DNA molecule contains one parental strand and one newly synthesised strand.'}],
    enzyme:[{title:'Find the substrate',detail:'A suitable substrate encounters the active site. Chemistry, charge, and molecular shape contribute to recognition.'},{title:'Induced fit',detail:'Binding changes the shapes of enzyme and substrate, helping position reacting groups and stabilise a transition state.'},{title:'Lower the barrier',detail:'Catalysis lowers activation energy. It does not change the reaction’s overall free-energy change or equilibrium position.'},{title:'Release & repeat',detail:'Products leave the active site. The enzyme can catalyse another reaction; it is not consumed overall.'}]
  };
  const kindMap = {'cell-structure':'cell','membrane-transport':'transport',biomolecules:'biomolecules',enzymes:'enzyme',photosynthesis:'photosynthesis','cellular-respiration':'respiration',mitosis:'mitosis',meiosis:'meiosis',dna:'dna','protein-synthesis':'protein','mendelian-genetics':'genetics','heart-circulation':'heart','gas-exchange':'gas-exchange','nervous-system':'neuron',immunity:'immunity','plant-transport':'plant-transport','natural-selection':'selection',ecology:'ecology',mitochondria:'mitochondria','calvin-cycle':'calvin'};
  const knownKinds = new Set([...Object.values(kindMap),'process']);
  function kindFor(topic, topics) {
    if (kindMap[topic.id]) return kindMap[topic.id];
    const aliases = {cellStructure:'cell',cellDivision:'mitosis',punnett:'genetics',circulation:'heart',photosystem:'photosynthesis','protein-synthesis':'protein','nervous-system':'neuron','cellular-respiration':'respiration',enzymes:'enzyme','natural-selection':'selection'};
    if (topic.visual?.kind && topic.visual.kind !== 'process' && knownKinds.has(topic.visual.kind)) return topic.visual.kind;
    if (topic.parentId) { const parent = topics.find(t => t.id === topic.parentId); if (parent) return kindFor(parent, topics); }
    return aliases[topic.visual?.kind] || (knownKinds.has(topic.visual?.kind) ? topic.visual.kind : 'process');
  }
  function cellDiagram(selected) {
    const group = (id,label,body) => `<g data-organelle="${id}" role="button" tabindex="0" aria-label="Inspect ${label}" opacity="${selected === id ? 1 : .65}" style="outline:none">${body}</g>`;
    if (['chloroplasts','vacuoles','cell-wall'].includes(selected)) {
      return group('cell-wall','cell wall',box(78,37,444,258,'var(--cy)',24)) + group('cell-membrane','cell membrane',box(90,48,420,234,'var(--cy)',20)) + group('vacuoles','central vacuole',box(179,90,247,145,'var(--sky)',25)+T(302,170,'Central vacuole',15)) + group('chloroplasts','chloroplasts',[0,1,2,3,4].map(i=>`<ellipse cx="${i<3?130:466}" cy="${95+(i%3)*65}" rx="17" ry="23" fill="var(--cy)" fill-opacity=".3" stroke="var(--cy)"/>`+line(i<3?119:455,95+(i%3)*65,i<3?141:477,95+(i%3)*65,'var(--cy)')).join('')) + group('nucleus','nucleus',circle(254,65,17,'var(--indigo)',.5)) + T(300,319,'Photosynthetic plant cell · simplified, not to scale',11,'var(--dim)');
    }
    let b = `<path d="M80 88C120 23 382 15 477 78C572 143 541 263 432 282C293 312 130 292 76 221C42 177 44 131 80 88Z" fill="var(--cy)" fill-opacity=".035" stroke="var(--cy)" stroke-opacity=".6" stroke-width="2"/>`;
    b += group('cell-membrane','cell membrane',`<path d="M84 91C127 29 379 20 474 83C561 145 533 258 430 277" fill="none" stroke="var(--cy)" stroke-width="${selected === 'cell-membrane' ? 6 : 3}"/>`);
    b += group('cytoskeleton','cytoskeleton',`<path d="M100 160Q210 70 421 263M102 230Q278 172 468 120M174 65Q199 241 455 215" fill="none" stroke="var(--cy)" stroke-opacity=".45" stroke-width="2" stroke-dasharray="5 6"/>`);
    b += group('nucleus','nucleus',`<ellipse cx="261" cy="144" rx="70" ry="58" fill="var(--indigo)" fill-opacity=".2" stroke="var(--indigo)" stroke-width="2"/><path d="M224 123Q250 104 252 154T293 166" fill="none" stroke="var(--indigo)" stroke-width="3"/>${T(258,210,'Nucleus',12)}`);
    b += group('nucleolus','nucleolus',circle(274,139,20,'var(--indigo)',selected==='nucleolus'?.9:.35));
    b += group('rough-er','rough endoplasmic reticulum',`<path d="M173 116Q152 173 201 205M164 100Q128 183 196 221M156 91Q111 189 191 233" fill="none" stroke="var(--sky)" stroke-width="5" stroke-linecap="round"/>${[0,1,2,3,4].map(i => circle(149 + i * 9,178 + i * 11,3,'var(--sky)')).join('')}`);
    b += group('mitochondria','mitochondria',`<g transform="translate(405 98) rotate(20)"><ellipse rx="53" ry="25" fill="var(--amber)" fill-opacity=".15" stroke="var(--amber)" stroke-width="2"/><path d="M-34 0L-23 -12L-12 11L0 -12L12 11L24 -10L33 2" fill="none" stroke="var(--amber)" stroke-width="2"/></g>${T(425,147,'Mitochondrion',11)}`);
    b += group('golgi-apparatus','Golgi apparatus',`<path d="M359 183Q397 202 427 176M355 194Q397 215 432 188M356 205Q397 230 430 200M361 218Q395 239 422 214" stroke="var(--rose)" stroke-width="5" fill="none" stroke-linecap="round"/>${circle(444,195,6,'var(--rose)',.5)}${T(399,253,'Golgi',11)}`);
    b += group('lysosomes','lysosome',`${circle(303,251,16,'var(--rose)',.3)}${circle(301,247,3,'var(--rose)')}${circle(307,255,3,'var(--rose)')}`);
    b += group('ribosomes','ribosomes',[0,1,2,3,4,5].map(i => circle(98 + (i % 3) * 15,129 + Math.floor(i / 3) * 18,4,'var(--sky)')).join(''));
    b += group('smooth-er','smooth ER',`<path d="M207 56Q230 73 245 59T277 63M213 47Q238 58 250 46T285 47" fill="none" stroke="var(--sky)" stroke-width="4"/>`);
    b += group('peroxisomes','peroxisomes',circle(349,249,12,'var(--amber)',.5));
    b += group('centrosomes','centrosome',`<path d="M341 158l21 16M345 152l21 16M345 167l18-21M351 171l18-21" fill="none" stroke="var(--amber)" stroke-width="3"/>`);
    return b + T(300,320,'Animal cell · structures simplified, not to scale',10,'var(--dim)');
  }
  function photosynthesis(step) {
    let body = '';
    if (step === 0) body = `<path d="M145 241C75 65 278 42 439 69C441 219 290 295 145 241Z" fill="var(--cy)" fill-opacity=".14" stroke="var(--cy)" stroke-width="2"/><path d="M99 278L410 85M163 230L149 131M221 192L246 87M285 156L341 92M189 212L290 246M250 179L353 210" fill="none" stroke="var(--cy)" stroke-width="2"/>${T(473,71,'LIGHT',11,'var(--amber)')}${line(475,84,429,124,'var(--amber)',true)}${T(464,234,'CO₂ + H₂O',13)}${T(295,295,'Leaf surface captures light',12,'var(--dim)')}`;
    else if (step === 1) body = [0,1,2,3,4,5].map(i => box(75 + i * 73,70,63,145,'var(--cy)',15) + [0,1,2].map(j => `<ellipse cx="${94 + i * 73}" cy="${97 + j * 43}" rx="9" ry="14" fill="var(--cy)" opacity=".5"/>`).join('')).join('') + `<path d="M62 55H533M62 230H533" stroke="var(--cy)" stroke-width="3"/>${T(300,272,'Chloroplast-rich mesophyll cells',15)}${T(300,297,'Air spaces let gases reach photosynthetic cells',11,'var(--dim)')}`;
    else if (step === 2) body = box(97,49,405,232,'var(--cy)',26) + box(112,62,375,205,'var(--cy)',22) + box(183,98,220,132,'var(--sky)',30) + T(293,168,'Vacuole',15,'var(--dim)') + [0,1,2,3,4,5].map(i => `<ellipse cx="${i < 3 ? 139 : 454}" cy="${100 + (i % 3) * 65}" rx="13" ry="22" fill="var(--cy)" fill-opacity=".3" stroke="var(--cy)"/>`).join('') + circle(240,80,16,'var(--indigo)',.4) + T(300,311,'A plant cell contains many chloroplasts',12,'var(--dim)');
    else if (step === 3) body = `<ellipse cx="300" cy="153" rx="230" ry="115" fill="var(--cy)" fill-opacity=".08" stroke="var(--cy)" stroke-width="2"/><ellipse cx="300" cy="153" rx="218" ry="103" fill="none" stroke="var(--cy)" stroke-opacity=".4"/>` + [0,1,2].map(i => [0,1,2,3].map(j => `<rect x="${136 + i * 117}" y="${96 + j * 18}" width="80" height="12" rx="7" fill="var(--cy)" fill-opacity=".22" stroke="var(--cy)"/>`).join('')).join('') + line(218,149,253,149,'var(--cy)') + line(335,149,370,149,'var(--cy)') + T(187,214,'Thylakoids',13) + T(370,215,'Stroma',13) + T(300,305,'Light reactions → ATP + NADPH → Calvin cycle',13,'var(--cy)');
    else if (step === 4) body = `<path d="M95 91H505M95 213H505" stroke="var(--cy)" stroke-width="9" stroke-opacity=".45"/>${T(300,70,'Stroma',13,'var(--dim)')}${T(300,165,'Thylakoid lumen',15)}` + [0,1,2,3,4,5,6,7].map(i => T(125 + i * 45,126,'H⁺',14,'var(--amber)')).join('') + box(399,192,48,42,'var(--amber)') + line(423,174,423,256,'var(--amber)',true) + T(423,283,'ATP synthase',12) + T(170,277,'Proton gradient stores energy',12,'var(--dim)');
    else body = line(72,179,531,179,'var(--line)',false,8) + [0,1,2].map((i) => box(101 + i * 163,122,92,114,i === 1 ? 'var(--amber)' : 'var(--cy)') + T(147 + i * 163,184,['PS II','Carriers','PS I'][i],16) + (i < 2 ? line(199 + i * 163,165,254 + i * 163,165,'var(--cy)',true) : '')).join('') + T(147,85,'Light ↓',14,'var(--amber)') + T(473,85,'Light ↓',14,'var(--amber)') + T(147,263,'H₂O → O₂',12) + T(474,263,'NADP⁺ → NADPH',12) + T(300,311,'Electron transfer powers proton-gradient formation',11,'var(--dim)');
    return body;
  }
  function division(step, meiosis) {
    const red = 'var(--rose)', blue = 'var(--sky)';
    let b = '';
    const cell = (x,y,r=98) => `<circle cx="${x}" cy="${y}" r="${r}" fill="var(--cy)" fill-opacity=".035" stroke="var(--cy)" stroke-opacity=".6" stroke-width="2"/>`;
    if (!meiosis) {
      if (step < 3) {
        b = `<ellipse cx="300" cy="148" rx="205" ry="103" fill="var(--cy)" fill-opacity=".035" stroke="var(--cy)" stroke-opacity=".6"/>`;
        if (step === 0) b += `<ellipse cx="300" cy="147" rx="98" ry="74" fill="none" stroke="var(--indigo)" stroke-dasharray="4 5"/>` + chromosome(264,118,red,.8) + chromosome(330,118,blue,.8) + chromosome(264,179,red,.6) + chromosome(330,179,blue,.6);
        else {
          for (let i=0;i<4;i++) { const y=88+i*39; b += line(119,148,step===1 ? 291 : 206,y,'var(--cy)',false,1) + line(481,148,step===1 ? 309 : 394,y,'var(--cy)',false,1); if (step===1) b += chromosome(300,y,i%2?blue:red,.65); else b += chromosome(218,y,i%2?blue:red,.65,true)+`<g transform="translate(600,0) scale(-1,1)">${chromosome(218,y,i%2?blue:red,.65,true)}</g>`; }
          b += circle(119,148,5,'var(--cy)')+circle(481,148,5,'var(--cy)');
        }
      } else b = [185,415].map(x => cell(x,145) + `<ellipse cx="${x}" cy="145" rx="50" ry="55" fill="none" stroke="var(--indigo)"/>` + [0,1,2,3].map(i => `<path d="M${x-28+i*18} 123v43" stroke="${i%2?blue:red}" stroke-width="5" stroke-linecap="round"/>`).join('')).join('');
      return b + pathway(['Condense','Align','Separate','Divide'],step,283);
    }
    if (step === 0) b = cell(300,150,112)+chromosome(267,147,red,1.4)+chromosome(333,147,blue,1.4)+`<path d="M261 143Q294 111 337 150" fill="none" stroke="var(--amber)" stroke-width="3" stroke-dasharray="5 4"/>`+T(300,289,'Non-sister chromatids exchange DNA',13,'var(--dim)');
    else if (step === 1) b = [185,415].map((x,i) => cell(x,147,99)+chromosome(x,147,i?blue:red,1.4)+`<path d="M${x+7} 160l9 17" stroke="${i?red:blue}" stroke-width="9" stroke-linecap="round"/>`).join('')+T(300,283,'Chromosome number is halved',13,'var(--dim)');
    else b = [126,243,360,477].map((x,i) => cell(x,147,52)+`<path d="M${x-9} 120l16 48" stroke="${i<2?red:blue}" stroke-width="8" stroke-linecap="round"/>`+(i===1||i===2?`<path d="M${x+2} 153l5 15" stroke="${i<2?blue:red}" stroke-width="8" stroke-linecap="round"/>`:'')).join('')+T(300,258,step===2?'Sister chromatids separate in meiosis II':'Four haploid products; variation remains',14,'var(--dim)');
    return b + T(300,317,'One homologous pair shown · DNA replicated once, cell divides twice',10,'var(--dim)');
  }
  function protein(step) {
    return `<path d="M32 40H251V273H32" fill="var(--indigo)" fill-opacity=".035" stroke="var(--indigo)" stroke-opacity=".5"/>${T(133,69,'Nucleus',12,'var(--dim)')}${T(424,69,'Cytoplasm',12,'var(--dim)')}` + [0,1,2,3,4,5,6].map(i => line(73,99+i*18,152,99+i*18,i%2?'var(--indigo)':'var(--sky)',false,3)+circle(73,99+i*18,4,'var(--indigo)')+circle(152,99+i*18,4,'var(--sky)')).join('') + T(111,252,'DNA',13) + `<path d="M174 130Q197 111 217 130T261 130T307 130T353 130T399 130T445 130T491 130" fill="none" stroke="var(--cy)" stroke-width="${step>0?4:2}" opacity="${step>0?1:.4}"/>` + T(339,105,'mRNA  5′ → 3′',12,'var(--cy)') + (step>=2 ? `<ellipse cx="394" cy="142" rx="55" ry="34" fill="var(--amber)" fill-opacity=".18" stroke="var(--amber)"/>${T(394,148,'AUG',15)}${T(394,200,'Ribosome',13)}` : '') + (step===3 ? [0,1,2,3,4,5].map(i=>line(394+i*15,226+i*5,409+i*15,231+i*5,'var(--rose)',false,2)+circle(394+i*15,226+i*5,6,'var(--rose)')).join('')+T(446,292,'Polypeptide',12,'var(--rose)') : '') + pathway(['Transcribe','Process','Translate','Fold'],step,304);
  }
  function heart(step) {
    const nodes = [[300,276],[177,176],[300,50],[423,176]];
    const labels = ['Body tissues','Right heart','Lungs','Left heart'];
    let b = `<path d="M278 266C85 266 85 53 278 53" fill="none" stroke="var(--sky)" stroke-width="5" stroke-opacity=".65"/><path d="M322 53C515 53 515 266 322 266" fill="none" stroke="var(--rose)" stroke-width="5" stroke-opacity=".65"/>`;
    nodes.forEach(([x,y],i) => { b += box(x-61,y-25,122,50,i===1?'var(--sky)':i===3?'var(--rose)':'var(--cy)',12)+T(x,y+5,labels[i],13); });
    const pos = [[194,248],[178,75],[412,78],[420,244]][step];
    b += `<g class="bl-bead">${circle(pos[0],pos[1],9,step<2?'var(--sky)':'var(--rose)')}</g>`;
    b += T(76,162,'O₂-poor',10,'var(--sky)')+T(525,162,'O₂-rich',10,'var(--rose)')+T(300,145,'Two circuits.',18)+T(300,171,'One continuous flow.',14,'var(--dim)')+T(300,318,'Blue and red indicate oxygenation, not the actual colour of blood',10,'var(--dim)');
    return b;
  }
  function neuron(step) {
    const heights = [233,170,230,248], x = [250,353,392,434][step];
    return `<path d="M98 42L119 82L79 107M126 38L119 82L166 56M119 82L167 117M119 82L199 82H501" fill="none" stroke="var(--cy)" stroke-width="3"/>${circle(120,82,19,'var(--cy)',.2)}` + [0,1,2,3].map(i=>box(209+i*70,66,52,32,'var(--amber)',12)).join('') + circle(205+step*91,82,7,'var(--cy)') + T(315,133,'An impulse propagates along the axon →',11,'var(--dim)') + line(98,267,511,267,'var(--dim)')+line(98,267,98,159,'var(--dim)')+T(72,173,'mV',10,'var(--dim)')+T(73,231,'−70',10,'var(--dim)')+T(301,306,'Time →',11,'var(--dim)')+`<path d="M100 233H276L316 214L351 169L359 170L387 222L432 250L458 234H510" fill="none" stroke="var(--cy)" stroke-width="3"/>`+line(101,214,501,214,'var(--dim)',false,1)+T(201,206,'Threshold',10,'var(--dim)')+circle(x,step===1?172:heights[step],7,'var(--amber)');
  }
  function genetics(a,b) {
    const gametesA = a.split(''), gametesB = b.split('');
    let body = T(300,34,'One gene · complete dominance model',13,'var(--dim)');
    for(let i=0;i<2;i++) { body += T(285+i*105,86,gametesA[i],24,'var(--cy)')+T(190,147+i*89,gametesB[i],24,'var(--indigo)'); for(let j=0;j<2;j++) { const gene = [gametesA[j],gametesB[i]].sort().join(''); body += box(235+j*105,105+i*89,94,78,gene.includes('A')?'var(--cy)':'var(--indigo)',8)+T(282+j*105,150+i*89,gene,25)+T(282+j*105,172+i*89,'25%',10,'var(--dim)'); } }
    return body+T(300,307,'Each box is an equally likely combination, not a birth order',11,'var(--dim)');
  }
  function ecology(step) {
    const pts = [[102,212],[258,100],[448,83],[462,227],[267,255]];
    const names = ['Plants','Rabbit','Fox','Hawk','Decomposers'];
    const edges = [[0,1],[1,2],[1,3],[0,4],[1,4],[2,4],[3,4]];
    return edges.map(([a,b]) => {const p=pts[a],q=pts[b];return line(p[0],p[1],q[0],q[1],'var(--cy)',true,step===3&&b===4?3:1.5);}).join('') + pts.map(([x,y],i)=> box(x-53,y-25,106,50,(step===0&&i===0)||(step===1&&i===1)||(step===2&&(i===2||i===3))||(step===3&&i===4)?'var(--cy)':'var(--dim)',10)+T(x,y+5,names[i],13)).join('')+T(101,55,'SUNLIGHT',11,'var(--amber)')+line(101,69,101,178,'var(--amber)',true)+T(300,317,'Arrows show the direction of matter and energy transfer',11,'var(--dim)');
  }
  function transport(step) {
    let body = T(156,43,step===3?'Higher water potential':'Higher solute concentration',13)+T(442,43,step===3?'Lower water potential':'Lower solute concentration',13);
    for(let i=0;i<11;i++) { const y=71+i*20; body+=circle(278,y,6,'var(--cy)',.7)+line(282,y,299,y,'var(--cy)')+circle(321,y,6,'var(--cy)',.7)+line(300,y,316,y,'var(--cy)'); }
    for(let i=0;i<17;i++) body+=circle(66+(i%5)*38,88+Math.floor(i/5)*44,step===3?4:7,'var(--indigo)',.75);
    for(let i=0;i<6;i++) body+=circle(399+(i%3)*45,106+Math.floor(i/3)*84,step===3?4:7,'var(--indigo)',.75);
    if(step>0) body+=box(266,141,66,62,step===2?'var(--amber)':'var(--sky)',11);
    body+=step===2?line(415,171,184,171,'var(--cy)',true,3):line(182,171,415,171,'var(--cy)',true,3);
    if(step===2) body+=T(301,235,'ATP → ADP + Pi',12,'var(--amber)');
    return body+T(300,314,['Net movement down gradient','A protein offers a selective path','Energy moves solute against gradient','Net water movement shown at equal pressure'][step],12,'var(--dim)');
  }
  function respiration(step) {
    return `<path d="M202 86C315 9 535 70 527 190C521 296 304 304 211 240C141 191 135 132 202 86Z" fill="var(--amber)" fill-opacity=".06" stroke="var(--amber)" stroke-width="2"/><path d="M220 100C263 76 286 80 291 95L279 169Q298 187 310 159L322 94Q344 78 354 99L349 182Q368 213 380 184L393 105Q417 85 428 112L420 194Q445 224 458 189L470 130" fill="none" stroke="var(--amber)" stroke-width="3"/>${T(98,140,'Cytosol',13,'var(--dim)')}${T(339,236,'Matrix',13,'var(--dim)')}${T(371,47,'Inner membrane',12,'var(--amber)')}` + [circle(100,180,13,'var(--cy)'),circle(257,216,13,'var(--cy)'),circle(360,108,13,'var(--cy)'),circle(450,217,13,'var(--cy)')][step] + pathway(['Glycolysis','Matrix','ETC','ATP synthase'],step,290);
  }
  function mitochondria(step) {
    let body=`<path d="M125 112C161 20 426 21 487 103C571 216 432 286 263 269C149 258 76 208 125 112Z" fill="var(--amber)" fill-opacity=".055" stroke="var(--amber)" stroke-width="${step===0?5:2}"/><path d="M152 118C186 68 219 59 248 77L226 166Q239 193 257 162L282 74Q301 62 319 78L305 177Q321 203 340 174L359 87Q386 76 398 97L390 183Q408 214 422 183L439 119Q478 151 452 207C397 264 194 245 157 204Q122 169 152 118Z" fill="none" stroke="var(--cy)" stroke-width="${step===1?5:2}"/>`;
    if(step===2)body += [0,1,2,3,4,5].map(i=>T(174+i*45,56+(i%2)*7,'H⁺',14,'var(--amber)')).join('');
    body+=T(298,222,'Matrix',15,step===3?'var(--cy)':'var(--dim)')+T(300,299,['Outer membrane','Inner membrane folds → cristae','A proton gradient across the inner membrane','Matrix reactions supply reduced electron carriers'][step],12,'var(--dim)');
    return body;
  }
  function calvin(step) {
    const nodes=[[180,117],[420,117],[420,242],[180,242]];
    let body=T(300,35,'Carbon accounting per net G3P',15)+`<path d="M225 117H366M420 153V209M365 242H234M180 206V155" fill="none" stroke="var(--cy)" stroke-width="2" marker-end="url(#bl-arrow)"/>`;
    const labels=[['3 RuBP','15 carbons'],['6 3-PGA','18 carbons'],['6 G3P','18 carbons'],['5 G3P','15 carbons']];
    nodes.forEach(([x,y],i)=>{body+=box(x-57,y-29,114,58,i===step?'var(--cy)':'var(--dim)',10)+T(x,y,labels[i][0],15)+T(x,y+19,labels[i][1],10,'var(--dim)');});
    return body+T(300,94,'+ 3 CO₂',13,'var(--amber)')+T(517,174,'ATP',11,'var(--amber)')+T(517,192,'NADPH',11,'var(--amber)')+line(421,274,421,306,'var(--cy)',true)+T(510,306,'1 net G3P',12,'var(--cy)')+T(298,314,'5 × 3C = 3 × 5C',12,'var(--dim)');
  }
  function dna(step) {
    const bases=['A—T','G—C','T—A','C—G','A—T','G—C','C—G'];
    const ladder=(x,faded=false)=>[0,1,2,3,4,5,6].map(i=>line(x,60+i*31,x+100,60+i*31,i%2?'var(--cy)':'var(--indigo)',false,2)+circle(x,60+i*31,5,'var(--cy)',faded?.4:1)+circle(x+100,60+i*31,5,'var(--indigo)')+T(x+50,65+i*31,bases[i],11)).join('');
    let b=step===3?ladder(128)+ladder(363,true):ladder(248);
    if(step===1||step===2) b+=`<path d="M248 60L190 24M348 60L406 24" stroke="var(--cy)" stroke-width="3" fill="none"/>`+T(184,22,'5′',12)+T(418,22,'3′',12);
    return b+T(300,298,step===0?'Antiparallel backbones · complementary bases':step===1?'Both strands can serve as templates':step===2?'Polymerases add nucleotides to a 3′ end':'Each molecule retains one parental strand',12,'var(--dim)');
  }
  function enzyme(step) {
    return `<path d="M80 151C76 77 178 61 222 117L191 147L224 179C178 232 83 221 80 151Z" fill="var(--indigo)" fill-opacity=".18" stroke="var(--indigo)" stroke-width="2"/>` + (step===0?`<path d="M277 119L306 148L277 176L251 148Z" fill="var(--cy)" fill-opacity=".3" stroke="var(--cy)"/>`:step<3?`<path d="M222 119L248 148L222 176L196 148Z" fill="var(--cy)" fill-opacity=".3" stroke="var(--cy)"/>`:`<path d="M287 119L313 148H260Z" fill="var(--cy)"/><path d="M277 181L303 157H250Z" fill="var(--amber)"/>`) + T(151,250,'Enzyme',13)+T(281,249,step===3?'Products':'Substrate',13)+line(352,247,545,247,'var(--dim)')+line(352,247,352,74,'var(--dim)')+`<path d="M365 213Q420 11 481 230H535" fill="none" stroke="var(--dim)" stroke-width="2" stroke-dasharray="5 5"/><path d="M365 213Q420 124 481 230H535" fill="none" stroke="var(--cy)" stroke-width="3"/>`+T(449,275,'Reaction progress →',11,'var(--dim)')+T(451,58,'Lower activation energy',12,'var(--cy)')+T(300,317,'Same overall energy difference · a different reaction pathway',11,'var(--dim)');
  }
  function gasExchange(step) {
    return `<path d="M213 29V88C104 87 72 184 144 235C242 305 358 239 349 162C346 107 312 91 267 88V29" fill="var(--cy)" fill-opacity=".08" stroke="var(--cy)" stroke-width="2"/><path d="M93 117C9 254 208 323 344 244C391 217 397 162 369 125" fill="none" stroke="var(--rose)" stroke-opacity=".5" stroke-width="26"/>${T(228,156,'Alveolus',19)}${T(227,181,'Air space',12,'var(--dim)')}${T(451,225,'Capillary',13,'var(--rose)')}${line(306,190,377,224,'var(--cy)',true,step%2===0?4:2)}${T(365,185,'O₂',17,'var(--cy)')}${line(368,253,285,218,'var(--cy)',true,step%2===1?4:2)}${T(297,270,'CO₂',17,'var(--rose)')}${T(300,314,'Gases diffuse down their own partial-pressure gradients',11,'var(--dim)')}`;
  }
  function plantTransport(step) {
    return `<path d="M298 265V71M298 108Q214 27 137 93Q203 157 297 115M300 154Q372 74 463 130Q397 192 301 164" fill="var(--cy)" fill-opacity=".09" stroke="var(--cy)" stroke-width="3"/><path d="M298 264L243 295M298 264L352 302M298 264L300 309M243 295L212 293M352 302L381 289" fill="none" stroke="var(--cy)" stroke-width="3"/>${line(280,246,280,118,'var(--sky)',true,step%2===0?4:2)}${line(318,128,318,250,'var(--rose)',true,step%2===1?4:2)}${T(175,204,'Xylem',16,'var(--sky)')}${T(175,225,'Water + minerals ↑',11,'var(--dim)')}${T(430,214,'Phloem',16,'var(--rose)')}${T(430,236,'Source → sink',11,'var(--dim)')}${T(300,32,'Water loss from leaves helps pull xylem sap upward',12,'var(--dim)')}`;
  }
  function selection(step) {
    const darkCounts=[4,4,7,10], count=darkCounts[step%4];
    return T(300,45,'Heritable variation + differential reproduction',14) + [0,1,2,3,4,5,6,7,8,9,10,11].map(i=>{const x=123+(i%6)*70,y=104+Math.floor(i/6)*73;return `<g opacity="${step===1&&i>=count?.22:1}"><ellipse cx="${x}" cy="${y}" rx="20" ry="13" fill="${i<count?'var(--indigo)':'var(--amber)'}" opacity=".8"/>`+line(x-13,y-11,x-18,y-18,'var(--dim)')+line(x+13,y-11,x+18,y-18,'var(--dim)')+'</g>';}).join('')+T(300,237,step===1?'Differential survival changes who can reproduce':'Environment favours the violet inherited variant',12,'var(--dim)')+box(116,258,368,20,'var(--dim)',4)+`<rect x="116" y="258" width="${368*count/12}" height="20" rx="4" fill="var(--indigo)"/>`+T(300,310,`Illustrative frequency: ${count} of 12 · populations evolve across generations`,11,'var(--dim)');
  }
  function immunity(step) {
    return `<circle cx="${[124,302,302,468][step%4]}" cy="155" r="69" fill="var(--cy)" fill-opacity=".035" stroke="var(--cy)" stroke-dasharray="4 5"/>`+circle(124,155,42,'var(--rose)',.12)+[0,1,2,3,4,5,6,7].map(i=>{const a=i*Math.PI/4;return line(124+43*Math.cos(a),155+43*Math.sin(a),124+57*Math.cos(a),155+57*Math.sin(a),'var(--rose)',false,3);}).join('')+T(124,243,'Antigen',13)+circle(302,155,48,'var(--indigo)',.15)+circle(302,155,18,'var(--indigo)',.3)+T(302,243,step<2?'Recognition':'Clonal expansion',13)+line(190,154,234,154,'var(--cy)',true)+line(363,154,406,154,'var(--cy)',true)+[0,1,2].map(i=>{const x=442+(i%2)*52,y=116+Math.floor(i/2)*75;return `<path d="M${x} ${y+24}V${y+7}L${x-12} ${y-8}M${x} ${y+7}L${x+12} ${y-8}" fill="none" stroke="var(--cy)" stroke-width="4"/>`;}).join('')+T(468,243,step===3?'Memory response':'Antibodies',13)+T(300,309,'A simplified view of the adaptive B-cell response',11,'var(--dim)');
  }
  function biomolecules(step) {
    const names=['Carbohydrates','Lipids','Proteins','Nucleic acids'];
    let b=T(300,43,names[step%4],19,'var(--cy)');
    if(step%4===0) b+=[0,1,2,3].map(i=>`<path d="M${120+i*107} 112l35 20v40l-35 20l-35-20v-40Z" fill="var(--cy)" fill-opacity=".1" stroke="var(--cy)" stroke-width="2"/>`+(i<3?line(156+i*107,154,190+i*107,154,'var(--cy)'): '')).join('')+T(300,263,'Sugar units can join into larger carbohydrates',13,'var(--dim)');
    else if(step%4===1) b+=box(124,87,40,147,'var(--amber)',5)+[0,1,2].map(i=>`<path d="M165 ${108+i*54}h40l23-13l24 13l24-13l24 13l24-13l24 13l24-13l24 13" fill="none" stroke="var(--amber)" stroke-width="4"/>`).join('')+T(300,274,'A triglyceride: glycerol + three fatty acids',13,'var(--dim)');
    else if(step%4===2) b+=[0,1,2,3,4,5,6,7].map(i=>{const x=98+i*56,y=156+Math.sin(i)*40;return (i<7?line(x,y,154+i*56,156+Math.sin(i+1)*40,'var(--rose)'):'')+circle(x,y,15,i%2?'var(--rose)':'var(--indigo)',.6);}).join('')+T(300,274,'Amino-acid sequence shapes a protein’s possibilities',13,'var(--dim)');
    else b+=dna(0);
    return b;
  }
  function process(steps,step) {
    const active=steps[step]||{};
    return circle(300,137,79,'var(--cy)',.07)+`<circle cx="300" cy="137" r="79" fill="none" stroke="var(--cy)" stroke-opacity=".45"/>`+T(300,133,String(step+1).padStart(2,'0'),39,'var(--cy)')+T(300,163,'Explore the sequence',11,'var(--dim)')+T(300,250,active.title||'Follow the mechanism',16)+pathway(steps.map((_,i)=>String(i+1)),step,287);
  }
  function mount(container, topic, config) {
    const kind=kindFor(topic,config.topics||[]);
    let steps=stageSets[kind] || topic.visual?.steps || [];
    if(!steps.length) steps=[{title:topic.title,detail:topic.summary}];
    const initialStage={'chloroplasts':3,'light-reactions':4,'translation':2,'osmosis':3,'active-transport':2,'electron-transport-chain':2,'chemiosmosis':3,'atp':3,'citric-acid-cycle':1};
    let step=Math.min(initialStage[topic.id]||0,steps.length-1), playing=false, timer=null, selected=organelles.find(o=>topic.id===o.id)?.id || 'nucleus', a='Aa', b='Aa', alive=true;
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const labels={cell:'Inspect a living cell',photosynthesis:'Zoom into photosynthesis',mitosis:'Follow the chromosomes',meiosis:'Two divisions, new combinations',protein:'From information to a protein',heart:'Trace the blood’s journey',neuron:'Watch an electrical signal',genetics:'Build a genetic cross',ecology:'Read a food web',transport:'Across a selective membrane',respiration:'Where energy is transferred',dna:'Information in two strands',enzyme:'How catalysis changes the path','gas-exchange':'Between air and blood','plant-transport':'Two transport systems',selection:'Follow variation through generations',immunity:'Recognition, response, memory',biomolecules:'The molecules of life',mitochondria:'Inside a mitochondrion',calvin:'Follow carbon through the cycle'};
    const findOrganelle = id => (config.topics||[]).find(t=>t.id===id) || (config.topics||[]).find(t=>(t.aliases||[]).some(alias=>alias.toLowerCase()===id.replace(/-/g,' ')) || t.title.toLowerCase()===id.replace(/-/g,' '));
    function draw() {
      let body;
      switch(kind) {
        case 'cell': body=cellDiagram(selected); break;
        case 'photosynthesis': body=photosynthesis(step); break;
        case 'mitosis': body=division(step,false); break;
        case 'meiosis': body=division(step,true); break;
        case 'protein': body=protein(step); break;
        case 'heart': body=heart(step); break;
        case 'neuron': body=neuron(step); break;
        case 'genetics': body=genetics(a,b); break;
        case 'ecology': body=ecology(step); break;
        case 'transport': body=transport(step); break;
        case 'respiration': body=respiration(step); break;
        case 'mitochondria': body=mitochondria(step); break;
        case 'calvin': body=calvin(step); break;
        case 'dna': body=dna(step); break;
        case 'enzyme': body=enzyme(step); break;
        case 'gas-exchange': body=gasExchange(step); break;
        case 'plant-transport': body=plantTransport(step); break;
        case 'selection': body=selection(step); break;
        case 'immunity': body=immunity(step); break;
        case 'biomolecules': body=biomolecules(step); break;
        default: body=process(steps,step);
      }
      const item=kind==='cell'?organelles.find(o=>o.id===selected):steps[step];
      const target=kind==='cell'?findOrganelle(selected):null;
      container.innerHTML=`<div class="bl-diagram"><div class="bl-vis-top"><span>${esc(labels[kind]||'Explore the mechanism')}</span><span>${kind==='cell'?'Click to inspect':kind==='genetics'?'Change the parents':kind==='photosynthesis'?'Six scales':'Interactive model'}</span></div>${wrapSVG(labels[kind]||topic.title,body)}
        ${kind==='cell'?`<div class="bl-organelles" aria-label="Choose an organelle">${organelles.map(o=>`<button type="button" data-select-organelle="${o.id}" aria-pressed="${selected===o.id}">${o.name}</button>`).join('')}</div>`:''}
        ${kind==='genetics'?`<div class="bl-genotype"><label>Parent 1 genotype<select data-parent="a">${['AA','Aa','aa'].map(v=>`<option ${a===v?'selected':''}>${v}</option>`).join('')}</select></label><label>Parent 2 genotype<select data-parent="b">${['AA','Aa','aa'].map(v=>`<option ${b===v?'selected':''}>${v}</option>`).join('')}</select></label></div><p class="bl-result-summary" role="status">${punnettSummary(a,b)}</p>`:''}
        ${kind==='photosynthesis'?`<div class="bl-zoompath" aria-label="Scale of observation">${steps.map((s,i)=>`<button type="button" data-zoom="${i}" aria-pressed="${step===i}">${esc(s.title)}${i<steps.length-1?' ›':''}</button>`).join('')}</div>`:''}
        ${!['cell','genetics'].includes(kind)?`<div class="bl-vis-controls"><button type="button" data-visual-action="back" aria-label="Previous ${kind==='photosynthesis'?'scale':'stage'}" ${step===0?'disabled':''}>← ${kind==='photosynthesis'?'Zoom out':'Back'}</button><button type="button" data-visual-action="play" aria-label="${playing?'Pause':'Play'} visual sequence">${playing?'Pause':'Play sequence'}</button><button type="button" data-visual-action="next" aria-label="Next ${kind==='photosynthesis'?'scale':'stage'}">${kind==='photosynthesis'?'Zoom in':'Next'} →</button><span class="bl-stepcount">${step+1} / ${steps.length}</span></div>`:''}
        <div class="bl-stepdetail" aria-live="${playing?'off':'polite'}"><strong>${esc(item?.title||item?.name||topic.title)}</strong>${esc(item?.detail||topic.summary)}${target&&target.id!==topic.id?`<br><a class="bl-organelle-link" href="${config.url(target,config.mode)}">Explore ${esc(target.title)} in six modes →</a>`:''}</div></div><p class="bl-vis-note">${kind==='genetics'?'Assumes random fertilisation, equal segregation, and one autosomal gene. Probabilities apply independently to each offspring.':kind==='selection'?'Illustrative frequencies explain selection; this is not a fitted population model.':'A conceptual model, with structures and timing simplified for learning.'}${reduced?' Reduced motion is enabled.':''}</p>`;
      container.querySelectorAll('[data-organelle],[data-select-organelle]').forEach(control=>{const select=()=>{selected=control.dataset.organelle||control.dataset.selectOrganelle;const focusKey=selected;draw();container.querySelector(`[data-select-organelle="${focusKey}"]`)?.focus({preventScroll:true});config.onContext?.(organelles.find(o=>o.id===selected)?.name||selected);};control.addEventListener('click',select);if(control.matches('[data-organelle]'))control.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();select();}});});
      container.querySelectorAll('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{stop();step=Number(button.dataset.zoom);draw();container.querySelector(`[data-zoom="${step}"]`)?.focus({preventScroll:true});config.onContext?.(steps[step].title);}));
      container.querySelectorAll('[data-parent]').forEach(select=>select.addEventListener('change',()=>{const id=select.dataset.parent;if(id==='a')a=select.value;else b=select.value;draw();container.querySelector(`[data-parent="${id}"]`)?.focus({preventScroll:true});}));
      container.querySelectorAll('[data-visual-action]').forEach(button=>button.addEventListener('click',()=>{
        const action=button.dataset.visualAction;
        if(action==='play'){if(playing)stop();else{playing=true;timer=setInterval(()=>{if(!alive)return;const focused=document.activeElement?.dataset?.visualAction;step=(step+1)%steps.length;draw();if(focused)container.querySelector(`[data-visual-action="${focused}"]`)?.focus({preventScroll:true});},reduced?2400:1800);}}
        else{stop();step=action==='back'?Math.max(0,step-1):(step+1)%steps.length;config.onContext?.(steps[step].title);}
        draw();container.querySelector(`[data-visual-action="${action}"]`)?.focus({preventScroll:true});
      }));
    }
    function stop(){playing=false;if(timer){clearInterval(timer);timer=null;}}
    function visibility(){if(document.hidden&&playing){stop();if(alive)draw();}}
    document.addEventListener('visibilitychange',visibility);
    draw();
    return ()=>{alive=false;stop();document.removeEventListener('visibilitychange',visibility);};
  }
  function punnettSummary(a,b) {
    const result={AA:0,Aa:0,aa:0};for(const x of a)for(const y of b)result[[x,y].sort().join('')]++;
    return Object.entries(result).filter(([,n])=>n).map(([g,n])=>`${g}: ${n*25}%`).join(' · ')+` | Dominant phenotype: ${(result.AA+result.Aa)*25}%`;
  }
  window.BioLibraryVisuals={mount};
})();
