/* Original option-specific explanations for the first 37 enrichment topics.
 * Question and option strings preserve identity after source option rotation.
 * Source references remain attached to each concept in the learning library.
 * This supplements feedback without changing questions or local grading. */
(function (global) {
  'use strict';
  global.BIO_EXAM_CHECKPOINT_RATIONALES = Object.assign(
    global.BIO_EXAM_CHECKPOINT_RATIONALES || {},
    {
      "A cell exports large amounts of protein. Which combination would you expect to be especially developed?": {
        "Rough ER and Golgi apparatus": "Ribosomes attached to rough ER make many proteins destined for secretion. The ER helps them fold, and the Golgi modifies and sorts the cargo into routes that lead to the cell surface.",
        "Cell wall and chloroplasts": "A cell wall provides support, while chloroplasts capture light energy for photosynthesis. Neither forms the main pathway that synthesizes, processes and exports proteins.",
        "Lysosomes and centrosomes": "Lysosomes mainly break down material, and centrosomes organize microtubules in many animal cells. These functions do not replace the rough ER and Golgi pathway needed for large-scale protein secretion."
      },
      "Which observation alone cannot distinguish a bacterial cell from an animal cell?": {
        "It contains a membrane-enclosed nucleus": "A membrane-enclosed nucleus is a eukaryotic feature. A typical animal cell has one, whereas a bacterial cell keeps its main chromosome in a region without a surrounding nuclear membrane.",
        "It contains mitochondria": "Mitochondria are membrane-bound organelles found in typical animal cells, not bacteria. Bacteria carry out their own energy-conversion reactions without mitochondrial compartments.",
        "It contains ribosomes": "Both bacterial and animal cells need ribosomes to translate mRNA into proteins. Finding ribosomes therefore establishes a shared cellular feature rather than distinguishing these two groups."
      },
      "A membrane channel opens for an ion. What determines the direction of its passive net movement?": {
        "The side with fewer membrane proteins": "The number of membrane proteins can affect how readily an ion crosses, but it does not establish the direction of passive net flow. That direction depends on the ion concentration difference and the voltage across the membrane.",
        "Its electrochemical gradient": "An ion responds to both its concentration gradient and the electrical attraction or repulsion across the membrane. Their combined electrochemical gradient determines passive net movement through an open channel.",
        "The amount of ATP next to the channel": "An open passive channel does not use nearby ATP to push ions in a chosen direction. ATP-powered pumps can establish gradients elsewhere, but the channel itself allows movement down the existing electrochemical gradient."
      },
      "A transporter uses a sodium gradient to move glucose uphill. Which description fits?": {
        "Secondary active transport": "Sodium moving down its electrochemical gradient supplies the energy to move glucose against its gradient. This is secondary active transport because the glucose transporter draws on a gradient rather than directly hydrolyzing ATP.",
        "Simple diffusion of glucose": "Simple diffusion moves a substance down its own gradient without a coupled transporter. Glucose moving uphill by coupling to sodium therefore cannot be explained by simple diffusion.",
        "Transport with no energy source": "The sodium gradient is an energy source even if this transporter does not split ATP itself. In animal cells, an ATP-driven sodium-potassium pump commonly supplies the work that maintains that gradient."
      },
      "A mutation replaces a water-loving amino acid with a water-avoiding one. Why might the protein change function?": {
        "Its amino-acid sequence must remain chemically identical": "Replacing one amino acid changes the protein’s primary sequence and the chemistry of that side chain. The substitution may alter hydrogen bonding, charge interactions or how the protein associates with water.",
        "Every such substitution destroys the protein": "A substitution is not automatically destructive: its effect depends on its position and the protein’s structure. Some replacements are tolerated, while others disrupt folding, binding or catalysis.",
        "Its folding or interactions may change": "Water-loving and water-avoiding side chains favor different surroundings and interactions. Replacing one with the other can change local folding or a binding surface, which may alter function without necessarily destroying the whole protein."
      },
      "Which small molecule is directly used to split a polymer bond by hydrolysis?": {
        "ATP in every case": "ATP is not a universal reagent for hydrolysis. The defining event is addition of water across a bond; many digestive hydrolysis reactions proceed without directly consuming ATP.",
        "Water": "Hydrolysis uses water to break a covalent bond, with components of water incorporated into the resulting products. Enzymes can accelerate this reaction, but water is the molecule named by the process.",
        "Oxygen gas": "Oxygen gas participates in reactions such as aerobic respiration, but hydrolysis specifically uses water. Breaking a polymer by adding water is different from oxidizing it with molecular oxygen."
      },
      "An enzyme accelerates a reversible reaction in a closed mixture. What remains unchanged?": {
        "The equilibrium ratio of reactants and products": "An enzyme lowers the activation barrier for both directions of a reversible reaction. It speeds the approach to equilibrium without changing the free-energy difference that determines the equilibrium ratio.",
        "The time needed to approach equilibrium": "Catalysis generally shortens the time needed to approach equilibrium because it increases reaction rates. The final equilibrium composition stays the same under otherwise unchanged conditions.",
        "The reaction pathway’s activation barrier": "Lowering the activation barrier is precisely how an enzyme speeds a reaction. It provides an alternative reaction pathway without changing the free energies of the initial reactants and final products."
      },
      "An enzyme works poorly after prolonged strong heating and cooling. Which explanation is plausible?": {
        "All enzyme molecules were consumed as reactants": "Enzymes participate in reaction steps but are regenerated during normal catalytic turnover. A lasting loss of activity after strong heating is better explained by damage to their functional structure than by consumption as reactants.",
        "Cooling must restore every enzyme to its original shape": "Cooling does not guarantee that a heat-denatured protein will refold correctly. Aggregation or other structural damage can persist, so activity may remain low after the temperature returns to normal.",
        "Its functional structure has been disrupted": "Strong heating can disrupt the interactions that maintain an enzyme’s shape, including the geometry of its active site. If correct folding is not restored on cooling, substrate binding or catalysis can remain impaired."
      },
      "Water supplied to a plant contains a traceable oxygen isotope. Which immediate photosynthetic output can contain it?": {
        "Only soil minerals": "Soil minerals are not the only destination of oxygen from absorbed water. During the light reactions, the water-splitting complex releases oxygen gas whose oxygen atoms came from water.",
        "Released oxygen gas": "The water-splitting complex associated with photosystem II removes electrons from water and releases O₂. Labeling the oxygen in water can therefore label the oxygen gas produced during photosynthesis.",
        "Only the carbon atoms of sugar": "An oxygen isotope traces oxygen atoms, so it cannot become a carbon atom in sugar. Carbon in newly fixed carbohydrate comes from carbon dioxide; the labeled water can supply oxygen to the released gas."
      },
      "A plant closes its stomata on a hot, dry day. What tradeoff can follow?": {
        "Less water loss but less CO₂ entry": "Closing stomata reduces water-vapor loss, but it also restricts carbon dioxide diffusion into the leaf. Lower internal CO₂ can limit carbon fixation even while the plant conserves water.",
        "More CO₂ entry with no water loss": "Stomatal closure narrows the route used by both water vapor leaving and carbon dioxide entering. It does not selectively increase CO₂ entry while completely preventing water loss.",
        "An immediate end to all cellular respiration": "Stomata mainly regulate exchange between the leaf and air; closing them does not switch off every respiratory reaction. Cells can continue using available respiratory substrates and oxygen, although gas-exchange conditions may change."
      },
      "Why can breathing faster support active muscle respiration?": {
        "It sends intact ATP from the lungs into mitochondria": "The lungs exchange respiratory gases rather than manufacture and ship ATP to muscle mitochondria. Muscle cells make ATP locally using fuels and oxygen delivered through the circulation.",
        "It allows breathing to replace the need for blood circulation": "Ventilation renews air at the lungs, but blood circulation must still carry oxygen to the muscles. Faster breathing cannot replace the transport function of the heart and blood vessels.",
        "It helps replenish oxygen used as an electron acceptor": "Oxygen accepts electrons at the end of the mitochondrial respiratory chain and is reduced to water. Increasing ventilation can help replenish blood oxygen as active muscles consume more of it."
      },
      "A cell fully oxidizes more glucose. Which statement is safest?": {
        "Oxygen becomes the carbon in CO₂": "Oxygen atoms cannot become carbon atoms during respiration. The carbon released as CO₂ comes from organic fuel, while inhaled O₂ acts as the final electron acceptor and is reduced to water.",
        "More carbon can be released as CO₂": "Complete glucose oxidation transfers its carbon atoms into carbon dioxide. Oxidizing more glucose can therefore release more CO₂, although the amount of ATP captured per glucose depends on cellular conditions.",
        "Each glucose must yield exactly the same ATP in every cell": "ATP yield is not an identical fixed count in every cell. Transport costs, proton leak and how reducing equivalents enter the respiratory chain can change how much of the released energy is captured as ATP."
      },
      "One chromosome is not properly attached to the spindle. What should an intact checkpoint do?": {
        "Delay sister-chromatid separation": "The spindle assembly checkpoint delays anaphase while chromosome attachment is incomplete. This gives the cell time to establish appropriate attachments before releasing sister chromatids toward opposite poles.",
        "Immediately start another S phase": "Another S phase would duplicate DNA again rather than correct a spindle attachment problem. The appropriate checkpoint response is to delay chromosome separation within the current mitosis.",
        "Proceed to anaphase before attachment is complete": "Starting anaphase with an unattached chromosome risks distributing chromosomes unequally between daughter cells. An intact spindle checkpoint restrains this transition until the attachment problem is resolved."
      },
      "Which observation most directly identifies anaphase of mitosis?": {
        "DNA being copied into sister chromatids": "DNA replication produces sister chromatids during S phase, before mitosis. Anaphase instead separates chromatids that have already been copied and attached to the spindle.",
        "Homologous chromosomes undergoing crossing over": "Crossing over between homologous chromosomes is characteristic of prophase I of meiosis. It does not identify the stage of mitosis in which sister chromatids separate.",
        "Sister chromatids moving toward opposite poles": "Anaphase begins when the links holding sister chromatids together are released and the chromatids move apart. Their movement toward opposite spindle poles is the defining event of this mitotic stage."
      },
      "After normal meiosis I, what does each daughter cell contain?": {
        "A newly doubled diploid chromosome set": "Meiosis I reduces the number of homologous chromosome sets; it does not double a diploid set. DNA was replicated before meiosis I, and no new S phase normally occurs between the two meiotic divisions.",
        "One member of each homologous pair, still with sister chromatids": "Homologous chromosomes separate during meiosis I, while sister chromatids usually remain joined. Each daughter cell therefore receives one homolog from each pair, with each chromosome still consisting of two chromatids.",
        "Both homologs of every pair as single chromatids": "Keeping both homologs would fail to reduce the chromosome-set number. Normal meiosis I separates homologs, whereas sister-chromatid separation normally occurs in meiosis II."
      },
      "Why are meiotic products usually genetically different?": {
        "Crossing over and independent chromosome assortment": "Crossing over exchanges DNA between homologous chromosomes, and independent assortment distributes maternal and paternal homologs in different combinations. Together they create varied allele combinations in meiotic products.",
        "Each product receives exactly the same allele combination": "Normal meiosis reshuffles allele combinations through crossing over and independent assortment. Giving every product exactly the same combination would omit the main sources of meiotic genetic variation.",
        "Meiosis always changes every gene sequence": "Meiosis mainly redistributes existing genetic variants; it does not require a mutation in every gene. New combinations of alleles can arise even when the underlying sequences of many genes remain unchanged."
      },
      "Two cells have the same DNA but make different proteins. Is this possible?": {
        "No; identical DNA forces identical protein production": "DNA provides the available genetic instructions, but cells regulate which genes are transcribed and how their products are used. Identical genomes therefore do not force identical amounts or types of protein.",
        "Only if one cell has no ribosomes": "Both cells can have functioning ribosomes and still make different proteins. Differences in gene regulation and the mRNAs supplied to those ribosomes are enough to produce different protein profiles.",
        "Yes; they can express different genes": "Cells with the same genome can activate different genes or express them at different levels. This changes which mRNAs are available for translation and helps specialized cell types make different proteins."
      },
      "A DNA molecule has 30% adenine and ordinary double-stranded pairing. What fraction is thymine?": {
        "60%": "Adenine and thymine together account for 60% in this example, but thymine alone does not. Ordinary double-stranded base pairing gives one thymine for each adenine, so their separate percentages match.",
        "30%": "In ordinary double-stranded DNA, adenine pairs with thymine. If adenine accounts for 30% of all bases, thymine also accounts for 30%; the remaining 40% is shared by guanine and cytosine.",
        "20%": "Twenty percent is the expected proportion of each of guanine and cytosine here. Adenine pairs with thymine, so thymine must match adenine’s 30%, not half of the remaining 40%."
      },
      "A stop codon appears early in an mRNA coding region. What is the immediate translation consequence?": {
        "The polypeptide is usually released early": "A stop codon is recognized by a release factor rather than an amino-acid-carrying tRNA. An early stop therefore usually releases a shortened polypeptide before the normal full-length protein has been made.",
        "The ribosome skips that codon and continues normally": "Ribosomes normally respond to a stop codon by terminating translation, not by treating it as an ordinary gap. Special readthrough mechanisms exist, but they are not the usual consequence assumed here.",
        "That codon adds a final stop amino acid": "There is no standard “stop amino acid” added at a termination codon. Release factors instead promote release of the completed or prematurely shortened polypeptide from the ribosome."
      },
      "Which order describes the ordinary flow of sequence information for a protein-coding gene?": {
        "Polypeptide → RNA → DNA": "Ordinary protein synthesis does not read a polypeptide to construct RNA and then DNA. The gene’s DNA sequence is transcribed into RNA, whose codons specify the amino-acid sequence during translation.",
        "RNA → lipid → polypeptide": "Lipids do not serve as the sequence-reading intermediate between mRNA and a polypeptide. Ribosomes read mRNA directly, using tRNAs to connect codons with amino acids.",
        "DNA → RNA → polypeptide": "Transcription copies sequence information from a protein-coding DNA region into RNA. Translation then reads the mRNA codons to assemble the corresponding polypeptide."
      },
      "In Aa × aa, with complete dominance and equal gamete viability, what fraction is expected to show the recessive phenotype?": {
        "All offspring": "The Aa parent can pass on either A or a, so some offspring receive A and show the dominant phenotype. Under the stated assumptions, only the aa half is expected to be recessive.",
        "One half": "The Aa parent produces A and a gametes in equal proportions, while the aa parent supplies only a. The expected offspring are therefore half Aa and half aa, with aa showing the recessive phenotype.",
        "One quarter": "One quarter recessive is the familiar expectation for Aa × Aa, not Aa × aa. Here the second parent always supplies a, so half the offspring are expected to be aa."
      },
      "A dominant phenotype is observed. What can you conclude about the genotype in a simple two-allele model?": {
        "It could be AA or Aa": "With complete dominance, one A allele is enough to produce the dominant phenotype. Both AA and Aa fit the observation, so phenotype alone cannot distinguish these genotypes.",
        "It must be AA": "An Aa heterozygote also shows the dominant phenotype in this model. Observing that phenotype therefore cannot establish that both alleles are A.",
        "The dominant allele must be more common in the population": "Dominance describes how alleles affect the phenotype of a heterozygote, not how frequent they are in a population. A dominant allele can be rare or common depending on population history and evolutionary processes."
      },
      "Which chamber normally pumps blood into systemic circulation?": {
        "Right atrium": "The right atrium receives venous blood returning from the systemic circulation and passes it to the right ventricle. It does not drive blood into the aorta and systemic arteries.",
        "Right ventricle": "The right ventricle pumps blood through the pulmonary arteries toward the lungs. Systemic circulation begins with ejection from the left ventricle into the aorta.",
        "Left ventricle": "The left ventricle ejects blood through the aortic valve into the aorta. Its contraction supplies the pressure that drives blood through the systemic circulation."
      },
      "Why is the left ventricular wall normally thicker than the right?": {
        "It contracts more often than the right ventricle": "The two ventricles normally contract once during each cardiac cycle. A greater number of contractions is therefore not the reason the left ventricular muscle is thicker.",
        "It must generate greater pressure for the systemic circuit": "The systemic circuit presents much greater resistance than the pulmonary circuit. A thicker left ventricular muscle generates the higher pressure needed to drive blood through that circuit.",
        "It pumps a greater volume than the right ventricle on every normal beat": "Over time, the two ventricles normally pump matching volumes because the pulmonary and systemic circuits are connected in series. The main difference is the pressure each must generate, not a routinely larger left-sided volume."
      },
      "Which change would favor faster diffusion across an otherwise unchanged respiratory surface?": {
        "A larger partial-pressure difference": "A larger partial-pressure difference provides a stronger driving force for net gas diffusion. With surface area, barrier thickness and other conditions unchanged, this increases the diffusion rate.",
        "A smaller surface area": "A smaller surface area leaves fewer routes across which gas can diffuse at once. It reduces total gas transfer when the pressure difference and barrier properties stay the same.",
        "A thicker barrier": "A thicker barrier increases the distance gas molecules must diffuse. With the other conditions unchanged, this slows rather than accelerates transfer across the respiratory surface."
      },
      "Why must blood keep flowing past alveoli for sustained gas exchange?": {
        "Flow removes the need for a partial-pressure difference": "Gas still crosses the alveolar-capillary barrier by diffusion down partial-pressure gradients. Blood flow helps maintain those gradients; it does not remove the need for them.",
        "Flow increases the diffusion distance across the alveolar wall": "Blood flow does not improve exchange by making the alveolar wall thicker. Increasing diffusion distance would hinder gas transfer, whereas renewing the blood maintains a useful pressure difference.",
        "Flow brings deoxygenated blood and carries oxygenated blood away": "Incoming blood has a lower oxygen partial pressure than alveolar air, and outgoing blood carries absorbed oxygen away. Continuous flow helps prevent local equilibration from stopping sustained net oxygen transfer."
      },
      "Which pathway carries a sensory signal toward the central nervous system?": {
        "A glandular duct": "A glandular duct carries a secretion, such as saliva, rather than conducting a sensory signal to the central nervous system. Sensory information travels through afferent neural pathways.",
        "An afferent pathway": "Afferent pathways carry information from sensory receptors toward the central nervous system. Efferent pathways carry commands away from it toward effectors such as muscles or glands.",
        "An efferent motor pathway": "An efferent motor pathway carries commands away from the central nervous system to an effector. A sensory signal traveling toward the central nervous system uses the opposite, afferent direction."
      },
      "Damage to myelin can slow signaling chiefly because it disrupts what?": {
        "Efficient propagation between nodes": "Myelin limits current leakage along the axon and helps depolarization spread efficiently between nodes of Ranvier. Losing it can slow conduction or prevent the next node from reaching the threshold for an action potential.",
        "Release of neurotransmitter along the entire length of every axon": "Neurotransmitter is usually released at specialized synaptic terminals rather than continuously along the axon. Myelin chiefly supports electrical signal propagation along the axonal membrane.",
        "The number of sodium ions created by the neuron": "Neurons move existing sodium ions across their membranes; they do not create sodium ions to send signals. Myelin damage affects electrical insulation and conduction, not the production of new ions."
      },
      "What does an antibody bind directly?": {
        "Every pathogen equally": "An antibody’s binding site recognizes particular molecular features, so it does not bind all pathogens equally. Specificity helps the immune system target some antigens while leaving unrelated molecules unbound.",
        "Only an entire living bacterium": "Antibodies can bind molecular features on viruses, toxins, cell surfaces and other antigens, including nonliving material. Their target need not be an entire living bacterium.",
        "A particular molecular feature of an antigen": "An antibody binds an epitope: a particular molecular feature of an antigen that fits its binding site. This recognition can help neutralize a target or recruit other immune mechanisms."
      },
      "Why can eliminating every immune response be harmful?": {
        "The body only encounters one pathogen in a lifetime": "People encounter many different microbes and antigens over a lifetime. Repeated and varied exposures are one reason continuing innate and adaptive defenses remain useful.",
        "Immune defenses help control infections and remove dangerous material": "Immune defenses recognize and help control infections, clear damaged material and act against some abnormal cells. Removing all immune responses would eliminate protective functions as well as potentially harmful ones.",
        "Inflammation is always harmless": "Inflammation can protect tissue, but excessive or misdirected inflammation can also cause damage. Its possible harms do not imply that eliminating every immune response would be safe."
      },
      "Which route mainly delivers newly absorbed mineral ions and water from roots toward shoots?": {
        "Xylem": "Xylem carries water and dissolved mineral ions from roots toward the shoots. Transpiration from leaves helps generate the tension that pulls this water column upward.",
        "Phloem only": "Phloem mainly distributes sugars and other assimilates between sources and sinks. Although water also enters and moves within phloem, it is not the main route for newly absorbed root water and minerals to the shoots.",
        "The leaf cuticle": "The leaf cuticle is a protective surface layer that limits water loss. It is not a vascular transport pathway connecting roots to shoots."
      },
      "A growing root receives sugar from mature leaves. How is the root classified in that exchange?": {
        "A source": "A source exports more sugar than it needs locally, as a mature photosynthesizing leaf often does. A growing root receiving that sugar is the destination in this exchange, so it acts as a sink.",
        "A stomatal pore": "A stomatal pore is an opening in the epidermis that regulates gas exchange and water loss. It does not describe the root’s role as a recipient of transported sugar.",
        "A sink": "A sink imports sugars for growth, respiration or storage. This root receives assimilates exported by mature leaves, making it a sink in the stated source-to-sink exchange."
      },
      "Which observation is required to support evolution by natural selection rather than survival alone?": {
        "An organism changes its behavior during one afternoon": "A behavioral change during one afternoon can be an individual response to the environment. By itself, it does not show a heritable difference causing unequal reproductive success across generations.",
        "A heritable difference linked to reproductive success": "Natural selection changes the representation of heritable variants when their carriers leave different numbers of offspring. Survival matters evolutionarily when it contributes to those inherited differences in reproductive success.",
        "Every individual survives the same length of time": "Equal survival time does not establish selection and does not rule it out either, because individuals may still leave different numbers of offspring. The relevant evidence connects heritable variation with reproductive success."
      },
      "An advantageous allele disappears from a tiny population by chance. Is selection impossible?": {
        "No; genetic drift can also affect allele frequencies": "Genetic drift changes allele frequencies through chance sampling and is especially strong in small populations. A beneficial allele can be lost despite a selective advantage, so drift and selection can operate together.",
        "Yes; beneficial alleles can never disappear": "A selective advantage raises an allele’s expected reproductive success but does not guarantee its survival in every lineage. Chance events can remove its few carriers from a tiny population.",
        "Yes; all mutations are harmful": "Mutations can be harmful, neutral or beneficial depending on their effects and environment. An advantageous allele disappearing by chance is evidence that chance can matter, not that all mutations are harmful."
      },
      "Why can removing a predator change plant abundance?": {
        "Herbivores must stop feeding when predators disappear": "Herbivores do not have to stop feeding when predators disappear. Reduced predation can instead increase herbivore abundance or activity and intensify their effects on plants.",
        "Only direct interactions influence ecosystems": "Ecological effects can pass through several interacting species. A predator can influence plants indirectly by changing the abundance or behavior of the herbivores that feed on them.",
        "Predators affect herbivores that consume plants": "Removing a predator can change herbivore numbers or feeding behavior, which can then change plant abundance. This indirect effect across feeding levels is a possible trophic cascade, although its size depends on the ecosystem."
      },
      "Which measurement is a population measurement rather than a community measurement?": {
        "The number of feeding links among pond species": "Feeding links connect different species within a food web. Counting those interactions describes community structure, rather than the abundance of one species’ population.",
        "The number of one frog species in a pond": "A population consists of individuals of one species in a defined area. Counting one frog species in the pond therefore measures a population attribute: its abundance.",
        "The variety of all pond species": "The variety of all pond species describes community diversity. A population measurement instead focuses on individuals belonging to one species in that location."
      },
      "Which molecule normally must leave the nucleus before its message is translated by cytoplasmic ribosomes?": {
        "A processed protein-coding mRNA": "A protein-coding transcript is processed in the nucleus and exported through nuclear pores. Cytoplasmic ribosomes can then read its codons to assemble the polypeptide.",
        "An entire chromosome": "An entire chromosome normally stays in the nucleus during gene expression. The cell exports an RNA copy of the relevant information rather than moving the chromosome to a cytoplasmic ribosome.",
        "A complete nuclear envelope": "The nuclear envelope forms the boundary across which selected molecules pass. It is not the message that ribosomes read; processed mRNA carries that information out through nuclear pores."
      },
      "A typical skin cell and neuron have similar DNA but behave differently. Which nuclear process helps explain this?": {
        "Different universal base-pairing rules": "Skin cells and neurons follow the same complementary DNA base-pairing rules. Their different behavior comes largely from how shared genetic information is regulated and used.",
        "Permanent deletion of all unused genes in every cell type": "Typical differentiation does not require each cell type to delete all genes it is not currently using. Most such genes remain in the genome but differ in their accessibility and expression.",
        "Different patterns of gene expression": "Regulatory proteins and chromatin organization help cells transcribe different sets of genes. Different RNA and protein production can therefore give a skin cell and neuron distinct structures and functions despite similar DNA."
      },
      "Which product most directly connects the nucleolus to protein synthesis?": {
        "The cell’s complete plasma membrane": "The plasma membrane is a lipid bilayer assembled using lipids and proteins made through several cellular pathways. Building the complete membrane is not the nucleolus’s direct role in protein synthesis.",
        "Developing ribosomal subunits": "The nucleolus is a major site of rRNA production and early assembly of ribosomal subunits. Those subunits ultimately participate in the ribosomes that translate mRNA into protein.",
        "Secreted digestive enzymes": "Secreted digestive enzymes are proteins translated by ribosomes and processed through the secretory pathway. The nucleolus contributes ribosomal components rather than directly producing finished secreted enzymes."
      },
      "Why is it misleading to describe the nucleolus as a second nucleus?": {
        "It is a specialized region inside the nucleus, not another membrane-enclosed nucleus": "The nucleolus is a specialized, non-membrane-bound region within the nucleus. Its concentration of ribosome-building machinery does not make it a separate nucleus enclosed by its own nuclear envelope.",
        "It contains all mitochondrial DNA": "Mitochondrial DNA is located within mitochondria. The nucleolus is a region inside the nucleus involved in ribosomal RNA production and subunit assembly, not a repository for all mitochondrial genomes.",
        "It replaces the nucleus during every interphase": "During interphase, the nucleolus operates within the existing nucleus. It does not replace the nucleus or take over the full set of functions performed by nuclear chromatin and the nuclear envelope."
      },
      "Which mitochondrial feature directly separates the matrix from the intermembrane space?": {
        "A ribosome": "A ribosome is a molecular machine for protein synthesis, not a continuous compartment boundary. The mitochondrial inner membrane separates the matrix from the intermembrane space.",
        "The plasma membrane": "The plasma membrane surrounds the cell as a whole. The boundary between the mitochondrial matrix and intermembrane space is inside the organelle and is formed by its inner membrane.",
        "The inner membrane": "The inner mitochondrial membrane encloses the matrix, with the intermembrane space on its other side. This separation allows the respiratory chain to establish the proton gradient used for ATP synthesis."
      },
      "A leaf cell has functioning chloroplasts. Why can it still need mitochondria?": {
        "Mitochondria only store unused sunlight": "Mitochondria use chemical reactions to transfer energy from respiratory substrates into ATP; they do not simply store sunlight. Plant cells can use this ATP for cellular work in both light and darkness.",
        "It still uses respiration to support cellular ATP demand": "A leaf cell still needs ATP for transport, maintenance and biosynthesis. Mitochondrial respiration helps meet this demand, including in darkness when the chloroplast light reactions cannot supply new ATP.",
        "Chloroplasts remove the need for all respiration": "Photosynthesis does not remove a plant cell’s need to respire. Chloroplast ATP is primarily used within photosynthetic metabolism, while mitochondria contribute ATP and metabolic functions needed by the living cell."
      },
      "What does a ribosome read while building a polypeptide?": {
        "The codon sequence of mRNA": "The ribosome moves along an mRNA and reads its codons in order. Matching tRNAs supply amino acids, allowing the ribosome to build a polypeptide with the sequence specified by that message.",
        "The base sequence of DNA directly": "Ribosomes do not normally translate DNA directly. Transcription first produces RNA, and a protein-coding mRNA then supplies the codons read during translation.",
        "The order of amino acids already in a mature protein": "An existing mature protein is not the template for ordinary translation. The order of amino acids in the new chain is specified by mRNA codons rather than copied from another protein."
      },
      "A ribosome becomes attached to rough ER during translation. What caused this routing?": {
        "A permanent difference in that ribosome’s genetic code": "Free and ER-bound ribosomes use the same genetic code and can belong to the same interchangeable pool. A signal in the nascent protein, rather than a permanent ribosome identity, directs attachment to rough ER.",
        "Every translated protein must first pass through the ER": "Many proteins remain in the cytosol or are targeted to other locations without entering the ER. ER entry is selected by targeting information in particular newly synthesized proteins.",
        "A targeting signal in the emerging protein": "An ER-targeting signal in the emerging polypeptide is recognized by targeting machinery that brings the translating ribosome to the ER. Translation can then continue with the protein entering or inserting into the ER membrane."
      },
      "Why does rough ER look rough in electron micrographs?": {
        "Its surface is formed from stacked Golgi cisternae": "Golgi cisternae are compartments of a different organelle that receives and processes cargo from the ER. The rough ER’s dotted appearance comes from ribosomes on its outer, cytosolic surface.",
        "Ribosomes are attached to its cytosolic surface": "Ribosomes attached to the cytosolic face of the ER appear as small particles in electron micrographs. Their presence gives rough ER its name and connects it to synthesis of many secreted and membrane proteins.",
        "Its membrane is folded into mitochondrial cristae": "Cristae are folds of the inner mitochondrial membrane. They are not features of the ER and do not account for the ribosome-studded appearance of rough ER."
      },
      "A secreted protein repeatedly misfolds in the ER. What is a plausible response?": {
        "Quality-control systems retain or target it for disposal": "ER quality-control mechanisms assess protein folding and can retain faulty cargo while refolding is attempted. Persistently misfolded proteins may be directed toward degradation rather than sent onward for secretion.",
        "It must be secreted faster regardless of folding": "Exporting persistently misfolded cargo more quickly could release a nonfunctional or harmful protein. ER quality control normally restricts the onward movement of such proteins rather than rewarding failed folding with faster secretion.",
        "Its amino acids immediately become a chromosome": "Chromosomes are DNA associated with proteins; they are not formed by converting a misfolded protein’s amino acids directly into a chromosome. The faulty protein may instead be degraded and its components recycled."
      },
      "Which activity best matches a major smooth ER function?": {
        "Assembly of the complete spindle from chromosomes": "The spindle is a microtubule-based structure organized by cellular microtubule-organizing systems. Chromosomes attach to it, but smooth ER does not assemble the complete spindle from chromosomes.",
        "Reading every mRNA codon": "Ribosomes read mRNA codons during translation. Smooth ER is distinguished by its lack of attached ribosomes and is better associated with functions such as lipid synthesis.",
        "Synthesis of many membrane lipids": "Enzymes in the ER membrane synthesize many lipids used in cellular membranes. Smooth ER is especially developed in some cells with strong lipid-synthesis, detoxification or calcium-storage functions."
      },
      "What makes the smooth ER “smooth”?": {
        "It lacks a lipid bilayer": "Smooth ER is still a membrane-bound network with a lipid bilayer. Its name refers to the absence of surface-bound ribosomes, not the absence of a membrane.",
        "It lacks the attached ribosomes that mark rough ER": "Smooth ER lacks the attached cytosolic ribosomes that give rough ER a dotted appearance. It retains a membrane and specialized enzymes despite this smoother appearance.",
        "It has no embedded enzymes": "Smooth ER contains enzymes needed for activities such as lipid synthesis and detoxification. “Smooth” describes the absence of attached ribosomes, not an enzyme-free membrane."
      },
      "Which order matches the usual passage of secretory cargo through the Golgi?": {
        "Entry at the cis side, exit toward the trans side": "Secretory cargo usually arrives from the ER at the Golgi’s cis side, undergoes processing, and is sorted for onward delivery at the trans side. This polarity organizes the secretory pathway.",
        "Entry at the trans side, exit toward the cis side": "This reverses the usual direction of newly arriving secretory cargo. The cis side receives ER-derived cargo, while the trans side is associated with sorting and exit toward destinations.",
        "Entry and exit only at the same unchanging cis face": "The Golgi has distinct receiving and shipping regions, and cargo is processed as it progresses through the organelle. Restricting all entry and exit to one unchanging cis face misses that functional polarity."
      },
      "A protein is synthesized but delivered to the wrong compartment. Which Golgi role is implicated?": {
        "DNA base pairing": "DNA base pairing concerns complementary nucleotides in nucleic acids. It does not select the destination of a newly made protein moving through the Golgi.",
        "Chromosome segregation": "Chromosome segregation distributes genetic material during cell division. Delivering a synthesized protein to the appropriate compartment instead depends on cargo-recognition and trafficking processes.",
        "Cargo sorting": "The Golgi sorts cargo into routes leading to destinations such as the plasma membrane or endosomal system. A protein that is made but misdelivered suggests a problem with sorting signals, their recognition or the associated trafficking route."
      },
      "An old mitochondrion is enclosed and delivered for lysosomal breakdown. What broader process is involved?": {
        "Oxygen fixation": "Oxygen fixation is not the process that encloses an old organelle for lysosomal degradation. The relevant pathway is autophagy, which delivers cellular material to a degradative compartment.",
        "Autophagy": "Autophagy brings a cell’s own components to lysosomes for breakdown and recycling. Selective removal of mitochondria through this pathway is called mitophagy.",
        "DNA translation": "Translation uses mRNA to build a polypeptide; DNA itself is not translated. Enclosing and degrading an old mitochondrion is an organelle-recycling process rather than protein synthesis."
      },
      "Why should a lysosome not be described as simply a rubbish bin?": {
        "Breakdown products can be reused by the cell": "Lysosomal enzymes break complex material into smaller components that can return to cellular metabolism. The organelle therefore supports recycling and resource recovery, not just permanent waste storage.",
        "All lysosomal contents remain there forever": "Many useful products of lysosomal digestion are transported back into the cell for reuse. Permanent retention of everything would prevent this recycling function and can indicate a storage problem rather than normal operation.",
        "It only stores molecules and never changes them": "Lysosomes contain hydrolytic enzymes that chemically break down delivered material. They are active degradative compartments, not passive containers that leave all their contents unchanged."
      },
      "Which pair most closely describes a peroxisomal role?": {
        "mRNA decoding and peptide-bond formation": "Reading mRNA and forming peptide bonds are functions of ribosomes. Peroxisomes instead contain enzymes for specific oxidative reactions and the handling of hydrogen peroxide.",
        "Chromosome pairing and crossing over": "Homologous chromosome pairing and crossing over occur during meiosis in the nucleus. These genetic events do not describe the metabolic activities of peroxisomes.",
        "Oxidation reactions and peroxide metabolism": "Peroxisomal oxidases carry out reactions that can generate hydrogen peroxide, and enzymes such as catalase help process it. Peroxisomes also contribute to pathways such as the breakdown of certain fatty acids."
      },
      "Does a peroxisome’s use of oxygen make it identical to a mitochondrion?": {
        "Yes; both organelles only package secreted proteins": "Neither organelle is defined as a package for secreted proteins; that trafficking role belongs mainly to the ER and Golgi. Oxygen use alone also does not identify the detailed reactions an organelle performs.",
        "No; they organize different pathways and energy-conversion machinery": "Mitochondria couple a respiratory electron-transport chain and proton gradient to ATP synthesis. Peroxisomes organize different oxidative pathways and peroxide handling, so shared oxygen use does not make their machinery identical.",
        "Yes; every oxygen-consuming organelle is a mitochondrion": "Oxygen can serve as a reactant in several distinct cellular pathways. An organelle’s identity depends on its structure and organized functions, not simply whether any of its enzymes consume oxygen."
      },
      "Why does a well-watered plant cell usually avoid bursting as water enters?": {
        "Its wall resists expansion and pressure opposes further entry": "Water entry expands the cell contents against the resistant cell wall, creating turgor pressure. That pressure opposes further osmotic entry and usually prevents a normal walled plant cell from bursting.",
        "Its vacuole actively expels every incoming water molecule": "A plant central vacuole is not a contractile pump that ejects every entering water molecule. Water accumulation supports turgor, while the cell wall provides the mechanical resistance that limits expansion.",
        "Its plasma membrane cannot pass any water": "Plant plasma membranes allow water movement, including through aquaporins. The cell avoids bursting mainly because wall resistance and rising pressure limit net entry, not because water cannot cross the membrane."
      },
      "Besides supporting turgor, what can a central vacuole do?": {
        "Replace all ribosomes during growth": "Ribosomes are needed to translate mRNA during growth, and the vacuole cannot perform that task. The vacuole’s contributions include storage, solute balance and, in many cells, degradation.",
        "Copy the nuclear chromosomes": "Nuclear chromosomes are replicated by DNA-replication machinery in the nucleus. The central vacuole is a separate compartment and does not copy those chromosomes.",
        "Store solutes and participate in breakdown": "The central vacuole can store ions, metabolites, pigments and other substances. Many plant vacuoles also contain enzymes that break down material, adding recycling functions to their role in turgor."
      },
      "Which location directly houses photosystems?": {
        "The Golgi lumen": "The Golgi lumen participates in processing and trafficking cellular cargo. The photosystems that capture light energy are embedded in chloroplast thylakoid membranes.",
        "The thylakoid membrane": "Photosystems are pigment-protein complexes embedded in the thylakoid membrane. Their arrangement with electron carriers supports light-driven electron transfer and the proton gradient used to make ATP.",
        "The nuclear envelope": "The nuclear envelope encloses the nucleus and regulates exchange through nuclear pores. It does not house the photosystems responsible for chloroplast light reactions."
      },
      "Which comparison between chloroplasts and mitochondria is correct?": {
        "Both use membrane proton gradients to help make ATP": "Both organelles build a proton electrochemical gradient across an internal membrane and use ATP synthase to draw on it. Their energy sources and electron donors differ, but this coupling principle is shared.",
        "Only mitochondria use electron transfer to establish a proton gradient": "Chloroplasts also use electron transfer to help establish a proton gradient across the thylakoid membrane. Light energizes their electron-transfer pathway, whereas mitochondria draw on oxidation of respiratory substrates.",
        "Both release O₂ by splitting water during normal operation": "Photosystem II in chloroplasts splits water and releases oxygen. Mitochondrial aerobic respiration instead consumes oxygen as the final electron acceptor, reducing it to water."
      },
      "Which structure directly connects a chromosome to spindle microtubules?": {
        "A nucleolus": "The nucleolus is involved in ribosomal RNA production and ribosomal subunit assembly. It is not the chromosome attachment site for spindle microtubules.",
        "A lysosome": "A lysosome is a degradative compartment that breaks down cellular material. It does not form the molecular interface linking a chromosome to spindle microtubules.",
        "A kinetochore": "The kinetochore is a protein complex assembled at a chromosome’s centromeric region. Spindle microtubules attach there to connect chromosome movement with the division machinery."
      },
      "Does the absence of a typical animal centrosome prevent every cell from dividing?": {
        "Yes; DNA cannot be copied without centrioles": "DNA polymerases and associated replication proteins copy DNA; centrioles are not required for that chemical process. Cells can also organize division machinery without a typical animal centrosome.",
        "No; other cells can organize spindles by different mechanisms": "A typical animal centrosome is one way to organize spindle microtubules, not the only way. Many plant cells and other cells build functional spindles through alternative microtubule-organizing mechanisms.",
        "Yes; all plant cells are unable to divide": "Plants grow through repeated cell divisions, including divisions in meristems. Many plant cells lack typical animal centrosomes but still organize spindles and segregate chromosomes."
      },
      "A drug prevents microtubule assembly. Which process is most directly threatened?": {
        "Mitotic spindle formation": "The mitotic spindle is built from microtubules, whose assembly and dynamics are required for normal chromosome attachment and movement. Blocking assembly therefore directly threatens spindle formation.",
        "Base pairing between two free DNA strands": "Complementary DNA bases can pair through molecular interactions without a microtubule scaffold. A microtubule-assembly inhibitor directly targets the spindle rather than the chemistry of DNA base pairing.",
        "Hydrolysis of starch by amylase": "Amylase hydrolyzes starch through its enzyme-substrate interactions. Microtubules do not form the enzyme’s catalytic machinery, so disrupting their assembly most directly threatens a different process: spindle formation."
      },
      "Which statement best describes actin’s role in animal-cell division?": {
        "Actin pulls homologous chromosomes apart at kinetochores": "Chromosomes move through attachments between kinetochores and spindle microtubules. Actin’s major role in animal-cell cytokinesis is the contractile ring, not pulling homologs apart at kinetochores.",
        "Actin forms the spindle microtubules": "Microtubules are assembled from tubulin, not actin. Actin forms a different cytoskeletal filament system that helps the dividing animal cell constrict its surface.",
        "Actin contributes to a contractile ring during cytokinesis": "Actin filaments cooperate with myosin in a contractile ring beneath the animal-cell membrane. Ring contraction deepens the cleavage furrow and helps separate the two daughter cells during cytokinesis."
      },
      "Which change directly adds a selective route for an ion through a membrane?": {
        "Removing the concentration gradient": "Removing a concentration gradient changes a driving force but does not create a physical route through the lipid bilayer. A channel protein provides the selective pathway an ion needs.",
        "Inserting a channel protein": "A channel protein provides a water-accessible pore with properties that favor particular ions. This adds a selective route through the bilayer, while the electrochemical gradient determines passive net flow when the channel is open.",
        "Making every phospholipid head point inward": "Phospholipid heads normally face the aqueous surroundings on both sides of a bilayer. Reorienting all heads inward would disrupt normal bilayer organization, not create a controlled, ion-selective transport pathway."
      },
      "Why is a cell membrane called fluid?": {
        "Many lipids and proteins can move laterally within it": "Many membrane lipids and proteins diffuse laterally within the plane of the bilayer. This mobility gives the membrane fluid behavior while its bilayer structure and selective barrier remain intact.",
        "It has no organized structure": "A fluid membrane still has organized structure: a bilayer with hydrophobic interiors, embedded proteins and distinct surfaces. “Fluid” refers to component mobility rather than complete structural disorder.",
        "Every membrane component freely crosses between its two faces": "Lateral movement within one leaflet is different from crossing between leaflets. Many components do not readily flip across the bilayer, and proteins generally retain a specific orientation."
      },
      "Which structural polymer is characteristic of plant cell walls?": {
        "Glycogen": "Glycogen is a branched glucose-storage polymer used by animals, fungi and many other organisms. Plant cell walls instead gain much of their tensile strength from cellulose microfibrils.",
        "DNA": "DNA stores genetic information in its nucleotide sequence. The characteristic structural polysaccharide of plant cell walls is cellulose, a polymer of glucose.",
        "Cellulose": "Cellulose chains associate into strong microfibrils that reinforce plant cell walls. Their arrangement helps resist the internal pressure created when water enters the cell."
      },
      "Does a cell wall prove an organism is a plant?": {
        "No; all animal cells also have cellulose walls": "Animal cells lack cellulose cell walls. The conclusion that a wall alone does not prove plant identity is sound, but the proposed reason is false because other walled groups include fungi and bacteria.",
        "No; fungi and many bacteria also have walls with different compositions": "A wall is not exclusive to plants: fungal walls commonly contain chitin, and most bacterial walls contain peptidoglycan. Wall composition and additional cellular features are needed to identify the organism’s group.",
        "Yes; no other organisms have walls": "Fungi and many bacteria also have cell walls, although their wall chemistry differs from that of plants. Observing a wall therefore does not uniquely establish that an organism is a plant."
      },
      "An animal cell loses water and remains shrunken after equilibration with a solution. The solution is what relative to the cell?": {
        "Hypertonic": "A hypertonic solution leaves the cell with less water and a smaller volume. A higher effective concentration of nonpenetrating solutes outside initially favors net water movement out of the cell.",
        "Isotonic": "An isotonic solution would maintain approximately stable cell volume because it causes no sustained net water gain or loss. The observed shrinkage instead shows that the surrounding solution is hypertonic to the cell.",
        "Hypotonic": "A hypotonic solution favors net water entry and swelling of an animal cell. Water loss and shrinkage indicate the opposite effective osmotic relationship: a hypertonic surrounding solution."
      },
      "Why does knowing total solute concentration alone sometimes fail to predict a cell’s final volume?": {
        "Only solute movement can change cell volume": "Water movement itself changes cell volume and is central to osmosis. Solute distribution influences that movement, but a cell need not gain or lose solute for its volume to change.",
        "All solutes are always actively pumped": "Some solutes move passively and others cross very slowly or not at all; active pumping is not universal. Their different permeabilities affect whether an osmotic difference persists.",
        "Some solutes can cross the membrane": "Permeating solutes can redistribute across the membrane, so their initial concentration difference may not produce a lasting volume effect. Tonicity therefore depends on effective, especially nonpenetrating, solutes as well as membrane permeability."
      },
      "Which is direct evidence of active transport?": {
        "Water moves toward lower water potential": "Water moving toward lower water potential is an example of passive osmotic movement. It does not, by itself, demonstrate that a transporter is using energy to move a substance uphill.",
        "A substance moves against its electrochemical gradient using an energy source": "Moving a substance against its electrochemical gradient requires energy coupled to transport. That energy can come directly from ATP or indirectly from another gradient, so the stated observation identifies active transport.",
        "A substance crosses through any membrane protein": "Membrane proteins also mediate passive transport through channels and facilitated-diffusion carriers. Protein involvement alone cannot establish active transport; the gradient direction and energy coupling must be considered."
      },
      "A primary ATP-driven ion pump is blocked. What may happen to transporters powered by its gradient over time?": {
        "Their driving force may weaken as the gradient dissipates": "The pump normally replenishes the gradient that secondary transporters use as an energy source. If pumping stops while ions continue to move, the gradient can dissipate and reduce the force driving those transporters.",
        "They remain unaffected because they do not directly hydrolyze ATP": "A secondary transporter need not hydrolyze ATP itself to depend on an ATP-driven pump. Its energy supply can decline indirectly when the pump no longer maintains the ion gradient.",
        "They automatically switch to simple diffusion against the gradient": "Simple diffusion cannot maintain net movement against a substance’s gradient. Losing a coupled driving gradient can slow, stop or sometimes reverse a transporter, but it does not make uphill simple diffusion possible."
      },
      "Why is ATP better described as an energy-transfer molecule than a long-term fuel store?": {
        "ATP contains no chemical bonds": "ATP contains covalent bonds, including bonds joining its phosphate groups. Its role in energy transfer comes from the favorable overall chemistry of reactions such as hydrolysis and their coupling to cellular work, not an absence of bonds.",
        "ATP cannot be made from ADP": "Cells regenerate ATP from ADP and inorganic phosphate using energy from processes such as respiration or photosynthesis. This continual regeneration is central to ATP’s role as a rapidly turned-over energy carrier.",
        "Cells continually regenerate and consume it": "Cells continually use ATP in coupled reactions and regenerate it from lower-energy precursors. Larger reserves such as fats and glycogen provide longer-term fuel, while ATP transfers energy into immediate cellular work."
      },
      "What happens to a coupled process if its total free-energy change is positive under the current conditions?": {
        "An enzyme can make its total free-energy change negative by itself": "An enzyme lowers the activation barrier but cannot change the overall free-energy difference under fixed conditions. Making the total change negative would require different conditions or additional favorable coupling, not catalysis alone.",
        "It is not thermodynamically favored in that direction": "A positive total free-energy change means the stated net process is not thermodynamically favored in that direction under those conditions. Including ATP only helps if the actual coupled overall free-energy change becomes favorable.",
        "It must run rapidly because ATP is mentioned": "Mentioning ATP does not guarantee favorable coupling, and thermodynamic favorability does not guarantee a rapid rate. The complete reaction’s free-energy change and its kinetic barriers must both be considered."
      },
      "In ideal competitive inhibition, what should happen at very high substrate concentration?": {
        "Rate approaches the uninhibited Vmax": "In ideal reversible competitive inhibition, substrate and inhibitor compete for the active site. Sufficiently high substrate concentration makes inhibitor occupancy negligible, so the rate approaches the same Vmax as the uninhibited enzyme.",
        "Vmax must become zero": "Ideal competitive inhibition does not remove the enzyme’s maximum catalytic capacity. It increases the substrate concentration needed to achieve a given rate, while Vmax remains unchanged at sufficiently high substrate.",
        "Substrate can never bind while any inhibitor is present": "A reversible competitive inhibitor does not permanently occupy every enzyme merely because some inhibitor is present. Substrate can bind free active sites, and increasing substrate concentration shifts competition in its favor."
      },
      "Why is reduced reaction rate alone insufficient to identify an inhibitor’s mechanism?": {
        "Every inhibitor binds the active site": "Inhibitors can act at the active site or through other sites and mechanisms. Lower rate alone therefore cannot establish active-site binding or competitive inhibition.",
        "A single inhibited rate uniquely determines where the inhibitor binds": "One measured rate cannot uniquely reveal a binding site because different mechanisms can produce the same reduction. Measurements across substrate and inhibitor concentrations, and sometimes direct binding evidence, are needed to distinguish explanations.",
        "Several mechanisms and experimental conditions can reduce rate": "Competitive, uncompetitive, mixed and irreversible inhibition can all reduce observed activity under suitable conditions. Changes in enzyme amount, substrate availability or assay conditions can also lower rate, so one observation is insufficient to identify the mechanism."
      }
    }
  );
})(window);
