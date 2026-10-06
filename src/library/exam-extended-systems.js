/* Original option-specific reasoning for the 18 additive physiology and plant lessons.
 * Scientific references and teaching limits are recorded in extended-systems.js.
 * Exact question and option keys preserve meaning after option rotation.
 * This adds feedback only: no grading changes, student data access or clinical advice. */
(function (global) {
  'use strict';
  const topics = {
    'What is the direct role of bile in lipid digestion?': {
      'Disperse lipids and support micelle formation': 'Bile salts help disperse lipid droplets and form mixed micelles. These actions improve access for lipases and help lipid digestion products reach the intestinal surface.',
      'Hydrolyze every triglyceride bond': 'Bile is not a hydrolytic enzyme. Lipases catalyse cleavage of triglyceride ester bonds; bile supports their access to the lipid substrate.',
      'Convert proteins into glucose': 'Protein breakdown involves proteases, and selected amino-acid carbon skeletons can later contribute to glucose synthesis. Neither process is the direct digestive action of bile.'
    },
    'Why can glucose uptake depend indirectly on ATP?': {
      'Glucose must be converted into ATP before crossing': 'Intestinal glucose is transported as a sugar molecule. Its later metabolism can supply energy, but conversion into ATP is not a prerequisite for crossing the epithelium.',
      'Every glucose carrier directly hydrolyzes ATP': 'The apical sodium-glucose cotransporter uses an ion gradient rather than directly splitting ATP. Other glucose carriers support facilitated diffusion, so ATP hydrolysis is not universal among carriers.',
      'The sodium gradient is maintained by an ATP-driven pump': 'Basolateral sodium-potassium ATPase keeps intracellular sodium relatively low. Sodium entry down this gradient can drive coupled glucose uptake at the apical membrane.'
    },
    'Why can a circulating hormone affect only some cells?': {
      'Hormones act only where they were made': 'Endocrine signals can travel in the circulation to distant targets. The production site does not confine all of their effects to neighboring cells.',
      'Only responsive cells have appropriate receptors and signaling machinery': 'A hormone must interact with a suitable receptor and a functioning response pathway. Cells exposed to the same circulating signal can therefore respond differently or not respond.',
      'Blood visits only those cells': 'Circulation distributes hormones more broadly than their functional target cells. Selectivity depends primarily on cellular responsiveness, not blood bypassing all non-target tissues.'
    },
    'How can insulin lower circulating glucose besides increasing muscle uptake?': {
      'Reduce liver glucose output': 'Insulin shifts hepatic metabolism toward storage and suppresses pathways that release glucose. Lower hepatic output can reduce circulating glucose independently of greater muscle uptake.',
      'Turn every cell into a glucose-producing cell': 'Widespread additional glucose release would oppose lowering its circulating level. Insulin instead coordinates tissue-specific uptake, storage and metabolic regulation.',
      'Convert glucose directly into a hormone': 'Glucose is a carbohydrate, whereas insulin is a peptide assembled from amino acids. Insulin signaling changes glucose handling rather than turning glucose directly into a hormone.'
    },
    'Why is filtered volume usually much greater than urine volume?': {
      'Filtration means blood cells become urine': 'The normal glomerular filtration barrier retains blood cells in the circulation. Filtrate is derived mainly from plasma water and sufficiently small dissolved substances.',
      'Urine is stored indefinitely in nephrons': 'Tubular fluid continues through the urinary drainage system. A much smaller final volume mainly reflects water recovery, not indefinite accumulation inside nephrons.',
      'Much filtered water is reabsorbed': 'Water moves from tubular fluid back toward the circulation during nephron processing. Because most filtered water is recovered, only a fraction normally leaves as urine.'
    },
    'What distinguishes the thick ascending limb of the nephron loop?': {
      'Water secretion without solute transport': 'This segment actively reabsorbs salts and is relatively impermeable to water. Net water secretion without salt transport is not its defining contribution.',
      'Salt reabsorption with low water permeability': 'Salt leaves the tubular fluid without equivalent water movement. This helps dilute the fluid in the ascending limb while supporting the medullary osmotic gradient.',
      'Equal permeability to every plasma protein': 'Nephron epithelia have selective transport properties, not uniform protein permeability. Most plasma proteins are also excluded from the initial filtrate by the glomerular barrier.'
    },
    'What happens to concentration if water leaves but solute amount stays fixed?': {
      'Concentration rises': 'Concentration is solute amount divided by solution volume. Removing water while retaining the same dissolved amount decreases the denominator and raises the concentration.',
      'Concentration must fall': 'A fall would require dilution or sufficient solute removal. Here only water leaves, so the retained solute becomes more concentrated rather than more dilute.',
      'Solute atoms disappear': 'Water loss does not destroy solute atoms. The question explicitly holds solute amount fixed, so only the amount of surrounding solvent changes.'
    },
    'What directly allows a bound myosin head to detach from actin?': {
      'Complete absence of ATP': 'Without available ATP, strongly bound cross-bridges cannot undergo their normal ATP-dependent detachment. ATP depletion therefore favors persistent attachment rather than release.',
      'Shortening of the actin molecule': 'Actin filaments do not have to shrink to release myosin. Detachment follows a change in myosin binding affinity associated with ATP binding.',
      'ATP binding': 'Binding of ATP to the myosin head lowers its affinity for actin and permits detachment. Subsequent ATP hydrolysis helps prepare the head for another cross-bridge cycle.'
    },
    'Which structure is the usual site of human fertilization?': {
      'The endometrium itself': 'The endometrium supports later implantation of a developing embryo. It is not the usual location where a sperm and oocyte first fuse.',
      'A uterine tube': 'Human fertilization usually occurs in a uterine tube, commonly its ampullary region. Development and transport toward the uterus follow before implantation can occur.',
      'The urinary bladder': 'The bladder stores urine and belongs to the urinary tract. It is not part of the normal route for oocyte transport or fertilization.'
    },
    'What is the ideal meiotic output from one primary spermatocyte?': {
      'Four haploid spermatids': 'Meiosis I separates homologous chromosomes, and meiosis II separates sister chromatids. The ideal output is four haploid spermatids that subsequently differentiate toward sperm.',
      'Four diploid oocytes': 'A spermatocyte belongs to the sperm-producing lineage, not the oocyte lineage. Meiotic reduction also produces haploid rather than diploid products.',
      'Two genetically identical diploid cells': 'Two daughter cells retaining diploid chromosome sets describe a simplified mitotic outcome. Spermatocyte meiosis involves two divisions and ordinarily generates variation among haploid products.'
    },
    'Why must fertilization be distinguished from implantation?': {
      'They are identical events with different names': 'Fertilization involves gamete fusion and egg activation. Implantation is a later interaction between a developing embryo and uterine tissue, so the two events cannot be interchanged.',
      'Implantation produces the sperm nucleus': 'The sperm nucleus originates during sperm development before fertilization. Attachment of an embryo to uterine tissue does not generate that paternal nucleus.',
      'Fusion and activation precede later attachment to uterine tissue': 'The early fertilization events precede cleavage and later implantation. Observing fertilization alone does not establish that implantation or subsequent development will occur.'
    },
    'Which statement best describes innate pattern recognition?': {
      'It begins only after antibodies appear': 'Innate receptors can respond to microbial features or tissue damage before a new antibody response develops. Antibodies can cooperate with innate defenses but are not required to initiate all of them.',
      'It detects recurring molecular features and damage signals': 'Innate receptors recognize classes of microbial components and signals associated with damaged cells. This supports rapid responses without generating a new rearranged receptor for each exposure.',
      'It detects absolutely every pathogen with a unique rearranged receptor': 'Innate recognition does not guarantee detection of every pathogen and does not create a unique somatically rearranged receptor for each one. Receptor rearrangement characterizes adaptive lymphocyte receptor diversity.'
    },
    'Which statement about xylem tissue is accurate?': {
      'It includes dead conducting elements and some living cells': 'Mature vessel elements and tracheids lack living contents, while xylem parenchyma remains living. Xylem is therefore a complex tissue with more than one cell type.',
      'Every xylem cell must be a living sieve tube': 'Sieve-tube elements belong to phloem, not xylem. The main mature water-conducting elements of xylem are vessel elements and tracheids.',
      'It contains only dead cells without exceptions': 'This describes some mature conducting elements but incorrectly extends their condition to the whole tissue. Living xylem parenchyma contributes storage and other functions.'
    },
    'Why can the same hormone affect roots and shoots differently?': {
      'A hormone changes into a different element in each tissue': 'Tissue-specific effects do not require transformation into another chemical element. Receptors, signal pathways, concentration and developmental context alter how the same chemical signal is interpreted.',
      'Only shoots possess living cells': 'Roots contain many living cells that grow, transport substances and respond to signals. Their responses differ from shoot responses because of physiology and context, not an absence of life.',
      'Tissues differ in sensitivity and downstream developmental programs': 'Receptor activity and downstream regulation vary among tissues. The same signal concentration can consequently promote one response while inhibiting or having little effect on another.'
    },
    'What directly produces a bend in a growing shoot?': {
      'Equal extension on both sides at all times': 'Equal longitudinal extension on both sides does not create the length difference needed for this growth-bending mechanism. Curvature requires an asymmetry in extension.',
      'Unequal extension on its two sides': 'The side that elongates more becomes the longer outer side of the curve. Differential growth therefore bends the shoot toward the relatively shorter side.',
      'A conscious choice by the leaf': 'Shoot curvature can be explained by stimulus detection, signaling and unequal cell expansion. A conscious decision is neither required nor supported by this mechanism.'
    },
    'What does plant meiosis directly produce in the alternation-of-generations cycle?': {
      'Haploid spores': 'Meiosis in the diploid sporophyte produces haploid spores. These develop into gametophytes, which produce gametes in a subsequent stage of the life cycle.',
      'A diploid zygote': 'A zygote normally forms when haploid gametes fuse at fertilization. Meiosis reduces chromosome-set number instead of combining gamete contributions.',
      'A mature seed in one division': 'Seed development involves an embryo and associated protective or nutritive tissues. A meiotic division produces spores, not a complete multicellular seed.'
    },
    'Why is pollen arrival not the same event as fertilization?': {
      'Each pollen grain is already a diploid embryo': 'A pollen grain represents the male gametophyte, not an embryo. The diploid embryo develops from a zygote after gamete fusion.',
      'A stigma contains no living cells': 'The stigma is living reproductive tissue involved in receiving and interacting with pollen. Its cellular state does not make pollen arrival equivalent to gamete fusion.',
      'Compatibility, tube growth and gamete fusion must still occur': 'Arrival is pollen transfer; compatible pollen must germinate and deliver sperm through a pollen tube. Fertilization requires the later fusion events, which arrival alone cannot guarantee.'
    },
    'Why might a viable seed fail to germinate even when water is available?': {
      'A seed cannot contain an embryo': 'A seed normally contains an embryo together with protective and often nutritive structures. Failure to germinate is not explained by claiming that embryos cannot occur in seeds.',
      'Dormancy or other unmet conditions can prevent germination': 'A living seed may require a dormancy-breaking cue or suitable oxygen, temperature or light conditions. Water availability alone does not establish that all requirements have been met.',
      'Water guarantees germination in every seed': 'Water supports hydration and metabolism but is not the only determinant. Dormancy, unsuitable environmental conditions or lack of viability can still prevent radicle emergence.'
    }
  };

  const checkpoints = {
    'Why does pancreatic bicarbonate help intestinal digestion?': {
      'It moderates acidic chyme for intestinal enzymes': 'Bicarbonate helps neutralize acid arriving from the stomach. The resulting luminal conditions are more suitable for the activity of pancreatic and intestinal enzymes.',
      'It supplies all digestive enzyme active sites': 'Active sites are structural regions of enzyme molecules, not structures supplied by bicarbonate. Bicarbonate mainly changes the surrounding acid-base conditions.',
      'It stops every intestinal contraction': 'Intestinal mixing and propulsion continue during digestion. Bicarbonate secretion supports chemical conditions rather than universally shutting down gut movement.'
    },
    'Which event is absorption rather than digestion?': {
      'A protease cleaves a peptide bond': 'Breaking a peptide bond reduces a protein into smaller products. That is chemical digestion; the products have not necessarily crossed the gut lining.',
      'Chewing fragments a food particle': 'Chewing physically breaks food into smaller pieces and increases accessible surface area. It does not itself transfer nutrients across intestinal epithelial cells.',
      'Glucose crosses the intestinal epithelium': 'Movement from the intestinal lumen across the epithelial barrier into the body is absorption. This is distinct from the prior breakdown that releases glucose from dietary carbohydrates.'
    },
    'Where do intestinal chylomicrons usually enter first?': {
      'Red blood cells': 'Red blood cells are not the receiving compartment for newly assembled chylomicrons. These lipoprotein particles initially enter intestinal lymphatic vessels.',
      'Lacteals and lymph': 'Enterocytes assemble chylomicrons and release them toward intestinal lacteals. Lymph carries them onward before they join the blood circulation.',
      'The stomach lumen': 'Chylomicrons leave intestinal absorptive cells toward the body, not backward into the stomach cavity. Their normal initial transport route is lymphatic.'
    },
    'Why might more luminal glucose stop increasing uptake proportionally?': {
      'Available transport pathways can become limiting': 'A finite population of transporters can approach its maximal transport rate. Additional substrate then produces progressively smaller increases in uptake through those pathways.',
      'All glucose diffusion stops at high concentration': 'High glucose concentration does not abolish molecular movement or every transport route. A plateau can reflect saturation of a particular uptake pathway rather than complete cessation of transport.',
      'Villi disappear whenever glucose rises': 'Rising luminal glucose does not normally cause villi to vanish. A capacity limit in existing carriers is a more direct explanation of the stated uptake pattern.'
    },
    'Which feature fits a typical steroid-hormone mechanism?': {
      'Direct translation into a new ribosome': 'Translation reads mRNA to assemble a polypeptide. A steroid hormone is not an mRNA template and is not directly translated into a ribosome.',
      'Obligate passage through a sodium channel': 'Sodium channels conduct ions and are not a mandatory entry route for steroid hormones. Many steroids can cross membranes and interact with intracellular receptors.',
      'Regulation of transcription through an intracellular receptor': 'Many steroid hormones bind intracellular receptors whose complexes regulate gene expression. The downstream change in protein production can alter cell behavior.'
    },
    'What does negative feedback usually accomplish in an endocrine axis?': {
      'Eliminates all fluctuation in secretion': 'Feedback does not require perfectly constant secretion. Endocrine systems can show pulses, rhythms and delays while still limiting deviations through feedback.',
      'Limits an upstream drive when its effects increase': 'An increase in a downstream hormone or regulated effect can suppress upstream stimulation. This restrains further output and helps stabilize the regulated system.',
      'Makes every response grow without limit': 'Self-amplification describes positive rather than negative feedback. Negative feedback opposes part of the change instead of making every response increase indefinitely.'
    },
    'Which cells are the principal source of pancreatic glucagon?': {
      'Alpha cells': 'Pancreatic islet alpha cells secrete glucagon. Its actions include supporting hepatic glucose output in the appropriate physiological context.',
      'Beta cells': 'Pancreatic beta cells are the principal source of insulin. Although both cell types participate in glucose regulation, beta cells are not the principal glucagon source.',
      'Red blood cells': 'Red blood cells specialize in respiratory-gas transport. They are not the pancreatic endocrine cells that synthesize and secrete glucagon.'
    },
    'Which statement about glucose uptake is accurate?': {
      'Every glucose transporter is GLUT4': 'Glucose transport involves several transporter families and tissue-specific isoforms. GLUT4 is important in insulin-responsive muscle and adipose tissue but does not represent every glucose carrier.',
      'Glucagon directly recruits GLUT4 in every tissue': 'Insulin is the major signal promoting GLUT4 recruitment in the relevant tissues. Glucagon mainly influences hepatic metabolism and does not universally recruit GLUT4.',
      'Not every tissue requires insulin for basal glucose uptake': 'Some tissues use transporters whose basal glucose transport does not depend on insulin-driven GLUT4 recruitment. Transporter identity and regulation differ among tissues.'
    },
    'Which route carries urine from a kidney to the bladder?': {
      'Renal vein': 'The renal vein returns blood from the kidney toward the systemic venous circulation. Urine follows a separate drainage route rather than entering this vein.',
      'Ureter': 'Each ureter carries urine from a kidney toward the bladder. Its role in urine transport distinguishes it from renal blood vessels.',
      'Renal artery': 'The renal artery delivers blood to the kidney for its circulation and processing. It does not drain formed urine into the bladder.'
    },
    'Which comparison correctly distinguishes two kidney processes?': {
      'Filtration enters tubules; reabsorption returns material toward blood': 'Glomerular filtration moves fluid into the nephron lumen, while tubular reabsorption recovers substances toward the circulation. These opposite transfers help determine final excretion.',
      'Filtration and urine excretion are identical flows': 'Tubular recovery and secretion alter the fluid after filtration. Final urine flow and composition therefore need not equal the initial glomerular filtrate.',
      'Reabsorption moves every solute into urine': 'Reabsorption removes selected substances from tubular fluid rather than adding them to it. Secretion is the process that adds substances from the body side into the tubule.'
    },
    'What directly raises collecting-duct water permeability in response to ADH?': {
      'Conversion of water into sodium': 'Water molecules are not converted into sodium ions during renal regulation. ADH changes the availability of water pathways across epithelial membranes.',
      'Removal of every epithelial membrane': 'An intact epithelium is essential for selective tubular transport. ADH changes channel availability without stripping away the membranes that maintain that barrier.',
      'Increased apical aquaporin availability': 'ADH signaling increases aquaporin-2 availability in the apical membrane of responsive collecting-duct cells. Water can then move more readily when an appropriate osmotic gradient is present.'
    },
    'Which equation correctly accounts for solute excretion?': {
      'Reabsorbed − filtered − secreted': 'This reverses the roles of all three transfers: recovery would incorrectly increase excretion, while entry into the lumen would reduce it. Begin with the filtered amount instead.',
      'Filtered − reabsorbed + secreted': 'Filtration contributes the initial tubular amount, reabsorption removes some, and secretion adds some. For the stated accounting model, the remainder is the amount excreted.',
      'Filtered + reabsorbed − secreted': 'The signs of the tubular adjustments are reversed. Reabsorption returns solute toward blood and must be subtracted, whereas secretion adds solute to the lumen and must be added.'
    },
    'Where is ADH synthesized before posterior-pituitary release?': {
      'Hypothalamic neurons': 'Specialized hypothalamic neurons synthesize ADH and transport it along their axons. The posterior pituitary stores and releases this hormone rather than being its original synthesis site.',
      'Red blood cells': 'Red blood cells do not synthesize the neurosecretory hormone ADH. Their principal role is gas transport, not hypothalamic-pituitary signaling.',
      'The bladder wall': 'The bladder serves urine storage and coordinated emptying. It is not the source of ADH transported to and released from the posterior pituitary.'
    },
    'Why should osmotic concentration and fluid volume be distinguished?': {
      'They are always numerically identical': 'Concentration is an amount per volume, whereas volume is the size of the fluid compartment. They represent different physical quantities and generally have different units.',
      'Concentration cannot change without new salt': 'Concentration can rise when water is removed even if the dissolved amount is unchanged. Changes in solvent volume must therefore be considered separately from added solute.',
      'Equal concentrations can occur at different total volumes': 'Two compartments can contain the same solute-to-volume ratio while holding different total amounts of water and solute. Concentration alone cannot specify compartment size.'
    },
    'What changes during sarcomere shortening?': {
      'Actin becomes a different chemical element': 'Actin remains a protein during contraction. Mechanical motion comes from cross-bridge interactions, not conversion of its atoms into another element.',
      'Overlap increases as filaments slide': 'Myosin-actin interactions move thin filaments relative to thick filaments. The sarcomere shortens as overlap increases while individual filament lengths remain essentially constant.',
      'Each thick filament loses half its length': 'Normal sliding-filament contraction does not require thick filaments to be cut or shortened by half. Changes in overlap account for sarcomere shortening.'
    },
    'Which observation describes an isometric contraction?': {
      'Tension rises while overall length stays fixed': 'An isometric setup constrains overall muscle length while activation develops tension. Force production therefore does not require visible shortening of the whole muscle.',
      'Length decreases with no force production': 'Decreasing overall length is not isometric, and active shortening normally involves force generation. The defining isometric constraint is fixed overall length.',
      'Myosin cannot interact with actin': 'Cross-bridge interactions can develop tension under isometric conditions. Preventing the overall length from changing does not mean actin and myosin stop interacting.'
    },
    'Which statement correctly distinguishes production from maturation?': {
      'The uterus produces sperm and oocytes': 'Gamete production is associated with the gonads, not the uterus. The uterus provides a site for implantation and gestational development rather than making both gamete types.',
      'Sperm are made only in the prostate': 'The prostate contributes secretions to semen. Sperm production occurs in the testes, so an accessory gland secretion should not be confused with the gamete source.',
      'Sperm develop in testes and undergo further maturation in the epididymis': 'Testicular seminiferous tubules support sperm development, followed by additional maturation in the epididymis. Production, maturation and transport are related but distinct functions.'
    },
    'Why can gonadal hormone secretion persist despite impaired gamete transport?': {
      'Blocked ducts remove every endocrine cell': 'A duct obstruction does not necessarily destroy the separate hormone-secreting cells. Transport failure alone therefore cannot establish loss of all endocrine function.',
      'Hormone-producing cells and transport pathways have different roles': 'Endocrine cells release hormones toward the circulation, while ducts carry gametes. Disrupting one route need not abolish the other function; the specific condition would require separate evidence.',
      'Hormones always travel inside gametes': 'Gonadal hormones are released through endocrine pathways and carried in the circulation. They do not depend on being packaged inside transported gametes.'
    },
    'Why does oogenesis not produce four equivalent large eggs?': {
      'Cytoplasm is partitioned asymmetrically into an oocyte lineage and polar bodies': 'Unequal cytokinesis retains most cytoplasm in the developing oocyte while producing much smaller polar bodies. Chromosome segregation therefore need not produce equally sized cells.',
      'Oocytes never undergo meiosis': 'Oocytes do enter meiosis, with characteristic arrest and completion stages in humans. Their unequal cell sizes reflect asymmetric division rather than absence of meiosis.',
      'Every meiotic product has a full diploid chromosome set': 'Normal meiotic reduction produces haploid chromosome sets. Ploidy reduction and unequal cytoplasmic allocation are separate features and should not be conflated.'
    },
    'What normally describes an ovulated human secondary oocyte?': {
      'A mature diploid embryo': 'An ovulated secondary oocyte is not yet an embryo. It has completed the first meiotic division and has not received a paternal chromosome contribution.',
      'A cell that has never replicated DNA': 'DNA was replicated before meiosis I. Sister chromatids still present in the secondary oocyte reflect that earlier replication, even though the cell now has one chromosome set.',
      'Haploid chromosome sets with sister chromatids still paired before meiosis II completion': 'Meiosis I has separated homologues, leaving a haploid set whose chromosomes still contain sister chromatids. The human secondary oocyte is normally arrested in meiosis II until activation permits progression.'
    },
    'What does cortical-granule release contribute to after mammalian egg activation?': {
      'Removal of every maternal chromosome': 'Maternal chromosomes must contribute to the normal zygote. Cortical-granule exocytosis changes the extracellular environment rather than removing the maternal genome.',
      'Changes that help reduce additional sperm interaction': 'Released granule contents modify structures surrounding the egg, including the zona pellucida. These changes contribute to limiting further sperm interactions rather than guaranteeing every subsequent developmental outcome.',
      'Production of a new ovary': 'An ovary is an organ formed through developmental processes. A local egg-activation response does not generate a replacement reproductive organ.'
    },
    'What is restored when two typical haploid human gamete contributions combine?': {
      'A diploid chromosome-set complement': 'Each typical gamete contributes one chromosome set. Combining the maternal and paternal contributions restores two sets under the normal fertilization model.',
      'Four complete parental chromosome sets': 'Combining one set from each of two gametes gives two sets, not four. Confusing replicated chromatids with additional chromosome sets can produce this incorrect count.',
      'Only the maternal chromosomes': 'Normal fertilization includes a paternal as well as a maternal chromosome contribution. Retaining only maternal chromosomes would not describe the stated two-gamete combination.'
    },
    'Can inflammation occur without a microbial infection?': {
      'No, every inflammatory response proves infection': 'Tissue injury can release danger signals even when microbes did not initiate the damage. Inflammation alone therefore does not uniquely establish an infectious cause.',
      'Only if antibodies are absent': 'Sterile inflammation is not defined by the absence of antibodies. Damage-associated signaling can trigger inflammation whether or not antibodies are present in the organism.',
      'Yes, sterile tissue damage can trigger it': 'Damaged cells can release signals that activate innate inflammatory pathways. This provides a non-microbial route to inflammation and shows why a response marker is not a diagnosis.'
    },
    'Why is more inflammation not always a better outcome?': {
      'Host cells are immune to every inflammatory mediator': 'Inflammatory mediators and recruited cells can affect healthy host tissue as well as harmful agents. Host cells are not universally protected against these effects.',
      'Excessive responses can damage host tissue': 'Inflammation can aid defense while also causing collateral injury. Its benefits depend on appropriate timing, location and regulation, not simply maximizing response intensity.',
      'Inflammation never recruits useful defenses': 'Recruitment of protective cells and molecules is an important inflammatory function. The risk of excessive injury does not erase those useful defensive roles.'
    },
    'Which feature supports flexibility in many young growing organs?': {
      'Collenchyma with unevenly thickened primary walls': 'Collenchyma combines living cells with supportive, unevenly thickened primary walls. This can strengthen young organs while still accommodating growth and flexibility.',
      'A complete absence of cell walls': 'Cell walls provide essential structural support in plant tissues. Flexible growth depends on wall properties and remodeling, not the disappearance of every wall.',
      'Every cell becoming a mature vessel element': 'Mature vessel elements are specialized for water conduction and have rigid secondary walls. Converting all cells to this state would not explain flexible support in a growing organ.'
    },
    'What distinguishes a meristem from a fully specialized tissue region?': {
      'It can never contain living cells': 'Active cell division requires living cellular machinery. Meristems consist of living cells, so excluding living cells contradicts their growth function.',
      'It transports only oxygen through empty pipes': 'Empty conducting elements are not the defining feature of a meristem. A meristem is a region of cell production, not a dedicated oxygen-pipe system.',
      'It supplies new cells through continuing division': 'Meristematic cells maintain division that generates new cells for plant growth. Their descendants can then enlarge and differentiate into specialized tissues.'
    },
    'Which statement about the traditional five plant hormone groups is accurate?': {
      'Every group always promotes elongation': 'Plant hormones have context-dependent effects on growth, dormancy, stress responses and other processes. Some responses inhibit elongation, so universal promotion is not a valid rule.',
      'They are important groups but not the complete list of plant signals': 'The traditional five groups are a useful historical framework. Additional signals, including brassinosteroids, jasmonates and strigolactones, also contribute to plant regulation.',
      'They explain every response independently of the environment': 'Plant signaling integrates environmental cues and developmental state. Hormone interactions cannot be interpreted as isolated explanations detached from those conditions.'
    },
    'Which response is associated with ABA in a water-stress context?': {
      'Promotion of stomatal closure signaling': 'ABA contributes to guard-cell signaling that changes ion transport and turgor. Promoting closure can reduce water loss through stomata during water stress.',
      'Mandatory opening of every stoma': 'Universal stomatal opening would tend to increase evaporative water loss. ABA in the stated stress context generally supports closure signaling, although actual responses depend on conditions.',
      'Conversion of every leaf into a seed': 'Leaves and seeds have distinct developmental origins. ABA-mediated stress signaling does not transform existing leaves into reproductive seed structures.'
    },
    'Why can roots and shoots bend differently after a gravity stimulus?': {
      'Gravity reverses direction inside roots': 'The gravitational cue does not reverse within a root. Different growth responses to that shared physical direction explain the contrasting organ behavior.',
      'Roots contain no cells': 'Roots are multicellular organs with living growth and sensing tissues. Their directional response cannot be attributed to an absence of cells.',
      'Their growth responses to redistributed signals differ': 'Signal redistribution produces different elongation responses in roots and shoots because their sensitivities differ. The resulting side-to-side growth patterns can therefore yield opposite bending directions.'
    },
    'Which experimental change most directly tests light direction?': {
      'Compare unrelated plants at one time only': 'Unrelated plants can differ in genotype, age and prior conditions. A one-time comparison without manipulating direction cannot cleanly attribute a growth difference to the light cue.',
      'Change light direction while keeping gravity orientation fixed': 'Changing the directional light cue while holding gravity orientation fixed separates those two influences. Other conditions and suitable controls should also be matched.',
      'Change light, temperature and orientation together': 'Simultaneously changing several factors introduces confounding. A growth difference could then reflect temperature or gravity orientation rather than light direction alone.'
    },
    'How are gametes produced within a haploid gametophyte?': {
      'By mitosis': 'The gametophyte already has one chromosome set. Mitotic divisions preserve that set during gamete production rather than reducing it again.',
      'By a second reduction from diploid to haploid': 'The starting gametophyte is haploid, not diploid. The reduction division occurred earlier when the sporophyte produced spores.',
      'By combining two embryos': 'Combining embryos is not the gamete-producing stage of alternation of generations. Gametes arise within the haploid generation before their fusion forms a new zygote.'
    },
    'What is a reasonable expectation for vegetative reproduction?': {
      'Every offspring combines two independent gamete genomes': 'Vegetative propagation does not normally require gamete fusion. Growth from parental vegetative tissue differs from sexual reproduction combining two gamete contributions.',
      'All offspring must have identical traits in every environment': 'Even organisms sharing a genotype can express different phenotypes under different conditions. Mutation and other biological variation also prevent an absolute identity claim.',
      'Offspring often preserve the parental genotype, apart from changes such as mutation': 'Vegetative growth generally propagates the parental genetic complement without meiotic reshuffling and fertilization. Mutations or other changes can still create differences, and phenotype remains environment-sensitive.'
    },
    'In the usual diploid flowering-plant model, what is the primary endosperm ploidy?': {
      'Always identical to the pollen grain': 'The usual endosperm nucleus combines a sperm contribution with two maternal haploid nuclear contributions. It therefore differs from the haploid male gametophyte represented by pollen.',
      'Triploid': 'In the usual model, one haploid sperm nucleus combines with the central cell containing two maternal haploid nuclear contributions. Their combined complement is three chromosome sets.',
      'Always haploid': 'The normal model specified in the question includes both maternal and paternal contributions to the primary endosperm nucleus. Counting only one set omits these combined contributions.'
    },
    'Why might abundant pollen still fail to produce many seeds?': {
      'Compatibility or post-pollination processes may limit success': 'Pollen must be compatible, germinate and deliver sperm, followed by successful fertilization and seed development. A limitation at any later stage can reduce seed production despite abundant arrival.',
      'Every landed pollen grain must become one seed': 'Pollen arrival does not guarantee compatibility or fertilization. Pollen grains are male gametophytes; a seed develops from an ovule after the required reproductive processes.',
      'Pollen transfer instantly removes all resource constraints': 'Water, nutrients and other resources can remain limiting after pollination. Pollen delivery supplies a reproductive contribution, not an unlimited resource budget for seed development.'
    },
    'What commonly provides early growth energy before a seedling photosynthesizes effectively?': {
      'Creation of carbon atoms from sunlight alone': 'Light supplies energy but does not create carbon atoms. Early growth relies on existing materials, and later photosynthesis incorporates carbon from carbon dioxide.',
      'Absorption of fully formed leaves from soil': 'Leaves develop from the growing plant; they are not imported as intact structures from soil. Early tissues are assembled using resources available to the embryo and seedling.',
      'Metabolism of stored seed reserves': 'Stored starches, lipids or proteins can supply substrates for respiration and biosynthesis. These reserves support early development before effective photosynthesis is established.'
    },
    'What does recording radicle emergence directly measure?': {
      'The exact cause of all failed seeds': 'The absence of a radicle does not distinguish dormancy, unsuitable conditions or nonviability. Additional observations are needed before assigning causes to non-emergence.',
      'An operational germination endpoint': 'Radicle emergence defines an observable event that can be counted consistently. It records attainment of that developmental stage, not every later outcome.',
      'Guaranteed survival to reproductive maturity': 'A germinated seedling can still encounter resource shortages, damage or unsuitable conditions. Reaching an early endpoint cannot guarantee survival through all later stages.'
    }
  };
  global.BIO_EXAM_TOPIC_RATIONALES = Object.assign(global.BIO_EXAM_TOPIC_RATIONALES || {}, topics);
  global.BIO_EXAM_CHECKPOINT_RATIONALES = Object.assign(global.BIO_EXAM_CHECKPOINT_RATIONALES || {}, checkpoints);
})(window);
