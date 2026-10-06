/* Original option-specific feedback for the 18 extended-core concepts.
 * Exact question and option keys survive display rotation. This module adds
 * explanations without replacing existing feedback, answers or grading.
 * Mechanism references remain with extended-core.js and its source ledger. */
(function (global) {
  'use strict';
  if (!global.BIO_LIBRARY) throw new Error('Extended core exam feedback requires the biology library.');
  var topics = {
    'What directly explains why evaporating water can cool a surface?': {
      'Evaporation transfers energy away from the surface':'Molecules escaping the liquid carry energy away. When that energy comes from the surface and liquid, their temperature can fall.',
      'Water molecules stop moving':'Water molecules remain in thermal motion in both liquid and vapor. Cooling changes their average thermal behavior rather than stopping all motion.',
      'Oxygen atoms disappear':'Evaporation changes water from liquid to gas without destroying its atoms. Energy transfer, not loss of oxygen atoms, explains the cooling.'
    },
    'Why can starch and cellulose behave differently despite both containing glucose?': {
      'They contain different chemical elements only':'Both polymers contain carbon, hydrogen and oxygen. Their distinct properties cannot be explained simply by giving them different lists of elements.',
      'Their glycosidic linkages and organization differ':'Different linkage orientations produce different chain arrangements and enzyme recognition. Glucose composition alone does not specify a polymer’s architecture or digestibility.',
      'Cellulose contains no covalent bonds':'Cellulose has covalent glycosidic bonds connecting glucose residues. Its structural role does not make it a collection of unconnected sugar molecules.'
    },
    'What property particularly helps a phospholipid form a membrane bilayer?': {
      'It is always a repeating polymer':'Bilayer assembly depends on interactions between water and different molecular regions, not a universal repeating-monomer structure in phospholipids.',
      'It has both polar and nonpolar regions':'Polar head groups contact water while nonpolar tails cluster away from it. This amphipathic organization favors a bilayer under suitable conditions.',
      'It is made only of amino acids':'Amino-acid chains form polypeptides. Phospholipid head groups and hydrophobic tails have a different chemical architecture responsible for their membrane behavior.'
    },
    'An enzyme loses activity after heating, but its peptide backbone remains largely intact. What is plausible?': {
      'Its amino acids must all have disappeared':'An intact peptide backbone still contains linked amino-acid residues. Loss of activity therefore does not require the disappearance of the protein’s building blocks.',
      'Denaturation disrupted its functional arrangement':'Heating can alter higher-level interactions and the active-site arrangement while leaving much of the covalent backbone intact, reducing catalytic function.',
      'Its DNA sequence changed inside the purified sample':'A purified enzyme does not need its encoding DNA present to function. Heating the protein can affect its conformation without a gene-sequence change.'
    },
    'Which lac condition usually supports the strongest expression in the simplified E. coli model?': {
      'Lactose available and glucose low':'Lactose-derived allolactose relieves repression, while low glucose supports CAP–cAMP activation. Both controls favor strong transcription in this simplified model.',
      'Lactose absent and glucose high':'Without lactose-derived induction the repressor remains effective, and high glucose does not favor strong CAP–cAMP activation. This is not the maximal-expression condition.',
      'Neither sugar available':'Low glucose can favor activation, but without lactose-derived induction the repressor is not relieved. An activator alone does not remove that brake.'
    },
    'In XᴬXᵃ × XᴬY, what fraction of sons inherit Xᵃ under the simple model?': {
      'All sons':'The mother can contribute either Xᴬ or Xᵃ. Sons do not necessarily inherit the same maternal X-linked allele.',
      'Half the sons':'Each son receives the paternal Y and one maternal X. Equal segregation gives a one-half chance of receiving the maternal Xᵃ.',
      'No sons':'The maternal Xᵃ can be transmitted to a son. The father’s Xᴬ goes to daughters in this model and does not prevent that transmission.'
    },
    'In the stated Aa × Aa recessive model, what is the carrier probability for a child known not to express the trait?': {
      '1/4':'One quarter is the unconditioned probability of aa, the trait-expressing genotype. That outcome is excluded once the child is known not to express the trait.',
      '1/2':'One half is the carrier probability before observing phenotype. Knowing the child is not aa changes the denominator to the non-expressing subset.',
      '2/3':'Among non-expressing outcomes, two equally weighted possibilities are Aa and one is AA. Dividing one half by three quarters gives two thirds.'
    },
    'With p = 0.7 and q = 0.3, what heterozygote frequency does the model predict?': {
      '0.21':'The product pq counts only one ordering of unlike alleles. Heterozygotes can arise through both A-then-a and a-then-A combinations.',
      '0.42':'The heterozygote expectation is 2pq. Substituting the supplied frequencies gives 2 × 0.7 × 0.3 = 0.42.',
      '0.49':'The value 0.49 is p², the AA homozygote expectation. It does not count individuals carrying one allele of each type.'
    },
    'Which is a prezygotic reproductive barrier?': {
      'Different breeding seasons prevent mating':'If breeding times do not overlap, mating and fertilization can be prevented before a zygote forms, making this a prezygotic barrier.',
      'Hybrids form but are sterile':'The hybrid exists after fertilization. Its inability to reproduce is therefore a postzygotic barrier, not a barrier preventing zygote formation.',
      'Hybrid embryos fail after fertilization':'Embryo failure occurs after a zygote has formed. This is a postzygotic effect on hybrid survival.'
    },
    'Does rotating two branches around their shared node change the relationships in a tree?': {
      'Yes, it changes their ancestor':'Rotation leaves the shared node and its connections intact. Moving labels around that node does not substitute a different common ancestor.',
      'No, the branching connections stay the same':'Topology depends on connections through nodes, not left-to-right layout. Rotating a node changes the drawing while preserving ancestor-descendant relationships.',
      'Yes, it makes one tip more advanced':'A phylogeny is not a ladder of progress. Neither position on the page nor node rotation makes a lineage more evolutionarily advanced.'
    },
    'Two samples each contain four species, but one is dominated by a single species. What differs?': {
      'Their richness must differ':'Richness counts species, and both samples contain four. Dominance concerns the distribution of individuals rather than that species count.',
      'Their evenness can differ':'Evenness describes how balanced the abundances are. Strong dominance can lower evenness while leaving the number of species unchanged.',
      'Their individuals have no ecological interactions':'An abundance pattern does not establish the absence of interactions. Competition, predation or mutualism can occur in either sample.'
    },
    'Which is an outcome measure rather than simply a conservation activity count?': {
      'Number of posters printed':'Poster production counts work performed. It does not directly establish whether organisms survived, reproduced or recovered after the intervention.',
      'Number of meetings scheduled':'A meeting count describes organizational activity. Biological outcomes need measurements such as survival, population change or restored ecological function.',
      'Survival of restored native seedlings after two years':'Survival measures a biological result over a stated period. It evaluates an outcome rather than only the amount of conservation effort.'
    },
    'Why does a fungus secrete digestive enzymes into its surroundings?': {
      'To convert large substrates into molecules it can absorb':'Extracellular enzymes break suitable large substrates into smaller products. The fungus can then take up compatible molecules across its cell boundary.',
      'To turn its cells into chloroplasts':'Digestive secretion does not create chloroplasts. Fungi obtain organic nutrients rather than changing their cells into photosynthetic plant organelles.',
      'To replace all membrane transport':'Digestion makes products available outside the cell, but those products still need to cross the membrane. Digestion and absorption are complementary stages.'
    },
    'A bacterium rises from 10% to 20% of sequence reads. What is certain?': {
      'Its absolute cell count doubled':'A proportion can rise when other groups decline. Read percentages alone cannot determine the organism’s absolute cell count or its change.',
      'Its relative share of measured reads increased':'The observed percentage directly records a larger share of the measured reads. Absolute abundance and biological activity require additional evidence.',
      'It caused a disease':'A read-fraction change does not demonstrate a disease or establish causation. Sampling, environmental changes and other organisms can influence the observed composition.'
    },
    'What does selection for a plasmid marker establish most directly?': {
      'Every insert base is correct':'Marker selection does not read the insert sequence. A selected candidate may contain an empty vector, a changed insert or an incorrect arrangement.',
      'Candidate cells possess the selected marker under the assay conditions':'Selection enriches for the marker-associated phenotype under the stated conditions. Separate checks are needed for insert identity, sequence and intended expression.',
      'The encoded protein must be active':'Protein activity depends on expression, folding and other conditions beyond carrying a selectable marker. Survival on selection does not assay that function.'
    },
    'What does high sequencing depth alone fail to guarantee?': {
      'That some positions have many reads':'Many reads covering positions are precisely what high depth describes. The important limitation is the correctness and placement of that evidence.',
      'That all systematic errors and mapping ambiguities are eliminated':'Repeated reads can share biases or match several genomic locations. More observations do not automatically resolve correlated errors or ambiguous placement.',
      'That coverage can be counted':'Read coverage is countable once reads are placed. Counting evidence is different from proving every placement and base call correct.'
    },
    'Which phrase uses homology correctly?': {
      'The sequences are 70% homologous':'Homology is an inference of shared ancestry, not a percentage. A percentage can describe sequence identity over a specified alignment.',
      'The alignment is 70% identical and may support shared ancestry':'Identity is a measurable alignment proportion. Appropriate sequence evidence can support homology, while its interpretation also depends on coverage and other context.',
      'A sequence is homologous because its filename matches':'File naming is administrative metadata, not evidence of common ancestry. Biological relationships require sequence or other relevant evolutionary evidence.'
    },
    'If every edge of a cube doubles, how does its area-to-volume ratio change?': {
      'It doubles':'Doubling edge length increases surface area fourfold but volume eightfold. The ratio decreases rather than following the increase in length.',
      'It stays unchanged':'Area and volume scale with different powers of length. Their ratio stays unchanged only if those scaling effects balance, which they do not here.',
      'It halves':'For a cube, area divided by volume is 6/a. Replacing a with 2a gives 3/a, half the original ratio.'
    }
  };
  var checkpoints = {
    'Which interaction is inside a single water molecule?': {
      'A polar covalent O–H bond':'Oxygen and hydrogen share electrons within one water molecule. Unequal sharing makes each O–H bond polar rather than turning it into an intermolecular attraction.',
      'A hydrogen bond joining two water molecules':'This attraction connects separate molecules. It differs from the covalent O–H bonds that hold atoms together within each water molecule.',
      'A bond between two sodium ions':'A water molecule contains oxygen and hydrogen, not sodium. Two sodium ions therefore cannot define an internal bond of water.'
    },
    'A salt ion becomes surrounded by water molecules. What process does this illustrate?': {
      'Hydration':'Water’s polar regions interact with the ion, forming a hydration environment. This can stabilize dissolved ions without changing them into water molecules.',
      'Translation':'Translation uses ribosomes to interpret an mRNA sequence and assemble a polypeptide. It does not name the solvation of an ion.',
      'Chromosome segregation':'Segregation distributes chromosomes or chromatids during cell division. Water molecules surrounding a dissolved ion involve molecular solvation, not chromosome movement.'
    },
    'Which polymer is a major structural component of plant cell walls?': {
      'Cellulose':'Cellulose chains associate into microfibrils that strengthen plant walls. Their arrangement supports a structural role rather than simply storing soluble glucose.',
      'Glycogen':'Glycogen is a branched glucose-storage polymer in animals and many other organisms. It is not the main reinforcing polymer of plant cell walls.',
      'Triglyceride':'A triglyceride is a lipid containing glycerol esterified to fatty acids. It is not a glucose polymer forming plant-wall microfibrils.'
    },
    'Which observation best supports enzyme specificity?': {
      'One enzyme hydrolyzes starch but not cellulose under matched conditions':'A controlled difference between substrates supports selective recognition or catalysis. The different linkage arrangements provide a molecular explanation worth testing further.',
      'All samples have the same color before testing':'Equal starting color can help control an assay, but it does not show how the enzyme responds to different chemical substrates.',
      'The assay tube is made of glass':'Container material alone does not establish substrate recognition. Specificity requires comparing enzyme action under controlled conditions.'
    },
    'Which lipid has a fused-ring framework?': {
      'A steroid':'Steroids share a characteristic fused-ring framework. This architecture distinguishes them from long carbohydrate or polypeptide chains.',
      'A cellulose chain':'Cellulose is a carbohydrate polymer of glucose residues. Its linked sugar rings are not the steroid fused-ring framework.',
      'A polypeptide':'A polypeptide is an amino-acid chain joined by peptide bonds. It is a protein-related polymer, not the defining ring structure of a steroid.'
    },
    'Why must temperature be matched when comparing membrane mobility?': {
      'Temperature itself changes molecular motion and packing':'Temperature can alter lipid movement and organization independently of composition. Matching it helps attribute mobility differences to the factor being tested.',
      'Temperature determines the genetic code':'The genetic code describes codon-to-amino-acid assignments. It does not explain why membrane lipids move differently when temperature changes.',
      'All membranes melt at exactly one temperature':'Membranes differ in lipid mixtures and other components, so their physical transitions are not universally identical. The control matters because temperature influences each preparation.'
    },
    'Which structural level directly records amino-acid order?': {
      'Primary structure':'Primary structure specifies the residue sequence. Folding and assembly build higher organizational levels from that chemically ordered chain.',
      'Quaternary structure':'Quaternary structure concerns how multiple polypeptide subunits associate. It does not directly list the amino-acid sequence within a chain.',
      'A membrane potential':'Membrane potential is an electrical difference across a membrane. It is not a level in the classification of protein structural organization.'
    },
    'What extra measurement helps interpret an activity decrease?': {
      'Protein abundance under the same treatment':'Measuring amount helps separate having less protein from having less activity per amount of protein. Both can reduce the total assay output.',
      'Only the tube label':'A label identifies the intended sample but does not measure protein amount or molecular function. It cannot explain the observed activity decrease.',
      'The number of pages in a laboratory notebook':'Notebook length is unrelated to the sample’s protein quantity or functional state. Relevant measurements must test plausible causes of the activity change.'
    },
    'What is a cis-regulatory change?': {
      'A change in a regulatory DNA site near or linked to the affected gene':'A cis-regulatory change acts through a linked DNA region, such as a binding site. It differs from changing a freely diffusible regulatory protein.',
      'A change in the room temperature only':'Temperature can influence expression, but an environmental change alone is not a change to a regulatory DNA sequence.',
      'A change in every ribosome simultaneously':'A broad alteration of translation machinery is not a linked regulatory DNA-site change. Cis describes how a DNA region acts relative to the gene.'
    },
    'Why can RNA and protein measurements disagree at one time point?': {
      'They have different production and degradation rates':'RNA and protein are produced and removed through distinct processes. Their different lifetimes can delay or reshape changes in measured abundance.',
      'RNA always becomes protein immediately':'Translation is regulated and takes time; some RNAs are not protein-coding at all. RNA is read as a template rather than instantly becoming protein.',
      'Proteins contain no amino acids':'Proteins are built from amino-acid residues. Their composition does not remove the separate regulation of RNA and protein production or turnover.'
    },
    'What does hemizygous mean for an X-linked gene in this model?': {
      'Only one copy is present':'For the specified non-pseudoautosomal X-linked locus in an XY individual, one copy is present. A second matching allele is not required for expression.',
      'Both copies must be identical':'Having two identical alleles describes homozygosity. Hemizygosity instead refers to having one copy at the locus in this context.',
      'The gene cannot be expressed':'A single gene copy can be expressed. Hemizygosity concerns copy number at the locus, not an automatic inability to produce its product.'
    },
    'Which event explains the absence of ordinary father-to-son X-linked transmission?': {
      'The father transmits Y rather than X to the son':'In the stated XX/XY model, the son receives the paternal Y. A non-pseudoautosomal allele on the paternal X is therefore not transmitted directly to him.',
      'Sons never inherit any paternal DNA':'Sons inherit paternal autosomes and a paternal sex chromosome. The restriction here concerns the paternal X-linked route, not all paternal inheritance.',
      'X chromosomes contain no genes':'X chromosomes carry many genes. The transmission pattern follows which sex chromosome is inherited, not an absence of genetic information.'
    },
    'Under complete autosomal recessivity, which genotype expresses the trait?': {
      'aa':'Under the stated fully recessive model, two a alleles are required for the defined phenotype. The result depends on that explicit inheritance assumption.',
      'AA only':'AA contains two A alleles, not the pair of recessive a alleles required by this model. It does not express the specified recessive trait.',
      'Every heterozygote':'An Aa heterozygote carries one a allele but does not express the fully recessive phenotype under the model. Carrying and expressing are distinct.'
    },
    'Why should classroom pedigree exercises use fictional families?': {
      'They avoid unnecessary collection of sensitive family information':'Fictional cases permit inheritance reasoning without asking students to disclose private family or health histories. The biological assumptions can still be stated and tested.',
      'Fiction makes all genotypes certain':'A fictional pedigree can deliberately retain uncertain genotypes. Certainty depends on the supplied evidence and assumptions, not whether the family is real.',
      'Real people do not inherit genes':'Humans inherit genetic material from their biological parents. Privacy and educational scope, not an absence of inheritance, motivate fictional classroom examples.'
    },
    'What does q² represent under the two-allele equilibrium model?': {
      'The aa genotype frequency':'Under random union of gametes, two a alleles combine with probability q × q. This gives the expected aa genotype proportion.',
      'The a allele frequency':'The allele frequency is q itself. Squaring it moves from one allele draw to the probability of two a contributions forming a genotype.',
      'The total heterozygote frequency':'Heterozygotes contain one of each allele and have expected frequency 2pq. The term q² describes two a alleles instead.'
    },
    'Can allele frequency be counted directly without assuming equilibrium?': {
      'Yes, from genotype copy counts':'At a diploid locus, count two A copies for AA and one for Aa, then divide by total allele copies. This counting requires no equilibrium assumption.',
      'No, p always equals the dominant phenotype fraction':'A dominant phenotype can combine AA and Aa genotypes. Its frequency is not generally the A allele frequency, so phenotype counting alone can be insufficient.',
      'Only if every individual is homozygous':'Heterozygotes contribute one copy of each allele and can be included directly. Their presence does not prevent allele-frequency calculation.'
    },
    'Which process can oppose divergence by mixing alleles?': {
      'Gene flow':'Movement followed by reproduction can transfer alleles between populations. This exchange can reduce differences created by selection, drift or mutation.',
      'Complete reproductive isolation':'Complete reproductive isolation prevents successful reproductive exchange. It therefore does not mix alleles between the isolated populations.',
      'Permanent absence of reproduction':'Without reproduction, alleles are not passed through successful interpopulation matings. This condition does not describe the mixing mechanism in gene flow.'
    },
    'Why should reciprocal crosses be considered?': {
      'Cross direction can influence reproductive outcomes':'Maternal effects, cytoplasmic inheritance or other asymmetries can make the two cross directions differ. Testing both can reveal a hidden limitation.',
      'They guarantee all hybrids are fertile':'Reversing parental roles does not guarantee compatibility or fertility. Reciprocal crosses test outcomes rather than ensuring that every hybrid succeeds.',
      'They remove every environmental effect':'Reciprocal crosses address directional asymmetry, but environmental variables still need controls. No cross arrangement automatically removes every confounder.'
    },
    'Which group is a clade?': {
      'One ancestor and all its descendants':'A clade includes the complete descendant group of a chosen ancestor. Omitting descendants changes it into a different type of grouping.',
      'Any three similarly colored species':'Similar color may evolve independently or be retained across several lineages. Appearance alone does not define an inclusive ancestor-descendant group.',
      'Only the oldest tip on a diagram':'A tip does not by itself specify the full descendants of an ancestral node. Page placement and apparent age do not supply the clade definition.'
    },
    'When can branch length be interpreted as elapsed time?': {
      'When the tree explicitly uses an appropriate time scale':'A time-calibrated tree links branch length to elapsed time. The legend and calibration are necessary because other trees use length differently.',
      'In every tree without checking the legend':'Branches may represent substitutions or arbitrary layout rather than time. Ignoring the legend can turn a drawing convention into a false chronological claim.',
      'Only when the line is horizontal':'Line orientation is a layout choice. A horizontal branch can be arbitrary, while a differently oriented branch can belong to a calibrated time tree.'
    },
    'What can vary within a species even when species richness is unchanged?': {
      'Genetic diversity':'Allele variation within and among populations can change without adding or removing a species. Genetic diversity is distinct from species richness.',
      'The number of different species by definition':'The question holds richness unchanged. Changing the number of species would change that quantity rather than identify a separate within-species level.',
      'The chemical identity of every atom':'Genetic differences concern molecular sequences and variants, not a universal change in elemental identities. Atom identity is not a measure of biodiversity.'
    },
    'Which comparison best controls sampling effort?': {
      'Equal survey duration using the same method in comparable areas':'Matching duration, method and area makes differences less likely to reflect unequal observation effort. Detection differences may still require additional consideration.',
      'One minute at one site and ten hours at another':'Longer observation creates more opportunities to detect uncommon species. Unequal duration confounds ecological differences with sampling effort.',
      'Counting only the easiest species at one site':'Changing which species are counted changes the detection and inclusion process. The resulting samples are not comparable measures of community richness.'
    },
    'Which example is ex situ conservation?': {
      'Storing viable seeds in a seed bank':'A seed bank maintains biological material outside its original ecological setting. It complements habitat protection rather than preserving every interaction in place.',
      'Protecting a breeding pond in its landscape':'Protection within the organism’s habitat is in situ conservation. The breeding population remains part of its original ecological setting.',
      'Reducing disturbance within a native forest':'Managing threats where organisms naturally live is an in situ approach. It does not relocate the conserved material to an external collection.'
    },
    'Why can a corridor have costs as well as benefits?': {
      'It can spread unwanted organisms as well as aid native movement':'Connectivity can assist native dispersal but also transmit pathogens or invasive organisms. Benefits and risks depend on the species and landscape.',
      'It always eliminates every ecological interaction':'A corridor changes movement opportunities; it does not eliminate interactions. It can increase encounters or alter existing relationships among organisms.',
      'It prevents all migration by definition':'A corridor is intended to facilitate some movement between habitat areas. Its effects may vary, but blocking all migration is not its defining purpose.'
    },
    'Which feature distinguishes fungi from bacteria?': {
      'Fungal cells are eukaryotic':'Fungal cells have eukaryotic organization, including membrane-enclosed nuclei. Bacteria have a different cellular organization without such nuclei.',
      'Fungi never contain DNA':'Fungi have DNA that supports inheritance and cellular function. DNA presence is shared with bacteria and does not distinguish these groups.',
      'Bacteria all have chloroplasts':'Bacteria do not have chloroplast organelles. Some bacteria photosynthesize using their own cellular structures, but this does not describe all bacteria.'
    },
    'What is a mycorrhizal association?': {
      'An association between a fungus and plant roots':'Mycorrhizal associations connect fungal and plant-root systems. Resource exchange can benefit both partners under appropriate biological conditions.',
      'A bacterial chromosome':'A chromosome is a DNA-containing genetic structure. Mycorrhiza describes an ecological association rather than a bacterial genome component.',
      'A type of animal blood cell':'Blood cells belong to animal circulatory systems. Mycorrhizal relationships instead involve fungi and plant roots.'
    },
    'Which measurement helps resolve a compositional ambiguity?': {
      'An appropriate absolute-abundance estimate':'Absolute counts can distinguish growth of a focal group from a rising percentage caused by declines elsewhere. The method still needs suitable controls.',
      'Only a larger pie chart':'Enlarging a proportional display does not add absolute-count evidence. The same percentages remain compatible with different underlying cell numbers.',
      'Renaming the most abundant group':'Changing a label does not change the measurement or supply missing counts. Compositional uncertainty requires additional evidence, not new terminology.'
    },
    'What is a useful purpose of a collection blank?': {
      'Checking for contamination introduced during sampling or processing':'A blank follows relevant handling steps without the intended biological sample. Material detected there can reveal background contamination affecting interpretation.',
      'Guaranteeing every microbe is harmless':'A blank checks contamination, not pathogenic potential. It cannot establish the biological effects of every organism in the actual sample.',
      'Counting all unculturable organisms':'A blank contains no intended sample community. It does not enumerate unculturable organisms or guarantee comprehensive microbial detection.'
    },
    'What is the main role of a plasmid origin of replication?': {
      'Supporting replication in a compatible host':'An origin provides information used by compatible replication machinery. Maintaining the plasmid depends on host compatibility and other necessary factors.',
      'Specifying every amino acid in the insert':'A coding sequence specifies a polypeptide through transcription and translation. The replication origin serves a different function from encoding the inserted protein.',
      'Guaranteeing the absence of mutations':'Replication can introduce errors, and an origin does not verify sequence identity. Construct verification remains necessary even when the plasmid replicates.'
    },
    'Which check directly examines nucleotide order?': {
      'DNA sequencing':'Sequencing estimates the order of nucleotide bases from molecular measurements. Appropriate quality checks are needed to interpret the resulting sequence.',
      'Only measuring total culture volume':'Culture volume measures how much liquid is present. It does not identify the sequence or arrangement of bases in a DNA construct.',
      'Counting surviving colonies alone':'Colony survival provides selection-related evidence. Different DNA sequences can produce the same colony count, so it does not read nucleotide order.'
    },
    'What does a gap with no mapped reads most directly indicate?': {
      'Missing read evidence at that region':'The mapped dataset supplies no reads covering the region. Additional evidence is needed to distinguish sampling failure, mapping problems and actual biological absence.',
      'Proof that the region cannot exist':'Uncovered regions can result from preparation biases, insufficient sequencing or mapping limitations. Absence of mapped evidence is not definitive proof of absence.',
      'Proof that every nearby base is correct':'Missing evidence at one location cannot validate calls elsewhere. Nearby bases require their own supporting quality and alignment evidence.'
    },
    'What does Q30 mean in the stated calibrated model?': {
      'An estimated error probability of 0.001':'Using P = 10^(−Q/10), Q30 gives P = 10⁻³. This is an estimated per-call error probability, not a guaranteed observed count.',
      'Exactly 30 errors in every read':'The score is logarithmically related to error probability. It is not a direct count, and actual error counts vary among reads.',
      'A sequence containing only 30 bases':'Read length and base quality are different measurements. Q30 describes a calibrated error estimate rather than the number of bases in a sequence.'
    },
    'What is a local alignment designed to find?': {
      'A matching region within sequences':'Local alignment identifies high-scoring regions without requiring end-to-end similarity. Its coverage must be considered before making whole-sequence claims.',
      'Only complete chromosome identity':'Local alignment can compare shorter matching regions in otherwise different sequences. Complete identity across chromosomes is not its defining requirement.',
      'A guaranteed biological function':'An alignment provides sequence-comparison evidence. Function depends on biological context and cannot be guaranteed merely by finding a matching region.'
    },
    'Which record improves reproducibility?': {
      'Input provenance, reference version and analysis parameters':'These records identify what was analyzed and how comparisons were made. They let another analyst trace, repeat or explain changes in the result.',
      'Only the final colored image':'A rendered image may omit data, parameters and reference versions. Without those details, the underlying analysis cannot reliably be repeated.',
      'Only the analyst’s preferred conclusion':'A conclusion does not specify inputs or methods. Reproducibility depends on documented evidence and procedures rather than agreement with a preferred interpretation.'
    },
    'What units does area divided by volume have?': {
      'Inverse length, such as mm⁻¹':'Dividing mm² by mm³ gives mm⁻¹. The ratio therefore depends on the chosen length unit and is not inherently dimensionless.',
      'Only cubic millimeters':'Cubic millimeters measure volume alone. Dividing area by volume cancels two powers of length and leaves an inverse-length unit.',
      'No units under every convention':'An ordinary area-to-volume ratio retains inverse-length units. A separately normalized dimensionless quantity would need its normalization stated explicitly.'
    },
    'Which change can improve exchange without simply increasing bulk volume?': {
      'Adding thin folds to an exchange surface':'Thin folds can enlarge available area while keeping local diffusion distances short. Effective exchange still requires permeability and maintained driving gradients.',
      'Removing all concentration gradients':'Removing the relevant gradient removes a driving force for net passive diffusion. More area cannot by itself replace that missing influence.',
      'Increasing diffusion distance everywhere':'Longer paths generally slow diffusion under comparable conditions. Increasing distance does not provide the short-path advantage of a thin exchange surface.'
    }
  };
  global.BIO_EXAM_TOPIC_RATIONALES = Object.assign(global.BIO_EXAM_TOPIC_RATIONALES || {},topics);
  global.BIO_EXAM_CHECKPOINT_RATIONALES = Object.assign(global.BIO_EXAM_CHECKPOINT_RATIONALES || {},checkpoints);
})(typeof window !== 'undefined' ? window : globalThis);
