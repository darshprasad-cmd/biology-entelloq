/* Original, option-specific teaching feedback for the canonical concept checks.
 * Keys preserve question and option identity, including after option rotation.
 * Biology references are recorded with each topic in topics.js.
 * Mechanism checks: OpenStax Biology 2e, sections 6.5, 7.4, 8.2, 12.1 and 35.2.
 * This supplements authored worked reasoning; it never changes local grading. */
(function (global) {
  'use strict';
  global.BIO_EXAM_TOPIC_RATIONALES = {
  "Which structure is present in both typical plant and animal cells?": {
    "Chloroplast": "Chloroplasts perform photosynthesis in plant cells and some algae. Typical animal cells have no chloroplasts, so this organelle is not shared by both groups.",
    "Mitochondrion": "Typical plant and animal cells both use mitochondria for aerobic respiration. Plant cells need cellular ATP even though photosynthetic cells also contain chloroplasts.",
    "Cellulose cell wall": "A cellulose wall supports plant cells outside their plasma membrane. Animal cells have a plasma membrane but no cellulose cell wall."
  },
  "At diffusion equilibrium, what happens to the particles?": {
    "They keep moving with balanced opposing flows": "Random thermal motion continues at equilibrium. Equal average movement in opposite directions produces zero net diffusion; it does not produce motionless particles.",
    "They all collect on one side": "Collecting on one side would maintain a concentration difference. Without an opposing constraint or energy input, diffusion tends to reduce that difference.",
    "They stop moving": "Equilibrium describes balanced net transport, not the disappearance of molecular motion. Individual particles continue moving and exchanging places."
  },
  "Which statement about lipids is accurate?": {
    "They are the only molecules containing carbon": "Carbohydrates, proteins and nucleic acids also contain carbon. Carbon content alone therefore cannot identify a molecule as a lipid.",
    "All are chains of repeating amino acids": "Amino-acid chains are polypeptides. Many lipids instead contain fatty acids, glycerol or fused rings, so amino-acid repetition does not define this group.",
    "They are a diverse group, not all repeating-monomer polymers": "Lipids include structurally different molecules such as triglycerides, phospholipids and steroids. Unlike proteins, the whole group is not defined by one repeating monomer."
  },
  "What does an enzyme change?": {
    "The activation barrier": "An enzyme provides a pathway with a lower activation barrier. More substrate molecules can then reach the transition state per unit time under the same conditions.",
    "The overall reaction ΔG": "The overall free-energy difference depends on the reactants, products and conditions. Catalysis changes the route between them, not their initial and final free energies.",
    "The equilibrium constant": "An enzyme accelerates approach to equilibrium in both directions. It does not change the equilibrium constant or make an unfavorable equilibrium favorable."
  },
  "Where does the released O₂ originate in plant photosynthesis?": {
    "Carbon dioxide": "Carbon dioxide supplies carbon for carbohydrate synthesis. The oxygen gas released by the light reactions instead comes from oxidation of water.",
    "Glucose": "Glucose is a carbohydrate product assembled using fixed carbon. Splitting glucose is not the source of oxygen released by photosystem II.",
    "Water": "The water-splitting complex associated with photosystem II removes electrons from water. Oxygen atoms from water combine to form the released O₂."
  },
  "What is oxygen’s direct role in aerobic electron transport?": {
    "It splits glucose in glycolysis": "Glycolysis breaks down glucose in the cytosol without directly consuming oxygen. The question asks about oxygen's role at the respiratory chain itself.",
    "It becomes every carbon atom in CO₂": "Oxygen contains no carbon atoms. Carbon dioxide released during respiration carries carbon from the organic molecules being oxidized.",
    "It accepts electrons at the end of the chain": "At the end of the mitochondrial chain, oxygen accepts electrons and combines with protons to form water. This permits continued electron flow."
  },
  "When is DNA copied for a typical mitotic division?": {
    "During anaphase": "Anaphase separates previously copied sister chromatids. If replication waited until anaphase, there would be no completed duplicated chromosomes to segregate normally.",
    "During S phase before mitosis": "DNA replication occurs during S phase of interphase. A typical cell therefore enters mitosis with sister chromatids already formed for each chromosome.",
    "After cytokinesis only": "Replication after cytokinesis could prepare a daughter cell for its next division, but it cannot supply the copies needed for the division just completed."
  },
  "What separates in meiosis I?": {
    "Every pair of sister chromatids": "Sister chromatids normally remain together during meiosis I. Their separation occurs in meiosis II, after homologous pairs have been divided between cells.",
    "The two DNA strands of each chromosome": "Separating the strands within a DNA double helix is not chromosome segregation. Meiosis distributes whole chromosomes and then chromatids between cells.",
    "Homologous chromosomes": "Meiosis I separates the two homologues of each pair. This reduces the number of chromosome sets while each chromosome still has sister chromatids."
  },
  "What makes the two DNA strands useful templates?": {
    "Every base pairing with every other base": "Unrestricted pairing would not specify a unique matching sequence. Template copying works because pairing rules constrain which nucleotide is added opposite each base.",
    "Identical direction": "The two strands run in opposite directions: they are antiparallel. Identical direction is therefore neither their normal arrangement nor the basis of sequence copying.",
    "Complementary base pairing": "A pairs with T and G pairs with C in ordinary DNA. Each strand can therefore specify a complementary partner during replication."
  },
  "During translation, what is directly read by a ribosome?": {
    "An mRNA sequence": "The ribosome advances along mRNA codons. Matching tRNAs deliver amino acids, allowing the nucleotide sequence to guide polypeptide assembly.",
    "A chromosome’s outer surface": "For a protein-coding gene, transcription first produces an RNA message. Ribosomes translate that message rather than reading the outside of a chromosome.",
    "A finished protein": "A completed protein is a product of translation. It is not the codon-bearing template that the ribosome reads to specify a new chain."
  },
  "In an Aa × Aa cross, is the fourth offspring guaranteed to be aa?": {
    "No, each offspring has a ¼ probability under the model": "Each parent supplies an a allele with probability 1/2. Under the independent-cross model, each offspring has probability 1/2 × 1/2 = 1/4 of being aa.",
    "Only if the first three are AA": "The first three offspring do not determine the alleles in the fourth fertilization. Previous outcomes do not create a requirement to balance the family ratio.",
    "Yes, because the ratio is 3:1": "The 3:1 phenotype ratio is an expected frequency across many offspring under complete dominance. It is not a fixed four-offspring sequence."
  },
  "Which rule correctly defines an artery?": {
    "It has a valve at every branch": "Valves at every branch are not an arterial feature or definition. Vessel identity is determined by its direction of flow relative to the heart.",
    "It always carries highly oxygenated blood": "Pulmonary arteries carry relatively deoxygenated blood from the heart to the lungs. Oxygen content therefore cannot define all arteries.",
    "It carries blood away from the heart": "An artery carries blood away from the heart, regardless of oxygen content. This definition correctly includes both systemic and pulmonary arteries."
  },
  "What directly determines the direction of oxygen diffusion?": {
    "A difference in oxygen partial pressure": "Oxygen diffuses down its partial-pressure gradient, provided a permeable pathway exists. The gradient determines the direction of net transfer.",
    "The color assigned to a vessel": "Red and blue are diagram conventions. Changing a drawing's color does not change oxygen partial pressure or the physical direction of diffusion.",
    "A cell choosing a direction": "Diffusion follows molecular motion and physical gradients. Cellular regulation can alter conditions, but it does not replace the gradient as the immediate driver."
  },
  "How can a stronger stimulus commonly be represented by a neuron?": {
    "By a change in action-potential firing rate": "Once threshold is reached, action potentials are approximately all-or-none. Stronger input is commonly encoded by a higher firing frequency, sometimes with recruitment of additional neurons.",
    "By reversing every ion gradient permanently": "Maintained ion gradients make repeated signaling possible. Permanently reversing all gradients would disrupt excitability rather than provide a normal intensity code.",
    "By much larger individual action potentials": "Individual action potentials in the same axon do not normally become much larger as a stimulus strengthens. Firing rate is the more appropriate variable here."
  },
  "Which cell type can become an antibody-secreting plasma cell?": {
    "Platelet": "Platelets are cell fragments involved in hemostasis. They do not follow the B-cell differentiation pathway that produces antibody-secreting plasma cells.",
    "B lymphocyte": "Activated B lymphocytes can differentiate into plasma cells. Plasma cells secrete antibodies with specificity related to the responding B-cell receptor.",
    "Red blood cell": "Red blood cells mainly transport respiratory gases. They are not antibody-producing lymphocytes and do not differentiate into plasma cells."
  },
  "Which statement best describes phloem transport?": {
    "It always moves downward": "Downward transport can occur, but it is not a universal rule. Developing shoots, roots and storage organs can act as sinks in different circumstances.",
    "It moves from sources toward sinks, which can change": "Sources export assimilates and sinks import or store them. Their identity can change with growth or season, so phloem transport follows source-to-sink relationships.",
    "It carries only pure water": "Phloem sap contains dissolved sugars and other transported substances. Describing it as pure water omits its central role in assimilate transport."
  },
  "Which statement describes natural selection accurately?": {
    "Heritable variants can differ in reproductive success": "Selection occurs when inherited differences are associated with different reproductive contributions. Across generations, variants can consequently change in frequency.",
    "Every population change must improve adaptation": "Genetic drift and other processes can change populations without improving adaptation. Even selection operates within a particular environment rather than toward a universal ideal.",
    "Organisms produce useful mutations because they need them": "Useful variation need not arise because it is needed. Selection changes the representation of variants; it does not instruct organisms to produce a chosen mutation."
  },
  "What do arrows usually show in an ecological food web?": {
    "A guaranteed population increase": "An energy-transfer arrow does not by itself predict population growth. Growth also depends on mortality, reproduction, competition and available resources.",
    "Energy transfer from a resource to its consumer": "A standard food-web arrow points from an eaten resource to its consumer. It represents the direction of energy and material transfer through feeding.",
    "Which animal looks at another": "Food-web arrows describe feeding relationships and transfer, not attention or gaze. Their direction should be interpreted from the diagram's ecological convention."
  },
  "Where is most DNA in a typical animal cell located?": {
    "Inside ribosomes": "Ribosomes contain ribosomal RNA and proteins and carry out translation. They do not house the cell's main chromosome complement.",
    "Inside the nucleus": "Most DNA in a typical animal cell is organized into nuclear chromosomes. Mitochondria contain a much smaller additional genome.",
    "Inside the Golgi": "The Golgi modifies and sorts cellular cargo. It is not the compartment that stores the main nuclear chromosomes."
  },
  "Is the nucleolus surrounded by its own lipid membrane?": {
    "No": "The nucleolus is a specialized region within the nucleus where ribosomal components are produced and assembled. It has no separate surrounding lipid membrane.",
    "Only while translating mRNA": "Translation occurs on ribosomes, not as a process that gives the nucleolus a membrane. Its membrane-free organization is unrelated to this proposed condition.",
    "Yes, a double membrane": "The nuclear envelope has two membranes and surrounds the nucleus. Confusing the nucleus with the nucleolus leads to this incorrect choice."
  },
  "Why is the inner membrane’s low proton permeability important?": {
    "It prevents all chemical reactions": "The inner membrane houses respiratory complexes and ATP synthase. Selective impermeability supports their coupled activity; it does not stop all chemistry.",
    "It allows a proton gradient to be maintained": "Restricting uncontrolled proton movement allows respiratory pumping to maintain an electrochemical difference. Proton flow through ATP synthase can then support ATP production.",
    "It lets all protons escape instantly": "Instant, unrestricted proton escape would short-circuit the gradient. Electron transport could then be uncoupled from efficient ATP synthesis."
  },
  "Which statement about ribosomes is correct?": {
    "Only eukaryotes have them": "Prokaryotes also synthesize proteins using ribosomes. Ribosomal size and composition differ between groups, but their presence is not restricted to eukaryotes.",
    "They occur in both prokaryotic and eukaryotic cells": "Both prokaryotic and eukaryotic cells use ribosomes to translate mRNA. This shared function is fundamental to cellular protein synthesis.",
    "They are membrane-bound storage bags": "Ribosomes are RNA-protein complexes without a surrounding membrane. Storage vesicles are a different class of cellular structure."
  },
  "What makes rough ER look rough?": {
    "DNA covering its lumen": "The ER lumen is not lined with DNA. The visible roughness comes from structures attached to the membrane's cytosolic face.",
    "Its complete lack of membranes": "The ER is an extensive membrane system. Losing those membranes would not explain the attached ribosomes that give rough ER its appearance.",
    "Ribosomes on its cytosolic surface": "Ribosomes attached to the cytosolic face synthesize proteins entering the ER pathway. These ribosomes create the granular appearance associated with rough ER."
  },
  "Which function is especially associated with specialized ER in muscle?": {
    "Chromosome segregation": "Chromosome segregation is organized by the spindle during cell division. It is not the specialized function of muscle's sarcoplasmic reticulum.",
    "Storage and release of calcium": "The sarcoplasmic reticulum stores calcium and releases it during excitation-contraction coupling. Calcium removal back into this compartment helps muscle relax.",
    "DNA replication": "DNA replication copies the genome during S phase. It is distinct from the rapid calcium handling performed by specialized ER in muscle."
  },
  "Which route is typical for a secreted protein?": {
    "Ribosome → ER → Golgi → cell exterior": "A typical secreted protein enters the ER during synthesis, then passes through the Golgi for processing and sorting before vesicular release at the cell surface.",
    "Golgi → nucleus → DNA": "A secreted protein does not normally become nuclear DNA. This choice reverses the secretory route and confuses protein transport with genetic information.",
    "Lysosome → chromosome → ribosome": "Lysosomal degradation and chromosome organization are not upstream stages of the standard secretory route. New protein synthesis starts on a ribosome."
  },
  "What helps lysosomal enzymes work in their usual compartment?": {
    "A complete absence of water": "Lysosomal digestion uses hydrolytic reactions, which involve water. A water-free compartment would not provide the normal conditions for these enzymes.",
    "Direct exposure of all DNA": "Lysosomal function does not require exposing all cellular DNA. Compartmentalization helps separate degradative enzymes from much of the cell's material.",
    "An acidic lumen": "Proton pumping maintains an acidic lysosomal lumen. Many lysosomal hydrolases function best under these acidic conditions."
  },
  "Which comparison is correct?": {
    "Peroxisomes contain the main nuclear chromosomes": "The main chromosomes lie in the nucleus of a typical eukaryotic cell. Peroxisomes are metabolic compartments, not chromosome-storage organelles.",
    "Peroxisomes and lysosomes perform identical chemistry": "The two organelles have different enzyme sets and chemical environments. Their shared participation in metabolism does not make their reactions identical.",
    "Peroxisomes handle selected oxidation pathways; lysosomes specialize in acidic degradation": "Peroxisomes carry out selected oxidative reactions and manage hydrogen peroxide. Lysosomes contain acid hydrolases for intracellular degradation."
  },
  "Which structure directly encloses a plant vacuole?": {
    "Tonoplast": "The tonoplast is the membrane surrounding the plant vacuole. Its transport proteins help regulate the vacuolar contents and contribute to cellular water balance.",
    "Nuclear envelope": "The nuclear envelope surrounds the nucleus. It does not form the vacuole's boundary, which has a distinct membrane and transport functions.",
    "Cellulose chromosome": "Cellulose is a cell-wall polysaccharide, not a chromosome or membrane. This proposed structure cannot enclose the vacuole."
  },
  "Where does the Calvin cycle occur in a chloroplast?": {
    "Thylakoid lumen": "The thylakoid lumen accumulates protons during the light reactions. The soluble enzymes of the Calvin cycle operate in the surrounding stroma.",
    "Outer membrane only": "The outer envelope is not the exclusive site of carbon fixation. The Calvin-cycle reactions occur in the chloroplast's internal stromal compartment.",
    "Stroma": "The stroma contains the enzymes for the Calvin cycle. ATP and NADPH from the light reactions support carbon reduction there."
  },
  "Can cells divide without a canonical animal centrosome?": {
    "Only if they lack DNA": "Successful cell division normally requires faithful chromosome distribution. Lacking DNA is not a mechanism for assembling a spindle without a canonical centrosome.",
    "No, all plants therefore lack mitosis": "Plant cells do undergo mitosis. Many organize spindle microtubules without the canonical centrosome characteristic of animal cells.",
    "Yes, alternative spindle-assembly pathways exist": "Microtubules can be organized by other pathways, including chromosome-associated and distributed nucleation mechanisms. A canonical animal centrosome is therefore not universally required."
  },
  "Why is “fixed skeleton” an incomplete description?": {
    "Many cytoskeletal structures are dynamic": "Actin filaments and microtubules can assemble, disassemble and reorganize. These changes support movement, transport and division, so a permanently fixed framework is an incomplete model.",
    "The cytoskeleton contains no proteins": "The cytoskeleton is built from proteins, including actin, tubulin and intermediate-filament proteins. Its composition directly contradicts this claim.",
    "It occurs only outside cells": "Cytoskeletal structures lie within cells and interact with membranes and organelles. Extracellular supporting material is not the cytoskeleton itself."
  },
  "Which region most strongly obstructs free passage of many ions?": {
    "The surrounding water": "Many ions are stabilized by hydration in water. Their main energetic barrier is entering the membrane's nonpolar core, not remaining in the surrounding aqueous solution.",
    "The word plasma": "The name plasma membrane has no physical effect on permeability. Its molecular structure, especially the hydrophobic core, explains the barrier.",
    "The bilayer’s hydrophobic interior": "Charged ions interact poorly with the hydrophobic lipid interior. Channels or transporters provide suitable pathways for controlled passage across it."
  },
  "Which statement distinguishes wall from membrane?": {
    "Both are made only of DNA": "Walls and membranes are chemically different structures. Plant walls contain cellulose, while membranes contain lipids and proteins; neither consists only of DNA.",
    "The wall usually replaces the membrane": "A plant cell retains a plasma membrane inside its wall. Mechanical support does not replace the membrane's role in selective transport.",
    "The wall provides support while the membrane regulates selective exchange": "The wall resists deformation and provides support. The plasma membrane forms the selectively permeable boundary controlling exchange with the cytoplasm."
  },
  "Can pressure oppose osmotic water entry into a plant cell?": {
    "Yes": "Water entry can build turgor pressure against a plant cell's wall. This pressure contributes to water potential and can oppose further net osmotic entry.",
    "No, solutes are the only possible influence": "Solute concentration matters, but pressure also contributes to water potential. Ignoring pressure cannot explain how a turgid cell approaches water balance.",
    "Only if the cell lacks a wall": "The wall helps the cell sustain turgor pressure. A missing wall is therefore not a requirement for pressure to oppose osmotic entry."
  },
  "Does every active transporter directly hydrolyze ATP?": {
    "No, secondary transport can use an ion gradient": "Primary transport can build an ion gradient using ATP. Secondary transport uses energy stored in that gradient to drive another substance uphill.",
    "No active transport requires energy": "Movement against an electrochemical gradient requires an energy source. Secondary transport changes the immediate source of that energy; it does not eliminate the requirement.",
    "Yes": "Direct ATP hydrolysis describes many primary pumps. It does not describe every active transporter, because cotransporters can couple transport to an ion gradient."
  },
  "Why is “breaking ATP’s bond releases energy” incomplete?": {
    "ATP works without any reaction": "ATP participates in coupled chemical reactions, often by transferring a phosphate group. Its presence alone cannot supply useful work without an appropriate reaction pathway.",
    "Bond breaking itself requires energy; the overall reaction can release free energy": "Breaking a chemical bond requires energy. ATP hydrolysis can nevertheless release free energy overall because the products and their interactions are more favorable under the stated conditions.",
    "ATP has no bonds": "ATP contains chemical bonds linking its components. The misconception concerns the net energetics of hydrolysis, not whether the molecule has bonds."
  },
  "In ideal reversible competitive inhibition, what happens to Vmax?": {
    "It is unchanged": "In the ideal competitive model, sufficient substrate can outcompete a reversible inhibitor. The same maximal rate is approached, although more substrate is required.",
    "It must become zero": "A finite reversible competitive inhibitor does not permanently remove all active enzyme. At sufficiently high substrate concentration, activity can approach the original maximum.",
    "It doubles in every case": "Competition does not create extra enzyme or universally double its turnover. The model predicts unchanged Vmax, not a fixed increase."
  },
  "Which photosystem acts first in the usual linear electron pathway?": {
    "Photosystem I": "Photosystem I acts after photosystem II in linear electron flow. Their numbering reflects discovery history rather than the order of the pathway.",
    "Neither uses light": "Both photosystems use light-driven excitation. Removing light use from both would remove the energy input required for the usual linear pathway.",
    "Photosystem II": "Photosystem II begins the usual linear pathway by supplying excited electrons to the chain; water replenishes them. Electrons later reach photosystem I."
  },
  "Why does most G3P remain in the cycle?": {
    "Because all G3P becomes oxygen": "G3P is a carbon-containing organic product. Oxygen gas is released by water oxidation in the light reactions, not by converting all G3P into oxygen.",
    "To regenerate the CO₂ acceptor RuBP": "For every three CO₂ fixed, most triose phosphate is rearranged to regenerate RuBP. Only a portion can leave while maintaining the cycle's acceptor supply.",
    "Because G3P has no carbon": "Glyceraldehyde-3-phosphate has three carbon atoms. Its carbon skeleton is precisely what permits both carbohydrate synthesis and regeneration of RuBP."
  },
  "What is the net ATP yield of glycolysis per glucose?": {
    "Two ATP": "Glycolysis makes four ATP by substrate-level phosphorylation but spends two ATP in its investment phase. The net yield is therefore two ATP per glucose.",
    "Four ATP": "Four ATP is the gross production. Subtracting the two ATP used earlier gives the requested net yield of two.",
    "Zero ATP in every condition": "The standard pathway provides a net ATP gain when it proceeds. A universal zero yield ignores the ATP-producing reactions in the payoff phase."
  },
  "What is regenerated so the cycle can continue?": {
    "Every original glucose molecule": "Glucose is broken down upstream of the cycle. The cycle does not reconstruct each starting glucose molecule to keep operating.",
    "Oxygen gas": "The cycle does not regenerate oxygen gas. Its reduced carriers pass electrons onward, while oxygen is consumed at the end of aerobic electron transport.",
    "Oxaloacetate": "Oxaloacetate combines with incoming acetyl-CoA to form citrate and is regenerated through the cycle. Regeneration allows another acetyl group to enter."
  },
  "Which mitochondrial respiratory complex does not pump protons?": {
    "Complex IV": "Complex IV transfers electrons to oxygen and contributes to proton translocation. It is therefore not the non-pumping complex requested.",
    "Complex II": "Complex II transfers electrons from succinate oxidation to ubiquinone without pumping protons. Complexes I, III and IV contribute to the mitochondrial proton gradient.",
    "Complex I": "Complex I couples electron transfer from NADH to proton pumping. Choosing it overlooks one of the main proton-translocating steps."
  },
  "What happens if protons freely leak across the membrane?": {
    "The usable gradient tends to dissipate": "An uncontrolled proton leak dissipates the electrochemical gradient. Less of that stored energy is available to drive ATP synthesis through ATP synthase.",
    "ATP yield must increase without limit": "Uncoupled proton return bypasses productive coupling through ATP synthase. It cannot cause unlimited ATP production and generally reduces the ATP obtained per respiratory input.",
    "All protons become electrons": "A proton remains a proton while crossing the membrane. Proton transport and electron transfer are distinct processes coupled by the respiratory machinery."
  },
  "What is the key role of lactate formation in sustaining glycolysis?": {
    "Producing oxygen": "Lactate formation reduces pyruvate and regenerates NAD⁺. Oxygen production is not part of this reaction or its role in sustaining glycolysis.",
    "Adding 30 ATP directly": "The lactate-forming step does not directly add a large ATP yield. It permits glycolysis, with its own limited ATP yield, to continue.",
    "Regenerating NAD⁺": "Reducing pyruvate to lactate oxidizes NADH back to NAD⁺. The regenerated NAD⁺ supports the oxidation step required for continued glycolytic flux."
  },
  "Which phase normally doubles cellular DNA before division?": {
    "Telophase": "Telophase reorganizes the nuclei after chromosome separation. The DNA required for that division was copied earlier, before mitosis began.",
    "S phase": "During S phase, each chromosome's DNA is replicated. This normally doubles the cellular DNA content without immediately doubling the number of chromosome sets.",
    "G1 alone": "G1 is primarily a growth and preparation phase in the usual cycle. Genome duplication is assigned to S phase, not G1 alone."
  },
  "In which direction does DNA polymerase extend a new strand?": {
    "5′ to 3′": "DNA polymerase adds each nucleotide to the growing strand's 3′ end. The new strand therefore extends in the 5′-to-3′ direction.",
    "3′ to 5′": "The template is read in the opposite direction to synthesis. Confusing template reading with new-strand extension leads to this reversed answer.",
    "Equally in either direction": "Ordinary DNA polymerases do not extend a new strand equally in both directions. Both leading and lagging strands are synthesized 5′ to 3′."
  },
  "Crossing over normally occurs between which chromatids?": {
    "Only identical strands within one chromatid": "The usual meiotic exchange involves chromatids from paired homologues. The two strands within one chromatid are not the two homologous chromatids exchanging segments.",
    "Any random unrelated chromosome ends": "Random exchange between unrelated chromosome ends would not be normal homologous crossing over. Homologous sequence alignment guides the usual meiotic exchange.",
    "Nonsister chromatids of homologous chromosomes": "Homologues pair during meiosis I, allowing nonsister chromatids to exchange corresponding DNA segments. This can create new combinations of alleles on a chromatid."
  },
  "Does transcription copy the entire genome each time?": {
    "Only during every nerve impulse": "A nerve impulse involves changes in membrane conductance. It does not require copying the whole genome into RNA during each impulse.",
    "No, selected regions are transcribed": "RNA polymerases transcribe selected regions according to cellular regulation. Different genes can therefore be expressed at different times and in different cell types.",
    "Yes, always": "Whole-genome duplication is DNA replication, not transcription. Transcription produces RNA from particular template regions rather than obligatorily copying every gene."
  },
  "What usually recognizes a stop codon during termination?": {
    "A release factor": "A release factor recognizes a stop codon in the ribosomal A site. It promotes release of the completed polypeptide rather than adding another amino acid.",
    "A tRNA carrying a stop amino acid": "There is no ordinary stop amino acid carried by a dedicated tRNA. Stop codons signal termination through release factors in the standard translation process.",
    "DNA ligase": "DNA ligase joins breaks in DNA. It does not read an mRNA stop codon or release a newly made polypeptide from a ribosome."
  },
  "Are all mutations harmful?": {
    "Yes": "Some mutations disrupt function, but others have little detectable effect or can be advantageous in a particular environment. Harm is not a universal outcome.",
    "No, they are all useful": "Benefit is not universal either. A mutation's effect depends on what changes, the genetic background and the environmental conditions being considered.",
    "No, effects can be harmful, neutral or beneficial depending on context": "A sequence change can be harmful, effectively neutral or beneficial. Evaluating its consequence requires biological context rather than assuming a single effect for all mutations."
  },
  "Does incomplete dominance mean alleles permanently blend together?": {
    "Only in every plant": "Incomplete dominance is not a rule that permanently merges alleles in plants. The same distinction between phenotype and allele identity applies across suitable examples.",
    "No, alleles remain distinct and segregate": "An intermediate heterozygous phenotype does not erase the alleles. They remain distinct and can segregate to produce the parental homozygous phenotypes in later generations.",
    "Yes, the DNA copies dissolve into one": "DNA copies do not dissolve into one blended allele. The intermediate appearance concerns expression of a trait, not permanent loss of the underlying alleles."
  },
  "Which blood component becomes a plasma cell that produces antibodies?": {
    "An activated B lymphocyte": "An activated B lymphocyte can differentiate into an antibody-secreting plasma cell. This is part of the adaptive immune response.",
    "A red blood cell": "Red blood cells specialize in respiratory gas transport. They do not become plasma cells or produce the antibody response of B lymphocytes.",
    "A platelet": "Platelets contribute to clot formation and vascular repair. They are not the lymphocyte precursors of antibody-secreting plasma cells."
  },
  "What directly causes a normal heart valve to open?": {
    "A tiny muscle pulling every leaflet open": "Normal valve leaflets move passively with pressure differences. Papillary muscles help prevent atrioventricular-valve prolapse; they do not pull the valves open.",
    "Blood changing color": "Blood color is associated with hemoglobin's state and is not the force opening a valve. Mechanical pressure differences determine leaflet movement.",
    "A favorable pressure difference across it": "When upstream pressure exceeds downstream pressure in the permitted direction, the valve opens. Reversal of that pressure difference favors closure."
  },
  "Why is sweating in response to overheating a negative-feedback example?": {
    "It increases the original disturbance in every case": "Amplifying the initial temperature rise would be positive feedback. Sweating can instead promote heat loss and reduce the original disturbance.",
    "It helps oppose the temperature increase": "Evaporation of sweat can remove heat, helping reduce elevated body temperature. The response therefore opposes the original change, which defines negative feedback.",
    "It is harmful by definition": "Negative refers to the direction of feedback, not whether the response is harmful. A stabilizing response can be beneficial while still being called negative feedback."
  },
  "What mainly produces the rapid repolarizing phase in a typical neuronal action potential?": {
    "Changes in channel conductance, including increased K⁺ efflux": "During repolarization, sodium-channel inactivation and increased potassium conductance favor a fall in membrane potential. Potassium efflux is a major contributor in a typical neuron.",
    "The sodium-potassium pump instantly reversing all ions": "The sodium-potassium pump maintains gradients over time. The rapid voltage change of repolarization mainly reflects changing channel conductances, not instant reversal by the pump.",
    "DNA being copied": "DNA replication occurs on a very different timescale and serves genome duplication. It is not the membrane mechanism underlying rapid repolarization."
  },
  "Which ion commonly triggers rapid vesicle release at a chemical synapse?": {
    "Chloride in every synapse": "Chloride can contribute to postsynaptic inhibitory responses, depending on its gradient. It is not the usual immediate trigger for presynaptic vesicle fusion.",
    "Iron": "Iron has biological roles but is not the standard rapid signal linking terminal depolarization to synaptic-vesicle release in this mechanism.",
    "Calcium": "Depolarization opens voltage-gated calcium channels in the presynaptic terminal. Incoming Ca²⁺ activates the machinery that promotes vesicle fusion and neurotransmitter release."
  },
  "Are memory B cells and long-lived plasma cells identical?": {
    "Yes, all immune cells are identical": "Immune cells have specialized roles. Grouping all of them together misses the difference between persistent antibody secretion and a rapid response to renewed antigen exposure.",
    "No, they have different functional roles": "Long-lived plasma cells can maintain antibody secretion. Memory B cells can respond to later antigen exposure and generate further effector responses; the roles are distinct.",
    "Yes, both terms mean red blood cells": "Both terms refer to B-cell-related immune populations, not red blood cells. Red cells mainly transport gases and do not supply these adaptive-memory functions."
  },
  "Are mature xylem vessel elements normally living cells?": {
    "No, they are dead at functional maturity": "Mature vessel elements lose their living contents and form conducting passages with reinforced walls. Their structure supports bulk water transport rather than active pumping by each cell.",
    "Yes, each contains a beating heart": "Vessel elements do not possess hearts. Water movement through mature xylem depends on physical pressure relationships and the connected conducting pathway.",
    "Only if the plant is flowering": "Functional maturity, rather than whether a plant is currently flowering, determines this condition. Mature xylem vessel elements are normally dead conducting cells."
  },
  "Can a storage root be a sink in one season and a source in another?": {
    "No, source and sink are permanent tissue names": "Source and sink describe current transport roles. A storage organ can import assimilates at one time and export mobilized reserves at another.",
    "Only after becoming an animal": "Changing a plant organ's source-sink role requires a change in metabolism and transport, not a change into another kind of organism.",
    "Yes": "A root can import sugar while building reserves, then export stored carbon during renewed growth. It can therefore change from sink to source."
  },
  "What tradeoff commonly follows stomatal closure?": {
    "No effect on gas exchange": "Stomata are major pathways for leaf gas exchange. Closing them affects both water-vapor loss and the entry of carbon dioxide.",
    "Lower water loss but reduced CO₂ entry": "Closing pores usually limits water-vapor loss but also restricts CO₂ supply for photosynthesis. The plant faces a tradeoff between conserving water and carbon uptake.",
    "More water loss and unlimited CO₂ entry": "Closure reduces the open diffusion pathway; it does not provide unlimited gas access. Both the claimed water-loss increase and unlimited CO₂ entry contradict the usual effect."
  },
  "Can a neutral allele become fixed through drift?": {
    "Yes": "Random differences in which alleles are passed on can eventually eliminate alternatives. A neutral allele can become fixed without providing a selective advantage.",
    "No, fixation always proves adaptation": "Fixation is an outcome, not proof of adaptation. Drift can cause it, especially in small populations, so additional evidence is needed to infer selection.",
    "Only if it consciously improves itself": "Alleles do not change frequency through conscious improvement. Drift follows chance sampling across generations, without a goal or requirement for benefit."
  },
  "Can standing biomass be greater in consumers than producers at one moment?": {
    "No, this would create energy": "A biomass snapshot is not a measurement of energy transfer over time. Rapid producer turnover can support consumers without creating energy.",
    "Only if consumers photosynthesize": "Consumers need not photosynthesize for a biomass pyramid to be inverted. The relevant difference can be turnover: producer biomass is replaced and eaten rapidly.",
    "Yes, if producer biomass renews rapidly enough": "A small producer standing stock can renew quickly and support a larger consumer stock. Energy-flow pyramids and biomass snapshots therefore answer different questions."
  },
  "Is carrying capacity a permanently fixed number for a species?": {
    "Yes, it equals body mass": "Carrying capacity describes population support under specified conditions, not an individual's body mass. The two quantities have different meanings and units.",
    "No, it depends on environment and model assumptions": "Resource availability, environmental conditions and interactions affect how many individuals can be sustained. K is a model parameter for those conditions, not a permanent species constant.",
    "Yes, every habitat has the same K": "Habitats differ in resources and constraints. Assigning the same carrying capacity to every habitat ignores the environmental basis of the parameter."
  },
  "Does rapid photosynthesis alone prove permanent carbon storage?": {
    "No, losses and storage timescales also matter": "Photosynthesis measures uptake, but respiration, decomposition and disturbance can return carbon. Net storage requires considering losses and how long carbon remains retained.",
    "Yes, all fixed carbon stays forever": "Fixed carbon can be respired, decomposed or burned. Rapid fixation therefore does not establish that the carbon will remain stored permanently.",
    "Only if oxygen is absent": "Oxygen absence alone does not establish permanent storage. Carbon can still be transformed or released through other pathways, and storage duration must be assessed."
  },
  "Can most plants directly use atmospheric N₂ as their nitrogen source?": {
    "Yes, all leaves do this without microbes": "Most plants cannot directly break the strong bond in atmospheric N₂. Some benefit from nitrogen-fixing microbial partners rather than performing this fixation in ordinary leaf cells.",
    "Only because N₂ is glucose": "N₂ is molecular nitrogen, whereas glucose is a carbon-containing sugar. They have different compositions and cannot be treated as the same nitrogen source.",
    "No, they generally rely on fixed nitrogen forms": "Most plants take up fixed nitrogen such as nitrate or ammonium. Biological fixation by certain microbes helps convert atmospheric N₂ into usable forms."
  },
  "Which statement is accurate?": {
    "Bacteria lack ribosomes": "Bacteria have ribosomes and use them for protein synthesis. Differences from eukaryotic ribosomes do not imply that bacterial ribosomes are absent.",
    "All bacteria cause disease": "Only some bacteria are pathogenic. Many carry out decomposition, nutrient cycling or beneficial associations, so disease does not define the whole group.",
    "Bacteria have diverse roles, and only some are pathogenic": "Bacteria span many metabolic and ecological roles. Pathogenic species are one subset of a much broader diversity."
  },
  "Why do viruses require host cells to make viral proteins?": {
    "They rely on host ribosomes": "Viruses do not have their own complete ribosomal translation machinery. Viral messages are translated using host-cell ribosomes to make viral proteins.",
    "They are all plants": "Viruses are not plants. Their dependence on host translation machinery explains the requirement, regardless of the type of organism they infect.",
    "They contain no genetic information": "Viruses carry genetic information in DNA or RNA. The limitation is their lack of independent cellular protein-synthesis machinery, not a universal absence of genomes."
  },
  "Does antibiotic exposure need to cause a directed useful mutation for resistance to spread?": {
    "Yes, bacteria must understand the drug": "Bacterial survival does not require understanding a drug. Inherited differences can influence survival and reproduction, allowing resistant variants to become more common.",
    "Only if the host requests it": "Selection does not depend on the host requesting a change. Antibiotic exposure can alter which bacterial variants survive and contribute descendants.",
    "No, selection can favor existing or independently arising variants": "Resistance can already be present or arise independently, including through mutation or gene transfer. Antibiotic exposure can then favor resistant variants without directing a useful mutation."
  },
  "Why do many specialized cells differ despite similar DNA?": {
    "Their DNA contains no genes": "Specialized cells generally retain many genes even when those genes are not active. Absence of all genes cannot explain regulated cellular specialization.",
    "They express and regulate different gene programs": "Different patterns of gene expression produce different proteins and cellular functions. Regulation can generate specialized cell types despite broadly similar genomes.",
    "Each must delete all unused genes": "Most differentiation does not require deleting every unused gene. Keeping genes while changing their activity explains why many specialized cells retain similar DNA."
  },
  "Are all stem cells pluripotent?": {
    "No, many have more restricted developmental potential": "Stem cells differ in developmental potential. Many adult stem cells are restricted to particular lineages rather than being able to form all body-cell types.",
    "Yes, all can form every cell type": "Self-renewal does not imply pluripotency. A stem cell may repeatedly divide while producing a limited set of differentiated descendants.",
    "Only after they lose DNA": "Losing DNA does not grant broader developmental potential. Stem-cell behavior depends on regulated gene activity and cellular context, not the removal of the genome."
  },
  "What most directly defines the boundaries of a standard PCR target?": {
    "The color of the tube": "Tube color does not specify which DNA sequences are copied. Sequence-specific primer binding provides the molecular targeting information.",
    "The total genome length alone": "Genome size alone cannot identify a particular region. The positions and orientations of the two primer-binding sites delimit the standard PCR product.",
    "The primer pair": "The two primers bind opposite template strands and orient synthesis toward the target. Their binding positions define the sequence interval that is preferentially amplified."
  },
  "Do two bands at the same position prove that their DNA sequences are identical?": {
    "Only because all DNA has one sequence": "DNA sequences are diverse. Similar migration can occur for different fragments, so assuming one universal sequence cannot explain coincident bands.",
    "No": "For comparable linear DNA, equal migration mainly supports similar fragment length. Different nucleotide sequences can share that length, so sequence identity needs another test.",
    "Yes, always": "A gel ordinarily separates fragments by migration behavior, strongly related to size under standard conditions. Matching band positions alone do not establish matching base sequences."
  },
  "Does a Cas9 cut guarantee one precise DNA replacement?": {
    "No, repair can produce different outcomes": "A targeted cut is followed by cellular repair. Repair can generate insertions, deletions or other outcomes; a precise replacement requires additional conditions and verification.",
    "Yes, cuts automatically encode the desired sequence": "The cut does not itself specify a replacement sequence. The repair pathway, any supplied template and cellular conditions influence the resulting DNA.",
    "Only if the DNA is drawn in blue": "Diagram color does not influence DNA repair. Molecular targeting and repair mechanisms determine editing outcomes, not how a sequence is illustrated."
  }
};
})(typeof window !== 'undefined' ? window : globalThis);
