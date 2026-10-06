/* Original option-specific explanations for the process / systems checkpoints.
 * Exact question and option keys keep feedback aligned after display rotation.
 * Scientific references are retained in the corresponding library topics.
 * These explanations neither replace the authored answers nor award marks. */
(function (global) {
  'use strict';
  const map = {
    'What is the direct role of an absorbed photon in a photosystem?': {
      'It supplies the phosphate groups used to make ATP':'A photon transfers energy; it is not a phosphate-containing molecule. ATP synthesis uses ADP and inorganic phosphate already present in the chloroplast.',
      'It helps raise an electron to a higher-energy state':'Absorption excites a pigment electron. Energy transfer and charge separation can then initiate the electron-transfer reactions that convert light energy into chemical forms.',
      'It becomes a carbon atom in glucose':'Light supplies energy, not carbon atoms. Carbon incorporated into carbohydrate precursors enters through carbon dioxide fixation.'
    },
    'What distinguishes cyclic electron flow around photosystem I?': {
      'It can support ATP formation without net NADPH formation':'Electrons return through an electron-transport pathway instead of ending in NADPH. The resulting proton-motive force can support ATP synthesis without a net supply of NADPH.',
      'It directly releases O₂ by splitting water at photosystem I':'Water oxidation and oxygen release are associated with photosystem II. Cyclic flow around photosystem I does not itself split water to replace electrons.',
      'It fixes CO₂ into a finished glucose molecule':'Cyclic electron flow concerns energy conversion, not direct carbon fixation. The Calvin cycle uses ATP and NADPH to produce carbohydrate precursors.'
    },
    'Can the Calvin cycle usually run indefinitely in darkness merely because its reactions do not directly absorb photons?': {
      'Yes; it needs neither ATP nor NADPH':'The reduction and regeneration stages require ATP, and reduction also requires NADPH. Stored supplies are finite, so absence of direct photon absorption does not imply energy independence.',
      'Yes; RuBisCO creates energy from carbon dioxide':'RuBisCO catalyses a carbon-fixation reaction; it does not create energy. The cycle needs energy and reducing power from other reactions.',
      'No; it depends on energy carriers and regulation linked to light reactions':'The cycle consumes ATP and NADPH supplied by light reactions, while light-linked regulation affects several enzymes. It therefore cannot usually continue indefinitely after illumination ceases.'
    },
    'Which molecule is the CO₂ acceptor used by RuBisCO in the Calvin cycle?': {
      'A finished starch granule':'Starch is a storage product assembled from carbohydrate units. It is not the five-carbon substrate to which RuBisCO adds CO₂.',
      'RuBP':'RuBisCO catalyses addition of CO₂ to ribulose-1,5-bisphosphate. The unstable six-carbon intermediate yields two three-carbon 3-phosphoglycerate molecules.',
      'Oxygen gas':'O₂ can compete in RuBisCO’s oxygenation reaction, initiating photorespiration. It is not the carbon acceptor in the carboxylation step.'
    },
    'Where does glycolysis occur in a typical eukaryotic cell?': {
      'The cytosol':'Cytosolic enzymes convert glucose to pyruvate through glycolysis, producing a net supply of ATP and NADH. A mitochondrion is not required for the glycolytic reactions themselves.',
      'The mitochondrial intermembrane space':'This compartment is important in the proton gradient of respiration. It is not the location of the standard glycolytic pathway.',
      'The mitochondrial matrix in every eukaryotic cell':'The matrix contains enzymes for pyruvate oxidation and much of the citric acid cycle. Glycolysis occurs in the cytosol, including in cells without functional mitochondria.'
    },
    'Why does sustained glycolysis require a way to regenerate NAD⁺?': {
      'NAD⁺ supplies the phosphate groups in every ATP molecule':'NAD⁺ is an electron acceptor, not the phosphate donor for every ATP molecule. Its required role here is accepting electrons in a glycolytic oxidation step.',
      'Glycolysis cannot begin unless oxygen binds every enzyme':'Glycolysis does not directly require oxygen binding to its enzymes. Fermentation can regenerate NAD⁺ when respiratory reoxidation is unavailable.',
      'A glycolytic oxidation step reduces NAD⁺ to NADH':'Oxidation of glyceraldehyde-3-phosphate transfers electrons to NAD⁺. If NADH is not reoxidised, the available NAD⁺ pool falls and that step cannot sustain flux.'
    },
    'What is a major energy-related output of the citric acid cycle?': {
      'A complete chromosome copied from glucose':'Chromosome copying is DNA replication. The cycle oxidises carbon substrates and transfers electrons; it does not assemble a complete genome.',
      'Reduced electron carriers such as NADH':'Oxidation reactions transfer electrons to carriers such as NAD⁺ and FAD. Their reduced forms can supply electrons to respiratory pathways that support ATP production.',
      'Oxygen released by splitting water':'Water oxidation with oxygen release occurs in oxygenic photosynthesis. The citric acid cycle releases carbon dioxide during oxidative decarboxylation instead.'
    },
    'Why can the cycle slow when the respiratory electron transport chain stops?': {
      'Oxidized electron carriers become harder to regenerate':'Respiratory electron transfer normally helps reoxidise NADH and other reduced carriers. If reduced forms accumulate, the oxidised carriers needed by cycle dehydrogenases become less available.',
      'The cycle directly consumes oxygen in every reaction':'The cycle is linked indirectly to oxygen availability through carrier reoxidation. Molecular oxygen is not a reactant in each cycle reaction.',
      'Oxygen is the carbon acceptor that begins every cycle turn':'Oxaloacetate accepts the acetyl group to form citrate. Oxygen is the terminal electron acceptor in aerobic respiration, not the cycle’s carbon acceptor.'
    },
    'In aerobic mitochondrial respiration, what receives electrons at the end of the chain?': {
      'Carbon dioxide':'CO₂ is released during oxidation and decarboxylation of carbon substrates. It is not the terminal electron acceptor of the mitochondrial respiratory chain.',
      'A ribosome':'A ribosome translates RNA into a polypeptide. It does not receive the final respiratory electrons.',
      'Oxygen':'At the terminal respiratory complex, oxygen accepts electrons and combines with protons to form water. Removing this acceptor prevents sustained normal chain operation.'
    },
    'Why does a proton leak reduce the efficiency of oxidative phosphorylation?': {
      'All leaked protons must pass through ATP synthase first':'A leak is a return route that bypasses ATP synthase. If all returning protons used the coupled enzyme, they would not constitute that bypass.',
      'Some stored gradient energy is dissipated without ATP synthesis':'Protons returning by other routes reduce the proton-motive force without driving ATP synthase. Less ATP can therefore be obtained for the same respiratory input.',
      'The leak increases the proton-motive force without extra pumping':'Uncontrolled return tends to dissipate the gradient, not build it. Maintaining the gradient despite leakage requires compensating energy input.'
    },
    'Which combination is directly needed for ATP synthesis by the coupled ATP synthase mechanism?': {
      'A proton-motive force, ADP and phosphate':'Proton flow down an electrochemical gradient drives conformational changes in ATP synthase that couple ADP and inorganic phosphate into ATP.',
      'Only oxygen and carbon dioxide':'Oxygen can support formation of the gradient in aerobic respiration, but oxygen and CO₂ are not sufficient substrates or driving conditions for ATP synthase.',
      'Only an intact DNA molecule':'DNA stores information used to build the machinery. It does not replace the gradient or the ADP and phosphate needed for ATP formation.'
    },
    'Why is an intact, selectively permeable energy-converting membrane important?': {
      'It prevents all movement of every substance':'An energy-converting membrane permits selected routes of exchange, including coupled proton movement. Complete impermeability to everything would prevent normal operation.',
      'It forces all protons to remain permanently on one side':'Protons must be able to return through ATP synthase for coupled ATP production. The relevant restriction is on uncontrolled return, not all return.',
      'It limits uncontrolled proton return':'Restricting proton leakage allows pumping to establish an electrochemical difference. Controlled proton flow through ATP synthase can then do useful chemical work.'
    },
    'Which comparison between common muscle lactate fermentation and yeast alcohol fermentation is correct?': {
      'Neither depends on reactions linked to glycolysis':'Both use products and reduced carriers generated through glycolysis. Their carrier-recycling role is what helps glycolysis continue.',
      'Both regenerate NAD⁺, but their end products differ':'Lactate formation oxidises NADH as pyruvate is reduced. Alcohol fermentation regenerates NAD⁺ during ethanol formation, so the shared function is carrier recycling despite different products.',
      'Both must release ethanol':'Ethanol is characteristic of alcohol fermentation. Muscle lactate fermentation produces lactate instead and does not require ethanol release.'
    },
    'Which observation would show that fermentation is failing to sustain glycolysis?': {
      'NAD⁺ becomes depleted while NADH accumulates':'This indicates inadequate reoxidation of NADH. Without enough NAD⁺, the glycolytic oxidation step becomes restricted and fermentation is not sustaining the needed carrier cycle.',
      'Pyruvate is available but no oxygen enters the cell':'Fermentation can regenerate NAD⁺ without oxygen, so oxygen absence alone is not evidence of fermentation failure. Pyruvate is a relevant substrate for common fermentation pathways.',
      'Glycolysis produces a net two ATP per glucose':'That is the standard net ATP yield of glycolysis. It is consistent with glycolysis operating, not evidence that NAD⁺ recycling has failed.'
    },
    'Which event defines S phase?': {
      'Separation of sister chromatids':'Sister chromatids separate later during division. S phase produces the duplicated DNA that will subsequently be segregated.',
      'Completion of cytokinesis':'Cytokinesis divides the cytoplasm at the end of cell division. It is distinct from the synthesis phase of interphase.',
      'DNA replication':'S stands for synthesis: the genome is replicated, producing sister chromatids. DNA amount doubles before the later segregation and division steps.'
    },
    'Why is uncontrolled cell-cycle progression dangerous?': {
      'Checkpoints exist only to make cells larger':'Checkpoints coordinate events such as DNA replication, damage responses and chromosome attachment. Cell size is not their only concern.',
      'Damaged or inappropriate cells can continue proliferating':'Loss of appropriate controls can permit proliferation despite damaged DNA or unsuitable tissue signals. This can propagate genome errors and disrupt tissue organisation.',
      'Every cell must divide continuously to stay alive':'Many differentiated cells remain alive without continuous division. Survival and proliferation are different requirements.'
    },
    'After one ordinary round of replication, each daughter double helix contains what?': {
      'One parental strand and one newly synthesized strand':'Each separated parental strand acts as a template for a complementary new strand. Each daughter duplex therefore conserves one of the original strands.',
      'Two entirely parental strands':'The two parental strands separate and enter different daughter duplexes. Keeping them together would describe a conservative outcome rather than semiconservative replication.',
      'Two newly made strands with no parental strand':'In ordinary semiconservative replication, each newly made strand remains paired with a parental template. A daughter molecule is not composed solely of new strands.'
    },
    'What is DNA ligase’s role after lagging-strand synthesis?': {
      'Adding RNA primers to start each DNA fragment':'Primase supplies primers for initiation. Ligase works later to join compatible adjacent DNA ends after fragment processing.',
      'Separating the parental strands ahead of the fork':'Helicase separates the strands. Ligase acts on breaks in the covalent backbone rather than unwinding the duplex.',
      'Sealing remaining breaks in the sugar-phosphate backbone':'Ligase forms phosphodiester bonds at suitable nicks between processed fragments. This converts separate lagging-strand pieces into a continuous backbone.'
    },
    'Which pair normally participates in a meiotic crossover?': {
      'Chromatids of unrelated nonhomologous chromosomes':'Normal meiotic crossing-over involves corresponding regions of aligned homologues. Exchanges between unrelated chromosomes would not describe the standard mechanism.',
      'Nonsister chromatids of homologous chromosomes':'Homologous chromosomes pair during prophase I. Exchange between their nonsister chromatids can create new combinations of alleles while preserving corresponding gene positions.',
      'Sister chromatids with identical corresponding sequences':'The usual meiotic crossover described here is between homologues’ nonsister chromatids. Exchange between identical sisters would not reshuffle maternal and paternal alleles in the same way.'
    },
    'A crossover reshuffles alleles without changing their sequences. Does it require a new mutation?': {
      'No; existing variants can be rearranged':'Crossing-over exchanges segments carrying existing alleles. A new combination of those alleles can appear without producing a new nucleotide sequence at either allele.',
      'Yes; every exchanged segment must become a new allele':'Moving an existing segment into a different chromatid combination does not require changing its sequence. Recombination and mutation are distinct sources of variation.',
      'Yes; all DNA bases must change':'A crossover exchanges corresponding DNA segments; it does not replace all their bases. The question explicitly says the allele sequences remain unchanged.'
    },
    'Two cells transcribe different sets of genes. What is a likely consequence?': {
      'They must use different DNA base-pairing rules':'Gene regulation changes which genes are used, not the complementary base-pairing rules that copy their information.',
      'They must belong to different species':'Cells within the same organism can transcribe different genes. Tissue specialisation does not require a difference in species.',
      'They can make different sets of RNA and proteins':'Selective transcription changes the RNA available, including mRNAs for translation. Different expression patterns can therefore support different cellular structures and functions.'
    },
    'Which event is transcription rather than translation?': {
      'A ribosome joins amino acids':'Joining amino acids into a polypeptide is translation. Transcription produces RNA rather than a protein chain.',
      'RNA polymerase builds RNA using a DNA template':'This is transcription: complementary ribonucleotides are assembled using DNA sequence information.',
      'A tRNA pairs with a codon at a ribosome':'Codon–anticodon recognition helps decode mRNA during translation. It is not the synthesis of RNA from DNA.'
    },
    'An insertion adds one nucleotide near the start of a coding region. What is a major possible effect?': {
      'A shifted reading frame for downstream codons':'Codons are read as successive triplets. Adding one base changes how following bases are grouped, potentially altering many amino acids and introducing an early stop.',
      'Exactly one extra amino acid with no other possible change':'Adding one complete codon could add one amino acid without shifting the frame. A one-base insertion is not a complete triplet.',
      'A guaranteed restoration of the original protein':'An insertion near the start can disrupt the reading frame. There is no mechanism in the stated change that guarantees recovery of the original protein sequence.'
    },
    'What normally recognizes a stop codon during translation?': {
      'A tRNA carrying a special stop amino acid':'A standard stop codon does not specify a special amino acid carried by a tRNA. Termination instead recruits a release factor.',
      'DNA polymerase':'DNA polymerase synthesises DNA; it does not recognise termination codons in the ribosome during translation.',
      'A release factor':'A release factor recognises the termination signal and promotes release of the completed polypeptide from its tRNA, ending translation.'
    },
    'Which mutation is most directly expected to shift a coding reading frame?': {
      'Deletion of exactly three nucleotides within the reading frame':'Removing a multiple of three bases removes coding information but preserves the downstream triplet grouping. The protein may still change or lose function without a frameshift.',
      'Deletion of one nucleotide':'Removing one base changes the grouping of subsequent codons because one is not divisible by three. This is the direct frameshift mechanism.',
      'Replacement of one nucleotide by another':'A substitution changes a base without changing the number of bases. It can alter a codon or create a stop but does not by itself shift the reading frame.'
    },
    'Does exposure to an antibiotic direct bacteria to make exactly the resistance mutation they need?': {
      'No; selection can favor resistant variants that arise without such foresight':'Variation can arise without being directed toward future benefit. Antibiotic exposure can then favour the survival and reproduction of resistant variants.',
      'Yes; the antibiotic writes the required DNA sequence':'Drug exposure is a selection pressure, not a sequence-writing instruction. Even when stress changes mutation rates, it does not specify the precisely useful mutation.',
      'Yes; every exposed bacterium acquires the same mutation':'Exposed bacteria need not acquire any resistance mutation, much less the same one. Susceptible and resistant variants can have different outcomes.'
    },
    'In codominance, what is observed in a heterozygote?': {
      'Only the more common allele is expressed':'Allele frequency in a population does not determine expression dominance. Codominance means both contributions are detectable in the heterozygote.',
      'The alleles permanently merge into a new allele':'The alleles remain distinct inherited DNA variants. A phenotype showing both contributions does not merge their sequences.',
      'Distinct contributions of both alleles are expressed':'Both allele products or their effects can be detected, as with A and B antigens in the AB blood group. Neither contribution is completely masked.'
    },
    'Why can linked genes fail to follow a simple independent-assortment ratio?': {
      'They must have identical nucleotide sequences':'Linkage concerns physical positions on a chromosome. The linked genes can have different sequences and functions.',
      'Their positions on the same chromosome can make them inherited together':'Chromosomal segments are transmitted together unless recombination separates them. The frequency of crossing-over affects how strongly the loci depart from independent assortment.',
      'They no longer obey DNA base pairing':'Linked genes still follow ordinary DNA pairing and replication. Their transmission relationship, not their chemistry, explains the ratio difference.'
    },
    'Which blood component primarily provides antibodies and other soluble proteins with a transport medium?': {
      'Plasma':'Plasma is the extracellular liquid component of blood. Antibodies and many other soluble proteins are carried dissolved in this aqueous medium.',
      'Only the interior of red blood cells':'Red-cell interiors contain haemoglobin for oxygen transport. Circulating antibodies are not confined to those interiors.',
      'Only platelets':'Platelets participate in clotting and related responses. They are not the bulk liquid transport medium for soluble plasma proteins.'
    },
    'Why is oxygen unloaded from hemoglobin in actively respiring tissues?': {
      'Tissue cells pull entire red blood cells through their membranes':'Oxygen dissociates from haemoglobin and diffuses across barriers. Normal oxygen delivery does not require tissues to engulf whole red cells.',
      'Hemoglobin is converted to glucose at every capillary':'Haemoglobin carries oxygen reversibly; it is not converted into glucose as the delivery mechanism.',
      'Local conditions favor release and tissue oxygen use maintains a gradient':'Respiration lowers tissue oxygen availability, favouring diffusion from blood. Local chemical conditions can also reduce haemoglobin’s oxygen affinity and promote unloading.'
    },
    'What directly causes the aortic valve to open during a normal beat?': {
      'Left atrial pressure falls below vena caval pressure':'These pressures are not the two sides of the aortic valve. Opening depends on the pressure difference between left ventricle and aorta.',
      'Left ventricular pressure exceeds aortic pressure':'Ventricular contraction raises pressure until it exceeds aortic pressure. The favourable pressure gradient pushes the valve open and allows ejection.',
      'The valve contracts using its own rhythm independent of pressure':'Valve leaflets respond passively to pressure differences; they are not a separately beating pump.'
    },
    'If stroke volume stays constant while heart rate rises, what happens to cardiac output?': {
      'It rises':'Cardiac output = heart rate × stroke volume. With stroke volume fixed, increasing the number of beats per minute increases the volume pumped per minute in direct proportion.',
      'It must fall':'With the other factor fixed and positive, increasing heart rate increases the product. A fall would require a sufficient stroke-volume reduction, which the question excludes.',
      'It is always unchanged':'A fixed stroke volume is a fixed volume per beat, not per minute. More beats per minute changes total flow per minute.'
    },
    'Which response is negative feedback?': {
      'A rise in a variable always triggers a further rise':'A response that reinforces the initiating rise describes positive rather than negative feedback.',
      'A response occurs with no relation to the measured variable':'Feedback requires a causal connection between a system’s state and its response. An unrelated change does not demonstrate feedback control.',
      'A rise in a variable activates a process that lowers it':'The response opposes the initial disturbance, reducing the stimulus that triggered it. That opposing direction is what makes the feedback negative.'
    },
    'Why does a constant room temperature not prove an organism is maintaining homeostasis?': {
      'Homeostasis occurs only when the environment changes suddenly':'Regulation can operate during stable conditions and gradual changes. A sudden environmental disturbance is not required.',
      'The relevant internal variables and responses must be measured':'External temperature alone says little about internal temperature or other regulated variables. Evidence for homeostasis requires measuring internal state and, where possible, the responses that sustain it.',
      'Every external condition equals the internal condition':'An organism can maintain internal conditions that differ from its surroundings. Equating the two overlooks the biological controls being investigated.'
    },
    'What directly produces much of the rapid rising phase of a typical neuronal action potential?': {
      'Opening of voltage-gated sodium channels and inward sodium current':'Opening Na⁺ channels allows inward current down the electrochemical gradient. Depolarisation recruits more voltage-gated channels, producing the rapid rising phase.',
      'Immediate outward sodium pumping by the sodium–potassium pump':'The pump maintains ionic gradients over time and moves sodium outward. The rapid upstroke is generated mainly by inward current through voltage-gated sodium channels.',
      'Rapid inward potassium current through voltage-gated channels':'In the usual neuronal spike, voltage-gated potassium current contributes mainly to repolarisation through outward K⁺ movement, not the sodium-driven upstroke.'
    },
    'Why is it inaccurate to say the sodium–potassium pump directly makes every spike’s rapid upstroke?': {
      'The pump does not use energy':'The sodium–potassium pump hydrolyses ATP. Energy use is central to maintaining gradients, so this cannot explain the distinction.',
      'Neurons contain no sodium':'Neuronal signalling depends on sodium and its electrochemical gradient. The issue is which transport mechanism carries the rapid current.',
      'Fast voltage-gated currents produce the upstroke; the pump maintains gradients over time':'Rapid changes in channel conductance shape individual spikes. The pump supports continued signalling by maintaining the gradients that those currents use.'
    },
    'Why can the same neurotransmitter have different effects on different target cells?': {
      'The transmitter always inhibits any cell it reaches':'The effect depends on the receptors and downstream pathways present. A neurotransmitter’s name alone does not establish that every response is inhibitory.',
      'Targets can express different receptor types and downstream machinery':'Receptor types can couple the same transmitter to different ion channels or signalling pathways. The target cell’s properties therefore determine the response.',
      'The transmitter always excites any cell it reaches':'A target can have receptors that favour inhibition or other responses. Universal excitation ignores receptor and cellular context.'
    },
    'How can a synaptic signal be brought to an end?': {
      'Transmitter can be removed by uptake, breakdown or diffusion':'Removing or inactivating transmitter reduces receptor binding and terminates the chemical signal. The dominant mechanism differs among synapses.',
      'The receptor must permanently stop responding after one signal':'Receptors can respond to later signals after transmitter is cleared. Permanent loss of responsiveness is not required for ordinary signal termination.',
      'Every synapse permanently stores all released transmitter':'Released transmitter is cleared, recycled or degraded through various routes. Permanent accumulation would interfere with controlled signalling.'
    },
    'Does memory against one antigen guarantee equal protection against all unrelated pathogens?': {
      'Yes; every memory cell recognizes every microbe':'Adaptive receptors recognise particular molecular features. A memory cell is not a universal detector of all microbial antigens.',
      'Yes; specificity disappears after the first response':'Memory preserves antigen-specific recognition rather than removing it. Faster responses still depend on matching or sufficiently related targets.',
      'No; adaptive recognition is antigen-specific':'Memory populations and antibodies reflect earlier recognised antigens. Cross-reactivity is possible, but protection against unrelated pathogens is not guaranteed.'
    },
    'Why can protection differ when a pathogen’s key surface antigens change?': {
      'Recognition is independent of antigen structure':'Binding depends on molecular features of the epitope. Changing those features can change antibody or receptor binding.',
      'Existing antibodies or memory receptors may bind the changed targets less well':'Altered epitopes can reduce recognition by parts of the existing adaptive response. The effect depends on which features change and which responses remain effective.',
      'Memory cells recognize only the age of a pathogen':'Recognition depends on molecular targets, not how old a pathogen is. Age is not an antigen-specific binding mechanism.'
    },
    'What is an embolism in the context of xylem transport?': {
      'A gas-filled interruption that can hinder water flow':'Gas can break the continuity of a water column and reduce flow through the affected conduit. This disrupts the cohesion–tension transport pathway.',
      'A pressure increase caused by phloem sugar loading':'Sugar loading and pressure-driven flow concern phloem. A xylem embolism refers to gas interrupting water conduction.',
      'A continuous water column under tension':'A continuous tension-bearing column is part of normal xylem transport. An embolism interrupts that continuity.'
    },
    'Why are lignified walls useful in water-conducting xylem?': {
      'They supply ATP to pump water in each dead conduit':'Mature vessel elements are dead and do not pump water using their own ATP. Lignin provides mechanical reinforcement.',
      'They make the conduit actively contract like a ventricle':'Xylem vessels are not muscular pumps. Long-distance flow is driven largely by transpiration-related tension and water-potential differences.',
      'They help resist collapse under tension':'Water columns can be under negative pressure during transpiration. Thick, reinforced walls support the conduit and resist collapse under those forces.'
    },
    'In the pressure-flow model, sugar loading at a source tends to promote what?': {
      'Equal pressure at source and sink in every condition':'Bulk flow requires a pressure difference along the pathway. Equal pressure would not provide the driving gradient in this model.',
      'Water entry and higher local turgor pressure':'Adding sugar lowers water potential, favouring water entry by osmosis. The resulting increase in source pressure can drive bulk flow toward a lower-pressure sink.',
      'Water loss that lowers source turgor pressure':'Sugar accumulation tends to draw water into the source phloem under the stated model, rather than directly causing water loss and a pressure fall.'
    },
    'Must all phloem transport move downward?': {
      'No; it moves from sources toward sinks, whose locations vary':'A source exports assimilates and a sink imports them. Because their positions can be above or below each other, different phloem pathways can transport upward or downward.',
      'Yes; gravity alone powers all sugar movement':'Pressure differences associated with loading and unloading drive flow. Gravity alone cannot explain upward transport or changing source–sink relationships.',
      'Yes; roots can never export stored material':'Storage organs, including roots, can become sources when reserves are mobilised. Source and sink roles can change with development and season.'
    },
    'Which cells directly change shape to adjust a stomatal pore?': {
      'Red blood cells':'Red blood cells are animal blood components and are not the plant epidermal cells surrounding stomata.',
      'Root xylem vessel elements':'Xylem conducts water; mature conducting elements do not form the living paired cells around a leaf pore.',
      'Guard cells':'A pair of guard cells surrounds the pore. Changes in their solute content and water balance alter turgor and shape, changing the aperture.'
    },
    'Why does bright light not guarantee maximum stomatal opening in every situation?': {
      'Stomatal aperture remains fixed after a leaf matures':'Guard cells dynamically adjust aperture in mature leaves. A fixed opening would prevent normal responses to environmental and internal signals.',
      'Water status and other signals also regulate guard cells':'Guard cells integrate light with CO₂, water availability and other signals. Water stress can favour closure even when illumination would otherwise promote opening.',
      'Light overrides water-stress signals in every plant':'Water-conservation responses can restrict opening despite bright light. Treating one signal as universally dominant ignores the interacting controls.'
    },
    'Which scenario most clearly describes genetic drift?': {
      'A neutral allele disappears because its few carriers leave no offspring by chance':'The allele is lost through random differences in contribution to the next generation, without a stated fitness advantage or disadvantage. That is genetic drift.',
      'A resistance allele increases because it improves survival during treatment':'Here the allele itself changes survival under treatment. This non-random fitness difference describes natural selection.',
      'Birds learn a new feeding behavior within one afternoon':'Learning by individuals does not by itself demonstrate a change in inherited allele frequencies between generations.'
    },
    'What can happen when a few individuals establish a new population?': {
      'The new population must contain every ancestral allele':'A small founding sample can miss variants present in the source population, especially rare ones.',
      'All alleles instantly acquire equal frequencies':'Sampling does not equalise frequencies. Some variants may be absent and others overrepresented among the founders.',
      'A founder effect can change allele frequencies':'The founders carry only a sample of the source gene pool. Chance differences in that sample can establish different initial frequencies in the new population.'
    },
    'Why is energy available to higher trophic levels usually smaller?': {
      'Higher trophic levels always receive more energy than producers':'Trophic transfers do not create energy. Metabolic use and incomplete transfer reduce the fraction available to the next level.',
      'Organisms use energy and dissipate heat at each transfer':'Respiration dissipates some energy as heat, and not all biomass is consumed or assimilated. Only part of a level’s production becomes production at the next level.',
      'All energy in a prey animal enters the next consumer unchanged':'Some material is not eaten or assimilated, and the consumer uses energy in metabolism. Transfer is therefore neither complete nor unchanged.'
    },
    'Why can removing one species have several different effects in a food web?': {
      'The species may share multiple direct and indirect links':'A species can be prey, predator and competitor in different interactions. Its removal can change several populations and trigger indirect effects through the network.',
      'Every food web is a single chain':'A chain is one pathway; a web contains multiple feeding links. That network structure creates several possible routes of influence.',
      'Only the largest predator interacts with other species':'Producers, consumers, decomposers and competitors all interact. Body size does not restrict ecological effects to the largest predator.'
    },
    'In an exponential-growth model, what remains constant?': {
      'The absolute number added every generation':'With a constant per-capita rate, a larger population contributes a larger absolute increase. A fixed absolute increment would instead describe linear growth.',
      'The available resources forever in every real habitat':'Resource sufficiency is a modelling condition over the interval of interest, not a fact about every real habitat for all time.',
      'The per-capita growth rate':'In the continuous model, dN/dt = rN with constant r. Multiplying the same per-capita rate by a growing population gives an increasing absolute growth rate.'
    },
    'A drought reduces usable habitat. What might happen to carrying capacity?': {
      'It becomes equal to the birth rate':'Carrying capacity is a supported population size under given conditions. Birth rate is a rate, so they are different kinds of quantity.',
      'It may decrease':'Reduced water and usable habitat can reduce the resources available to sustain individuals. The supported population size can therefore decline.',
      'It must remain fixed because it is a species constant':'Carrying capacity depends on the environment and interactions as well as the species. A change in habitat can change it.'
    },
    'Why is fast photosynthesis not automatically permanent carbon storage?': {
      'Respiration, decomposition or burning can return the carbon':'Fixation moves carbon into organic matter, but later oxidation can return it to CO₂. Persistent storage requires uptake to exceed release over the relevant interval and reservoir.',
      'Photosynthesis cannot use CO₂':'CO₂ is the carbon source incorporated during photosynthetic carbon fixation. The uncertainty concerns how long that carbon remains stored.',
      'Carbon atoms are destroyed when sugar is made':'Chemical reactions rearrange atoms rather than destroying them. Carbon moves between reservoirs and molecular forms.'
    },
    'Burning a carbon-containing fuel primarily transfers its carbon into which pool?': {
      'Living biomass without any carbon entering the air':'Combustion oxidises fuel rather than directly converting it into living biomass. Carbon-containing gases can enter the atmosphere.',
      'The original fuel pool with no carbon transfer':'Fuel is consumed during combustion, so its carbon does not remain wholly in the original reservoir.',
      'The atmosphere as CO₂ under complete combustion':'Complete oxidation converts fuel carbon to carbon dioxide. Carbon atoms are transferred to the atmosphere rather than eliminated.'
    },
    'Which process returns nitrogen to the atmosphere as nitrogen gas under suitable conditions?': {
      'Translation':'Translation incorporates amino acids into proteins. It does not describe microbial reduction of nitrate to atmospheric nitrogen gas.',
      'Denitrification':'Denitrifying microbes reduce oxidised nitrogen compounds through pathways that can produce N₂ under suitable conditions, returning nitrogen to the atmosphere.',
      'Photosynthetic carbon fixation':'Carbon fixation incorporates CO₂ into organic molecules. It is a carbon transformation, not the nitrogen-gas-producing pathway asked for.'
    },
    'What is the key transformation in biological nitrogen fixation?': {
      'N₂ is reduced to ammonia that can enter metabolism':'Nitrogenase-containing organisms reduce atmospheric N₂ to ammonia using substantial energy and reducing power. This supplies nitrogen in a form that can enter biological synthesis.',
      'Nitrate is returned to the atmosphere as nitrogen gas':'That describes denitrification, which returns nitrogen to N₂ rather than fixing it into ammonia.',
      'Ammonia is oxidized first to nitrite and then nitrate':'Those oxidation steps describe nitrification. Nitrogen fixation begins with N₂ and reduces it.'
    },
    'What directly increases the number of bacteria in ordinary binary fission?': {
      'A bacterium exchanges a plasmid without dividing':'Gene transfer can change genetic content without increasing cell number. Division is required for the stated numerical increase.',
      'A bacterium forms four haploid products by meiosis':'Ordinary bacterial binary fission is not meiosis and does not produce four meiotic products.',
      'One cell replicates its DNA and divides into two cells':'Genome replication, segregation and cellular division produce two daughter cells from one parent. That division directly raises cell number.'
    },
    'Can a bacterium gain a gene without inheriting it from its immediate parent cell?': {
      'Only if it first grows a nucleus':'Horizontal gene transfer does not require a membrane-bound nucleus. Bacteria remain prokaryotic while acquiring DNA.',
      'Yes; horizontal gene transfer can introduce DNA':'Transformation, transduction or conjugation can transfer genetic material between lineages rather than solely from parent to daughter cell.',
      'No; DNA never moves between bacterial lineages':'DNA can move between bacteria by several established mechanisms. Restricting inheritance to cell division omits horizontal transfer.'
    },
    'Why can a virus infect one cell type more readily than another?': {
      'Entry receptors and intracellular compatibility can differ':'Appropriate attachment and entry factors help a virus enter. The cell must also supply conditions and machinery compatible with subsequent replication, so susceptibility differs among cell types.',
      'Every cell has an equal ability to support every viral genome':'Cells differ in receptors, antiviral responses and available machinery. These differences constrain viral host range and tissue tropism.',
      'Receptor recognition alone guarantees successful replication in every cell':'Entry is only one stage. A cell may permit binding yet fail to support genome replication, protein production or assembly.'
    },
    'Why would an antibiotic targeting bacterial ribosomes not directly stop a virus by the same target mechanism?': {
      'All antibiotics enter only cells with a nucleus':'Antibiotic action is not defined by entry only into nucleated cells. The relevant issue is whether the molecular target exists.',
      'A virus has a thicker peptidoglycan wall than a bacterium':'Viruses do not have peptidoglycan cell walls. That invented wall does not explain a ribosome-targeting drug’s specificity.',
      'Viruses lack their own bacterial ribosomes':'Viruses use host translation machinery. They do not carry the bacterial ribosomal target on which the antibiotic’s stated mechanism depends.'
    },
    'In a resistant bacterial infection, what is resistant to the antibiotic?': {
      'Every immune cell’s nucleus':'The resistance trait belongs to bacteria in this question. It is not a shared change in the patient’s immune-cell nuclei.',
      'The bacterial population':'Bacterial traits can reduce susceptibility through mechanisms such as altered targets, drug inactivation or efflux. The population can become enriched for those traits.',
      'The patient’s entire body in the genetic sense':'Antibiotic resistance does not mean the person has become genetically resistant to the medicine. It concerns the bacteria the treatment is intended to inhibit.'
    },
    'A resistance plasmid moves into a previously susceptible bacterium. What process best describes this change?': {
      'Horizontal gene transfer':'The bacterium gains genetic material from outside its immediate parent–daughter line. If the transferred genes function in the recipient, they can confer resistance.',
      'An individual animal adapting its behavior':'The event is DNA transfer between bacteria, not behavioural learning or adjustment by an animal.',
      'Ordinary mitochondrial respiration':'Bacteria do not gain resistance plasmids by mitochondrial respiration. Respiration concerns energy metabolism, while this event concerns gene transfer.'
    },
    'Which finding supports differentiation by gene regulation?': {
      'A neuron uses no proteins':'Neurons require many specialised proteins for structure, transport and signalling. Protein absence would not support normal differentiation.',
      'Each tissue has a completely different genetic code':'Different tissues generally use the same codon meanings. They differ largely in which genes are expressed, not in a wholly different code.',
      'Two cell types have similar DNA but different expressed RNAs':'Similar genomes with different RNA expression patterns support selective use of genetic information. Those differences can yield distinct proteins and cellular functions.'
    },
    'Does ordinary differentiation require deleting every gene a cell is not currently using?': {
      'Yes; every cell must erase all other tissue identities from DNA':'Ordinary differentiation usually changes regulation and chromatin state rather than deleting all unused genes. The genome retains many potential programmes.',
      'No; many genes remain present but regulated':'Cells can repress or activate genes while retaining their sequences. Different regulatory states permit specialised functions from broadly shared genetic information.',
      'Yes; inactive genes can never remain in a nucleus':'An inactive gene can remain in nuclear DNA without being transcribed. Presence in the genome and current expression are different properties.'
    },
    'Which ability is central to the definition of a stem cell?': {
      'Self-renewal together with production of differentiated descendants':'A stem-cell population can sustain itself while giving rise to more specialised progeny. Both maintenance and developmental output are central to the concept.',
      'Inability to respond to any signal':'Stem cells respond to signals from their environment and internal regulatory systems. Those signals help control self-renewal and differentiation.',
      'Permanent absence of DNA':'Stem cells contain DNA and depend on gene regulation. DNA absence is not a defining stem-cell property.'
    },
    'Why should “stem cell” not be treated as one uniform cell type?': {
      'All stem cells necessarily form an entire organism':'Developmental capacity differs. Many tissue stem cells are restricted to particular lineages and cannot generate an entire organism.',
      'All stem cells behave identically in every environment':'Signals, niches and developmental states influence behaviour. Cells from different populations do not respond identically in all conditions.',
      'Stem cells differ in potency, tissue origin and regulatory state':'These differences determine the lineages a cell can produce and the conditions needed to maintain or differentiate it. The shared label does not imply identical capacity.'
    },
    'Why does PCR require a heat-stable DNA polymerase?': {
      'PCR never uses temperature changes':'Standard PCR repeatedly changes temperature for denaturation, primer annealing and extension. Heating is essential to separate the DNA strands.',
      'Repeated high-temperature strand-separation steps would disable many ordinary enzymes':'A heat-stable polymerase retains useful activity through repeated heating, allowing new DNA to be extended in successive cycles without constant enzyme replacement.',
      'The polymerase must turn into a primer each cycle':'Polymerase and primers are different components. Primers provide annealed starting ends; polymerase catalyses nucleotide addition.'
    },
    'A primer cannot bind its intended target sequence. What is the most direct consequence?': {
      'Efficient amplification of that target may fail':'DNA polymerase needs an appropriately paired primer end to begin extension. Poor target binding therefore prevents or reduces production of the intended amplicon.',
      'The sample automatically becomes a protein':'Failure of primer binding does not convert DNA into protein. Translation requires a separate cellular or experimental system.',
      'Every unrelated sequence is necessarily amplified perfectly':'Failure at the intended target does not guarantee successful binding elsewhere. Nonspecific products are possible under some conditions, not inevitable or perfect.'
    },
    'Which direction does DNA generally migrate in an electric field during standard gel electrophoresis?': {
      'Toward the negative electrode':'DNA’s phosphate backbone is negatively charged under standard conditions, so the electric force directs it toward the opposite, positive electrode.',
      'Only toward the nearest light source':'Illumination can help visualise labelled DNA, but it is the electric field that drives migration through the gel.',
      'Toward the positive electrode':'The net negative charge of the phosphate backbone causes DNA to migrate toward the positive electrode. The gel matrix then helps separate fragments by migration properties.'
    },
    'Why include a DNA size ladder beside unknown samples?': {
      'It supplies the only electrical charge in the gel':'Sample DNA is itself charged, and the buffer contains ions. The ladder is a reference, not the sole source of charge.',
      'It provides fragments of known sizes for comparison':'Comparing an unknown band’s migration with known fragment sizes allows an estimate of its size under the same gel conditions.',
      'It changes every sample into the same sequence':'The ladder is run alongside samples and does not rewrite their DNA. It provides a migration standard, not sequence conversion.'
    },
    'What primarily provides sequence targeting in a typical CRISPR–Cas9 system?': {
      'Complementarity between guide RNA and target DNA, with the required neighboring motif':'Guide–target base pairing and recognition of an appropriate PAM help position Cas9 at the target. These molecular requirements provide sequence selectivity.',
      'The color of the cell membrane':'Membrane colour does not encode the DNA sequence recognised by the guide–Cas9 complex.',
      'A ribosome reading a protein’s name':'Ribosomes decode mRNA codons to assemble proteins; they do not read names or choose Cas9 DNA targets.'
    },
    'Why must a proposed genome edit be checked after the procedure?': {
      'A correctly matched guide guarantees one repair outcome in every cell':'Targeting does not guarantee identical delivery, cutting or repair across cells. Even a matched guide can yield a mixture of outcomes.',
      'A cut alone proves that a precise intended edit was installed':'Cutting initiates repair; it does not specify or confirm the repaired sequence. The intended edit must be measured directly.',
      'Editing can be incomplete or yield unintended changes':'Validation establishes whether the target sequence changed as intended and checks for alternative repair products or unintended effects. A successful procedure cannot be inferred from reagent delivery alone.'
    }
  };
  global.BIO_EXAM_CHECKPOINT_RATIONALES = Object.assign(global.BIO_EXAM_CHECKPOINT_RATIONALES || {},map);
})(window);
