/* Short, authored extensions for every published Biology Entelloq concept.
 * Correct choices are authored first, then rotated deterministically for display.
 * These are learning checks, not a diagnostic or an examination score. */
(function (global) {
  'use strict';
  var cards = {}, sequence = 0;
  function check(question, options, explanation) {
    var offset = sequence++ % options.length;
    return {question:question, options:options.slice(offset).concat(options.slice(0,offset)),
      answer:(options.length-offset)%options.length, explanation:explanation};
  }
  function add(id, title, body, question, steps, answer, checkpoints, sourceId) {
    cards[id] = {curiosity:{title:title,body:body},
      workedExample:{question:question,steps:steps,answer:answer},checkpoints:checkpoints};
    if (sourceId) cards[id].curiosity.sourceId = sourceId;
  }

  add('cell-structure','A plant cell also needs mitochondria',
    'Photosynthesis stores light energy in organic molecules. Plant cells still use mitochondrial respiration to help supply ATP, including when light is unavailable.',
    'A leaf cell receives no light overnight. Does its ATP supply have to stop?',
    ['Light-dependent photosynthesis stops without light.','Stored organic molecules can still provide fuel for respiration.','Mitochondria can use that fuel and oxygen to support ATP production.'],
    'No. Respiration can continue in darkness while suitable fuel and oxygen are available.',[
      check('A cell exports large amounts of protein. Which combination would you expect to be especially developed?',['Rough ER and Golgi apparatus','Cell wall and chloroplasts','Lysosomes and centrosomes'],'Ribosomes on rough ER make many exported proteins; the ER and Golgi process and route them.'),
      check('Which observation alone cannot distinguish a bacterial cell from an animal cell?',['It contains ribosomes','It contains a membrane-enclosed nucleus','It contains mitochondria'],'Both bacteria and animal cells use ribosomes. Bacteria lack a membrane-enclosed nucleus and mitochondria.')
    ],'cells');

  add('membrane-transport','Equilibrium still moves',
    'At diffusion equilibrium, molecules keep crossing in both directions. What disappears is the net flow, not molecular motion.',
    'Oxygen is more concentrated outside a cell than inside. The cell keeps consuming oxygen. Predict its net movement.',
    ['Oxygen can diffuse through the lipid bilayer.','The concentration difference favors net movement inward.','Consumption inside helps maintain this difference.'],
    'Oxygen has a continuing net inward flow while this gradient persists.',[
      check('A membrane channel opens for an ion. What determines the direction of its passive net movement?',['Its electrochemical gradient','The amount of ATP next to the channel','The side with fewer membrane proteins'],'An ion responds to both the concentration difference and the electrical potential difference.'),
      check('A transporter uses a sodium gradient to move glucose uphill. Which description fits?',['Secondary active transport','Simple diffusion of glucose','Transport with no energy source'],'Energy stored in the sodium gradient drives glucose transport; maintaining that gradient often requires ATP elsewhere.')
    ]);

  add('biomolecules','Same sugar, different material',
    'Starch and cellulose both contain glucose. Different linkages give them different structures and make them accessible to different enzymes.',
    'Why can a human digest starch but not obtain glucose directly from cellulose using their own digestive enzymes?',
    ['Starch and cellulose connect glucose units differently.','An enzyme recognizes a particular arrangement of chemical bonds.','Human digestive enzymes can cleave starch linkages but lack cellulase.'],
    'The linkage matters, not just the identity of the building block.',[
      check('A mutation replaces a water-loving amino acid with a water-avoiding one. Why might the protein change function?',['Its folding or interactions may change','Its amino-acid sequence must remain chemically identical','Every such substitution destroys the protein'],'A side chain changes local interactions. Its effect depends on where it occurs; some substitutions have little effect.'),
      check('Which small molecule is directly used to split a polymer bond by hydrolysis?',['Water','Oxygen gas','ATP in every case'],'Hydrolysis cleaves a bond by adding the elements of water. Different enzymes catalyze different hydrolytic reactions.')
    ]);

  add('enzymes','A catalyst helps both directions',
    'An enzyme accelerates the approach to equilibrium from either side. It does not decide which side of a reversible reaction is energetically favored.',
    'Doubling substrate barely changes the initial rate. Adding more enzyme does. What is a likely explanation?',
    ['At high substrate concentration, many active sites are occupied.','The existing enzyme population is close to its catalytic capacity.','More enzyme supplies additional active sites.'],
    'The reaction was near substrate saturation for that amount of enzyme.',[
      check('An enzyme accelerates a reversible reaction in a closed mixture. What remains unchanged?',['The equilibrium ratio of reactants and products','The time needed to approach equilibrium','The reaction pathway’s activation barrier'],'A catalyst lowers the barrier without changing the free-energy difference or equilibrium constant.'),
      check('An enzyme works poorly after prolonged strong heating and cooling. Which explanation is plausible?',['Its functional structure has been disrupted','All enzyme molecules were consumed as reactants','Cooling must restore every enzyme to its original shape'],'Heating can disrupt protein structure, sometimes irreversibly. A slower rate alone does not prove this, but it is a plausible mechanism.')
    ],'enzymes');

  add('photosynthesis','A growing tree gets carbon from air',
    'Much of the carbon in a tree’s dry material began as atmospheric CO₂. Soil supplies water and mineral nutrients, but it is not the tree’s main carbon source.',
    'A well-watered plant gets brighter light, but its photosynthetic rate stops increasing. Has it stopped absorbing light?',
    ['More light can initially supply more energy.','Carbon fixation also depends on CO₂, enzymes and suitable conditions.','Another factor can limit the rate even while light is absorbed.'],
    'A plateau suggests another limitation; it does not imply zero light absorption.',[
      check('Water supplied to a plant contains a traceable oxygen isotope. Which immediate photosynthetic output can contain it?',['Released oxygen gas','Only the carbon atoms of sugar','Only soil minerals'],'The O₂ released by oxygenic photosynthesis comes from water oxidation.'),
      check('A plant closes its stomata on a hot, dry day. What tradeoff can follow?',['Less water loss but less CO₂ entry','More CO₂ entry with no water loss','An immediate end to all cellular respiration'],'Closing stomata conserves water but can limit CO₂ supply for carbon fixation. Respiration is a separate cellular process.')
    ],'calvin');

  add('cellular-respiration','Carbon and electrons have different exits',
    'In aerobic respiration, fuel carbon can leave as CO₂ while electrons ultimately reach oxygen, forming water. Following these two routes prevents a common mix-up.',
    'Oxygen becomes unavailable. Why does this eventually slow many reactions that do not directly consume oxygen?',
    ['The electron transport chain loses its terminal electron acceptor.','Reduced carriers are not efficiently reoxidized by that chain.','A shortage of oxidized carriers constrains earlier oxidation steps.'],
    'Linked pathways depend on carrier recycling, not just their own direct oxygen use.',[
      check('Why can breathing faster support active muscle respiration?',['It helps replenish oxygen used as an electron acceptor','It sends intact ATP from the lungs into mitochondria','It allows breathing to replace the need for blood circulation'],'Ventilation supports gas exchange and oxygen delivery. Cells make ATP locally through metabolic pathways.'),
      check('A cell fully oxidizes more glucose. Which statement is safest?',['More carbon can be released as CO₂','Each glucose must yield exactly the same ATP in every cell','Oxygen becomes the carbon in CO₂'],'Carbon dioxide comes from removal of fuel-derived carbon; ATP yield varies with pathways and coupling.')
    ],'oxidative');

  add('mitosis','A copied chromosome is still one chromosome',
    'After DNA replication, a chromosome has two sister chromatids joined together. Chromosome counts usually follow centromeres, so DNA doubling does not immediately double the chromosome number.',
    'A diploid cell has six chromosomes before S phase. How many should each daughter nucleus receive after an ordinary mitosis?',
    ['S phase makes two sister chromatids for each of the six chromosomes.','Mitosis separates the sisters into two groups.','Each new nucleus receives one copy of each original chromosome.'],
    'Each daughter nucleus receives six chromosomes, barring segregation errors.',[
      check('One chromosome is not properly attached to the spindle. What should an intact checkpoint do?',['Delay sister-chromatid separation','Immediately start another S phase','Proceed to anaphase before attachment is complete'],'The spindle checkpoint delays anaphase until appropriate attachments are established.'),
      check('Which observation most directly identifies anaphase of mitosis?',['Sister chromatids moving toward opposite poles','DNA being copied into sister chromatids','Homologous chromosomes undergoing crossing over'],'Sister separation marks mitotic anaphase. Replication occurs earlier, and crossing over is associated with meiosis I.')
    ]);

  add('meiosis','Two divisions, one DNA-copying round',
    'Meiosis separates homologous chromosomes first and sister chromatids second. DNA is copied before meiosis I, not again between the two divisions.',
    'A cell begins meiosis with two homologous pairs. How many chromosomes should each final haploid product contain?',
    ['The diploid starting number is four.','Meiosis I sends one chromosome from each homologous pair to each pole.','Meiosis II separates sister chromatids without restoring the homologous pairs.'],
    'Each final product has two chromosomes: one from each original pair.',[
      check('After normal meiosis I, what does each daughter cell contain?',['One member of each homologous pair, still with sister chromatids','Both homologs of every pair as single chromatids','A newly doubled diploid chromosome set'],'Homologs separate in meiosis I; sister chromatids typically remain joined until meiosis II.'),
      check('Why are meiotic products usually genetically different?',['Crossing over and independent chromosome assortment','Each product receives exactly the same allele combination','Meiosis always changes every gene sequence'],'Recombination and assortment reshuffle existing variants; mutation is not required for every product to differ.')
    ],'meiosis');

  add('dna','Complementarity makes copying possible',
    'The sequence on one DNA strand constrains its partner: A pairs with T and G with C. Each parental strand can therefore act as a template during replication.',
    'One DNA strand is written 5′-AGTC-3′. What is its paired strand, aligned beneath it?',
    ['Match A with T and G with C at each position.','The paired strands run in opposite directions.'],
    'The aligned partner is 3′-TCAG-5′; written 5′ to 3′ it is 5′-GACT-3′.',[
      check('Two cells have the same DNA but make different proteins. Is this possible?',['Yes; they can express different genes','No; identical DNA forces identical protein production','Only if one cell has no ribosomes'],'Gene regulation allows different cell types to use different parts of a shared genome.'),
      check('A DNA molecule has 30% adenine and ordinary double-stranded pairing. What fraction is thymine?',['30%','20%','60%'],'Each A is paired with T, so their total proportions match in ordinary double-stranded DNA.')
    ]);

  add('protein-synthesis','A message can host many ribosomes',
    'Several ribosomes can translate one mRNA at the same time. Each reads successive codons and builds its own polypeptide; this assembly is called a polysome.',
    'A cell has a gene, but produces no detectable protein from it. Does that prove the gene is missing?',
    ['The gene must first be transcribed to make RNA.','The RNA must be available for translation.','The resulting protein may also be rapidly degraded.'],
    'No. Regulation or breakdown at several steps can prevent protein accumulation.',[
      check('A stop codon appears early in an mRNA coding region. What is the immediate translation consequence?',['The polypeptide is usually released early','The ribosome skips that codon and continues normally','That codon adds a final stop amino acid'],'A stop codon recruits termination machinery rather than a tRNA carrying an amino acid.'),
      check('Which order describes the ordinary flow of sequence information for a protein-coding gene?',['DNA → RNA → polypeptide','Polypeptide → RNA → DNA','RNA → lipid → polypeptide'],'Transcription makes RNA from a DNA template; translation uses mRNA to specify a polypeptide sequence.')
    ],'translation');

  add('mendelian-genetics','Ratios describe chances, not family quotas',
    'A predicted 3:1 phenotype ratio is an expectation across many offspring. Four offspring are not required to divide into exactly three of one phenotype and one of another.',
    'Two heterozygous plants, Aa × Aa, have complete dominance. What is the chance their next offspring is aa?',
    ['Each parent produces A and a gametes with equal probability in this simple model.','An aa offspring needs an a gamete from both parents.','Multiply the independent probabilities: ½ × ½.'],
    'The probability is ¼ for each offspring.',[
      check('In Aa × aa, with complete dominance and equal gamete viability, what fraction is expected to show the recessive phenotype?',['One half','One quarter','All offspring'],'The first parent supplies a half the time; the second always supplies a. Half the expected offspring are aa.'),
      check('A dominant phenotype is observed. What can you conclude about the genotype in a simple two-allele model?',['It could be AA or Aa','It must be AA','The dominant allele must be more common in the population'],'Dominance describes heterozygote phenotype, not allele frequency or an assured homozygous genotype.')
    ]);

  add('heart-circulation','Arteries are named by direction',
    'An artery carries blood away from the heart; a vein carries it toward the heart. Oxygen content does not define the name, which is why pulmonary vessels challenge the usual shortcut.',
    'Trace a red blood cell from the right ventricle until it reaches the left atrium.',
    ['The right ventricle pumps into the pulmonary artery.','Blood passes through lung capillaries, where gas exchange occurs.','Pulmonary veins return the blood to the left atrium.'],
    'Right ventricle → pulmonary artery → lung capillaries → pulmonary veins → left atrium.',[
      check('Which chamber normally pumps blood into systemic circulation?',['Left ventricle','Right atrium','Right ventricle'],'The left ventricle ejects into the aorta, supplying the systemic circuit.'),
      check('Why is the left ventricular wall normally thicker than the right?',['It must generate greater pressure for the systemic circuit','It pumps a greater volume than the right ventricle on every normal beat','It contracts more often than the right ventricle'],'The systemic circuit has a greater pressure requirement. The two ventricles normally beat together and have matching average output.')
    ]);

  add('gas-exchange','A thin barrier makes a large difference',
    'Gas exchange depends on surface area, barrier thickness and partial-pressure differences. An organ can move air successfully yet exchange gases poorly if its exchange surface is damaged.',
    'The alveolar exchange barrier becomes thicker while all other factors stay the same. Predict oxygen transfer.',
    ['Oxygen must diffuse across the barrier.','A greater thickness increases the diffusion distance.','With the same surface area and pressure difference, transfer is slower.'],
    'Oxygen diffusion decreases under these controlled assumptions.',[
      check('Which change would favor faster diffusion across an otherwise unchanged respiratory surface?',['A larger partial-pressure difference','A smaller surface area','A thicker barrier'],'A greater partial-pressure difference increases the driving force for diffusion.'),
      check('Why must blood keep flowing past alveoli for sustained gas exchange?',['Flow brings deoxygenated blood and carries oxygenated blood away','Flow removes the need for a partial-pressure difference','Flow increases the diffusion distance across the alveolar wall'],'Blood flow helps maintain the gradients and transports exchanged gases; alveolar diffusion itself is passive.')
    ]);

  add('nervous-system','Signal size is not the whole message',
    'Many neurons encode stronger input by changing firing frequency or recruiting additional neurons. A single action potential is not simply made proportionally taller.',
    'A receptor experiences a stronger stimulus. How can it send more information if action potentials are all-or-none?',
    ['A stronger stimulus can create a larger graded receptor potential.','Threshold may then be reached more frequently.','A train of action potentials can have a higher firing frequency.'],
    'Signal timing and frequency can change even when individual spike amplitudes remain similar.',[
      check('Which pathway carries a sensory signal toward the central nervous system?',['An afferent pathway','An efferent motor pathway','A glandular duct'],'Afferent pathways carry sensory information toward the CNS; efferent pathways carry commands away.'),
      check('Damage to myelin can slow signaling chiefly because it disrupts what?',['Efficient propagation between nodes','Release of neurotransmitter along the entire length of every axon','The number of sodium ions created by the neuron'],'Myelin changes the electrical properties of an axon so depolarization spreads efficiently between nodes.')
    ],'neuron');

  add('immunity','Defense includes recognition and restraint',
    'An immune response must distinguish useful targets from the body’s own tissues and limit unnecessary damage. A stronger response is not automatically a better response.',
    'Why can an unfamiliar pathogen trigger inflammation before a tailored antibody response appears?',
    ['Innate immune cells detect broad danger or microbial patterns.','These defenses act without first selecting a new antigen-specific clone.','Adaptive responses require activation and expansion of matching lymphocytes.'],
    'Innate defenses can respond early while a specific adaptive response develops.',[
      check('What does an antibody bind directly?',['A particular molecular feature of an antigen','Every pathogen equally','Only an entire living bacterium'],'An antibody recognizes an epitope, a particular molecular feature. Antigens can occur on many kinds of material.'),
      check('Why can eliminating every immune response be harmful?',['Immune defenses help control infections and remove dangerous material','Inflammation is always harmless','The body only encounters one pathogen in a lifetime'],'Regulation should limit harmful responses while preserving protective functions; immune activity is context-dependent.')
    ],'immune');

  add('plant-transport','Leaves help pull a water column',
    'Transpiration can place xylem water under tension. Cohesion helps transmit that pull through connected water columns; a plant does not need a heart-like pump in its trunk.',
    'Humidity rises around a leaf while its stomata and other conditions remain similar. Predict transpiration.',
    ['The air spaces inside the leaf are moist.','More humid outside air reduces the water-vapor gradient.','Net evaporation and diffusion out of the leaf tend to decrease.'],
    'Transpiration tends to fall when the outward vapor gradient becomes smaller.',[
      check('Which route mainly delivers newly absorbed mineral ions and water from roots toward shoots?',['Xylem','Phloem only','The leaf cuticle'],'Xylem carries water and dissolved minerals in the transpiration stream.'),
      check('A growing root receives sugar from mature leaves. How is the root classified in that exchange?',['A sink','A source','A stomatal pore'],'A sink imports assimilates for growth, storage or use. A mature exporting leaf is a source.')
    ],'plant-transport');

  add('natural-selection','Selection has no future plan',
    'A variant can be advantageous in one environment and disadvantageous in another. Natural selection favors inherited differences through present reproductive outcomes, not through what a population might need later.',
    'A drought leaves mostly hard seeds. Birds already differ in inherited beak strength. What could happen over generations?',
    ['Some existing beak variants may improve access to the remaining food.','Their carriers may survive and reproduce more successfully.','Offspring inherit variants, changing their frequencies over generations.'],
    'Variants associated with reproductive success may become more common; individuals do not evolve stronger inherited beaks by wanting them.',[
      check('Which observation is required to support evolution by natural selection rather than survival alone?',['A heritable difference linked to reproductive success','Every individual survives the same length of time','An organism changes its behavior during one afternoon'],'Selection produces evolutionary change when differential reproductive success acts on heritable variation.'),
      check('An advantageous allele disappears from a tiny population by chance. Is selection impossible?',['No; genetic drift can also affect allele frequencies','Yes; beneficial alleles can never disappear','Yes; all mutations are harmful'],'Selection and drift can operate together. Chance effects are especially influential in small populations.')
    ],'evolution');

  add('ecology','Energy flows; atoms return',
    'An ecosystem continually loses usable energy as heat and needs an energy input. Atoms can instead cycle among organisms, water, soil and the atmosphere.',
    'A pond receives extra nutrients. Why might its oxygen level later fall?',
    ['Nutrients can promote rapid algal growth when they are limiting.','Dead algae provide organic matter for decomposers.','Aerobic decomposition consumes dissolved oxygen.'],
    'A bloom can be followed by oxygen depletion, depending on growth, mixing and decomposition.',[
      check('Why can removing a predator change plant abundance?',['Predators affect herbivores that consume plants','Herbivores must stop feeding when predators disappear','Only direct interactions influence ecosystems'],'Indirect effects can travel through a food web; their direction and size depend on the network.'),
      check('Which measurement is a population measurement rather than a community measurement?',['The number of one frog species in a pond','The variety of all pond species','The number of feeding links among pond species'],'A population consists of members of one species in a defined area; communities include interacting populations.')
    ]);

  add('nucleus','Nuclear pores are selective gates',
    'The nuclear envelope does not seal DNA away from the rest of the cell. Nuclear pores regulate exchange, including export of RNA and import of proteins needed inside the nucleus.',
    'A protein used for DNA replication is made in the cytosol. How can it reach its working location?',
    ['Ribosomes synthesize the protein outside the nucleus.','Nuclear-targeting information is recognized by transport machinery.','The protein is imported through nuclear pores.'],
    'A nuclear destination signal can route the protein through a pore.',[
      check('Which molecule normally must leave the nucleus before its message is translated by cytoplasmic ribosomes?',['A processed protein-coding mRNA','An entire chromosome','A complete nuclear envelope'],'In eukaryotic cells, processed mRNA is exported and can then be translated by cytoplasmic ribosomes.'),
      check('A typical skin cell and neuron have similar DNA but behave differently. Which nuclear process helps explain this?',['Different patterns of gene expression','Different universal base-pairing rules','Permanent deletion of all unused genes in every cell type'],'Regulatory machinery controls which genes are transcribed, helping cells maintain different identities.')
    ],'cells');

  add('nucleolus','A compartment without a lipid wall',
    'The nucleolus is a major site of ribosome assembly inside the nucleus. Unlike the nucleus itself, it is not surrounded by a lipid membrane.',
    'A cell increases protein production over time. Why might it need increased nucleolar activity?',
    ['Sustained protein synthesis may require more ribosomes.','Ribosomes contain ribosomal RNA and proteins.','The nucleolus produces much rRNA and assembles developing ribosomal subunits.'],
    'More ribosome production can support greater translation capacity.',[
      check('Which product most directly connects the nucleolus to protein synthesis?',['Developing ribosomal subunits','Secreted digestive enzymes','The cell’s complete plasma membrane'],'Nucleolar processing and assembly produce precursors of the subunits used in ribosomes.'),
      check('Why is it misleading to describe the nucleolus as a second nucleus?',['It is a specialized region inside the nucleus, not another membrane-enclosed nucleus','It contains all mitochondrial DNA','It replaces the nucleus during every interphase'],'The nucleolus is an organized nuclear region with a ribosome-biogenesis role, not an independent nucleus.')
    ],'cells');

  add('mitochondria','More membrane, more working surface',
    'Folds called cristae increase the inner mitochondrial membrane’s surface area. This membrane houses respiratory electron-transfer machinery and ATP synthase.',
    'A chemical makes the inner mitochondrial membrane freely permeable to protons. Predict ATP synthesis through ATP synthase.',
    ['Electron transport normally establishes a proton gradient.','Protons now return through the leak instead of being constrained to useful pathways.','Less proton-motive force is available to drive ATP synthase.'],
    'Oxidative ATP synthesis decreases, even if electron transfer can continue.',[
      check('Which mitochondrial feature directly separates the matrix from the intermembrane space?',['The inner membrane','A ribosome','The plasma membrane'],'The inner membrane establishes the selective barrier needed to sustain the proton gradient.'),
      check('A leaf cell has functioning chloroplasts. Why can it still need mitochondria?',['It still uses respiration to support cellular ATP demand','Chloroplasts remove the need for all respiration','Mitochondria only store unused sunlight'],'Photosynthesis and mitochondrial respiration serve connected but distinct energy-conversion roles.')
    ],'mitochondria');

  add('ribosomes','RNA helps build proteins',
    'A ribosome contains both RNA and protein. Ribosomal RNA forms the catalytic center that joins amino acids, so biological catalysts are not limited to proteins.',
    'An mRNA codon enters a ribosome. What determines which amino acid is added next?',
    ['A tRNA anticodon pairs with the mRNA codon.','The tRNA carries an amino acid loaded by a specific charging enzyme.','The ribosome links that amino acid to the growing chain.'],
    'Codon recognition and accurate tRNA charging together support correct amino-acid addition.',[
      check('What does a ribosome read while building a polypeptide?',['The codon sequence of mRNA','The base sequence of DNA directly','The order of amino acids already in a mature protein'],'Ribosomes translate mRNA codons; DNA is transcribed rather than read directly by the ribosome.'),
      check('A ribosome becomes attached to rough ER during translation. What caused this routing?',['A targeting signal in the emerging protein','A permanent difference in that ribosome’s genetic code','Every translated protein must first pass through the ER'],'An ER signal in a growing polypeptide recruits targeting machinery; free and bound ribosomes are not permanently different classes.')
    ],'translation');

  add('rough-er','The address can emerge during construction',
    'Many secreted proteins begin on cytosolic ribosomes. An emerging signal directs the translating ribosome to the ER, allowing the new chain to enter the secretory pathway.',
    'Trace the early route of a protein that will be secreted from a cell.',
    ['Translation begins and an ER-targeting signal emerges.','The ribosome is directed to the ER, where the chain enters or crosses the membrane.','After processing and quality control, transport vesicles carry it toward the Golgi.'],
    'Ribosome → rough ER → transport vesicle → Golgi is the early secretory route.',[
      check('Why does rough ER look rough in electron micrographs?',['Ribosomes are attached to its cytosolic surface','Its membrane is folded into mitochondrial cristae','Its surface is formed from stacked Golgi cisternae'],'Bound ribosomes give the surface its characteristic appearance.'),
      check('A secreted protein repeatedly misfolds in the ER. What is a plausible response?',['Quality-control systems retain or target it for disposal','It must be secreted faster regardless of folding','Its amino acids immediately become a chromosome'],'ER quality control limits export of many misfolded proteins and can direct them toward degradation.')
    ],'sorting');

  add('smooth-er','ER jobs vary with the cell',
    'The smooth ER supports functions including lipid metabolism and calcium storage. Its specialization in muscle, the sarcoplasmic reticulum, releases and recaptures calcium during contraction cycles.',
    'A muscle cell needs to rapidly raise and then lower cytosolic calcium. Which compartment helps?',
    ['The sarcoplasmic reticulum stores calcium behind its membrane.','Regulated channels can release calcium into the cytosol.','Calcium pumps help return it to the store.'],
    'Specialized smooth ER enables controlled calcium release and recovery.',[
      check('Which activity best matches a major smooth ER function?',['Synthesis of many membrane lipids','Assembly of the complete spindle from chromosomes','Reading every mRNA codon'],'Lipid synthesis is a major smooth ER role; translation is performed by ribosomes.'),
      check('What makes the smooth ER “smooth”?',['It lacks the attached ribosomes that mark rough ER','It has no embedded enzymes','It lacks a lipid bilayer'],'Smooth ER lacks the ribosome-studded appearance of rough ER but contains many functional membrane proteins.')
    ],'sorting');

  add('golgi-apparatus','Shipping includes editing',
    'The Golgi does more than package cargo. Enzymes modify many proteins and lipids as they pass through its compartments, helping determine their final properties and destinations.',
    'A cell makes a lysosomal enzyme correctly but fails to give it the appropriate sorting signal. What can go wrong?',
    ['The enzyme enters the secretory pathway.','Sorting machinery relies on molecular signals to select a destination.','Without the appropriate signal, the enzyme may be misrouted.'],
    'Making a functional enzyme is insufficient if it does not reach the compartment where it is needed.',[
      check('Which order matches the usual passage of secretory cargo through the Golgi?',['Entry at the cis side, exit toward the trans side','Entry at the trans side, exit toward the cis side','Entry and exit only at the same unchanging cis face'],'Cargo from the ER arrives near the cis face and is processed and sorted toward the trans side.'),
      check('A protein is synthesized but delivered to the wrong compartment. Which Golgi role is implicated?',['Cargo sorting','DNA base pairing','Chromosome segregation'],'Sorting directs cargo to destinations using signals and transport machinery.')
    ],'sorting');

  add('lysosomes','Recycling needs the right chemistry',
    'Many lysosomal enzymes work best in an acidic compartment. ATP-driven proton transport helps create conditions different from the surrounding cytosol.',
    'A lysosome can no longer maintain its acidic interior. Why might material accumulate?',
    ['Cargo reaches the lysosome for breakdown.','Many digestive enzymes depend on acidic conditions for effective activity.','Slower breakdown can leave incoming material undegraded.'],
    'Disrupting the compartment’s conditions can impair recycling even when enzymes are present.',[
      check('An old mitochondrion is enclosed and delivered for lysosomal breakdown. What broader process is involved?',['Autophagy','DNA translation','Oxygen fixation'],'Autophagy routes cellular material, including damaged organelles, to degradative compartments.'),
      check('Why should a lysosome not be described as simply a rubbish bin?',['Breakdown products can be reused by the cell','All lysosomal contents remain there forever','It only stores molecules and never changes them'],'Lysosomal breakdown recovers useful building blocks and supports ongoing cellular maintenance.')
    ],'sorting');

  add('peroxisomes','A reactive product needs a cleanup partner',
    'Some peroxisomal oxidation reactions generate hydrogen peroxide. Catalase helps break it down, linking useful chemistry with control of a reactive by-product.',
    'An oxidation pathway produces hydrogen peroxide in a peroxisome. Why is catalase nearby useful?',
    ['The oxidation reaction generates a potentially damaging by-product.','Catalase can decompose hydrogen peroxide.','Local processing limits accumulation while the pathway runs.'],
    'The compartment couples metabolic work with peroxide removal.',[
      check('Which pair most closely describes a peroxisomal role?',['Oxidation reactions and peroxide metabolism','mRNA decoding and peptide-bond formation','Chromosome pairing and crossing over'],'Peroxisomes contain oxidative enzymes and enzymes that handle peroxide; ribosomes and meiotic chromosomes have the other roles.'),
      check('Does a peroxisome’s use of oxygen make it identical to a mitochondrion?',['No; they organize different pathways and energy-conversion machinery','Yes; every oxygen-consuming organelle is a mitochondrion','Yes; both organelles only package secreted proteins'],'Oxygen use alone does not define an organelle. Mitochondrial oxidative phosphorylation relies on distinct membrane machinery.')
    ],'cells');

  add('vacuoles','Water can help hold a plant upright',
    'A large central vacuole stores solutes and water. Water entry can press the cell contents against the wall, producing turgor that supports many soft plant tissues.',
    'A plant cell is placed in a solution that causes net water loss. Predict the vacuole and turgor changes.',
    ['Water leaves across selectively permeable membranes.','The vacuole loses water and volume.','Pressure against the cell wall declines.'],
    'The vacuole shrinks and turgor falls; severe loss can cause plasmolysis.',[
      check('Why does a well-watered plant cell usually avoid bursting as water enters?',['Its wall resists expansion and pressure opposes further entry','Its vacuole actively expels every incoming water molecule','Its plasma membrane cannot pass any water'],'The wall supports pressure development, which changes water potential and limits further net entry.'),
      check('Besides supporting turgor, what can a central vacuole do?',['Store solutes and participate in breakdown','Replace all ribosomes during growth','Copy the nuclear chromosomes'],'Plant vacuoles can store ions and other molecules and have degradative functions.')
    ]);

  add('chloroplasts','Two connected chemical workspaces',
    'Light-driven electron transfer occurs in thylakoid membranes, while the Calvin cycle runs in the surrounding stroma. ATP and NADPH connect their work.',
    'A chloroplast has intact Calvin-cycle enzymes but cannot make NADPH. Why does net carbon assimilation suffer?',
    ['Fixing CO₂ begins a sequence of reactions, not a finished sugar.','Reduction of fixed-carbon intermediates requires reducing power.','NADPH normally supplies that reducing power.'],
    'Carbon fixation machinery alone cannot sustain normal net triose-phosphate production.',[
      check('Which location directly houses photosystems?',['The thylakoid membrane','The nuclear envelope','The Golgi lumen'],'Photosystems are pigment-protein complexes in the thylakoid membrane.'),
      check('Which comparison between chloroplasts and mitochondria is correct?',['Both use membrane proton gradients to help make ATP','Only mitochondria use electron transfer to establish a proton gradient','Both release O₂ by splitting water during normal operation'],'Both use chemiosmosis, but their electron sources, destinations and metabolic roles differ.')
    ],'light');

  add('centrosomes','An organizer, not a chromosome counter',
    'The centrosome organizes microtubules in many animal cells. Its role in spindle organization is distinct from the chromosome attachment sites called kinetochores.',
    'An animal cell forms extra spindle poles. Why might chromosome distribution become unreliable?',
    ['A typical mitotic spindle organizes two opposing poles.','Extra poles can create abnormal attachment geometry.','Chromosomes may be pulled into unequal groups unless the cell resolves the problem.'],
    'A multipolar arrangement can increase the risk of chromosome-segregation errors.',[
      check('Which structure directly connects a chromosome to spindle microtubules?',['A kinetochore','A nucleolus','A lysosome'],'A kinetochore assembles at a chromosome’s centromere region and provides the microtubule attachment interface.'),
      check('Does the absence of a typical animal centrosome prevent every cell from dividing?',['No; other cells can organize spindles by different mechanisms','Yes; all plant cells are unable to divide','Yes; DNA cannot be copied without centrioles'],'Typical higher-plant cells lack animal-style centrosomes yet organize functional spindles.')
    ]);

  add('cytoskeleton','Cell scaffolding can rebuild itself',
    'Cytoskeletal filaments continually assemble, disassemble and interact with motors. This dynamic organization lets a cell change shape, move cargo and divide.',
    'A vesicle must travel farther than diffusion alone can efficiently carry it. How can the cytoskeleton help?',
    ['A motor protein binds to both cargo and a suitable filament system.','ATP-driven motor cycles generate directed movement.','The filament provides a route through the cell.'],
    'Motor proteins can carry cargo along cytoskeletal tracks.',[
      check('A drug prevents microtubule assembly. Which process is most directly threatened?',['Mitotic spindle formation','Base pairing between two free DNA strands','Hydrolysis of starch by amylase'],'Spindle fibers are microtubules, so disrupting their assembly can compromise chromosome segregation.'),
      check('Which statement best describes actin’s role in animal-cell division?',['Actin contributes to a contractile ring during cytokinesis','Actin pulls homologous chromosomes apart at kinetochores','Actin forms the spindle microtubules'],'Actin and myosin help constrict the cleavage furrow that separates many animal cells.')
    ]);

  add('cell-membrane','A membrane has two different faces',
    'The two sides of a plasma membrane are not identical. Many carbohydrate groups face outward, where they participate in recognition and interactions with the environment.',
    'Why does a small nonpolar gas cross a lipid bilayer more readily than a sodium ion?',
    ['The bilayer’s interior is hydrophobic.','A nonpolar gas can dissolve in and traverse that region relatively readily.','A charged ion faces an energetic barrier and usually needs a protein route.'],
    'Charge and compatibility with the hydrophobic core matter, not size alone.',[
      check('Which change directly adds a selective route for an ion through a membrane?',['Inserting a channel protein','Making every phospholipid head point inward','Removing the concentration gradient'],'An ion channel provides a selective hydrophilic pathway through the membrane.'),
      check('Why is a cell membrane called fluid?',['Many lipids and proteins can move laterally within it','It has no organized structure','Every membrane component freely crosses between its two faces'],'Lateral mobility is common, while movement between leaflets is more constrained and often requires enzymes.')
    ]);

  add('cell-wall','A wall supports; a membrane selects',
    'A plant cell wall provides mechanical support outside the plasma membrane. The membrane underneath remains the main selective barrier controlling many exchanges with the cytoplasm.',
    'A plant cell takes up water in a dilute solution. How do the membrane and wall contribute differently?',
    ['Water crosses the selectively permeable membrane.','Expanding contents press against the surrounding wall.','The wall’s resistance permits turgor pressure to develop.'],
    'The membrane governs permeability; the wall limits expansion and provides support.',[
      check('Which structural polymer is characteristic of plant cell walls?',['Cellulose','Glycogen','DNA'],'Cellulose microfibrils are important load-bearing components of plant walls.'),
      check('Does a cell wall prove an organism is a plant?',['No; fungi and many bacteria also have walls with different compositions','Yes; no other organisms have walls','No; all animal cells also have cellulose walls'],'Walls occur in several groups. Their chemistry differs, so a wall alone is not a plant identifier.')
    ]);

  add('osmosis','Pressure can balance a solute difference',
    'Osmosis depends on water potential, which includes both solute and pressure effects. Unequal solute concentrations do not guarantee continuing net water flow if a pressure difference balances them.',
    'A membrane passes water but traps sugar. One side initially has more dissolved sugar at the same pressure. Which way does water move net?',
    ['Trapped sugar lowers water potential on the more concentrated side.','Water can cross while sugar cannot.','Net water movement is toward the lower water potential until opposing effects balance.'],
    'Water initially moves toward the side with more trapped sugar.',[
      check('An animal cell loses water and remains shrunken after equilibration with a solution. The solution is what relative to the cell?',['Hypertonic','Isotonic','Hypotonic'],'A hypertonic solution contains an effective concentration of nonpenetrating solutes that causes net water loss from the cell.'),
      check('Why does knowing total solute concentration alone sometimes fail to predict a cell’s final volume?',['Some solutes can cross the membrane','Only solute movement can change cell volume','All solutes are always actively pumped'],'Permeating solutes can redistribute. Tonicity depends on the effective osmotic influence of nonpenetrating solutes over the relevant time.')
    ]);

  add('active-transport','One gradient can pay for another',
    'A cell can spend ATP to establish an ion gradient, then use that stored energy to transport a different substance. Energy use can be indirect even when a particular transporter does not hydrolyze ATP.',
    'A sodium–glucose cotransporter stops importing glucose after the sodium gradient collapses. Why?',
    ['Sodium moving down its electrochemical gradient supplies energy.','The cotransporter couples that favorable movement to glucose uptake.','When the sodium driving force disappears, uphill glucose transport loses its energy source.'],
    'The transporter depends on energy stored in the sodium gradient.',[
      check('Which is direct evidence of active transport?',['A substance moves against its electrochemical gradient using an energy source','A substance crosses through any membrane protein','Water moves toward lower water potential'],'Protein involvement alone is insufficient: channels and carriers can also mediate passive transport.'),
      check('A primary ATP-driven ion pump is blocked. What may happen to transporters powered by its gradient over time?',['Their driving force may weaken as the gradient dissipates','They remain unaffected because they do not directly hydrolyze ATP','They automatically switch to simple diffusion against the gradient'],'Secondary transport depends on a maintained gradient, which may decline through leaks and ongoing transport.')
    ]);

  add('atp','Breaking a bond alone costs energy',
    'ATP hydrolysis releases free energy overall because the products and their interactions are more favorable than the reactants under cellular conditions. Breaking the terminal bond by itself requires energy.',
    'A cell must drive an energetically unfavorable reaction. How can ATP help?',
    ['ATP hydrolysis can be energetically favorable under cellular conditions.','An enzyme links hydrolysis to another reaction through a shared mechanism.','The combined process can have a favorable overall free-energy change.'],
    'Useful coupling joins the reactions mechanistically; nearby ATP breakdown alone is not enough.',[
      check('Why is ATP better described as an energy-transfer molecule than a long-term fuel store?',['Cells continually regenerate and consume it','ATP contains no chemical bonds','ATP cannot be made from ADP'],'ATP turns over rapidly, transferring free energy from metabolism into cellular work.'),
      check('What happens to a coupled process if its total free-energy change is positive under the current conditions?',['It is not thermodynamically favored in that direction','It must run rapidly because ATP is mentioned','An enzyme can make its total free-energy change negative by itself'],'An enzyme changes kinetic barriers. Favorability depends on the complete coupled reaction and conditions.')
    ]);

  add('enzyme-inhibition','An inhibitor’s effect depends on the mechanism',
    'In an ideal competitive model, more substrate can overcome inhibition at the active site. Other mechanisms need not respond that way, so “add more substrate” is not a universal rescue.',
    'An inhibitor raises apparent Km but leaves Vmax unchanged in a simple initial-rate experiment. Which model fits?',
    ['More substrate is needed to reach a given fraction of maximum rate.','At sufficiently high substrate, the same limiting rate can still be reached.','This matches the ideal competitive-inhibition pattern.'],
    'Competitive inhibition is consistent with these data, within the simple model.',[
      check('In ideal competitive inhibition, what should happen at very high substrate concentration?',['Rate approaches the uninhibited Vmax','Vmax must become zero','Substrate can never bind while any inhibitor is present'],'Substrate competes for the same binding opportunity, so sufficiently high substrate can overcome the inhibition in this model.'),
      check('Why is reduced reaction rate alone insufficient to identify an inhibitor’s mechanism?',['Several mechanisms and experimental conditions can reduce rate','Every inhibitor binds the active site','A single inhibited rate uniquely determines where the inhibitor binds'],'Determining a mechanism requires additional evidence, such as rate curves across substrate and inhibitor concentrations.')
    ],'enzymes');

  add('light-reactions','Oxygen release replaces lost electrons',
    'When photosystem II sends energized electrons into the transport chain, water supplies replacements. Oxidizing water releases oxygen as a by-product.',
    'Electron transfer from photosystem II is blocked. Predict the effect on normal linear electron flow.',
    ['Photosystem II normally contributes electrons obtained from water.','Those electrons help sustain transfer toward photosystem I and NADP⁺.','Blocking their entry disrupts this linked pathway and its usual carrier production.'],
    'Normal linear flow and associated NADPH production decline; alternative pathways do not replace every function.',[
      check('What is the direct role of an absorbed photon in a photosystem?',['It helps raise an electron to a higher-energy state','It becomes a carbon atom in glucose','It supplies the phosphate groups used to make ATP'],'Pigment excitation initiates energy and electron transfer; light supplies energy rather than carbon atoms.'),
      check('What distinguishes cyclic electron flow around photosystem I?',['It can support ATP formation without net NADPH formation','It directly releases O₂ by splitting water at photosystem I','It fixes CO₂ into a finished glucose molecule'],'Cyclic flow returns electrons to the transport pathway, helping build a proton gradient without net NADPH production or direct water oxidation.')
    ],'light');

  add('calvin-cycle','Most of the cycle’s output stays in the cycle',
    'The Calvin cycle must regenerate its CO₂ acceptor, RuBP. Most of its three-carbon intermediates are recycled; only a fraction is available as net output.',
    'After three CO₂ molecules enter the simplified Calvin-cycle accounting, why does only one three-carbon G3P count as net output?',
    ['Three CO₂ add three new carbon atoms to the existing cycle intermediates.','Six three-carbon G3P equivalents form after reduction.','Five G3P equivalents supply the 15 carbons needed to regenerate three five-carbon RuBP molecules.'],
    'One G3P equivalent remains as net output; the rest regenerates the carbon acceptor.',[
      check('Can the Calvin cycle usually run indefinitely in darkness merely because its reactions do not directly absorb photons?',['No; it depends on energy carriers and regulation linked to light reactions','Yes; it needs neither ATP nor NADPH','Yes; RuBisCO creates energy from carbon dioxide'],'The cycle consumes ATP and NADPH, and several enzymes are regulated in relation to light conditions.'),
      check('Which molecule is the CO₂ acceptor used by RuBisCO in the Calvin cycle?',['RuBP','Oxygen gas','A finished starch granule'],'RuBisCO adds CO₂ to ribulose-1,5-bisphosphate, initiating carbon incorporation into the cycle.')
    ],'calvin');

  add('glycolysis','An early investment enables a later return',
    'Glycolysis spends ATP before producing it. In the standard pathway, two ATP are invested and four are formed, giving a net gain of two per glucose.',
    'A pathway forms four ATP but consumes two ATP while converting one glucose into two pyruvate. What is the net ATP yield?',
    ['Count ATP used in the investment steps: two.','Count ATP formed in the payoff steps: four.','Subtract the investment from the production: four minus two.'],
    'The net yield is two ATP per glucose, along with other products including NADH.',[
      check('Where does glycolysis occur in a typical eukaryotic cell?',['The cytosol','The mitochondrial intermembrane space','The mitochondrial matrix in every eukaryotic cell'],'Glycolytic enzymes act in the cytosol; later stages of aerobic respiration involve mitochondria.'),
      check('Why does sustained glycolysis require a way to regenerate NAD⁺?',['A glycolytic oxidation step reduces NAD⁺ to NADH','NAD⁺ supplies the phosphate groups in every ATP molecule','Glycolysis cannot begin unless oxygen binds every enzyme'],'NAD⁺ must be replenished so the oxidation step can continue; respiration or fermentation can support this recycling.')
    ]);

  add('citric-acid-cycle','A cycle can export building blocks',
    'Citric-acid-cycle intermediates also supply biosynthetic pathways. When a cell withdraws them, replenishing reactions help maintain the cycle’s working pool.',
    'A cell withdraws many cycle intermediates to build amino acids. Why can adding more acetyl-CoA alone be insufficient?',
    ['Acetyl-CoA enters by combining with an existing cycle intermediate.','Withdrawing intermediates reduces the pool available to keep the cycle operating.','Replenishing reactions are needed to restore that pool.'],
    'The cycle needs both incoming fuel and a maintained supply of intermediates.',[
      check('What is a major energy-related output of the citric acid cycle?',['Reduced electron carriers such as NADH','Oxygen released by splitting water','A complete chromosome copied from glucose'],'NADH and FADH₂ carry electrons toward respiratory electron-transfer pathways.'),
      check('Why can the cycle slow when the respiratory electron transport chain stops?',['Oxidized electron carriers become harder to regenerate','The cycle directly consumes oxygen in every reaction','Oxygen is the carbon acceptor that begins every cycle turn'],'Electron transport normally reoxidizes reduced carriers, helping maintain the oxidized forms needed for continued oxidation.')
    ]);

  add('electron-transport-chain','Electron transfer can store energy across a membrane',
    'Respiratory electron transfer powers proton pumping at several complexes. The chain’s main contribution to ATP production is creating a gradient that a different machine, ATP synthase, can use.',
    'A terminal respiratory complex cannot transfer electrons to oxygen. What happens upstream?',
    ['The final electron outlet is blocked.','Upstream carriers tend to remain reduced.','Continued electron flow and proton pumping become constrained.'],
    'The chain backs up, reducing the proton gradient that supports oxidative ATP synthesis.',[
      check('In aerobic mitochondrial respiration, what receives electrons at the end of the chain?',['Oxygen','Carbon dioxide','A ribosome'],'Oxygen is reduced to water at the terminal respiratory complex.'),
      check('Why does a proton leak reduce the efficiency of oxidative phosphorylation?',['Some stored gradient energy is dissipated without ATP synthesis','The leak increases the proton-motive force without extra pumping','All leaked protons must pass through ATP synthase first'],'Protons that bypass ATP synthase dissipate part of the proton-motive force without generating ATP through that enzyme.')
    ],'oxidative');

  add('chemiosmosis','A gradient is a stored opportunity',
    'A proton gradient includes both a concentration difference and an electrical difference. ATP synthase couples downhill proton movement to ATP formation.',
    'Electron transport is stopped after establishing a proton gradient. Could ATP synthase briefly keep making ATP?',
    ['The existing gradient still stores electrochemical energy.','Protons can continue returning through ATP synthase for a time.','The gradient weakens as it is used and leaks away.'],
    'Briefly, yes, while sufficient proton-motive force and substrates remain.',[
      check('Which combination is directly needed for ATP synthesis by the coupled ATP synthase mechanism?',['A proton-motive force, ADP and phosphate','Only oxygen and carbon dioxide','Only an intact DNA molecule'],'ATP synthase couples proton flow to joining ADP and inorganic phosphate under suitable conditions.'),
      check('Why is an intact, selectively permeable energy-converting membrane important?',['It limits uncontrolled proton return','It prevents all movement of every substance','It forces all protons to remain permanently on one side'],'Selective restriction of proton flow allows energy to be stored as a gradient and released through regulated routes.')
    ],'oxidative');

  add('fermentation','The key rescue is carrier recycling',
    'Fermentation regenerates NAD⁺ from NADH so glycolysis can continue. In the standard lactate and alcohol pathways, the fermentation steps themselves do not add ATP beyond glycolysis’s yield.',
    'A yeast cell loses access to oxygen but has glucose. How can alcohol fermentation support continued ATP production?',
    ['Glycolysis produces ATP and converts NAD⁺ into NADH.','Fermentation transfers electrons through reactions that regenerate NAD⁺.','Recycled NAD⁺ allows glycolysis to keep supplying its modest ATP yield.'],
    'Fermentation enables ongoing glycolysis rather than replacing it with high-yield oxidative phosphorylation.',[
      check('Which comparison between common muscle lactate fermentation and yeast alcohol fermentation is correct?',['Both regenerate NAD⁺, but their end products differ','Both must release ethanol','Neither depends on reactions linked to glycolysis'],'Lactate and alcohol fermentation have different products but share the carrier-recycling function.'),
      check('Which observation would show that fermentation is failing to sustain glycolysis?',['NAD⁺ becomes depleted while NADH accumulates','Pyruvate is available but no oxygen enters the cell','Glycolysis produces a net two ATP per glucose'],'Insufficient NAD⁺ prevents the glycolytic oxidation step from continuing effectively.')
    ]);

  add('cell-cycle','A pause can protect future cells',
    'Checkpoints coordinate cell-cycle events with conditions such as DNA integrity and chromosome attachment. Pausing can allow repair instead of passing a problem to daughter cells.',
    'A cell detects substantial DNA damage before replication. Why might delaying S phase help?',
    ['S phase would copy the DNA, including damaged templates.','A checkpoint can slow progression and activate repair responses.','Repair before copying can reduce the chance of propagating damage.'],
    'A delay creates an opportunity to resolve damage before genome duplication.',[
      check('Which event defines S phase?',['DNA replication','Separation of sister chromatids','Completion of cytokinesis'],'S phase is the genome-synthesis period; chromosome segregation occurs later in mitosis.'),
      check('Why is uncontrolled cell-cycle progression dangerous?',['Damaged or inappropriate cells can continue proliferating','Every cell must divide continuously to stay alive','Checkpoints exist only to make cells larger'],'Growth control and checkpoints restrict proliferation and help maintain tissue organization and genome integrity.')
    ]);

  add('dna-replication','Both new strands grow the same chemical way',
    'DNA polymerases extend DNA in the 5′→3′ direction. Because parental strands are antiparallel, the two sides of a replication fork are built differently.',
    'Why is one strand near a replication fork synthesized in short fragments?',
    ['The two template strands run in opposite directions.','DNA polymerase can extend a strand only at its 3′ end.','One new strand must repeatedly start as more template becomes exposed.'],
    'The lagging strand forms Okazaki fragments that are processed and joined.',[
      check('After one ordinary round of replication, each daughter double helix contains what?',['One parental strand and one newly synthesized strand','Two entirely parental strands','Two newly made strands with no parental strand'],'Semiconservative replication preserves one template strand in each daughter DNA molecule.'),
      check('What is DNA ligase’s role after lagging-strand synthesis?',['Sealing remaining breaks in the sugar-phosphate backbone','Adding RNA primers to start each DNA fragment','Separating the parental strands ahead of the fork'],'After fragment processing, ligase seals nicks to make a continuous DNA backbone.')
    ]);

  add('crossing-over','Recombination swaps linked neighborhoods',
    'Crossing over exchanges corresponding DNA segments between nonsister chromatids of homologous chromosomes. It can create new combinations of alleles already present in the parents.',
    'One homolog carries AB and the other ab. A crossover occurs between the two genes. Which new combinations can appear?',
    ['Before recombination, the combinations are AB and ab.','A reciprocal exchange between the gene positions joins A with b and a with B on participating chromatids.','Chromatids not involved can retain the parental combinations.'],
    'Recombinant combinations Ab and aB can appear alongside parental AB and ab.',[
      check('Which pair normally participates in a meiotic crossover?',['Nonsister chromatids of homologous chromosomes','Sister chromatids with identical corresponding sequences','Chromatids of unrelated nonhomologous chromosomes'],'Homologs align during meiosis I, enabling exchange between corresponding DNA regions on nonsister chromatids.'),
      check('A crossover reshuffles alleles without changing their sequences. Does it require a new mutation?',['No; existing variants can be rearranged','Yes; every exchanged segment must become a new allele','Yes; all DNA bases must change'],'Recombination changes combinations of variants; mutation changes sequence and is a distinct source of variation.')
    ],'meiosis');

  add('transcription','The template is read, not consumed',
    'RNA polymerase makes RNA complementary to one DNA template strand. The DNA remains available for future transcription rather than being converted into RNA.',
    'A DNA template segment reads 3′-TACG-5′. What RNA sequence is synthesized across it?',
    ['RNA is made complementary to the template.','RNA uses U opposite A rather than T.','The growing RNA is written in the 5′→3′ direction.'],
    'The RNA segment is 5′-AUGC-3′.',[
      check('Two cells transcribe different sets of genes. What is a likely consequence?',['They can make different sets of RNA and proteins','They must use different DNA base-pairing rules','They must belong to different species'],'Gene regulation changes which instructions are used, helping cells specialize even with similar genomes.'),
      check('Which event is transcription rather than translation?',['RNA polymerase builds RNA using a DNA template','A tRNA pairs with a codon at a ribosome','A ribosome joins amino acids'],'Transcription makes an RNA copy; translation decodes an mRNA sequence into a polypeptide.')
    ]);

  add('translation','The code has redundancy, not ambiguity',
    'Several codons can specify the same amino acid. In the standard code, a particular codon still has a defined meaning; redundancy does not make the ribosome choose randomly.',
    'The coding sequence changes from GAA to GAG. Both codons specify glutamate in the standard code. Predict the amino-acid change.',
    ['The nucleotide sequence has changed.','Look up both codons rather than assuming every substitution changes protein sequence.','Both specify the same amino acid.'],
    'This is a synonymous coding change: no amino-acid substitution at that position.',[
      check('An insertion adds one nucleotide near the start of a coding region. What is a major possible effect?',['A shifted reading frame for downstream codons','Exactly one extra amino acid with no other possible change','A guaranteed restoration of the original protein'],'Codons are read in groups of three; a one-base insertion can shift how all following bases are grouped.'),
      check('What normally recognizes a stop codon during translation?',['A release factor','A tRNA carrying a special stop amino acid','DNA polymerase'],'Release factors promote termination and release of the polypeptide; there is no ordinary stop amino acid.')
    ],'translation');

  add('mutations','A changed sequence is not a guaranteed changed trait',
    'A mutation may alter a protein, change regulation or have little detectable effect. Its consequences depend on its location, molecular effect and biological context.',
    'A substitution occurs in a protein-coding region. Why can you not infer its effect from “one base changed” alone?',
    ['Different codons can encode the same amino acid.','An amino-acid substitution may affect a crucial site or a relatively tolerant position.','The surrounding regulatory and cellular context also matters.'],
    'Inspect the sequence change and functional context before predicting an effect.',[
      check('Which mutation is most directly expected to shift a coding reading frame?',['Deletion of one nucleotide','Replacement of one nucleotide by another','Deletion of exactly three nucleotides within the reading frame'],'An insertion or deletion not divisible by three can alter downstream codon grouping.'),
      check('Does exposure to an antibiotic direct bacteria to make exactly the resistance mutation they need?',['No; selection can favor resistant variants that arise without such foresight','Yes; the antibiotic writes the required DNA sequence','Yes; every exposed bacterium acquires the same mutation'],'Mutations do not arise to satisfy a future need. Selection changes the representation of variants under the new conditions.')
    ]);

  add('non-mendelian-inheritance','Dominance describes a relationship',
    'An allele is not universally “stronger.” Dominance describes the heterozygote phenotype for a particular trait; codominance and incomplete dominance describe other observable relationships.',
    'In a hypothetical flower, RR is red, rr is white and Rr is pink. What phenotypes are expected from Rr × Rr?',
    ['The expected genotypes are ¼ RR, ½ Rr and ¼ rr.','Map each genotype to its stated phenotype.','The heterozygote is visibly distinct from both homozygotes.'],
    'The expected phenotype ratio is 1 red : 2 pink : 1 white.',[
      check('In codominance, what is observed in a heterozygote?',['Distinct contributions of both alleles are expressed','Only the more common allele is expressed','The alleles permanently merge into a new allele'],'Codominance preserves detectable contributions from both alleles; it is not the blending of alleles themselves.'),
      check('Why can linked genes fail to follow a simple independent-assortment ratio?',['Their positions on the same chromosome can make them inherited together','They no longer obey DNA base pairing','They must have identical nucleotide sequences'],'Genes on the same chromosome can be transmitted together, with recombination influencing the observed combinations.')
    ]);

  add('blood','Most oxygen travels with a protein partner',
    'Most oxygen in human blood is carried bound to hemoglobin in red blood cells, rather than simply dissolved in plasma. Binding increases the amount blood can transport.',
    'Two blood samples have the same dissolved oxygen partial pressure but different hemoglobin amounts. Must they contain the same total oxygen?',
    ['Dissolved oxygen contributes to partial pressure.','Additional oxygen can be bound to hemoglobin.','Different hemoglobin amounts can carry different quantities at similar saturation.'],
    'No. Oxygen partial pressure and total oxygen content are related but different measurements.',[
      check('Which blood component primarily provides antibodies and other soluble proteins with a transport medium?',['Plasma','Only the interior of red blood cells','Only platelets'],'Plasma is the liquid component that carries dissolved proteins and many other substances.'),
      check('Why is oxygen unloaded from hemoglobin in actively respiring tissues?',['Local conditions favor release and tissue oxygen use maintains a gradient','Tissue cells pull entire red blood cells through their membranes','Hemoglobin is converted to glucose at every capillary'],'Tissue consumption and local conditions support oxygen release and diffusion from blood to cells.')
    ]);

  add('cardiac-cycle','Valves follow pressure differences',
    'Heart valves open and close as pressure changes across them. They prevent backflow; they do not actively pull blood through the heart.',
    'Left ventricular pressure rises above left atrial pressure before it exceeds aortic pressure. Which valves are open?',
    ['The reversed atrium-to-ventricle gradient closes the mitral valve.','Ventricular pressure is not yet high enough to open the aortic valve.','The ventricle contracts briefly with both valves closed.'],
    'Both are closed during this isovolumetric contraction phase.',[
      check('What directly causes the aortic valve to open during a normal beat?',['Left ventricular pressure exceeds aortic pressure','The valve contracts using its own rhythm independent of pressure','Left atrial pressure falls below vena caval pressure'],'A favorable pressure difference opens the valve and allows ventricular ejection.'),
      check('If stroke volume stays constant while heart rate rises, what happens to cardiac output?',['It rises','It must fall','It is always unchanged'],'Cardiac output equals heart rate multiplied by stroke volume; the stated fixed-volume assumption determines this prediction.')
    ]);

  add('homeostasis','Stable does not mean unchanging',
    'Homeostasis uses ongoing adjustments to keep important variables within workable ranges. Small fluctuations and responsive change are part of the process.',
    'Body temperature rises during exercise. How can negative feedback oppose the rise?',
    ['Temperature-sensitive systems detect the change.','Effectors increase heat loss, for example through sweating and skin blood-flow changes.','As temperature approaches its regulated range, the corrective drive diminishes.'],
    'The response counteracts the original temperature increase.',[
      check('Which response is negative feedback?',['A rise in a variable activates a process that lowers it','A rise in a variable always triggers a further rise','A response occurs with no relation to the measured variable'],'Negative feedback reduces deviation from a regulated condition; “negative” does not mean harmful.'),
      check('Why does a constant room temperature not prove an organism is maintaining homeostasis?',['The relevant internal variables and responses must be measured','Every external condition equals the internal condition','Homeostasis occurs only when the environment changes suddenly'],'Homeostasis concerns regulated internal conditions. External stability alone does not reveal the organism’s regulation.')
    ]);

  add('action-potential','A refractory period creates a timing limit',
    'After a spike begins, many voltage-gated sodium channels temporarily become unavailable. This helps limit immediate re-firing and supports orderly propagation along the axon.',
    'A second strong stimulus arrives during the absolute refractory period. Why does it fail to trigger another normal action potential?',
    ['The previous spike has inactivated many voltage-gated sodium channels.','Those channels must recover before reopening normally.','A stronger stimulus cannot instantly bypass their unavailable state.'],
    'The membrane must recover sufficient channel availability before another spike can occur.',[
      check('What directly produces much of the rapid rising phase of a typical neuronal action potential?',['Opening of voltage-gated sodium channels and inward sodium current','Immediate outward sodium pumping by the sodium–potassium pump','Rapid inward potassium current through voltage-gated channels'],'Sodium entry depolarizes the membrane and recruits further voltage-gated sodium channels.'),
      check('Why is it inaccurate to say the sodium–potassium pump directly makes every spike’s rapid upstroke?',['Fast voltage-gated currents produce the upstroke; the pump maintains gradients over time','The pump does not use energy','Neurons contain no sodium'],'The pump supports the ionic gradients on which signaling depends, but rapid channel currents shape the spike.')
    ],'neuron');

  add('synapses','An electrical arrival becomes a chemical message',
    'At a chemical synapse, an arriving action potential promotes calcium entry. Calcium then triggers neurotransmitter release, connecting electrical activity to chemical signaling.',
    'Presynaptic voltage-gated calcium channels are blocked. What happens to evoked neurotransmitter release?',
    ['An action potential can still reach the terminal if axonal conduction is intact.','Less calcium enters through the blocked channels.','The usual calcium-triggered vesicle fusion is reduced.'],
    'Action-potential-evoked transmitter release decreases even though the electrical signal may arrive.',[
      check('Why can the same neurotransmitter have different effects on different target cells?',['Targets can express different receptor types and downstream machinery','The transmitter always excites any cell it reaches','The transmitter always inhibits any cell it reaches'],'A transmitter’s effect depends on the receptor and cellular context, not solely its chemical name.'),
      check('How can a synaptic signal be brought to an end?',['Transmitter can be removed by uptake, breakdown or diffusion','The receptor must permanently stop responding after one signal','Every synapse permanently stores all released transmitter'],'Removal or inactivation of transmitter helps terminate receptor activation; mechanisms vary by synapse.')
    ]);

  add('immune-memory','The second encounter starts with a head start',
    'After an adaptive response, memory cells can persist. Re-exposure to a matching antigen can then produce a faster, more effective response than the first encounter.',
    'Why can a booster exposure strengthen an established antigen-specific response?',
    ['The first exposure generated activated and memory cell populations.','A later matching exposure can reactivate suitable memory cells.','Expansion and further selection can improve the response.'],
    'The response builds on existing immune memory rather than beginning from an entirely naive state.',[
      check('Does memory against one antigen guarantee equal protection against all unrelated pathogens?',['No; adaptive recognition is antigen-specific','Yes; every memory cell recognizes every microbe','Yes; specificity disappears after the first response'],'Memory depends on what the receptors recognize. Related antigens can sometimes cross-react, but unrelated protection is not guaranteed.'),
      check('Why can protection differ when a pathogen’s key surface antigens change?',['Existing antibodies or memory receptors may bind the changed targets less well','Memory cells recognize only the age of a pathogen','Recognition is independent of antigen structure'],'Changes to recognized epitopes can alter the effectiveness of a pre-existing antigen-specific response.')
    ],'immune');

  add('xylem','Much of the pipeline is made from dead cells',
    'Many mature water-conducting xylem elements are dead cells with reinforced walls. Their open interiors form useful conduits after the living contents are lost.',
    'Why can transpiration from leaves move water up xylem without each conducting cell spending ATP to pump it upward?',
    ['Evaporation from leaf surfaces lowers water potential.','Tension is transmitted through cohesive water columns.','Xylem provides a supported pathway for this bulk flow.'],
    'The water-potential gradient and cohesion–tension mechanism drive the flow.',[
      check('What is an embolism in the context of xylem transport?',['A gas-filled interruption that can hinder water flow','A pressure increase caused by phloem sugar loading','A continuous water column under tension'],'Gas can interrupt the continuity of water columns and reduce transport through affected conduits.'),
      check('Why are lignified walls useful in water-conducting xylem?',['They help resist collapse under tension','They supply ATP to pump water in each dead conduit','They make the conduit actively contract like a ventricle'],'Reinforced walls provide mechanical support under the negative pressures associated with transpiration.')
    ],'plant-transport');

  add('phloem','Source and sink can switch',
    'A storage organ can import sugars while filling and later export them during new growth. “Source” and “sink” describe a current transport role, not a permanent organ label.',
    'A stored tuber supplies sugars to a sprouting shoot before leaves are active. Identify source and sink.',
    ['Stored carbohydrates are mobilized in the tuber.','Sugars are exported toward the growing shoot.','The shoot uses the incoming material for growth and metabolism.'],
    'The tuber is the source; the growing shoot is the sink.',[
      check('In the pressure-flow model, sugar loading at a source tends to promote what?',['Water entry and higher local turgor pressure','Water loss that lowers source turgor pressure','Equal pressure at source and sink in every condition'],'Adding sugars lowers water potential, encouraging water entry and helping generate pressure for bulk flow.'),
      check('Must all phloem transport move downward?',['No; it moves from sources toward sinks, whose locations vary','Yes; gravity alone powers all sugar movement','Yes; roots can never export stored material'],'Phloem can carry assimilates upward or downward in different pathways depending on source–sink relationships.')
    ],'plant-transport');

  add('stomata','A pore negotiates two exchanges at once',
    'Opening stomata facilitates CO₂ entry but also exposes moist internal leaf surfaces to water loss. Guard cells adjust the pore as conditions change.',
    'Why can closing stomata conserve water while reducing photosynthetic carbon gain?',
    ['Water vapor leaves the leaf mainly through open stomatal pathways.','CO₂ also diffuses through those pathways into the leaf.','Narrowing the pore restricts both exchanges.'],
    'Water conservation can come at the cost of a smaller CO₂ supply.',[
      check('Which cells directly change shape to adjust a stomatal pore?',['Guard cells','Red blood cells','Root xylem vessel elements'],'Changes in guard-cell solutes, water content and turgor adjust stomatal aperture.'),
      check('Why does bright light not guarantee maximum stomatal opening in every situation?',['Water status and other signals also regulate guard cells','Light overrides water-stress signals in every plant','Stomatal aperture remains fixed after a leaf matures'],'Stomatal behavior integrates light, CO₂, water status and other signals; severe water limitation can favor closure.')
    ],'plant-transport');

  add('genetic-drift','Chance is stronger in a small sample',
    'Genetic drift changes allele frequencies through random sampling across generations. Small populations can lose variants even when those variants are not harmful.',
    'A storm leaves a few survivors by chance. Why can the next generation have different allele frequencies?',
    ['The survivors are a small sample of the original population.','Their allele mix need not match the original proportions.','Their descendants inherit from that restricted sample.'],
    'A bottleneck can shift allele frequencies without the alleles causing survival differences.',[
      check('Which scenario most clearly describes genetic drift?',['A neutral allele disappears because its few carriers leave no offspring by chance','A resistance allele increases because it improves survival during treatment','Birds learn a new feeding behavior within one afternoon'],'Drift is random sampling of inherited variants. Differential success caused by the variant is selection.'),
      check('What can happen when a few individuals establish a new population?',['A founder effect can change allele frequencies','The new population must contain every ancestral allele','All alleles instantly acquire equal frequencies'],'Founders bring only a sample of the original gene pool, which can differ from the source population.')
    ],'evolution');

  add('food-webs','A feeding link carries matter and energy',
    'Food-web arrows conventionally point from the food resource toward its consumer. They trace transfer, which is why a grass-to-rabbit arrow points toward the rabbit.',
    'A predator declines, allowing a plant-eating prey species to increase. What might happen to plants?',
    ['Fewer predators may allow more prey to survive.','More herbivores can increase grazing pressure.','Plant abundance may fall if this pressure is not offset by other factors.'],
    'A decrease in plants is a plausible indirect effect, not a guaranteed outcome in every web.',[
      check('Why is energy available to higher trophic levels usually smaller?',['Organisms use energy and dissipate heat at each transfer','All energy in a prey animal enters the next consumer unchanged','Higher trophic levels always receive more energy than producers'],'Respiration and incomplete transfer limit the usable energy passed onward through feeding relationships.'),
      check('Why can removing one species have several different effects in a food web?',['The species may share multiple direct and indirect links','Every food web is a single chain','Only the largest predator interacts with other species'],'Food webs are networks; alternate foods, competitors and indirect interactions complicate predictions.')
    ]);

  add('population-growth','Carrying capacity can move',
    'Carrying capacity summarizes the population an environment can support under particular conditions. Food, space, disturbance and climate can change those conditions over time.',
    'A population grows rapidly after colonizing a resource-rich habitat, then slows. How can the logistic model explain this?',
    ['At low density, resources are relatively abundant per individual.','As density rises, limiting resources or other density-dependent effects intensify.','Per-capita net growth declines near the modeled carrying capacity.'],
    'The logistic model predicts slowing growth as density approaches a resource-limited capacity.',[
      check('In an exponential-growth model, what remains constant?',['The per-capita growth rate','The absolute number added every generation','The available resources forever in every real habitat'],'A constant per-capita rate means the absolute increment grows with population size; real resource limits can invalidate the model.'),
      check('A drought reduces usable habitat. What might happen to carrying capacity?',['It may decrease','It must remain fixed because it is a species constant','It becomes equal to the birth rate'],'Carrying capacity depends on environmental conditions and resource availability, not just species identity.')
    ]);

  add('carbon-cycle','An atom can visit many kinds of life',
    'A carbon atom fixed into a leaf can enter a herbivore, a decomposer or the atmosphere. Carbon cycling describes these transfers without implying that the atom disappears when energy is used.',
    'Trace one carbon atom from atmospheric CO₂ through a plant and back to the atmosphere by respiration.',
    ['Photosynthetic carbon fixation incorporates the carbon into an organic molecule.','That carbon can enter plant metabolic compounds.','Respiratory decarboxylation can release it again as CO₂.'],
    'Atmospheric CO₂ → organic plant carbon → respiratory CO₂.',[
      check('Why is fast photosynthesis not automatically permanent carbon storage?',['Respiration, decomposition or burning can return the carbon','Photosynthesis cannot use CO₂','Carbon atoms are destroyed when sugar is made'],'Long-term storage depends on the balance of uptake, release and the persistence of carbon reservoirs.'),
      check('Burning a carbon-containing fuel primarily transfers its carbon into which pool?',['The atmosphere as CO₂ under complete combustion','Living biomass without any carbon entering the air','The original fuel pool with no carbon transfer'],'Complete oxidation converts fuel carbon to CO₂; carbon is transferred rather than eliminated.')
    ]);

  add('nitrogen-cycle','Abundant does not mean directly usable',
    'The atmosphere contains abundant N₂, but most organisms cannot use it directly. Nitrogen fixation converts it into forms that can enter biological pathways.',
    'A plant has plenty of atmospheric N₂ around its leaves but insufficient usable soil nitrogen. Why can growth still be limited?',
    ['The plant needs nitrogen for molecules including amino acids and nucleotides.','Most plants do not directly fix atmospheric N₂.','They depend on accessible combined nitrogen, often supplied through soil transformations.'],
    'Atmospheric abundance cannot replace access to biologically usable nitrogen compounds.',[
      check('Which process returns nitrogen to the atmosphere as nitrogen gas under suitable conditions?',['Denitrification','Photosynthetic carbon fixation','Translation'],'Denitrifying microbes can reduce nitrate and related compounds toward gaseous nitrogen products.'),
      check('What is the key transformation in biological nitrogen fixation?',['N₂ is reduced to ammonia that can enter metabolism','Nitrate is returned to the atmosphere as nitrogen gas','Ammonia is oxidized first to nitrite and then nitrate'],'Nitrogen-fixing organisms use specialized enzymes to convert N₂ into ammonia, requiring substantial energy.')
    ]);

  add('bacteria','No nucleus does not mean no organization',
    'Bacteria have a plasma membrane, ribosomes and organized cellular processes. Their DNA is not enclosed by a membrane-bound nucleus, but they are complete cells.',
    'A microbe has ribosomes and a membrane but no membrane-enclosed nucleus. Does that make it a virus?',
    ['Ribosomes and a cellular boundary support cell-based metabolism and protein synthesis.','Bacteria lack a membrane-enclosed nucleus.','Viruses do not have their own complete cellular translation machinery.'],
    'No. These features are consistent with a prokaryotic cell such as a bacterium.',[
      check('What directly increases the number of bacteria in ordinary binary fission?',['One cell replicates its DNA and divides into two cells','A bacterium exchanges a plasmid without dividing','A bacterium forms four haploid products by meiosis'],'Binary fission includes genome replication and division into daughter cells; it is not meiotic gamete formation.'),
      check('Can a bacterium gain a gene without inheriting it from its immediate parent cell?',['Yes; horizontal gene transfer can introduce DNA','No; DNA never moves between bacterial lineages','Only if it first grows a nucleus'],'Transformation, transduction and conjugation are routes of horizontal genetic transfer.')
    ]);

  add('viruses','A genome needs a host’s machinery',
    'Viruses carry genetic information but lack a complete independent system for making proteins and reproducing. Their replication depends on entering suitable host cells.',
    'Why does a virus fail to reproduce on a surface that has nutrients but no living host cells?',
    ['A virion lacks the full cellular machinery needed for independent reproduction.','Nutrients alone do not supply working ribosomes and host functions.','Replication requires a compatible cellular environment.'],
    'Food molecules alone cannot replace the host machinery the virus needs.',[
      check('Why can a virus infect one cell type more readily than another?',['Entry receptors and intracellular compatibility can differ','Every cell has an equal ability to support every viral genome','Receptor recognition alone guarantees successful replication in every cell'],'Host range depends on molecular entry requirements and the cell’s ability to support the replication cycle.'),
      check('Why would an antibiotic targeting bacterial ribosomes not directly stop a virus by the same target mechanism?',['Viruses lack their own bacterial ribosomes','All antibiotics enter only cells with a nucleus','A virus has a thicker peptidoglycan wall than a bacterium'],'A drug’s target matters. Viruses use host translation machinery rather than carrying bacterial ribosomes.')
    ]);

  add('antibiotic-resistance','Treatment changes which variants succeed',
    'An antibiotic can remove susceptible bacteria while resistant variants survive and reproduce. Resistance can also spread when bacteria acquire resistance genes from other bacteria.',
    'A mixed bacterial population contains a rare resistant variant before an antibiotic is applied. Why can its proportion rise afterward?',
    ['The antibiotic inhibits or kills susceptible members more effectively.','Resistant members contribute a larger share of the survivors.','Their reproduction increases the representation of resistance in the population.'],
    'Selection changes the population’s composition; the drug need not create the original variant.',[
      check('In a resistant bacterial infection, what is resistant to the antibiotic?',['The bacterial population','The patient’s entire body in the genetic sense','Every immune cell’s nucleus'],'Antibiotic resistance refers to bacterial traits that reduce susceptibility, not the person becoming genetically resistant to the medicine.'),
      check('A resistance plasmid moves into a previously susceptible bacterium. What process best describes this change?',['Horizontal gene transfer','An individual animal adapting its behavior','Ordinary mitochondrial respiration'],'Transfer of resistance genes can spread the trait between bacteria without waiting for a new mutation in each lineage.')
    ]);

  add('cell-differentiation','Shared instructions, different programs',
    'Many specialized cell types share nearly the same genome. Their different identities arise largely from regulated gene expression and stable patterns of cellular organization.',
    'A neuron and a muscle cell from one person contain similar DNA. Why do they make different structures?',
    ['Signals and regulatory proteins activate different gene-expression programs.','Different RNAs and proteins accumulate.','These products support distinct structures and cellular functions.'],
    'Different use of a shared genome helps produce different cell identities.',[
      check('Which finding supports differentiation by gene regulation?',['Two cell types have similar DNA but different expressed RNAs','A neuron uses no proteins','Each tissue has a completely different genetic code'],'Different expression patterns can generate specialized functions without requiring an entirely different genome.'),
      check('Does ordinary differentiation require deleting every gene a cell is not currently using?',['No; many genes remain present but regulated','Yes; inactive genes can never remain in a nucleus','Yes; every cell must erase all other tissue identities from DNA'],'Cells generally retain unused genes; regulatory states determine which programs are active.')
    ],'stem-cells');

  add('stem-cells','Self-renewal and specialization are different abilities',
    'A stem cell can maintain a stem-cell population while generating more specialized descendants. The range of cell types it can produce depends on its potency and context.',
    'A cell divides repeatedly but can generate only one mature cell type. Does division alone prove it is pluripotent?',
    ['Self-renewal concerns maintaining the stem-cell state through divisions.','Potency concerns the range of descendant cell types.','Producing only one demonstrated lineage does not establish broad developmental potential.'],
    'No. Repeated division and pluripotency are different properties that need different evidence.',[
      check('Which ability is central to the definition of a stem cell?',['Self-renewal together with production of differentiated descendants','Inability to respond to any signal','Permanent absence of DNA'],'Stem cells sustain themselves and can give rise to more specialized progeny.'),
      check('Why should “stem cell” not be treated as one uniform cell type?',['Stem cells differ in potency, tissue origin and regulatory state','All stem cells necessarily form an entire organism','All stem cells behave identically in every environment'],'Different stem-cell populations have different developmental capacities and requirements.')
    ],'stem-cells');

  add('pcr','Primers define the region to copy',
    'PCR amplifies a chosen DNA region using primers that bind near its boundaries. It does not automatically copy every sequence in a sample equally.',
    'An ideal PCR starts with one double-stranded target copy and doubles the target count in each cycle. How many after five cycles?',
    ['Apply a doubling for each ideal cycle.','The model gives 1 × 2⁵.','Real reactions may depart from perfect doubling and eventually plateau.'],
    'The idealized count is 32 target copies; this is a model, not a guarantee for a real reaction.',[
      check('Why does PCR require a heat-stable DNA polymerase?',['Repeated high-temperature strand-separation steps would disable many ordinary enzymes','The polymerase must turn into a primer each cycle','PCR never uses temperature changes'],'Heat stability lets the enzyme remain useful through repeated thermal cycling.'),
      check('A primer cannot bind its intended target sequence. What is the most direct consequence?',['Efficient amplification of that target may fail','The sample automatically becomes a protein','Every unrelated sequence is necessarily amplified perfectly'],'Polymerase requires an appropriately annealed primer to initiate synthesis of the intended product.')
    ],'pcr');

  add('gel-electrophoresis','Distance can estimate size, not identity',
    'In a typical agarose gel, smaller linear DNA fragments migrate farther under comparable conditions. A band’s position estimates size against a ladder; it does not reveal the full DNA sequence.',
    'Two samples produce bands at the same position in an agarose gel. Must those fragments have identical sequences?',
    ['Migration depends strongly on fragment size under the stated conditions.','Different sequences can have the same length.','Equal migration therefore does not establish sequence identity.'],
    'No. Similar band position supports similar size, not identical sequence.',[
      check('Which direction does DNA generally migrate in an electric field during standard gel electrophoresis?',['Toward the positive electrode','Toward the negative electrode','Only toward the nearest light source'],'The phosphate backbone gives DNA a net negative charge, so the electric field drives it toward the positive electrode.'),
      check('Why include a DNA size ladder beside unknown samples?',['It provides fragments of known sizes for comparison','It changes every sample into the same sequence','It supplies the only electrical charge in the gel'],'Known reference bands help estimate unknown fragment sizes from their migration.')
    ]);

  add('crispr','A targeted cut does not specify every repair outcome',
    'In common CRISPR–Cas editing workflows, a guide directs a nuclease to a target. The cell’s repair processes then influence whether a small disruption, a precise edit or another outcome results.',
    'Two cells receive the same guide and nuclease, but repair the cut differently. Why can the final sequences differ?',
    ['Targeting identifies where the nuclease should act.','A cut can be processed by different repair outcomes.','Joining errors or use of a supplied template can change the result.'],
    'Target selection and DNA repair are separate stages, so identical targeting need not produce identical edits.',[
      check('What primarily provides sequence targeting in a typical CRISPR–Cas9 system?',['Complementarity between guide RNA and target DNA, with the required neighboring motif','The color of the cell membrane','A ribosome reading a protein’s name'],'Guide–target complementarity and the nuclease’s sequence requirements help determine recognition.'),
      check('Why must a proposed genome edit be checked after the procedure?',['Editing can be incomplete or yield unintended changes','A correctly matched guide guarantees one repair outcome in every cell','A cut alone proves that a precise intended edit was installed'],'Validation checks the intended target, possible unintended outcomes and whether the desired edit actually occurred.')
    ],'crispr');

  global.BIO_ENRICHMENT = cards;
})(window);
