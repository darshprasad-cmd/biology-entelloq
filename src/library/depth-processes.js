/* Authored depth lessons: bioenergetics, inheritance, physiology and living systems.
 * All investigation values are illustrative teaching data, never clinical records.
 * References support the science; explanations and learning tasks are original. */
(function (global) {
  'use strict';
  var units = global.BIO_DEPTH = global.BIO_DEPTH || {};
  var bio = 'https://openstax.org/books/biology-2e/pages/';
  var anatomy = 'https://openstax.org/books/anatomy-and-physiology-2e/pages/';
  function ref(title, url) { return {title:title,url:url}; }
  function add(id, objectives, mechanism, misconception, investigation, transfer, sources) {
    units[id] = {objectives:objectives,
      mechanism:mechanism.map(function (step) { return {title:step[0],body:step[1]}; }),
      misconception:{claim:misconception[0],correction:misconception[1]},
      investigation:investigation,
      transfer:{question:transfer[0],hint:transfer[1],answer:transfer[2]},sources:sources};
  }

  add('light-reactions',[
    'Trace electrons from water to NADPH through both photosystems.',
    'Explain why a sealed thylakoid membrane matters for ATP production.',
    'Distinguish electron transfer from carbon fixation using two measurements.'
  ],[
    ['Excite and replace electrons','A pigment absorbs a photon, and excitation energy can reach a photosystem reaction center. Charge separation transfers an electron to an acceptor. In oxygenic photosynthesis, photosystem II replaces lost electrons by oxidizing water. This releases oxygen and protons; the oxygen atoms in released O₂ therefore originate in water rather than carbon dioxide.'],
    ['Build two usable energy supplies','Electrons pass through carriers toward photosystem I. These transfers help establish a proton gradient across the thylakoid membrane. A second light-driven excitation supports reduction of NADP⁺ to NADPH. Protons returning from the lumen to the stroma through ATP synthase support ATP formation. Electron flow and ATP production are connected but distinct processes.'],
    ['Match supply to demand','The Calvin cycle consumes ATP and NADPH, regenerating carriers needed by the light reactions. Cyclic electron flow around photosystem I can support extra ATP formation without net NADPH or oxygen production. Consequently, oxygen release alone cannot reveal every route of electron movement or establish the amount of carbon fixed by a leaf.']
  ],['The light reactions directly turn CO₂ into glucose.','Light reactions provide ATP and reducing power; carbon incorporation occurs through carbon-fixation reactions. These processes depend on each other without being identical. A preparation can release oxygen yet fail to accumulate carbohydrate if carbon fixation is restricted or its required enzymes are absent.'],{
    title:'When oxygen and ATP disagree',
    context:'Illustrative fictional readings from equal amounts of isolated thylakoids over the same interval; light intensity and electron acceptor availability are matched.',
    columns:['Condition','O₂ output (relative units)','ATP output (relative units)'],
    rows:[['Dark control','0','0'],['Light, intact membrane','10','12'],['Light, proton leak','9','2']],
    question:'Which result supports a role for membrane coupling beyond light absorption, and what alternative must be checked?',
    hint:'Compare the proportional change in oxygen output with the change in ATP output.',
    answer:'The leak preparation keeps most oxygen output while ATP output falls sharply. This supports a requirement for retaining a proton gradient; direct damage to ATP synthase must also be excluded.',
    reasoning:['Oxygen output indicates continued water oxidation and electron movement.','A leaky membrane allows gradient energy to dissipate without passing through ATP synthase.','An intact-membrane control and an independent ATP-synthase activity check distinguish coupling failure from enzyme damage.'],
    limitation:'These invented relative values are not a quantitative photosynthesis model. Isolated membranes do not represent whole-leaf carbon balance.'
  },['Could ATP still form without measurable oxygen release?','Consider a route that uses photosystem I without net water oxidation.','Yes. Cyclic electron flow can reinforce the proton gradient and support ATP formation without net oxygen release or NADPH production; suitable illumination and a functional coupling system are still needed.'],[
    ref('OpenStax: Light-dependent reactions',bio+'8-2-the-light-dependent-reactions-of-photosynthesis'),
    ref('NCBI Bookshelf: Chloroplasts and photosynthesis','https://www.ncbi.nlm.nih.gov/books/NBK26819/')
  ]);

  add('calvin-cycle',[
    'Track carbon through fixation, reduction and RuBP regeneration.',
    'Calculate the net triose-phosphate output from a specified CO₂ input.',
    'Explain why light-independent chemistry remains linked to illumination.'
  ],[
    ['Attach inorganic carbon','Rubisco catalyzes attachment of CO₂ to the five-carbon acceptor RuBP. The unstable six-carbon product yields two three-carbon molecules. This incorporates inorganic carbon into organic material but does not yet produce a net sugar export. The acceptor itself must be rebuilt so repeated fixation can continue in the chloroplast stroma.'],
    ['Invest ATP and reducing power','ATP and NADPH support conversion of fixation products into triose phosphates. Carbon is reduced as electrons are supplied through NADPH. For three CO₂ fixed in the conventional cycle accounting, six three-carbon products become available; only one represents net export. The remainder contains the carbon needed to regenerate the acceptor pool.'],
    ['Regenerate and regulate','Regeneration uses additional ATP to rearrange five triose phosphates into three RuBP molecules. Producing one net triose phosphate therefore requires nine ATP and six NADPH in this simplified accounting. Actual leaf costs can be higher because photorespiration and other processes also consume resources. Light also influences enzyme activity and stromal conditions.']
  ],['The Calvin cycle runs equally well throughout the night because it is light-independent.','Its individual carbon-fixation reactions do not absorb photons directly, but sustained activity needs ATP, NADPH and an appropriate enzyme state. Darkness changes these supplies and regulatory conditions. Calling it light-independent describes the immediate chemistry, not freedom from the light reactions in a functioning leaf.'],{
    title:'Carbon export or acceptor maintenance?',
    context:'Theoretical carbon accounting for the conventional Calvin cycle, assuming complete regeneration and no competing carbon losses.',
    columns:['CO₂ fixed (molecules)','Triose phosphates formed','Triose phosphates retained for regeneration'],
    rows:[['3','6','5'],['6','12','10'],['9','18','15']],
    question:'For nine CO₂, how many net triose phosphates can leave, and why is exporting all eighteen unsustainable?',
    hint:'Subtract regeneration requirements before calculating net export.',
    answer:'Three triose phosphates can leave. Exporting all eighteen removes the carbon required to rebuild RuBP, so subsequent fixation would run out of acceptor.',
    reasoning:['Eighteen minus fifteen leaves three net exported molecules.','Their nine total carbons match the nine newly fixed CO₂ carbons.','Regeneration recycles existing carbon; it is not an optional extra added after sugar production.'],
    limitation:'This stoichiometric model excludes photorespiration and alternative carbon allocation. It predicts accounting, not the rate of a real leaf.'
  },['Would doubling CO₂ always double net carbon fixation?','Identify at least one input besides CO₂ and one enzyme limit.','No. ATP supply, NADPH supply, enzyme capacity and RuBP regeneration can become limiting. A prediction requires holding light, temperature and water status constant and measuring the response rather than assuming a linear relationship.'],[
    ref('OpenStax: Carbon fixation and the Calvin cycle',bio+'8-3-using-light-energy-to-make-organic-molecules'),
    ref('NCBI Bookshelf: Photosynthesis','https://www.ncbi.nlm.nih.gov/books/NBK9861/')
  ]);

  add('glycolysis',[
    'Separate ATP investment from gross and net ATP production.',
    'Track glucose carbon and NAD⁺ through glycolysis.',
    'Use carrier measurements to identify a constraint on sustained glycolysis.'
  ],[
    ['Invest before the split','In the cytosol, glycolysis converts one six-carbon glucose into two three-carbon pyruvate molecules. Early phosphorylation steps consume two ATP in the standard pathway. These transformations retain and prepare the sugar for cleavage. An ATP investment is compatible with an energy-yielding pathway because later reactions return more ATP than the beginning consumes.'],
    ['Recover ATP and reduce a carrier','Both three-carbon branches pass through reactions that form ATP by substrate-level phosphorylation. Four ATP are produced per glucose, giving a net gain of two after the initial investment. Oxidation also reduces two NAD⁺ to two NADH. Glycolysis itself releases no CO₂: all six glucose carbons remain in the two pyruvates.'],
    ['Keep the pathway supplied','Continued glycolysis needs NAD⁺ as well as glucose, ADP and phosphate. If NADH is not reoxidized, the available NAD⁺ pool becomes limiting. Respiration or fermentation can regenerate this carrier through different routes. Pathway rate also responds to enzyme regulation; having abundant glucose alone does not guarantee an unlimited ATP supply.']
  ],['Glycolysis produces four ATP per glucose, so the net gain is four.','Four ATP is the gross production in the standard pathway. Two ATP were spent before the payoff phase, leaving a net gain of two. Keep the accounting boundary consistent: ATP subsequently obtained from NADH belongs to another process, not to glycolytic substrate-level phosphorylation.'],{
    title:'Find the missing reusable input',
    context:'Fictional cell-free pathway results after equal intervals. Glucose, ADP, phosphate and enzyme amounts begin matched; values are illustrative, not an experimental recipe.',
    columns:['System','Available NAD⁺ at end (relative units)','Net ATP formed (relative units)'],
    rows:[['Carrier recycling present','8','20'],['Carrier recycling absent','1','5'],['No glucose control','9','0']],
    question:'Why can the second system slow even though it still contains glucose, and what would strengthen that explanation?',
    hint:'Ask whether a reactant used during oxidation is regenerated elsewhere.',
    answer:'NAD⁺ depletion can constrain the oxidation step. Showing that glucose remains and that selective restoration of carrier recycling restores flux would strengthen the explanation.',
    reasoning:['The no-glucose control links ATP accumulation to substrate availability.','Lower NAD⁺ accompanies lower ATP output when recycling is absent.','Correlation alone does not rule out enzyme damage or altered pH, which require matched controls.'],
    limitation:'Final pool sizes do not measure all reaction rates. These data cannot establish which glycolytic enzyme controls flux in a living tissue.'
  },['If three glucose molecules complete standard glycolysis, how many pyruvates and net ATP result?','Apply the per-glucose carbon and ATP accounting separately.','Six pyruvate molecules and six net ATP result, with six NADH also formed. This assumes the standard pathway completes and excludes ATP from later respiration.'],[
    ref('OpenStax: Glycolysis',bio+'7-2-glycolysis')
  ]);

  add('citric-acid-cycle',[
    'Explain how the cycle regenerates its four-carbon acceptor.',
    'Distinguish direct ATP production from reduced-carrier production.',
    'Predict how restricted carrier recycling changes cycle activity.'
  ],[
    ['Connect pyruvate to the cycle','Before entering the cycle, pyruvate is converted to acetyl-CoA, releasing CO₂ and reducing NAD⁺. This link reaction is separate from the cycle itself. The two-carbon acetyl group combines with four-carbon oxaloacetate to form citrate. Counting these stages separately prevents attributing every respiratory CO₂ molecule to the same reaction.'],
    ['Transfer electrons while rearranging carbon','A conventional turn releases two CO₂ and forms three NADH, one FADH₂-equivalent reduced carrier and one GTP or ATP. The largest immediate output is reduced carriers, not ATP. Newly entering acetyl carbons are not necessarily the carbons released during that first turn; carbon rearrangements make isotope tracing more subtle than net equations suggest.'],
    ['Regenerate an acceptor and share intermediates','Oxaloacetate is regenerated, allowing another acetyl group to enter. In eukaryotes most cycle enzymes operate in the mitochondrial matrix, with succinate dehydrogenase embedded in the inner membrane. Intermediates also support biosynthesis. Removing them requires replenishment reactions, while continued oxidation depends on adequate oxidized electron carriers supplied by linked metabolic pathways.']
  ],['The cycle directly uses oxygen to turn carbon into CO₂.','No step in the conventional citric acid cycle directly consumes molecular oxygen. In aerobic cells, oxygen supports electron transport, which helps regenerate oxidized carriers. Oxygen shortage can therefore constrain the cycle indirectly. The oxygen atoms in products cannot be assigned simply by imagining inhaled O₂ attaching to each fuel carbon.'],{
    title:'A downstream constraint travels upstream',
    context:'Illustrative fictional mitochondrial-system readings with matched substrate input and temperature. The intervention selectively reduces electron-carrier reoxidation in the model.',
    columns:['Condition','NADH/NAD⁺ ratio','Cycle turnover (relative units)'],
    rows:[['Carrier reoxidation available','0.4','10'],['Reoxidation restricted','3.0','3'],['Reoxidation restored','0.6','9']],
    question:'How can restricting a downstream process slow the cycle without directly inhibiting a cycle enzyme?',
    hint:'A carrier can be abundant overall but scarce in the oxidation state needed next.',
    answer:'Reduced carriers accumulate and the oxidized NAD⁺ supply becomes less favorable for further oxidation. Restoring reoxidation supports recovery, consistent with coupling between pathways.',
    reasoning:['The ratio rises while turnover falls, indicating a shift toward reduced carrier.','Several cycle reactions require oxidized electron acceptors.','Recovery argues against permanent enzyme destruction, though it does not identify every regulatory effect.'],
    limitation:'Relative values illustrate a mechanism. ATP/ADP, substrate pools and enzyme regulation also influence real cycle flux.'
  },['Why might rapidly growing cells replenish cycle intermediates even when fuel is abundant?','Follow the carbon leaving the cycle for biosynthesis.','Fuel supplies acetyl groups, but diverted intermediates remove the acceptor framework needed for continued cycling. Replenishment maintains that pool while supporting synthesis of molecules such as amino acids.'],[
    ref('OpenStax: Pyruvate oxidation and the citric acid cycle',bio+'7-3-oxidation-of-pyruvate-and-the-citric-acid-cycle')
  ]);

  add('electron-transport-chain',[
    'Trace respiratory electrons from reduced carriers to oxygen.',
    'Distinguish proton pumping, oxygen consumption and ATP synthesis.',
    'Interpret why oxygen consumption and ATP yield can move differently.'
  ],[
    ['Transfer electrons through carriers','In aerobic mitochondrial respiration, electrons from fuel oxidation enter a sequence of carriers in the inner membrane. NADH and succinate-linked pathways enter at different points. Electron transfer toward oxygen releases usable free energy overall. Oxygen is reduced to water at the end; it is not the carbon source for respiratory carbon dioxide.'],
    ['Store part of the released energy','Complexes I, III and IV contribute to proton translocation from the matrix toward the intermembrane space; complex II does not pump protons. This establishes electrical and concentration differences across the inner membrane. The chain therefore conserves some oxidation energy in a gradient, while some energy is dissipated rather than captured as ATP.'],
    ['Couple flow to cellular work','ATP synthase uses proton return to support ATP formation. When the gradient becomes harder to increase, electron flow can slow; when protons leak back, respiration may continue with less ATP captured. Transport costs and leak pathways vary, so a single fixed ATP yield cannot describe every cell or every physiological condition.']
  ],['More oxygen consumption always means proportionally more ATP production.','Oxygen consumption reports terminal electron transfer, whereas ATP output also depends on coupling. A proton leak can allow rapid electron flow while diverting gradient energy away from ATP synthase. Compare both outputs and membrane integrity before inferring energetic efficiency from respiration alone.'],{
    title:'Compare respiratory coupling',
    context:'Fictional model systems supplied with the same fuel and ADP availability; relative outputs are measured over an equal interval.',
    columns:['System','O₂ consumed (relative units)','ATP formed (relative units)'],
    rows:[['Intact coupling','10','25'],['Increased proton leak','15','10'],['Electron flow blocked','1','1']],
    question:'Which system has the lowest ATP captured per oxygen consumed among the actively respiring systems?',
    hint:'Compare ratios rather than the oxygen column alone.',
    answer:'The proton-leak system captures about 0.67 ATP units per oxygen unit versus 2.5 for intact coupling. It respires faster while capturing less ATP per oxygen consumed.',
    reasoning:['Dividing matched relative outputs gives a comparative index, not a universal molecular stoichiometry.','Proton return through a leak bypasses ATP synthesis.','The blocked system demonstrates that suppressing electron flow differs from uncoupling it.'],
    limitation:'The relative scale is invented. Substrate entry points, membrane damage and ATP consumption must be controlled before applying this reasoning to real measurements.'
  },['Why can blocking the final electron acceptor cause NADH to accumulate?','Consider what happens when downstream carriers cannot pass electrons onward.','The carrier chain becomes more reduced, limiting further electron entry. NADH reoxidation slows, which can constrain upstream fuel oxidation even though those reactions do not directly use oxygen.'],[
    ref('OpenStax: Oxidative phosphorylation',bio+'7-4-oxidative-phosphorylation'),
    ref('NCBI Bookshelf: Energy conversion','https://www.ncbi.nlm.nih.gov/books/NBK21063/')
  ]);

  add('chemiosmosis',[
    'Explain how an electrochemical gradient can power ATP synthesis.',
    'Predict proton movement from concentration and membrane voltage together.',
    'Use a membrane-control comparison to distinguish a gradient from its source.'
  ],[
    ['Separate charge and concentration','A proton gradient is more than a difference in acidity. Because protons carry positive charge, membrane voltage also influences their movement. The combination is an electrochemical potential difference. An intact, selectively permeable membrane can maintain this stored free energy even though individual protons continue moving and the system is not static.'],
    ['Connect proton flow to molecular rotation','Proton movement through the membrane portion of ATP synthase drives structural changes and rotation coupled to its catalytic portion. These changes allow ADP and phosphate to be joined and ATP released. The machine requires appropriate orientation, substrates and a sufficient driving force; merely placing an enzyme beside concentrated protons does not ensure useful ATP production.'],
    ['Recognize a reusable energy principle','Respiratory electron transfer, photosynthetic electron transfer and experimentally imposed gradients can all provide the driving force. The immediate requirement is the usable gradient, not a particular fuel molecule. Under some conditions ATP synthase can run in reverse, hydrolyzing ATP to support ion pumping; cells regulate this behavior to limit waste.']
  ],['ATP synthase needs electrons to pass through it.','Electrons pass through electron-transfer components that can help create the proton gradient. ATP synthase couples ion movement and structural changes to ATP chemistry; it is not another electron carrier in that chain. Separating the gradient-producing system from the gradient-using machine explains why different energy sources can support the same principle.'],{
    title:'Can a prepared gradient do work?',
    context:'Fictional membrane-vesicle model with the same correctly oriented ATP synthase, ADP and phosphate. Voltage is held equal; only the stated pH difference or membrane permeability changes.',
    columns:['Vesicle condition','Initial pH difference','ATP output (relative units)'],
    rows:[['Sealed, gradient present','3','8'],['Sealed, no gradient','0','0'],['Leaky, gradient initially present','3','1']],
    question:'What does the sealed-gradient result establish, and why is the leaky comparison needed?',
    hint:'Separate the source of a gradient from the ability to retain it.',
    answer:'A prepared gradient can support ATP synthesis without simultaneous electron transport in this model. The leaky comparison shows that a nominal initial difference is insufficient if it dissipates rapidly.',
    reasoning:['The no-gradient control tests dependence on stored electrochemical energy.','Matched ATP synthase and substrates avoid confusing gradient effects with enzyme abundance.','Low output from leaky vesicles is consistent with protons bypassing the coupling machinery.'],
    limitation:'The model fixes voltage and orientation. Real membranes include ion movements, variable ATP demand and additional transport costs.'
  },['Can equal pH on both sides prove there is no proton-driving force?','Remember that protons are charged particles.','No. A membrane voltage can still favor proton movement when concentrations are equal. Both the electrical difference and concentration difference are needed to evaluate the total driving force.'],[
    ref('NCBI Bookshelf: Energy conversion in mitochondria and chloroplasts','https://www.ncbi.nlm.nih.gov/books/NBK21063/')
  ]);

  add('fermentation',[
    'Explain the role of NAD⁺ regeneration during fermentation.',
    'Compare lactate and ethanol pathways without conflating their carbon outputs.',
    'Infer how fermentation can sustain glycolytic ATP production.'
  ],[
    ['Identify the carrier bottleneck','Glycolysis reduces NAD⁺ while extracting energy from glucose. If cells cannot reoxidize the resulting NADH fast enough through respiration, the oxidized carrier pool becomes limiting. Fermentation pathways provide alternative routes for carrier recycling. Their importance lies in maintaining a reaction network, rather than creating a large additional supply of ATP themselves.'],
    ['Use an organic electron acceptor','In lactate fermentation, reduction of pyruvate regenerates NAD⁺ without releasing CO₂ in that conversion. In alcoholic fermentation, pyruvate first loses CO₂ to form acetaldehyde, which is reduced to ethanol. Both routes can recycle NAD⁺, but they differ in products and carbon handling; visible gas production cannot be assumed for every fermentation.'],
    ['Keep the accounting boundary clear','For the familiar glucose-to-lactate or glucose-to-ethanol pathways, the net two ATP arise from glycolysis. The subsequent fermentation reactions sustain that yield by recycling carriers. Other microorganisms have additional fermentative pathways with different accounting. Oxygen absence is therefore an incomplete definition: identify the electron acceptor and whether an electron-transport chain is involved.']
  ],['Fermentation and anaerobic respiration are the same process.','Both can support metabolism without oxygen, but anaerobic respiration uses an electron-transport chain with a terminal acceptor other than oxygen. Fermentation transfers electrons to organic intermediates without that respiratory arrangement. Distinguishing the mechanism is more informative than grouping every oxygen-independent process under a single label.'],{
    title:'Which pathway releases gas?',
    context:'Illustrative fictional pathway systems with equal glucose conversion. These are conceptual outputs, not instructions for growing microorganisms.',
    columns:['Pathway model','NAD⁺ recycled (relative units)','CO₂ released (relative units)'],
    rows:[['Lactate route','10','0'],['Ethanol route','10','10'],['No recycling route','0','0']],
    question:'Why would using CO₂ alone underestimate the range of systems able to sustain glycolysis?',
    hint:'Compare the carrier-recycling column across the two product routes.',
    answer:'The lactate route recycles NAD⁺ without releasing CO₂. Absence of gas therefore does not demonstrate absence of fermentation or of glycolytic ATP production.',
    reasoning:['Both fermentation models restore an oxidized carrier needed by glycolysis.','Only the ethanol model includes the carbon-removing step represented here.','A no-recycling control clarifies that glucose availability alone cannot sustain unlimited flux.'],
    limitation:'Relative values simplify diverse microbial pathways. Carrier balance, pH and product accumulation can affect real rates and must be assessed separately.'
  },['Could a cell produce lactate even when some oxygen is present?','Compare the rates of NADH production and reoxidation rather than using an on/off oxygen rule.','Yes. Lactate formation can occur when glycolytic flux and carrier-recycling demands favor it despite oxygen availability. Oxygen concentration alone does not describe every local metabolic rate or regulatory state.'],[
    ref('OpenStax: Metabolism without oxygen',bio+'7-5-metabolism-without-oxygen')
  ]);

  add('cell-cycle',[
    'Distinguish DNA content from chromosome number through the cell cycle.',
    'Explain why a checkpoint response can reduce division without killing cells.',
    'Interpret changes in phase distributions without assuming a direct rate measurement.'
  ],[
    ['Prepare and duplicate the genome','During G₁ a proliferating cell grows and responds to its environment. During S phase DNA is replicated, generating sister chromatids. DNA amount doubles, but chromosome number counted by centromeres does not immediately double. Some cells leave active cycling for a quiescent state, so growth and division are not inevitable properties of every living cell.'],
    ['Coordinate readiness with progression','Cyclins and cyclin-dependent kinases help coordinate transitions between phases. Checkpoint pathways can delay progression when DNA is damaged, replication is incomplete or chromosomes are not properly attached for segregation. A checkpoint is a regulatory response with many components, rather than a physical gate that independently inspects every feature of a cell.'],
    ['Separate copies and complete division','During mitosis sister chromatids are segregated into daughter nuclei; cytokinesis partitions the cell. These are linked but distinct events. Errors in chromosome attachment can threaten inheritance even if DNA replication was accurate. Interpreting a cell-cycle experiment therefore requires considering replication, segregation, cell survival and the duration of each phase together.']
  ],['Cells with twice the G₁ DNA content must be dividing successfully.','A high DNA content can indicate G₂ or mitosis, and cells may remain there if progression is delayed. DNA quantity alone does not establish chromosome separation or completion of cytokinesis. Pair a DNA-content measurement with phase markers, timing and viability observations before concluding that division has accelerated.'],{
    title:'More cells in one phase: faster or slower?',
    context:'Fictional matched proliferating populations sampled after the same interval. Percentages describe intact viable cells; each row sums to 100%.',
    columns:['Population','G₁ (%)','S (%)','G₂/M (%)'],
    rows:[['Untreated control','50','30','20'],['After a G₂ delay','30','20','50'],['After recovery','48','31','21']],
    question:'Does the 50% G₂/M fraction establish faster mitosis? Give a better interpretation and a useful follow-up.',
    hint:'An increased number in a phase can result from longer residence time.',
    answer:'No. Accumulation is consistent with slower exit from G₂/M. Following marked cells over time would distinguish delayed progression from increased entry into that group.',
    reasoning:['A snapshot measures occupancy, not how many divisions occur per hour.','The treatment label predicts delay, and the distribution is compatible with that prediction.','Recovery supports reversibility, but independent mitotic markers are needed to separate G₂ from M.'],
    limitation:'Percentages hide absolute cell counts. Cell death, unequal growth and sampling can also alter a distribution.'
  },['A diploid cell has six chromosomes in G₁. Immediately after S phase, how many chromosomes and chromatids are present?','Count centromeres separately from replicated DNA copies.','There are six duplicated chromosomes and twelve chromatids, assuming normal replication and no segregation. Ploidy remains diploid even though DNA content has doubled.'],[
    ref('OpenStax: The cell cycle',bio+'10-2-the-cell-cycle')
  ]);

  add('dna-replication',[
    'Explain semiconservative inheritance of DNA strands.',
    'Connect 5′ to 3′ synthesis with leading and lagging strands.',
    'Use a strand-label pattern to compare replication models.'
  ],[
    ['Expose templates and initiate copying','Replication opens the DNA double helix, allowing each parental strand to serve as a template. Complementary pairing guides nucleotide incorporation. DNA polymerases require an existing primer end and extend the new strand in the 5′ to 3′ direction. Origins and coordinated protein assemblies organize this work rather than leaving copying to random collisions alone.'],
    ['Solve the antiparallel-strand problem','The two templates run in opposite directions. At a moving replication fork, one new strand can be synthesized largely continuously, while the other is synthesized as Okazaki fragments. Primers are removed and replaced, and DNA ligase seals remaining backbone discontinuities. Both new strands still grow chemically in the same 5′ to 3′ direction.'],
    ['Preserve information with imperfect fidelity','Each completed daughter duplex contains one parental strand and one newly synthesized strand: replication is semiconservative. Polymerase selectivity, proofreading and repair reduce errors but do not make copying infallible. In eukaryotes, many origins help copy long chromosomes; chromosome ends require additional solutions because standard replication cannot completely solve the end-copying problem.']
  ],['The lagging strand is synthesized in the 3′ to 5′ direction.','Both strands are synthesized 5′ to 3′. The lagging strand is discontinuous because its template orientation conflicts with overall fork movement. Short segments are each extended in the permitted direction and later joined. Distinguishing chemical synthesis direction from the direction a whole fork advances resolves the apparent contradiction.'],{
    title:'Follow old and new strands',
    context:'Theoretical predictions for DNA initially carrying a heavy isotope label, then replicated in light-label material. Complete rounds and clean separation are assumed.',
    columns:['Replication round','Heavy-only duplexes (%)','Hybrid duplexes (%)','Light-only duplexes (%)'],
    rows:[['0','100','0','0'],['1','0','100','0'],['2','0','50','50']],
    question:'Why does the second round help distinguish semiconservative copying from a model that mixes old and new material throughout every strand?',
    hint:'Track the two strands of one hybrid duplex separately during the next round.',
    answer:'A hybrid produces one hybrid and one fully light duplex when its two strands are copied separately. A uniformly dispersive model instead predicts all duplexes remain mixtures, becoming progressively lighter.',
    reasoning:['Each parental strand persists as a whole template in the semiconservative model.','The old heavy strand pairs with a new light strand.','The previously made light strand pairs with another light strand, producing a separate light-only class.'],
    limitation:'This is idealized model accounting. Real density measurements have resolution limits, asynchronous replication and other sources of experimental uncertainty.'
  },['Would a small DNA-copying error necessarily become a heritable organism-level change?','Consider repair, the affected cell lineage and reproduction.','No. Repair may remove it, and a somatic error need not enter gametes. Transmission depends on whether a stable sequence change reaches a reproducing lineage and is inherited by descendants.'],[
    ref('OpenStax: Basics of DNA replication',bio+'14-3-basics-of-dna-replication')
  ]);

  add('crossing-over',[
    'Identify which chromatids exchange DNA during meiotic crossing over.',
    'Calculate recombinant frequency from offspring classes.',
    'Explain why map distance estimates become unreliable for widely separated loci.'
  ],[
    ['Pair homologous chromosomes','During prophase I of meiosis, homologous chromosomes align. Each has already replicated into sister chromatids. Crossing over involves DNA exchange between nonsister chromatids of homologous chromosomes, typically at corresponding regions. The process can create new combinations of existing alleles without requiring a new allele to arise by mutation.'],
    ['Exchange and resolve DNA connections','Programmed DNA breaks and repair interactions can produce crossovers. Their visible consequences include chiasmata, which help maintain connections between homologs until segregation. Not every repair interaction produces a crossover. The detailed molecular events differ from a diagram of two chromosome arms simply swapping positions, although that diagram can help track allele combinations.'],
    ['Infer linkage from descendants','Closely located loci are less likely to be separated by a crossover than more distant loci, within useful limits. Recombinant offspring can therefore estimate linkage. Multiple crossovers may restore the parental arrangement of two markers, making some events invisible. Observed recombination fractions approach, but do not exceed, 50% in standard two-point mapping expectations.']
  ],['A 50% recombinant frequency proves that two genes are on different chromosomes.','Unlinked genes can produce 50% recombinants, but loci far apart on the same chromosome can approach the same value because multiple crossovers obscure linkage. Two-marker offspring counts alone cannot always distinguish these cases. Additional markers or physical chromosome evidence can resolve the uncertainty.'],{
    title:'Recover a hidden allele arrangement',
    context:'Fictional testcross offspring counts for a heterozygote with parental combinations AB and ab. Equal viability and reliable phenotype scoring are assumed.',
    columns:['Offspring allele combination','Count'],
    rows:[['AB','410'],['ab','390'],['Ab','110'],['aB','90']],
    question:'Estimate the recombination fraction and explain why it is not an exact physical distance along DNA.',
    hint:'Sum both recombinant classes and divide by all offspring.',
    answer:'There are 200 recombinants among 1,000 offspring, giving 20%. This approximates 20 map units when multiple crossovers are limited, but it is not a count of base pairs.',
    reasoning:['The two abundant parental classes preserve the original allele associations.','Both less common classes count as recombinant outcomes.','Crossover rates vary along chromosomes, and undetected multiple events can make genetic and physical distances differ.'],
    limitation:'Sampling uncertainty, unequal viability and scoring errors can bias an estimate. The fictional counts do not test those assumptions.'
  },['Does crossing over change the total number of alleles a gamete should receive at a locus?','Separate rearrangement from chromosome segregation.','Normally no: recombination rearranges allele combinations, while meiosis still gives a gamete one allele at each single-copy locus. Abnormal exchanges or segregation errors are different events and require separate analysis.'],[
    ref('OpenStax: The process of meiosis',bio+'11-1-the-process-of-meiosis')
  ]);

  add('transcription',[
    'Determine an RNA sequence from a correctly oriented DNA template.',
    'Distinguish transcription initiation from RNA processing and decay.',
    'Interpret why steady RNA abundance need not imply steady RNA synthesis.'
  ],[
    ['Select a transcription start site','RNA polymerase and associated factors recognize regulatory information that helps determine where transcription begins. For a given transcription unit, one DNA strand serves as the template. Regulatory proteins and chromatin accessibility influence initiation, so possession of a gene does not guarantee that every cell copies it into RNA at the same rate.'],
    ['Build a complementary RNA','Polymerase reads the template 3′ to 5′ while extending RNA 5′ to 3′. RNA contains uracil in place of thymine. Its sequence corresponds to the coding DNA strand, with that substitution, when both are written in the same direction. The DNA template remains available after transcription; it is not consumed to make RNA.'],
    ['Process and control the message','For typical eukaryotic protein-coding genes, the initial RNA is processed through capping, splicing and addition of a poly(A) tail before productive cytoplasmic translation. Other RNAs have different processing routes and functions. Measured RNA abundance reflects both production and removal, so a larger RNA pool can result from faster synthesis, slower decay or both.']
  ],['Every RNA transcript is a message that becomes a protein.','Many RNAs function directly, including ribosomal RNAs, transfer RNAs and regulatory RNAs. Even a protein-coding transcript must be appropriately processed and available for translation. Transcription describes DNA-to-RNA information transfer; it does not by itself establish protein production or a particular protein activity.'],{
    title:'A larger RNA pool has two explanations',
    context:'Fictional steady-state gene-expression model. RNA abundance is proportional to synthesis rate divided by decay-rate constant; all values use a shared relative scale.',
    columns:['Condition','Synthesis rate','Decay-rate constant','RNA abundance'],
    rows:[['Control','10','1','10'],['A','20','1','20'],['B','10','0.5','20']],
    question:'Why can equal RNA abundance in A and B conceal different mechanisms, and what should be measured next?',
    hint:'Use both numerator and denominator in the stated relationship.',
    answer:'A increases synthesis whereas B slows removal. Measuring newly synthesized RNA or following RNA decay would distinguish them; abundance alone cannot identify transcriptional activation.',
    reasoning:['Both conditions double the ratio of synthesis to decay.','A larger steady pool is not itself a direct rate measurement.','Matched cell number and normalization are needed before comparing RNA quantities.'],
    limitation:'The model assumes a constant decay-rate coefficient and steady state. Real genes can show delays, bursts and changing cell populations.'
  },['Write the RNA copied from template DNA 3′-TACGGA-5′.','Build a complementary strand antiparallel to the template and use U rather than T.','The RNA is 5′-AUGCCU-3′. This short sequence exercise establishes orientation and pairing; it does not establish a complete gene or its biological expression.'],[
    ref('OpenStax: Eukaryotic transcription',bio+'15-3-eukaryotic-transcription'),
    ref('OpenStax: Regulation of gene expression',bio+'16-1-regulation-of-gene-expression')
  ]);

  add('translation',[
    'Explain how ribosomes and charged tRNAs connect codons to amino acids.',
    'Distinguish initiation, elongation and termination.',
    'Infer why mRNA abundance and protein output can diverge.'
  ],[
    ['Establish the reading frame','A ribosome assembles on an mRNA with initiation factors and an initiator tRNA. Start-site selection establishes a reading frame, dividing the message into successive three-nucleotide codons. Translation proceeds along the mRNA 5′ to 3′. Not every AUG encountered is automatically used as a start: surrounding sequence and the initiation machinery matter.'],
    ['Match codons and join amino acids','Transfer RNAs carry amino acids after charging by aminoacyl-tRNA synthetases. Codon–anticodon pairing positions them in the ribosome, whose ribosomal RNA contributes the catalytic center for peptide-bond formation. The growing chain passes to the incoming amino acid, and the ribosome moves onward. Accuracy depends on both correct charging and correct codon recognition.'],
    ['Release and develop a functional product','When a stop codon reaches the decoding site, release factors promote release of the chain rather than adding a special stop amino acid. Folding, targeting, modification or assembly may then be required for function. Protein abundance depends on translation and degradation, while protein activity also depends on its molecular state and cellular location.']
  ],['The ribosome checks the amino acid attached to every tRNA against the codon.','The decoding machinery chiefly evaluates codon–anticodon recognition; aminoacyl-tRNA synthetases establish the amino acid–tRNA connection and often provide editing. A correctly pairing tRNA carrying an incorrect amino acid can therefore challenge fidelity. Translation accuracy arises from multiple linked recognition steps rather than one final ribosomal inspection.'],{
    title:'Same message, different protein output',
    context:'Fictional matched-cell measurements over one interval. Protein synthesis is normalized to equal viable cell number; mRNA abundance uses the same relative scale.',
    columns:['Condition','mRNA abundance','New protein output','Ribosome loading per mRNA'],
    rows:[['Control','10','20','4'],['Initiation reduced','10','5','1'],['More mRNA','20','40','4']],
    question:'Which comparison supports regulation at translation initiation rather than a change in transcript abundance?',
    hint:'Look for unchanged mRNA alongside lower loading and lower new protein production.',
    answer:'The initiation-reduced condition has unchanged mRNA but fewer loaded ribosomes and less newly produced protein, supporting altered translation per message.',
    reasoning:['The transcript pool alone cannot explain the fourfold output decrease.','Reduced loading is consistent with fewer initiation events.','Measuring newly made protein reduces confusion with differences in degradation of older protein.'],
    limitation:'Ribosome loading also depends on elongation speed; stalled ribosomes can increase occupancy without increasing protein output. Additional timing evidence is needed for a definitive mechanism.'
  },['Why can a one-nucleotide insertion early in a coding region affect many later amino acids?','Follow how the insertion changes the grouping into triplets.','It shifts the reading frame unless compensated by another change. Subsequent codons are regrouped, potentially changing many amino acids and introducing an early stop. Insertions outside a translated region require a different analysis.'],[
    ref('OpenStax: Ribosomes and protein synthesis',bio+'15-5-ribosomes-and-protein-synthesis')
  ]);

  add('mutations',[
    'Distinguish a DNA sequence change from its possible functional consequences.',
    'Explain why coding and regulatory variants require different evidence.',
    'Evaluate whether a sequence association alone establishes causation.'
  ],[
    ['Recognize a sequence change','A mutation changes DNA sequence and can arise through copying errors, damage or other molecular events. Changes range from single bases to chromosome-scale rearrangements. DNA repair reduces their persistence. A variant is a sequence difference described relative to a comparison; calling it a variant does not by itself establish when it arose or what it does.'],
    ['Locate the affected information','A coding change may alter an amino acid, create a stop signal or shift a reading frame. Other changes affect splice signals or regulatory elements, potentially changing where, when or how much RNA is produced. Some changes have little detectable effect in a given setting. Consequences depend on sequence context and biological conditions.'],
    ['Separate molecular effect from inheritance','A stable change in a somatic cell can be passed to its daughter cells without being transmitted to an organism’s offspring. Germline changes can enter the next generation. Even an inherited functional change need not produce a simple one-gene phenotype: other genes, environment, developmental timing and chance can influence the observable outcome.']
  ],['Every change that leaves the amino acid unchanged is biologically harmless.','The genetic code allows different codons to specify the same amino acid, but a synonymous change can still affect splicing, RNA structure or translation under some circumstances. Most sequence descriptions alone do not establish an effect. Functional evidence and context are needed before classifying a particular change as consequential.'],{
    title:'Association or a tested mechanism?',
    context:'Fictional reporter-gene comparison in matched model cells. Only the indicated regulatory sequence differs; an independent repeat and equal DNA delivery are assumed.',
    columns:['Regulatory sequence','RNA output (relative units)','Protein output (relative units)'],
    rows:[['Original','10','20'],['Variant','4','8'],['Variant reverted to original','10','19']],
    question:'What does the reversion add to the claim that the sequence change affects expression?',
    hint:'Ask whether restoring sequence also restores the outcome.',
    answer:'Recovery after reversion strengthens the causal link between the regulatory sequence and reduced expression in this model. It still does not establish the effect in every tissue or in an organism.',
    reasoning:['Both RNA and protein decrease without a coding-sequence change.','Reversion helps rule out some background differences between constructs.','Matched delivery, cell number and repeated measurements remain necessary controls.'],
    limitation:'A reporter lacks much of a natural chromosome’s regulatory environment. These fictional results cannot classify any real person’s variant.'
  },['Why might the same sequence change have different observable effects in two tissues?','Consider which genes are active and which regulatory partners are present.','Tissues differ in gene expression, splicing machinery, interacting proteins and physiological demands. A change matters only through the processes operating in that context; DNA sequence alone is not a complete phenotype prediction.'],[
    ref('NHGRI: Mutation','https://www.genome.gov/genetics-glossary/Mutation'),
    ref('OpenStax: DNA repair',bio+'14-6-dna-repair')
  ]);

  add('non-mendelian-inheritance',[
    'Distinguish incomplete dominance, codominance and interactions between loci.',
    'Explain why intermediate appearance does not blend inherited alleles.',
    'Test a one-locus model against offspring counts while acknowledging uncertainty.'
  ],[
    ['Separate allele segregation from phenotype','Mendelian segregation concerns how alternative alleles enter gametes. Dominance concerns the phenotype of a heterozygote. In incomplete dominance, its measured phenotype lies between those of the homozygotes; in codominance, distinguishable products of both alleles can be observed. Neither pattern requires the alleles to merge or cease to segregate as discrete variants.'],
    ['Add interactions and multiple contributors','An organism may have more than two alleles circulating in its population, even though a diploid individual generally carries two at a single autosomal locus. Epistasis occurs when one locus changes the phenotypic effect of another. Polygenic traits combine contributions from multiple loci, often together with environmental influences and developmental variation.'],
    ['Choose a model appropriate to the evidence','A phenotype ratio is a prediction from assumptions about genotype, segregation, penetrance, viability and scoring. Departure from a simple ratio does not identify one unique alternative. Distinguish discrete categories from continuously measured traits, track the actual parental genotypes and test whether environmental differences could create or obscure the proposed inheritance pattern.']
  ],['An intermediate heterozygote proves that parental traits permanently blend.','Intermediate appearance describes the organism’s phenotype, not a mixing of its alleles into a new permanent substance. When that heterozygote makes gametes, the original alleles can segregate and later produce either homozygous phenotype again. This distinction explains why a parental-looking phenotype may reappear after being absent in one generation.'],{
    title:'Does the intermediate phenotype breed true?',
    context:'Fictional offspring from two heterozygous plants at one locus. The model assumes incomplete dominance, random segregation, equal survival and three reliably distinguishable color classes.',
    columns:['Phenotype','Observed count','Expected count under 1:2:1'],
    rows:[['Dark','48','50'],['Intermediate','105','100'],['Pale','47','50']],
    question:'Do these counts fit permanent blending better than segregating alleles? Explain without claiming exact proof.',
    hint:'Look for reappearance of both parental homozygous classes.',
    answer:'The return of dark and pale offspring, with counts near 1:2:1, is consistent with segregating alleles and incomplete dominance. It does not support a permanently blended allele that always produces intermediate offspring.',
    reasoning:['A heterozygote-by-heterozygote cross predicts one quarter of each homozygote.','Sampling produces deviations from exact expected counts.','Other models and survival effects require additional crosses or genotype evidence to exclude.'],
    limitation:'The fictional sample is consistent with the model but is not a formal statistical test. Color intensity could also depend on environment.'
  },['Can codominance and multiple alleles describe the same locus?','One term describes heterozygotes; the other describes variation across a population.','Yes. A locus can have several population alleles, while a particular heterozygote expresses distinguishable products of two of them. The terms address different aspects of inheritance and are not competing explanations.'],[
    ref('OpenStax: Characteristics and traits',bio+'12-2-characteristics-and-traits')
  ]);

  add('blood',[
    'Distinguish oxygen partial pressure, hemoglobin saturation and oxygen content.',
    'Explain how hemoglobin loading and unloading support tissue exchange.',
    'Calculate comparative oxygen delivery from content and flow.'
  ],[
    ['Move oxygen down a pressure difference','Oxygen diffuses from regions of higher to lower oxygen partial pressure. In the lungs, diffusion adds dissolved oxygen to blood, where most carried oxygen binds reversibly to hemoglobin inside red blood cells. Binding greatly increases transport capacity without making the bound oxygen itself contribute directly to the dissolved-gas partial pressure in the same way.'],
    ['Load and unload a cooperative carrier','Hemoglobin’s subunits interact, so binding one oxygen molecule can change the affinity of remaining sites. The resulting relationship between oxygen pressure and saturation is curved rather than linear. Tissue conditions, including lower pH and higher temperature, can favor unloading. Oxygen remains in venous blood; deoxygenated does not mean completely devoid of oxygen.'],
    ['Connect content with circulation','Saturation reports the fraction of binding sites occupied, whereas oxygen content also depends on how much hemoglobin is present. Delivery to a tissue depends on content multiplied by blood flow, while extraction depends on the arterial–venous content difference. Thus, a single percentage cannot fully describe the amount of oxygen available for cellular respiration.']
  ],['Two blood samples with the same oxygen saturation must carry the same amount of oxygen.','Equal saturation means an equal fraction of available binding sites is occupied, not an equal number of occupied sites per unit volume. Samples with different hemoglobin concentrations can therefore differ in oxygen content at the same saturation. Circulatory flow adds another independent factor when considering tissue delivery.'],{
    title:'Same percentage, different delivery',
    context:'Fictional circulation models for arithmetic practice, not patient measurements. Dissolved oxygen is ignored, and the binding-capacity values are stipulated model inputs.',
    columns:['Model','O₂ capacity (mL/L blood)','Saturation (%)','Flow (L/min)'],
    rows:[['A','200','100','5'],['B','150','100','5'],['C','150','100','6']],
    question:'Rank oxygen delivery in A, B and C, and explain whether higher flow fully compensates in C.',
    hint:'Multiply capacity by fractional saturation, then by flow.',
    answer:'A delivers 1,000 mL/min, C 900 mL/min and B 750 mL/min. The higher flow in C partly compensates for its lower carrying capacity but does not reach A.',
    reasoning:['All models have equal saturation, so capacity determines oxygen content.','Multiplying mL/L by L/min produces mL/min.','Delivery is distinct from tissue consumption, which additionally requires an extraction measurement.'],
    limitation:'This omits dissolved oxygen, flow distribution and real physiology. It is not a tool for interpreting health measurements.'
  },['Why might active tissue unload more oxygen even if incoming blood is unchanged?','Consider local consumption and the conditions surrounding hemoglobin.','Greater oxygen consumption lowers tissue oxygen pressure, maintaining diffusion from blood. Local changes in CO₂, pH and temperature can also favor hemoglobin unloading, linking transport to tissue demand.'],[
    ref('OpenStax: Transport of gases',anatomy+'22-5-transport-of-gases')
  ]);

  add('cardiac-cycle',[
    'Predict valve state from pressure differences rather than timing labels alone.',
    'Explain why ventricular pressure can change while volume stays constant.',
    'Calculate stroke volume from end-diastolic and end-systolic volumes.'
  ],[
    ['Fill through a favorable pressure difference','During ventricular filling, ventricular pressure is lower than atrial pressure, so atrioventricular valves permit flow into the ventricles. Much filling is passive; atrial contraction contributes near the end. Valves open and close in response to pressure differences. They do not actively pull blood onward or initiate the electrical rhythm.'],
    ['Raise pressure before ejection','Ventricular contraction first raises pressure enough to close the atrioventricular valves. Until ventricular pressure exceeds pressure in the outflow artery, the semilunar valve remains closed too. During this isovolumetric interval, pressure rises with nearly unchanged blood volume. Once the outflow valve opens, ejection reduces ventricular volume as blood enters the artery.'],
    ['Relax and start the next cycle','As ventricular pressure falls below arterial pressure, the semilunar valve closes. A second isovolumetric interval follows until pressure drops below atrial pressure and filling resumes. Stroke volume is end-diastolic volume minus end-systolic volume. Cardiac output combines stroke volume with heart rate; changing rate can also change filling time and stroke volume.']
  ],['A contracting ventricle must always be ejecting blood.','Contraction can increase pressure while both inlet and outlet valves remain closed. Ejection begins only when the ventricular-to-arterial pressure difference opens the outlet valve. Separating pressure generation from flow explains why part of ventricular systole is isovolumetric and why muscle activity alone does not guarantee forward blood movement.'],{
    title:'Which interval has closed valves?',
    context:'Illustrative fictional left-heart snapshots for a mechanics lesson. Values are selected to identify pressure relationships, not to represent a clinical record.',
    columns:['Snapshot','Atrium (mmHg)','Ventricle (mmHg)','Aorta (mmHg)'],
    rows:[['A','8','4','80'],['B','8','50','80'],['C','8','110','90']],
    question:'Which snapshot is consistent with both valves closed, and why does it not by itself distinguish contraction from relaxation?',
    hint:'The inlet closes when ventricular pressure exceeds atrial pressure; the outlet opens only above aortic pressure.',
    answer:'B has ventricular pressure above the atrium but below the aorta, consistent with both valves closed. A time sequence is needed to know whether pressure is rising or falling.',
    reasoning:['A favors atrioventricular opening and filling.','C favors aortic-valve opening and ejection.','B describes pressure ordering, while direction of pressure change identifies the isovolumetric phase.'],
    limitation:'Valve motion has dynamics, and real pressure traces overlap in time. The table assumes ideal competent valves and omits right-heart behavior.'
  },['A model ventricle holds 120 mL before ejection and 50 mL afterward. What is its stroke volume?','Subtract the remaining volume from the initial filled volume.','Stroke volume is 70 mL per beat. At a stipulated rate of 60 beats per minute, modeled output is 4.2 L/min; this calculation does not imply that rate and stroke volume vary independently in a real heart.'],[
    ref('OpenStax: Cardiac cycle',anatomy+'19-3-cardiac-cycle')
  ]);

  add('homeostasis',[
    'Identify the regulated variable, sensor and effector in a feedback system.',
    'Distinguish negative feedback from absence of change.',
    'Interpret delayed correction and overshoot without assuming perfect control.'
  ],[
    ['Measure a regulated condition','Homeostatic systems maintain variables within workable ranges despite internal and external disturbances. Sensors provide information to integrating mechanisms, which influence effectors. The regulated variable must be distinguished from the response: body temperature, for example, is not the same variable as sweat production. Some reference levels vary with time, activity or physiological state.'],
    ['Oppose a disturbance','In negative feedback, a response tends to reduce the deviation that triggered it. As the deviation decreases, the drive for correction also decreases. This is a direction-of-effect relationship, not a judgment that the response is harmful or beneficial. Multiple effectors can act together, and their consequences may create tradeoffs with other regulated variables.'],
    ['Account for delays and limits','Sensors, signals and effectors take time to respond. Delays can cause oscillation or overshoot, while limited effector capacity can leave a residual disturbance. Positive feedback amplifies a change and usually requires a stopping event or another control mechanism. Biological regulation therefore involves dynamic adjustment, not perfectly constant conditions or unlimited ability to resist disturbance.']
  ],['Homeostasis means every internal variable stays at one fixed value.','A regulated variable usually fluctuates within a range and may follow changing reference levels. A working feedback system responds to disturbances; it does not prevent every deviation before it occurs. The size, duration and consequences of a deviation matter more than whether the plotted line is perfectly flat.'],{
    title:'Read correction in a time series',
    context:'Fictional temperature-control model for an imaginary organism after a brief heat input. Values are illustrative and are not human health thresholds.',
    columns:['Time (min)','Internal temperature (°C)','Cooling response (relative units)'],
    rows:[['0','30.0','1'],['2','32.0','2'],['5','31.0','5'],['10','30.1','1']],
    question:'What supports negative feedback, and why does the strongest cooling response occur after peak temperature?',
    hint:'Compare the direction of the response with the disturbance, then consider delay.',
    answer:'Cooling increases after warming and the temperature returns toward its starting range. The later cooling peak is consistent with delayed signaling or effector activation.',
    reasoning:['The response opposes the initial increase in the regulated variable.','Cooling falls again as the deviation diminishes.','A no-response comparison would help separate active regulation from passive heat loss.'],
    limitation:'The table alone cannot identify sensors or prove causation. Environmental temperature, metabolism and passive heat exchange must be controlled.'
  },['Why is a response that amplifies a change not automatically a malfunction?','Think about a process that needs to finish a defined event.', 'Positive feedback can help complete a bounded process, such as amplifying local clot formation. It must be constrained or terminated; its usefulness depends on context and control, not on the word positive.'],[
    ref('OpenStax: Homeostasis',anatomy+'1-5-homeostasis')
  ]);

  add('action-potential',[
    'Connect changes in membrane permeability to the phases of an action potential.',
    'Explain why stimulus strength can alter spike frequency without increasing spike height.',
    'Use recovery timing to infer refractory behavior.'
  ],[
    ['Reach a regenerative threshold','A neuron maintains ion gradients and a resting membrane potential through selective permeability and active transport. A sufficient local depolarization can recruit enough voltage-gated sodium channels for regenerative inward current in a typical axon. Threshold depends on channel state and recent activity; it is a useful functional boundary rather than one universal voltage for all neurons.'],
    ['Depolarize and repolarize','Rapid sodium-channel activation drives the rising phase. Sodium-channel inactivation and delayed potassium-channel opening then favor repolarization and often an after-hyperpolarization. Only a small fraction of all cellular ions move during one spike. The sodium–potassium pump maintains gradients over time but does not directly generate the rapid upstroke or downstroke of each action potential.'],
    ['Recover and transmit information','Inactivated sodium channels need time and appropriate voltage to recover. This contributes to an absolute refractory period, followed by a period of reduced excitability. Local currents activate neighboring membrane, propagating the signal. Stronger stimulation often increases spike frequency or recruits more neurons rather than proportionally enlarging each all-or-none spike in the same axon.']
  ],['A stronger stimulus produces a taller action potential in the same neuron.','Once a typical regenerative spike is triggered under matched conditions, its amplitude is largely set by ion gradients and channel behavior. Stimulus strength is often represented through firing frequency and recruitment. Spike shape can vary with physiology, so all-or-none does not mean every spike in every neuron is numerically identical.'],{
    title:'How soon can a second spike occur?',
    context:'Fictional paired-stimulus results in a simplified axon model. The first pulse is identical in every trial; the second pulse is held at the same moderately suprathreshold strength.',
    columns:['Interval between pulses (ms)','First spike','Second spike'],
    rows:[['1','Present','Absent'],['3','Present','Absent'],['8','Present','Present']],
    question:'What can these trials show about recovery, and what can they not establish about absolute versus relative refractoriness?',
    hint:'The second pulse uses only one strength.',
    answer:'Excitability has recovered enough by 8 ms for the chosen pulse. Earlier failures could reflect absolute or relative refractoriness; testing different pulse strengths is needed to distinguish them.',
    reasoning:['Matched first responses show that each trial began with successful excitation.','Recovery of channel availability changes the response to an otherwise identical second pulse.','Failure at one stimulus strength does not prove that no stronger stimulus could work.'],
    limitation:'Timing is fictional and neuron-specific in reality. Temperature, channel types and stimulus location affect refractory behavior.'
  },['Why does myelin speed propagation without making ions jump through the insulating layers?','Follow local electrical spread and the locations of regenerative channels.','Myelin reduces current loss and changes membrane charging between nodes. Local current spreads along the axon, and action potentials regenerate at nodes rich in channels; ions do not leap bodily from one node to another.'],[
    ref('OpenStax: The action potential',anatomy+'12-4-the-action-potential')
  ]);

  add('synapses',[
    'Connect presynaptic calcium entry to neurotransmitter release.',
    'Distinguish a postsynaptic potential from an action potential.',
    'Use a bypass comparison to locate a defect within synaptic signaling.'
  ],[
    ['Convert an arriving voltage signal','At many chemical synapses, an arriving action potential depolarizes the presynaptic terminal and opens voltage-gated calcium channels. Calcium entry promotes fusion of transmitter-containing vesicles with the membrane. This converts an electrical event into a chemical signal. Release is probabilistic and regulated, so identical presynaptic spikes need not always yield identical postsynaptic effects.'],
    ['Respond through particular receptors','Transmitter diffuses across the cleft and binds postsynaptic receptors. Some directly open ion channels; others engage intracellular signaling. The resulting effect depends on receptor properties and ion gradients, not simply on the transmitter’s name. A graded postsynaptic potential can increase or reduce the likelihood of firing without itself being an all-or-none action potential.'],
    ['Integrate and terminate the signal','A neuron combines inputs arriving at different sites and times. Spatial and temporal summation influence whether the spike-initiation region reaches threshold. Transmitter removal by uptake, diffusion or enzymatic breakdown limits signaling duration. Synaptic strength can change through altered release, receptor availability or other mechanisms, providing several possible sites for learning-related plasticity.']
  ],['An excitatory synapse always makes the next neuron fire.','Excitatory input generally increases firing probability in the relevant conditions, but its effect must combine with other inputs and the neuron’s current state. A single small excitatory postsynaptic potential may remain below threshold. Inhibition, timing, location and recent channel activity can all influence the final outcome.'],{
    title:'Locate the interrupted step',
    context:'Fictional synapse-model responses with matched postsynaptic cells. A modeled calcium-entry block acts only at the presynaptic terminal; direct receptor stimulation bypasses release.',
    columns:['Condition','Presynaptic spike','Postsynaptic response (relative units)'],
    rows:[['Normal signaling','Present','10'],['Calcium entry blocked','Present','1'],['Block plus direct receptor stimulation','Present','9']],
    question:'Which part of signaling is most strongly implicated by the recovery after bypassing release?',
    hint:'Identify which structures must still work for direct receptor stimulation to succeed.',
    answer:'The result implicates presynaptic release rather than complete loss of postsynaptic responsiveness. Receptors and downstream responses still operate when the release step is bypassed.',
    reasoning:['An arriving spike alone is insufficient when calcium entry is restricted.','The bypass supplies a signal downstream of vesicle release.','A matched stimulation control is needed because overly strong receptor activation could conceal partial downstream impairment.'],
    limitation:'The model stipulates selectivity. Real interventions can affect several steps, and the result does not identify a particular release protein.'
  },['Why can repeated weak inputs close together succeed when one input fails?','Consider whether the earlier postsynaptic response has fully decayed.', 'Residual graded potentials can add through temporal summation, producing a larger combined depolarization. Whether this reaches threshold depends on input timing, inhibitory signals and membrane properties.'],[
    ref('OpenStax: Communication between neurons',anatomy+'12-5-communication-between-neurons')
  ]);

  add('immune-memory',[
    'Explain how clonal expansion and memory alter a later antigen response.',
    'Distinguish circulating antibodies from memory B and T cells.',
    'Interpret recall responses without equating one marker with complete protection.'
  ],[
    ['Select antigen-responsive cells','Adaptive immunity begins with diverse lymphocytes whose receptors differ before a particular exposure. Appropriate antigen recognition and additional signals activate selected cells, which proliferate and differentiate. The antigen does not teach every lymphocyte to invent the same receptor. This selective expansion produces many descendants capable of responding to features of that antigen.'],
    ['Build immediate effectors and lasting capacity','Activated B cells can generate antibody-secreting cells, while T-cell subsets coordinate responses or act on infected cells. Some descendants become long-lived memory cells. Persistent antibodies and memory lymphocytes are related but distinct components: antibodies can act immediately, whereas memory cells can mount renewed responses after recognizing a relevant stimulus.'],
    ['Recall with specificity and limits','A later encounter can produce a faster or stronger response because relevant cells and sometimes antibodies already exist. Vaccination can establish such preparedness without requiring the target disease itself. Protection varies with the pathogen, immune component, time and antigenic change. Prevention of severe disease and complete prevention of infection are different possible outcomes.']
  ],['If antibody levels fall, all immune memory has disappeared.','Circulating antibody concentration is only one measure. Memory B cells, memory T cells and long-lived antibody-secreting cells can contribute differently over time. Declining antibodies may change immediate protection, but do not by themselves establish the complete loss of recall capacity or predict a person’s outcome.'],{
    title:'Recognize a specific recall response',
    context:'Fictional classroom immune-response curves for model antigens A and B. Measurements are illustrative relative antibody signals, not vaccine efficacy or patient results.',
    columns:['Exposure history','Day 3 signal','Day 10 signal'],
    rows:[['First exposure to A','1','8'],['Later exposure to A','12','25'],['First exposure to unrelated B after A','1','7'],['First exposure to B, no prior A','1','7']],
    question:'Which comparisons support both memory and antigen specificity, and what do they leave unmeasured?',
    hint:'Compare repeated A with first A, then ask whether the advantage automatically extends to B.',
    answer:'Repeated A gives an earlier, larger signal. Prior exposure to A leaves the B response equal to its matched first-exposure baseline. This supports antigen-specific recall in the model but does not measure T-cell responses or actual protection.',
    reasoning:['The day-3 comparison shows a timing advantage.','The day-10 comparison shows greater measured magnitude.','The unrelated-antigen comparison helps distinguish specific memory from a universally increased response.'],
    limitation:'Antigens differ in immunogenicity, so proper controls must match them. These invented signals cannot guide vaccination choices or clinical interpretation.'
  },['Could immune memory reduce illness without preventing every infection?','Separate blocking entry from accelerating control after entry.', 'Yes. Existing defenses may fail to block initial infection while recall responses help limit spread or severity. Demonstrating either effect requires outcome evidence rather than antibody magnitude alone.'],[
    ref('OpenStax: Adaptive immune response',bio+'42-2-adaptive-immune-response')
  ]);

  add('xylem',[
    'Explain how transpiration can pull water through xylem.',
    'Predict movement using water-potential differences and hydraulic resistance.',
    'Evaluate a potometer reading as an indirect estimate of water loss.'
  ],[
    ['Establish a soil-to-air pathway','Water moves along differences in water potential through soil, roots and vascular tissues. Root membranes and selective transport influence entry, while mineral uptake can alter solute potential. Most long-distance xylem-conducting cells are dead at maturity, forming reinforced conduits. Living surrounding tissues remain important, so a dead conduit does not imply a physiologically inactive plant.'],
    ['Transmit tension through connected water','Evaporation from moist leaf cell walls lowers leaf water potential and creates tension transmitted through connected water columns. Cohesion between water molecules and interactions with conduit walls help sustain this pathway. The main upward pull in a transpiring tall plant is therefore associated with leaf water loss, rather than a pump located in each xylem cell.'],
    ['Balance transport against failure risk','Flow depends on the driving water-potential difference and resistance along the pathway. Drying soil, stomatal closure and conduit anatomy can alter both. Gas bubbles can interrupt water columns, reducing conductivity. Root pressure contributes in some circumstances, but does not provide a universal explanation for lifting water to the tops of tall trees.']
  ],['A potometer directly measures how much water leaves a leaf each second.','A potometer measures water uptake by a shoot under its particular setup. Uptake often approximates transpiration over suitable intervals, but water can also enter storage or growth, and changing internal water status can delay the relationship. Leaks and imperfect seals add further reasons to treat uptake as an indirect estimate.'],{
    title:'Separate uptake from instantaneous loss',
    context:'Fictional matched-shoot observations over equal intervals after a humidity change. Uptake and mass-based water loss use illustrative common units; leaks are assumed excluded.',
    columns:['Interval','Water uptake (mg)','Water loss (mg)'],
    rows:[['Before humidity increase','100','98'],['Immediately afterward','70','40'],['Later steady interval','42','41']],
    question:'Why might uptake exceed loss immediately after humidity rises without violating conservation of water?',
    hint:'Include water stored inside the shoot in the balance.',
    answer:'The difference can temporarily replenish internal water stores. In the middle interval, modeled storage increases by 30 mg; uptake and loss need not match instantaneously.',
    reasoning:['Conservation requires uptake minus loss to equal storage change, ignoring other exchanges here.','Higher humidity can reduce the vapor-pressure driving force for transpiration.','Convergence later is consistent with a new approximate steady state.'],
    limitation:'Temperature, leaf area, stomatal response and boundary-layer airflow must be controlled. A mismatch could also arise from measurement error.'
  },['Why can closing stomata conserve water while also reducing growth?','Connect the water exit pathway with the carbon dioxide entry pathway.', 'Closure reduces vapor escape but can also restrict CO₂ entry, limiting carbon fixation. The plant must balance water status against carbon gain; the best response depends on environmental conditions and its transport capacity.'],[
    ref('OpenStax: Transport of water and solutes in plants',bio+'30-5-transport-of-water-and-solutes-in-plants')
  ]);

  add('phloem',[
    'Explain source-to-sink transport using osmotic water entry and pressure flow.',
    'Distinguish bulk transport from the energy costs of loading and unloading.',
    'Predict how changing a sink can redirect transported carbon.'
  ],[
    ['Identify sources and sinks','A source exports more assimilate than it imports, while a sink consumes or stores imported assimilate. A mature photosynthesizing leaf is often a source; a growing root or fruit is often a sink. These roles can change with development. A storage organ may become a source when it mobilizes reserves for new growth.'],
    ['Create a pressure difference','Loading sugars into phloem near a source can lower solute potential, drawing in water and increasing hydrostatic pressure. Unloading near sinks contributes to a lower-pressure region. Bulk flow follows this pressure difference through sieve tubes. Loading and unloading mechanisms vary among plants; active transport is important in many systems but is not universal at every interface.'],
    ['Maintain living transport pathways','Sieve-tube elements rely on associated companion cells and living cellular machinery. The long-distance movement of sap is pressure-driven, while energy is required for supporting transport processes and cellular maintenance. Different tubes can carry material toward different sinks simultaneously. Direction is determined by source–sink relationships, rather than an absolute rule that phloem always moves downward.']
  ],['Sugar is actively pumped molecule by molecule along the whole length of the stem.','Many loading and unloading steps involve membrane transport and metabolic energy, but long-distance movement through a sieve tube is mainly bulk flow down a pressure gradient. Separating these steps explains how a system can depend on living cells and energy without assigning an ATP-driven pump to every centimeter of sap movement.'],{
    title:'A sink changes the destination',
    context:'Fictional tracer-carbon allocation after equal uptake by a source leaf. Values are percentages of recovered exported label, measured after the same interval in matched plants.',
    columns:['Destination','Fruit sink intact (%)','Fruit sink reduced (%)'],
    rows:[['Fruit','60','20'],['Roots','25','50'],['Young leaves','15','30']],
    question:'What does the redistribution support, and why can these percentages not establish that total export increased?',
    hint:'Percentages describe shares of a total that may differ between plants.',
    answer:'Allocation changes with sink demand or access. Greater total export is unproven: a larger percentage can represent less carbon if total export falls.',
    reasoning:['The fruit share decreases while other sink shares increase.','Each column sums to 100%, so the measurements describe composition.','Absolute recovered label and source-leaf fixation should also be measured to assess export quantity.'],
    limitation:'Changing a sink can alter signaling, water status and source activity. Tracer percentages do not directly measure pressure or prove pressure flow.'
  },['Can one plant transport sugars upward and downward at the same time?','Consider different sieve tubes connecting different sources and sinks.', 'Yes. Separate pathways can carry assimilate from source leaves to roots below and growing tissues above. This does not require opposing bulk flows within the same continuous tube at the same moment.'],[
    ref('OpenStax: Phloem transport',bio+'30-5-transport-of-water-and-solutes-in-plants')
  ]);

  add('stomata',[
    'Connect guard-cell solute movement, water movement and pore aperture.',
    'Explain the tradeoff between carbon uptake and water loss.',
    'Interpret an apparent water-use benefit alongside its carbon cost.'
  ],[
    ['Use guard cells to adjust a pore','A stoma is a regulated pore surrounded by guard cells. Changes in guard-cell solute content alter osmotic water movement and turgor. Cell-wall properties translate these pressure changes into a change in aperture. Opening is therefore a coordinated mechanical and transport response, not simply the pore being pushed open by air inside the leaf.'],
    ['Integrate environmental signals','Light, internal CO₂, water availability and hormonal signals influence guard-cell transport. During water stress, abscisic-acid signaling can promote ion loss, water loss from guard cells and closure. Ion channels, pumps and signaling networks act together. Species and photosynthetic pathways differ, so a universal schedule of daytime opening and nighttime closure has important exceptions.'],
    ['Trade water loss for carbon gain','Open stomata permit CO₂ diffusion inward while water vapor commonly diffuses outward. Closing them can conserve water but constrain photosynthesis. The outcome also depends on air dryness, boundary-layer conditions and leaf temperature. A useful comparison therefore measures both carbon assimilation and water loss, rather than declaring the smallest aperture universally best.']
  ],['Guard cells close a stoma by absorbing more water and swelling shut.','For the common opening mechanism, increasing guard-cell turgor helps open the pore because of cell geometry and wall properties. Loss of solutes and water reduces turgor and promotes closure. The aperture follows the mechanics of the paired cells; treating them like a single water-filled plug gives the wrong prediction.'],{
    title:'More efficiency, less total carbon?',
    context:'Fictional leaf-gas-exchange values under matched light and temperature, with water availability changed. Rates are illustrative and do not describe a particular crop.',
    columns:['Water state','CO₂ assimilation (µmol/m²/s)','Water loss (mmol/m²/s)'],
    rows:[['Well supplied','12','4'],['Moderately restricted','8','2'],['Strongly restricted','2','1']],
    question:'Which state has the largest assimilation-to-water-loss ratio, and why is that not the same as maximum growth?',
    hint:'Divide each carbon rate by its water-loss rate, keeping the units explicit.',
    answer:'Moderate restriction gives the largest ratio, 4 µmol CO₂ per mmol water, versus 3 and 2. Its total assimilation remains lower than the well-supplied state, so efficiency alone cannot establish maximum growth.',
    reasoning:['The denominator matters: reducing water loss can improve a ratio.','Severe closure can reduce carbon gain disproportionately.','Growth also depends on duration, respiration, allocation and leaf area, beyond an instantaneous exchange ratio.'],
    limitation:'Water stress can affect photosynthetic enzymes as well as stomata. Aperture or conductance measurements are needed to attribute all changes specifically to pores.'
  },['Why might a dry wind increase water stress even when the soil is initially moist?','Follow the water-vapor gradient and the air layer beside a leaf.', 'Wind can remove humid air near the leaf, and dry air increases the evaporative driving force. Loss may temporarily exceed water delivery, prompting stomatal responses despite water being present in the soil.'],[
    ref('Plant Physiology: Guard-cell transport and stomatal dynamics','https://pmc.ncbi.nlm.nih.gov/articles/PMC5462021/'),
    ref('Annual Review of Plant Biology: Guard-cell signal networks','https://pmc.ncbi.nlm.nih.gov/articles/PMC3056615/')
  ]);

  add('genetic-drift',[
    'Explain allele-frequency change caused by finite sampling.',
    'Predict why small populations show more variable neutral trajectories.',
    'Distinguish drift from evidence of a consistent selective advantage.'
  ],[
    ['Sample the next generation','Only some of a population’s allele copies contribute to the next generation. Even when alternative alleles have equal expected reproductive success, random sampling can change their frequencies. This is genetic drift. It concerns inherited variation across generations, not an individual deliberately changing its DNA or a population choosing which variant will survive.'],
    ['Recognize the effect of population size','Chance deviations are generally proportionally larger when fewer copies contribute. A severe bottleneck or founding event can therefore change allele frequencies and remove variation without favoring a useful trait. Effective population size describes the strength of sampling in an idealized comparison and can differ substantially from simply counting every organism present.'],
    ['Follow loss and fixation','In a finite population without mutation or migration, a neutral allele can eventually be lost or fixed. Different replicate populations can move in opposite directions under the same conditions. Selection can operate at the same time, so one observed change does not uniquely identify either process. Repeated trajectories and reproductive evidence strengthen the distinction.']
  ],['An allele that becomes common must have improved survival.','Frequency can rise through chance sampling even without a fitness advantage, especially in small populations. Selection is one possible explanation, but demographic history, migration and drift also matter. Evidence of consistent reproductive differences or repeated directional change is needed before interpreting every increase as adaptation.'],{
    title:'Compare independent neutral populations',
    context:'Fictional neutral-allele simulation outcomes after the same number of generations. Every population starts at frequency 0.50; mutation, migration and selection are disabled.',
    columns:['Replicate','Small population final frequency','Large population final frequency'],
    rows:[['1','0.10','0.47'],['2','0.80','0.53'],['3','0.35','0.49'],['4','0.95','0.51']],
    question:'What pattern supports the expected population-size effect, and why is the average direction not the key observation?',
    hint:'Compare spread around the starting value rather than choosing the largest increase.',
    answer:'Small-population outcomes vary much more widely. Drift predicts greater random dispersion, not a consistent upward or downward direction across independent neutral replicates.',
    reasoning:['The small outcomes span 0.10–0.95, while large outcomes stay near 0.50.','Equal starting frequencies and disabled selection isolate the model’s sampling effect.','More replicates are needed to estimate variability reliably; four examples only illustrate the prediction.'],
    limitation:'Real populations seldom meet all neutral-model assumptions. A single field trajectory cannot be assigned to drift from resemblance alone.'
  },['Why can a bottleneck reduce future adaptive possibilities even if the population later grows?','Separate recovery of organism numbers from recovery of lost alleles.', 'Growth copies the variants that remain; it does not automatically restore variants lost during the bottleneck. Mutation and migration may introduce variation later, but population size can recover before genetic diversity does.'],[
    ref('NHGRI: Genetic drift','https://www.genome.gov/genetics-glossary/Genetic-Drift'),
    ref('OpenStax: Population evolution',bio+'19-1-population-evolution')
  ]);

  add('food-webs',[
    'Distinguish energy transfer from the recycling of matter.',
    'Calculate trophic transfer efficiency using matched production values.',
    'Predict indirect effects while identifying the limits of a simple food chain.'
  ],[
    ['Trace the direction of an energy arrow','Primary producers convert an external energy supply into chemical forms used to build biomass. Consumers obtain energy by eating other organisms or their products. A food-web arrow commonly points from the resource to the consumer, indicating transfer. An omnivore can feed at several trophic positions, so a real web cannot always be reduced to one ladder.'],
    ['Separate consumption from new production','Not all resource biomass is eaten, not everything eaten is assimilated, and assimilated energy also supports respiration. Only part becomes new consumer biomass available to another level. Production must be measured over a shared area and interval. Standing biomass is a stock, so it cannot be substituted directly for production when estimating energy-transfer efficiency.'],
    ['Include detritus and indirect interactions','Dead material and waste support decomposers and detritivores across the web. Matter can cycle back into available chemical forms, while energy is progressively dissipated as heat and requires renewed input. Changing one species can alter resources and competitors indirectly. The strength and even direction of a response depend on alternative feeding links and environmental conditions.']
  ],['Exactly ten percent of energy moves to the next trophic level in every ecosystem.','Ten percent is a convenient illustration, not a biological constant. Transfer depends on consumption, assimilation, respiration and the organisms involved. Measured efficiencies vary, and comparing mismatched areas, intervals or stocks can produce misleading values. State the accounting boundary before interpreting any percentage.'],{
    title:'Where does transfer change?',
    context:'Fictional annual production for a simplified ecosystem over the same area. Values represent new biomass energy, not standing biomass or the amount eaten.',
    columns:['Trophic group','Production (kJ/m²/year)'],
    rows:[['Producers','10000'],['Herbivores','1200'],['Small predators','120'],['Top predators','6']],
    question:'Calculate the three successive transfer efficiencies. What do their differences show about the ten-percent rule?',
    hint:'For each link, divide consumer production by resource-level production and multiply by 100.',
    answer:'The efficiencies are 12%, 10% and 5%. The values demonstrate that one fixed efficiency is not required even in a deliberately simple model.',
    reasoning:['All measurements share area and duration, making the ratios comparable.','Energy used in respiration does not remain as new biomass for the next level.','The table omits detrital pathways, so missing production is not all explained by one mechanism.'],
    limitation:'The fictional groups have one assumed feeding chain. Omnivory, imported food and uncertainty in production estimates complicate real food-web accounting.'
  },['Would removing a predator necessarily increase every producer in a food web?','Follow both direct prey release and alternative feeding pathways.', 'No. Released prey might consume producers, but competitors, omnivores and other predators can change that outcome. A specific web and evidence about interaction strengths are needed to predict a trophic cascade.'],[
    ref('OpenStax: Energy flow through ecosystems',bio+'46-2-energy-flow-through-ecosystems')
  ]);

  add('population-growth',[
    'Distinguish per-capita growth from total population increase.',
    'Apply the logistic growth model while stating its assumptions.',
    'Explain why carrying capacity is conditional rather than permanently fixed.'
  ],[
    ['Account for entries and exits','Population size changes through births, deaths, immigration and emigration. In a closed population, the difference between per-capita birth and death rates determines intrinsic net growth under specified conditions. Exponential growth assumes that this per-capita rate remains constant. It describes an idealized phase, not a promise of indefinite increase in a finite environment.'],
    ['Add density dependence','The logistic model writes growth as rN(1 − N/K), where N is population size, r the intrinsic rate and K a modeled carrying capacity. The factor in parentheses reduces per-capita growth as N approaches K. Total growth can initially rise because more individuals reproduce, then decline as density-dependent limits outweigh that numerical advantage.'],
    ['Interpret a model cautiously','The simple logistic curve assumes a smooth, immediate response to density and a stable environment. Real populations experience age structure, time delays, seasonality, chance events and changing resources. Carrying capacity therefore summarizes conditions rather than naming an immutable maximum. A population can overshoot a resource limit, particularly when reproduction responds after a delay.']
  ],['The largest population always adds the most individuals each year.','A large population has more potential reproducers, but it may also experience lower per-capita growth because resources are constrained. In the simple logistic model, total growth is greatest at half the carrying capacity, not at the largest population size. Other models can behave differently, so identify the assumed equation first.'],{
    title:'Find the fastest-growing population',
    context:'Theoretical logistic predictions with r = 0.4 per year and K = 1,000 individuals. No migration or time delay is included.',
    columns:['Population N (individuals)','r (per year)','1 − N/K'],
    rows:[['100','0.4','0.9'],['500','0.4','0.5'],['900','0.4','0.1']],
    question:'Which population has the greatest total growth rate, and why do the smallest and largest cases match?',
    hint:'Multiply all three factors rather than comparing N alone.',
    answer:'At N = 500, growth is 100 individuals per year. Both N = 100 and N = 900 give 36 per year: few reproducers with weak limitation balance many reproducers with strong limitation.',
    reasoning:['At N = 100: 0.4 × 100 × 0.9 = 36.','At N = 500: 0.4 × 500 × 0.5 = 100.','At N = 900: 0.4 × 900 × 0.1 = 36.'],
    limitation:'These are instantaneous continuous-model rates, not exact next-year counts. They should not be treated as measured forecasts for a real species.'
  },['What happens to the model prediction if habitat change lowers K below the current population?', 'Check the sign of 1 − N/K.', 'The logistic term becomes negative and predicts decline under the new conditions. Real responses may be delayed, and migration or altered birth and death rates determine how the decline actually occurs.'],[
    ref('OpenStax: Environmental limits to population growth',bio+'45-3-environmental-limits-to-population-growth')
  ]);

  add('carbon-cycle',[
    'Distinguish carbon reservoirs from carbon-transfer rates.',
    'Calculate net storage change from opposing fluxes.',
    'Explain why rapid cycling does not guarantee a balanced carbon budget.'
  ],[
    ['Identify stocks and pathways','Carbon is stored in organisms, soils, oceans, the atmosphere and rocks. A reservoir amount is a stock measured as mass of carbon; movement between reservoirs is a flux measured as mass per time. A large stock does not necessarily have the fastest turnover. Explicit units prevent confusing how much carbon is present with how quickly it moves.'],
    ['Follow biological exchange','Photosynthesis transfers inorganic carbon into organic molecules, while respiration and decomposition return much of it to inorganic forms. Carbon also moves through feeding, dissolved transport and burial. These processes can occur simultaneously in one ecosystem. A forest may absorb carbon during photosynthesis while also releasing it through plant respiration, decomposers and disturbance.'],
    ['Connect short and long timescales','Weathering, sedimentation, burial and geological processes connect rapid biological exchange to slower reservoirs. Combustion can transfer stored carbon to the atmosphere much faster than geological processes replace it. Net accumulation depends on the imbalance of fluxes. Calling the system a cycle describes connected pathways, not a requirement that every reservoir remain constant.']
  ],['A forest that photosynthesizes is necessarily storing carbon overall.','Photosynthesis is an input, but respiration, decomposition, fire and material export are outputs. Net storage grows only if total inputs exceed total outputs over the chosen boundary and interval. A forest can take up carbon vigorously while losing stored carbon overall if its combined losses are larger.'],{
    title:'Build a carbon budget',
    context:'Fictional annual carbon flows for a bounded woodland. All entries use tonnes of carbon per year, not tonnes of CO₂; other exchanges are excluded by the model.',
    columns:['Flow','Direction','Carbon (tonnes/year)'],
    rows:[['Photosynthetic uptake','Into woodland','120'],['Plant respiration','Out','50'],['Decomposition','Out','55'],['Harvest export','Out','20']],
    question:'Is the woodland a net carbon store over this year, and what happens if harvest export is omitted from the accounting?',
    hint:'Subtract every listed output from the input.',
    answer:'Storage changes by 120 − 50 − 55 − 20 = −5 tonnes of carbon. Omitting export would wrongly suggest a gain of 15 tonnes within the woodland boundary.',
    reasoning:['Opposing flows must use matching carbon units and time intervals.','Export removes carbon from this reservoir even if it remains stored elsewhere.','Changing the boundary to include harvested products requires tracking their later storage and release separately.'],
    limitation:'The data are invented and omit soil transport and disturbance variability. One year does not establish long-term ecosystem behavior.'
  },['Why can atmospheric carbon increase while oceans and land are also absorbing carbon?', 'Compare total additions with total removals rather than assuming every reservoir must move oppositely.', 'Atmospheric inputs can exceed the combined uptake by other reservoirs. Several reservoirs may gain carbon while a long-stored reservoir, such as fossil carbon, loses it; conservation applies to the complete accounting.'],[
    ref('NASA: The carbon cycle','https://science.nasa.gov/earth/earth-observatory/the-carbon-cycle/'),
    ref('NASA JPL: Carbon-cycle reservoirs and fluxes','https://airs.jpl.nasa.gov/resources/157/carbon-cycle/')
  ]);

  add('nitrogen-cycle',[
    'Distinguish fixation, nitrification, assimilation and denitrification.',
    'Trace nitrogen atoms without treating every form as equally available to plants.',
    'Evaluate how oxygen conditions can redirect microbial nitrogen transformations.'
  ],[
    ['Convert atmospheric nitrogen into usable forms','Nitrogen gas is abundant but its strong bond prevents most organisms from using it directly. Nitrogen-fixing microorganisms convert N₂ into ammonia-related forms using substantial energy. Plants generally obtain nitrogen as ammonium or nitrate, then assimilate it into organic molecules. Symbiosis can connect plant carbon supply with microbial nitrogen input without making every plant a nitrogen fixer.'],
    ['Transform and recycle nitrogen','Decomposers convert organic nitrogen into ammonium through mineralization. Nitrifying microorganisms oxidize ammonia or ammonium-derived substrates toward nitrite and nitrate, commonly in oxygenated settings. Assimilation incorporates inorganic nitrogen into biomass. These are distinct transformations: nitrification does not introduce a new nitrogen atom from the atmosphere, and decomposition does not make nitrogen disappear.'],
    ['Return nitrogen and recognize competing pathways','Denitrification can reduce nitrate through intermediate forms toward nitrogen gases under suitable low-oxygen conditions. Other microbial pathways also move nitrogen between forms. Water movement can carry nitrate away from a local soil reservoir. Consequently, nitrogen availability depends on microbial activity, oxygen, carbon resources, plant uptake and transport, rather than on fertilizer input alone.']
  ],['Nitrification and nitrogen fixation are two names for the same process.','Fixation brings atmospheric N₂ into reactive nitrogen compounds. Nitrification oxidizes already-reactive nitrogen from reduced forms toward nitrite and nitrate. They involve different substrates, organisms and energy relationships. Following the nitrogen atom’s starting form clarifies whether a process adds new reactive nitrogen or transforms nitrogen already in that pool.'],{
    title:'Does disappearance prove conversion to gas?',
    context:'Fictional matched-soil model outputs after equal starting nitrate input. Oxygen differs; gaseous nitrogen recovery is measured separately. Values are illustrative nitrogen mass units.',
    columns:['Condition','Nitrate remaining','Nitrogen recovered as gas'],
    rows:[['Oxygenated','8','1'],['Low oxygen','3','5'],['Low oxygen, microbes inactive','9','0']],
    question:'What supports a microbial gaseous-loss pathway, and why is nitrate disappearance alone insufficient?',
    hint:'Compare both the low-oxygen control and the measured destination of nitrogen.',
    answer:'Low oxygen accompanies greater gas recovery when microbes are active. Nitrate loss alone could reflect assimilation or other transfers, so detecting nitrogen in gas strengthens the proposed transformation.',
    reasoning:['The inactive-microbe comparison links the modeled gas output to biological activity.','Measuring a product is stronger than inferring its presence from a missing substrate.','A complete nitrogen budget must include ammonium, biomass and remaining intermediates.'],
    limitation:'Low oxygen alone does not guarantee denitrification. Carbon supply, microbial communities and alternative nitrogen pathways complicate real soils.'
  },['Why might adding nitrogen fail to increase plant growth?', 'Identify other limiting resources and possible nitrogen losses.', 'Light, water, phosphorus or another requirement may limit growth instead. Added nitrogen may also be transformed or lost before uptake, so input quantity cannot by itself predict plant response.'],[
    ref('OpenStax: Biogeochemical cycles',bio+'46-3-biogeochemical-cycles')
  ]);

  add('bacteria',[
    'Identify cellular features shared by bacteria and other organisms.',
    'Separate binary fission from horizontal gene transfer.',
    'Calculate ideal population increase while recognizing environmental limits.'
  ],[
    ['Recognize a complete cell','Bacteria have a plasma membrane, cytoplasm, DNA and ribosomes, although they lack a membrane-enclosed nucleus. Many have a peptidoglycan cell wall; important exceptions exist. Their metabolic diversity includes photosynthetic, aerobic and anaerobic strategies. Small size and a simpler compartment layout do not mean they lack regulation, organization or biologically sophisticated interactions.'],
    ['Copy and divide','During binary fission, chromosome replication and segregation are coordinated with cell growth and division. Descendants can inherit new mutations, while physiological state also changes with resources and stress. An ideal doubling model assumes every cell completes division and survives at a common rate. Actual populations include cells with different growth states and reproductive outcomes.'],
    ['Exchange genes without making a new generation','Bacteria can acquire genetic material through processes such as transformation, transduction and conjugation. These routes differ from reproduction and can move traits between lineages. Plasmids may carry useful genes but are not present in every bacterium. A transferred sequence matters only if it persists and is expressed in an appropriate cellular context.']
  ],['Bacteria are all harmful germs and have no useful roles.','Bacteria participate in decomposition, nutrient cycling, food production and many associations with other organisms. Some cause disease under particular conditions, but that does not describe the whole domain. Biological effect depends on species, strain, location and context; a broad category alone does not establish whether an interaction is beneficial or harmful.'],{
    title:'When does the doubling model stop fitting?',
    context:'Fictional population counts in an abstract bacterial-growth model. Intervals are arbitrary equal steps, not culture instructions; initial conditions are matched.',
    columns:['Interval','Ideal unlimited model (cells)','Resource-limited model (cells)'],
    rows:[['0','100','100'],['1','200','190'],['2','400','330'],['3','800','460']],
    question:'What changes in the resource-limited model indicate that a constant doubling factor is becoming unsuitable?',
    hint:'Compare successive ratios, not just the fact that both populations increase.',
    answer:'The ratios fall from 1.90 to about 1.74 to about 1.39, whereas the ideal model stays at 2. Growth continues, but its proportional increase slows.',
    reasoning:['Exponential doubling requires a constant multiplication factor per interval.','Lower growth factors can follow resource limitation or accumulation of inhibitory conditions.','Counts alone cannot distinguish slower division from more deaths; additional observations are needed.'],
    limitation:'The invented model excludes aggregation, dormant cells and measurement bias. Cell counts and viable reproductive units are not always identical.'
  },['If a bacterium receives a plasmid, has its population size necessarily increased?', 'Separate gene transfer from cell division.', 'No. Existing cells can exchange or acquire genetic material without producing another cell. Horizontal transfer changes genetic composition, whereas binary fission increases cell number when division and survival occur.'],[
    ref('OpenStax: Structure of bacteria and archaea',bio+'22-2-structure-of-prokaryotes-bacteria-and-archaea'),
    ref('OpenStax: Prokaryotic cells',bio+'4-2-prokaryotic-cells')
  ]);

  add('viruses',[
    'Explain which functions viruses obtain from host cells.',
    'Distinguish particle presence, cell entry and productive replication.',
    'Use controls to assess a claim that a model cell supports replication.'
  ],[
    ['Package a genome for transmission','A virus contains a genetic genome surrounded by a protein capsid, sometimes with a lipid envelope. Viral genomes vary widely and can use DNA or RNA. A virion is a particle form; it does not possess the complete cellular machinery for independent metabolism and protein synthesis. Viral replication therefore depends on interaction with a suitable host.'],
    ['Enter a compatible cellular environment','Attachment factors and receptors help determine whether a virus can bind and enter a cell, but entry is only one requirement. Intracellular conditions must also permit genome expression, replication and assembly. Some viruses bring or encode specialized enzymes; all still rely on host resources. Detecting a genome inside a cell does not establish completion of this sequence.'],
    ['Produce descendants or persist differently','Productive infection generates new viral genomes and particles that may leave through lysis or other release pathways. Some viral infections instead involve persistent or latent states, with limited production during particular periods. Viral abundance and host effects vary with immune responses and cellular context. One general diagram cannot describe every genome type or infection strategy.']
  ],['If a test detects viral genetic material, it proves that new infectious viruses are being produced.','Genetic material may come from incoming particles, incomplete replication or remnants. Productive replication requires evidence of new output, and infectivity is a further property that sequence detection alone does not measure. Time-resolved changes and suitable controls help distinguish simple presence from a completed replication process.'],{
    title:'Presence versus increasing output',
    context:'Fictional safe computational model of viral-genome signals after equal starting input. The values illustrate inference only and provide no laboratory procedure.',
    columns:['Model environment','Early signal (relative units)','Later signal (relative units)'],
    rows:[['Compatible cellular model','10','100'],['Entry-only cellular model','10','4'],['No-cell decay control','10','3']],
    question:'Which result is consistent with new genome production, and what does even that result not establish?',
    hint:'Compare an increase with the decline expected from the initial input alone.',
    answer:'The compatible-cell model’s increase is consistent with new genome production. It does not by itself establish assembly of intact particles, infectious output or any particular effect on a host.',
    reasoning:['Equal early signals make different starting inputs less likely to explain the comparison.','Entry-only and no-cell conditions illustrate persistence or decay of input material.','Independent evidence of completed assembly and transmission would be needed for stronger claims.'],
    limitation:'The model assumes reliable signal normalization. Real nucleic-acid measurements can be affected by sampling, degradation and assay specificity.'
  },['Why can a virus attach to a cell yet fail to reproduce there?', 'Follow the requirements after entry.', 'The cell may lack needed factors, restrict genome expression or activate defenses. Surface compatibility is therefore one component of host range, not a complete explanation of productive replication.'],[
    ref('OpenStax: Virus infections and hosts',bio+'21-2-virus-infections-and-hosts')
  ]);

  add('antibiotic-resistance',[
    'Explain resistance as a property of microorganisms rather than of a patient.',
    'Distinguish the origin of heritable variation from selection among variants.',
    'Calculate frequency changes without confusing them with increases in total population size.'
  ],[
    ['Begin with heritable differences','Bacterial populations can contain variants with different susceptibility because of mutation or acquired genetic material. Resistance mechanisms include changes to a target, reduced effective drug entry, export or inactivation. The particular mechanism matters, but variation need not arise because bacteria anticipate a treatment. Heritable differences can exist before the selective condition occurs.'],
    ['Change relative reproductive success','An antimicrobial exposure can suppress susceptible bacteria more strongly than resistant ones. Resistant variants then make up a larger fraction of survivors or descendants, even if their absolute number initially decreases. This is selection acting on a population. It differs from an individual bacterium deliberately adapting its genome to a predicted future need.'],
    ['Follow persistence and spread','Resistance-associated genes can spread through reproduction and, in some cases, horizontal transfer. Their frequency also depends on fitness costs, compensatory changes, migration and the environment. Resistance and temporary tolerance are different concepts: survival without heritable reduced susceptibility does not automatically show a resistance mechanism. Appropriate evidence must separate genotype, phenotype and population history.']
  ],['People become antibiotic-resistant because their bodies get used to antibiotics.','Resistance describes microorganisms’ reduced susceptibility, not a human body becoming resistant to the medicine. A person can carry or acquire resistant microbes. Population selection and gene movement explain how resistance spreads; this biology lesson does not determine which medicine or treatment is appropriate for an individual.'],{
    title:'A fraction can rise while numbers fall',
    context:'Fictional population-selection accounting. Categories represent heritable susceptibility states in an abstract model, with no experimental treatment protocol or clinical prediction.',
    columns:['Stage','Susceptible cells','Resistant cells'],
    rows:[['Before selection','990','10'],['After selection','9','5'],['After equal modeled regrowth','90','50']],
    question:'Did resistance become more common after selection even though resistant-cell number fell? Calculate the relevant fractions.',
    hint:'Use resistant cells divided by all cells at each stage.',
    answer:'Yes. The fraction rises from 10/1,000 = 1% to 5/14 ≈ 35.7%, while the resistant count falls from 10 to 5. Equal later multiplication preserves that fraction.',
    reasoning:['Selection is a difference in relative survival or reproduction.','A rising percentage need not mean that every group grew.','These counts do not show new mutations or gene transfer; those processes were not included in this model.'],
    limitation:'Real populations differ in growth, exposure and resistance mechanisms. The fictional survival values do not represent a particular organism or antimicrobial.'
  },['Would removing selection always make a resistance allele disappear quickly?', 'Consider fitness costs and movement between populations.', 'No. Some resistance variants have small costs, costs may be compensated, and migration or gene transfer can maintain them. Predicting decline requires evidence about the particular allele and environment.'],[
    ref('CDC: About antimicrobial resistance','https://www.cdc.gov/antimicrobial-resistance/about/index.html')
  ]);

  add('cell-differentiation',[
    'Explain how cells with largely shared DNA can acquire different functions.',
    'Connect extracellular signals with gene-regulatory networks and cell state.',
    'Distinguish marker expression from evidence of mature cellular function.'
  ],[
    ['Use different parts of a shared genome','Many differentiated cells retain broadly the same genome but express different genes, producing different proteins, structures and capabilities. Differentiation usually changes gene use rather than deleting unused genes. Exceptions include DNA rearrangements in some immune cells and loss of nuclei in mature mammalian red cells; genomic equivalence is not an absolute rule.'],
    ['Interpret signals through regulatory networks','Signals from neighboring cells, positional cues and internal regulators influence transcription factors and chromatin state. Regulatory networks can reinforce one another, stabilizing an emerging identity while suppressing alternatives. A cell’s previous state influences how it responds, so the same external signal can produce different outcomes at different developmental stages or in different cellular contexts.'],
    ['Acquire and maintain specialized function','Differentiation involves coordinated changes in gene expression, morphology and behavior over time. One marker may appear before a cell performs a mature function, and mixed populations can complicate interpretation. Some identities remain plastic, while others are strongly stabilized. Demonstrating a cell fate requires multiple lines of evidence rather than a single label or visual resemblance.']
  ],['A muscle cell differs from a neuron because it has kept only muscle genes.','Most nucleated somatic cells retain a largely shared DNA repertoire. They differ mainly in which genes are expressed and how their products are regulated. Stable cell identity can be maintained through regulatory networks and chromatin features without discarding all alternative instructions; specialized exceptions should be described separately rather than made the general rule.'],{
    title:'One marker is not a complete identity',
    context:'Fictional model-cell differentiation results under matched survival conditions. A lineage marker and a separate specialized-function score use arbitrary relative scales.',
    columns:['Cell population','Lineage marker','Specialized function'],
    rows:[['Starting cells','1','0'],['Early induced cells','8','1'],['Later induced cells','9','8']],
    question:'Why would declaring the early cells fully mature from the marker alone overstate the evidence?',
    hint:'Compare when the marker rises with when the function develops.',
    answer:'The marker appears strongly before the functional score develops. It supports progression toward the lineage, but mature identity requires functional and additional molecular evidence.',
    reasoning:['Marker and function measure different features of cell state.','The later population shows that acquisition of function can lag behind marker expression.','Single-cell measurements could reveal whether a small mature subgroup is dominating an average.'],
    limitation:'This is an invented lineage assay. Viability, population composition and measurement specificity need independent controls.'
  },['Why might two cells exposed to the same developmental signal adopt different fates?', 'Consider their earlier regulatory states and available receptors.', 'They can differ in receptors, transcription factors, chromatin accessibility and prior signals. The incoming cue is interpreted by an existing cellular system, so identical exposure does not guarantee identical gene-expression responses.'],[
    ref('NCBI Bookshelf: Differential gene expression','https://www.ncbi.nlm.nih.gov/books/NBK10061/'),
    ref('NCBI Bookshelf: Regulation of genome activity','https://www.ncbi.nlm.nih.gov/books/NBK21127/')
  ]);

  add('stem-cells',[
    'Distinguish self-renewal from differentiation potential.',
    'Compare pluripotency with more restricted tissue stem-cell potency.',
    'Evaluate what repeated lineage output establishes about a cell population.'
  ],[
    ['Maintain a source while producing descendants','Stem cells combine the capacity to self-renew with the ability to produce differentiated descendants. Division can retain stem-cell identity in one or both daughters, or generate daughters that progress toward differentiation. These outcomes must be balanced at a population level. A rapidly dividing cell is not automatically a stem cell if it lacks durable self-renewal.'],
    ['Describe potential precisely','Pluripotent cells can give rise to derivatives of the body’s major embryonic germ layers, while many tissue stem cells produce a more restricted range. Potency describes possible differentiation outcomes under appropriate conditions; it is not the same as how often a cell divides. A marker associated with pluripotency is evidence to investigate, not a complete functional definition.'],
    ['Connect cells with their niche','Local signals, physical contacts and tissue conditions influence stem-cell maintenance and fate. Induced pluripotent cells illustrate that differentiated states can sometimes be reprogrammed, but producing a desired cell type reliably requires more than changing a label. Research evaluates identity, stability, function and unwanted outcomes separately; developmental potential alone does not establish therapeutic readiness.']
  ],['All stem cells can become any cell type, and any rapidly growing cell is a stem cell.','Stem-cell types differ in their developmental range. Many adult tissue stem cells are restricted to particular lineages, while pluripotent cells have broader potential. Rapid proliferation alone demonstrates neither that range nor lasting self-renewal. Both continued stem-cell maintenance and appropriate differentiated output need evidence over time.'],{
    title:'Short-lived progenitor or sustained source?',
    context:'Fictional lineage-output study of equal starting model populations. Each round tests whether retained cells can again generate specialized descendants under the same stipulated conditions.',
    columns:['Population','Round 1 output','Round 2 output','Round 3 output'],
    rows:[['A','100','95','98'],['B','100','30','0'],['No-differentiation control','0','0','0']],
    question:'Which population better supports sustained self-renewing capacity, and why does the table not establish pluripotency?',
    hint:'Persistence across rounds and breadth of cell types are different questions.',
    answer:'A better supports sustained source capacity, whereas B is consistent with limited progenitor output. Neither result establishes pluripotency because only one specialized output is measured.',
    reasoning:['Similar first-round outputs conceal different long-term behavior.','Repeated output requires retaining cells able to supply later descendants.','Clonal tracking and tests of multiple lineages would strengthen claims about individual stem cells and their potency.'],
    limitation:'Survival or growth differences could also alter output. Population averages cannot prove that every starting cell had the same capacity.'
  },['Can a population self-renew yet remain unable to produce neurons?', 'Keep maintenance and lineage range separate.', 'Yes. A tissue-restricted stem-cell population can maintain itself and generate its normal descendants without having neuronal potential. Self-renewal and potency describe different properties and should be tested independently.'],[
    ref('NIH: Stem cell basics','https://stemcells.nih.gov/info/basics/stc-basics'),
    ref('NIGMS: What are stem cells?','https://www.nigms.nih.gov/biobeat/2024/11/what-are-stem-cells')
  ]);

  add('pcr',[
    'Explain how primers define a DNA region for amplification.',
    'Calculate ideal copy growth and distinguish it from real amplification efficiency.',
    'Interpret positive and negative controls before drawing a sample conclusion.'
  ],[
    ['Choose a bounded DNA target','Polymerase chain reaction uses primers that bind on opposite strands around a target region. Their orientations allow new strands to extend toward the region being copied. The sequence and placement of primer-binding sites help determine what can amplify. PCR copies nucleic-acid information; it does not by itself identify the source organism or biological function.'],
    ['Repeat template-directed copying','Conceptually, repeated strand separation, primer binding and polymerase extension produce additional templates for later rounds. Under an ideal doubling model, copy number grows as the starting amount multiplied by two raised to the number of cycles. Actual amplification is less ideal because efficiency changes and reactions eventually approach a plateau as components and conditions become limiting.'],
    ['Interpret an assay with controls','A positive control tests whether the assay can produce its expected signal, and a no-template control checks for unwanted amplification or contamination. A sample control can reveal inhibition or failed processing. A signal requires interpretation against these comparisons. Presence of an amplified region alone does not establish viability, infectiousness or every sequence outside that region.']
  ],['A negative PCR signal proves that the original material contained no target DNA.','A target can be missed if it is below the assay’s detection capability, poorly recovered, mismatched at primer sites or inhibited. Controls help distinguish these possibilities. A negative result supports absence of detectable target under validated conditions; it is not a universal proof of absolute absence.'],{
    title:'Can this negative be trusted?',
    context:'Fictional educational assay signals for an unspecified harmless target. The internal control is a separate known sequence expected in each processed sample; no experimental recipe is provided.',
    columns:['Material','Target signal','Internal-control signal'],
    rows:[['Known target control','Present','Present'],['No-template control','Absent','Not added'],['Sample A','Absent','Present'],['Sample B','Absent','Absent']],
    question:'Which sample gives the stronger interpretable negative result, and why must B remain unresolved?',
    hint:'A missing control signal tests whether the sample workflow worked as expected.',
    answer:'A has a more interpretable target-negative result because its control amplifies. B could reflect inhibition or processing failure, so its missing target signal cannot be treated as evidence of absence.',
    reasoning:['The positive control supports assay capability.','The no-template control shows no detected unwanted target signal in that comparison.','Sample-specific control failure identifies a problem that shared external controls may miss.'],
    limitation:'This qualitative model omits detection thresholds and sampling uncertainty. It cannot interpret a real diagnostic test.'
  },['Under ideal doubling, how many copies result from five starting copies after four cycles?', 'Use the multiplier 2⁴, keeping the idealization explicit.', 'Five multiplied by sixteen gives eighty copies. This is theoretical growth accounting for an established target, not a prediction that every real PCR doubles perfectly at each round.'],[
    ref('NHGRI: Polymerase chain reaction fact sheet','https://www.genome.gov/about-genomics/fact-sheets/Polymerase-Chain-Reaction-Fact-Sheet'),
    ref('NHGRI: Polymerase chain reaction','https://www.genome.gov/genetics-glossary/Polymerase-Chain-Reaction-PCR')
  ]);

  add('gel-electrophoresis',[
    'Explain why linear DNA fragments separate by size in a suitable gel.',
    'Estimate fragment size using a ladder without assuming linear distance-to-size scaling.',
    'Distinguish a band’s migration position from its identity and quantity.'
  ],[
    ['Move charged molecules through a matrix','An electric field drives charged molecules through a gel. DNA’s phosphate backbone gives it a net negative charge, so it moves toward the positive electrode under standard conditions. The matrix resists movement and separates fragments. For comparable linear DNA fragments in an appropriate size range, shorter fragments generally migrate farther than longer fragments.'],
    ['Use standards to interpret position','A size ladder contains fragments of known lengths and provides a comparison within the same run. Migration often relates approximately to the logarithm of fragment length over a useful range, not directly to length itself. Gel composition, run conditions and DNA shape influence migration; circular, supercoiled and linear forms cannot always be compared by one simple rule.'],
    ['Separate size evidence from identity','A band contains many molecules with similar migration behavior. Two sequences of equal length can occupy the same position even if their base sequences differ. Band intensity can provide an approximate mass-related signal under controlled staining and imaging, but saturation and loading differences matter. Sequence identity requires additional evidence beyond a matching band position.']
  ],['Two bands at the same height must contain identical DNA sequences.','Matching position supports similar migration under those conditions, often interpreted as similar length for linear DNA. It does not reveal base order. Different sequences of equal length can co-migrate, and different conformations can alter apparent size. A gel provides separation evidence, not a complete sequence readout.'],{
    title:'Interpolate on the right scale',
    context:'Fictional linear-DNA ladder in a size range stipulated to have a linear relationship between migration distance and log₂ fragment length. All bands share one modeled gel.',
    columns:['Band','Length (base pairs)','Migration (mm)'],
    rows:[['Ladder A','1000','20'],['Ladder B','500','30'],['Ladder C','250','40'],['Unknown','?','35']],
    question:'Is the unknown closer to 350 or 750 base pairs, and why is a simple arithmetic midpoint only approximate?',
    hint:'A halfway distance represents a halfway logarithm; use the geometric mean of 500 and 250.',
    answer:'It is approximately 354 base pairs, so 350 is closer. The geometric mean √(500 × 250) follows the stipulated logarithmic calibration; the arithmetic midpoint 375 is not the exact model result.',
    reasoning:['Farther migration corresponds to smaller fragments within this range.','The unknown lies between the 500- and 250-base-pair standards.','Standards must bracket the unknown to avoid unjustified extrapolation.'],
    limitation:'The calibration is fictional and idealized. Real bands have width, measurement uncertainty and possible conformation effects.'
  },['Could a brighter band contain fewer molecules than a dimmer one?', 'Compare DNA mass per molecule as well as molecule number.', 'Yes. Longer fragments contribute more DNA mass per molecule, so brightness cannot be read as molecule count without accounting for length and staining behavior. Imaging saturation can further distort comparisons.'],[
    ref('NHGRI: Electrophoresis','https://www.genome.gov/genetics-glossary/Electrophoresis')
  ]);

  add('crispr',[
    'Distinguish guide-directed targeting from the cellular repair outcome.',
    'Explain why an edit at the intended site still requires validation.',
    'Compare editing success with unintended changes using explicit denominators.'
  ],[
    ['Direct a molecular tool to a sequence','CRISPR systems originated in microbial defense and have been adapted as research tools. In a common Cas9 editing system, a guide RNA helps recognize a complementary DNA region near a compatible sequence motif. Recognition depends on more than the guide alone, including sequence context and access. Different CRISPR-associated tools have different molecular requirements.'],
    ['Let the outcome depend on repair or editing chemistry','Conventional nuclease editing creates a DNA break that cellular repair processes resolve. Repair can produce varied insertions or deletions, or in some settings copy information from a template. Other approaches, including base and prime editing, use different mechanisms. Targeting a location therefore does not guarantee one exact final sequence in every cell.'],
    ['Validate sequence, function and population variation','Researchers examine whether the intended change occurred, whether other alterations appeared and whether the predicted function changed. A mixed population can contain unedited cells and several edited outcomes. Checking selected off-target sites cannot prove that every other genomic position is unchanged. Biological effects, delivery limits and ethical context remain separate questions beyond molecular targeting accuracy.']
  ],['CRISPR works like a perfect find-and-replace command that changes every cell identically.','Target recognition, delivery and repair each introduce variability. Even cells edited at the intended location can carry different final sequences, and some may remain unedited. A measured editing percentage must specify which outcome was counted and which cells were examined; precise function and absence of unintended changes require additional validation.'],{
    title:'Which result counts as success?',
    context:'Fictional sequence review of 100 model cells per group at a neutral target. Local outcome categories are mutually exclusive.',
    columns:['Group','Intended change','Other local changes','Unchanged'],
    rows:[['Untreated control','0','1','99'],['Editing condition A','60','25','15'],['Editing condition B','45','5','50']],
    question:'Which condition yields more intended changes, and which has greater precision among locally changed cells?',
    hint:'Use all 100 cells for one comparison, but only locally changed cells for the other.',
    answer:'A yields more intended changes: 60 versus 45. B has greater precision among local changes: 45/50 = 90%, versus 60/85 ≈ 70.6%.',
    reasoning:['Overall yield and precision among detected local changes use different denominators.','The control establishes a small background of local variation in this fictional sample.','Neither local-site table measures changes elsewhere in the genome or proves the intended biological function.'],
    limitation:'Sampling and assay coverage matter. These invented percentages cannot predict performance or safety of an actual application.'
  },['Why might two cells with the same intended edit still show different phenotypes?', 'Consider the rest of the genome and each cell’s regulatory state.', 'Genetic background, cell identity, expression level and environment can alter the effect. Additional local or distant changes may also differ, so sequence confirmation and functional testing answer complementary questions.'],[
    ref('NHGRI: CRISPR','https://www.genome.gov/genetics-glossary/CRISPR'),
    ref('NHGRI: How genome editing works','https://www.genome.gov/about-genomics/policy-issues/Genome-Editing/How-genome-editing-works')
  ]);
})(typeof window !== 'undefined' ? window : globalThis);
