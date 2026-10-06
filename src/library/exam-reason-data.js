/* Worked explanations for the three guided cases. Diagrams show causal links,
 * not measured curves; the original questions and grading remain authoritative. */
(function (global) {
  'use strict';
  const altitude = {title:'Acclimatisation: sensor → signal → effector',steps:[
    ['Lower inspired oxygen pressure','At altitude, lower atmospheric pressure reduces oxygen partial pressure.'],
    ['Kidney oxygen sensing','Reduced local oxygen availability increases the stimulus for EPO production.'],
    ['EPO → bone marrow','The circulating hormone stimulates red-cell production.'],
    ['More haemoglobin capacity','Increased red-cell mass can support tissue oxygen delivery.']
  ],note:'Negative feedback: improved kidney oxygenation reduces the stimulus for EPO. The response unfolds over time and does not make mountain air richer in oxygen.'};
  const resistance = {title:'Selection changes population composition',steps:[
    ['Before treatment','Susceptible bacteria are common; inherited resistance is already rare but present.'],
    ['Antibiotic selection','Susceptible bacteria are inhibited more strongly than resistant bacteria.'],
    ['Survival and reproduction','Resistant survivors contribute disproportionately to subsequent generations.'],
    ['After selection','Resistance is more frequent in the population; the same drug is less effective.']
  ],note:'This is a qualitative model, not a count of cells. It describes selection of the pre-existing variant specified in this case; mutation and horizontal transfer can also supply resistance in real populations.'};
  const glucose = {title:'Glucose regulation: the meal response',steps:[
    ['Meal glucose enters blood','Absorption raises blood-glucose concentration.'],
    ['Pancreatic β-cells respond','Insulin secretion rises, with gut and other signals also contributing.'],
    ['Target tissues change fluxes','Muscle and fat uptake rises; storage is favoured and liver glucose output falls.'],
    ['Glucose moves toward its range','The glucose-driven insulin response decreases as the stimulus declines.']
  ],note:'Negative feedback opposes the rise. During low glucose, glucagon and other counter-regulatory responses support liver glucose release; this is not a complete map of every control.'};
  global.BIO_EXAM_WORKOUTS = {
    altitude:{
      principles:{reasons:[
        'The response supports tissue oxygenation despite an environmental disturbance; that is the relevant homeostatic function.',
        'Reduced kidney oxygen availability stimulates a response that can improve oxygen delivery, thereby reducing the original stimulus.',
        'Acclimatisation in one person is a physiological response. This case does not describe inherited variants changing frequency across generations.',
        'Lower oxygen partial pressure affects gas exchange, and haemoglobin in red cells provides most blood oxygen-carrying capacity.',
        'Mature human red cells do not divide. Kidney-to-marrow hormonal signalling increases production of new red cells.'
      ]},
      regulated:{paragraphs:[
        'Oxygen delivery to tissues is the relevant physiological function. Low oxygen availability in kidney tissue increases the signal for red-cell production; greater haemoglobin capacity can then support oxygen delivery.',
        'The number of red cells is part of the response, rather than the ultimate variable defended for its own sake. The distinction is regulated function versus the mechanism used to support it.'
      ],reasons:[
        'Red-cell mass changes as an effector response. A fixed cell count is not the goal when environmental oxygen availability changes.',
        'Adequate oxygen supply is the function supported by the kidney–EPO–marrow response.',
        'Blood pressure has its own interacting controls, but it does not explain the specified erythropoietic response.',
        'The body cannot alter the climber’s altitude; it changes physiology in response to the environment.'
      ]},
      form:{paragraphs:[
        'Specialised kidney cells respond to reduced oxygen availability by increasing erythropoietin secretion. EPO circulates to bone marrow and stimulates the development of red-cell precursors.',
        'This links three distinct roles: the kidney detects local oxygen availability, a hormone carries the signal, and marrow supplies the cells that increase blood haemoglobin capacity.'
      ],reasons:[
        'The lungs exchange gases; they do not directly manufacture the circulating red cells or their haemoglobin.',
        'This correctly links the kidney sensor, circulating EPO signal and marrow effector.',
        'Increased pumping can affect delivery, but the heart does not manufacture red cells.',
        'Muscle cells do not convert into red cells in this acclimatisation response.'
      ],diagram:altitude},
      strategy:{paragraphs:[
        'Start with the measured change and build a testable causal chain: reduced inspired oxygen pressure can lower kidney tissue oxygen availability, EPO rises, and marrow erythropoiesis increases. Each step has a biological mechanism.',
        'To support this explanation, measurements across time could relate oxygenation, EPO and total red-cell mass. The case specifies total mass, avoiding the mistake of treating a concentration increase caused only by lower plasma volume as new red-cell production.'
      ],reasons:[
        'Following stimulus, sensor, hormone and effector produces a mechanism that can be tested.',
        'Saying the body “wants” more cells names a purpose but supplies no signal or cellular mechanism.',
        'Measurement error is possible in general, but dismissing the specified change does not evaluate the established hypoxia response.'
      ]},
      reason:{answer:'The rise in red-cell mass is consistent with hypoxia-driven erythropoiesis during acclimatisation.',paragraphs:[
        'At high altitude, atmospheric pressure is lower, so inspired oxygen partial pressure falls even though the oxygen fraction of air remains similar. Reduced kidney tissue oxygen availability stimulates increased erythropoietin secretion. EPO travels in blood to bone marrow, where it increases production of red cells over time.',
        'The resulting increase in total red-cell mass raises haemoglobin-carrying capacity and can help sustain tissue oxygen delivery. As kidney oxygenation improves, the drive for further EPO secretion declines. This closes a negative-feedback loop because the response reduces the stimulus that initiated it.'
      ],diagram:altitude,note:'An elevated red-cell concentration alone would not establish increased total red-cell mass: reduced plasma volume can also raise concentration. Ventilation and circulation contribute to acclimatisation too.'}
    },
    resistance:{
      principles:{reasons:[
        'The initial test already detects more than one inherited variant, including rare resistance. Selection requires such differences.',
        'The drug suppresses susceptible bacteria more strongly, so resistant cells contribute more descendants.',
        'Resistance must be transmitted for resistant descendants to become common over generations.',
        'Effort is not a heritable molecular mechanism; populations evolve through differences in survival and reproduction.',
        'The useful variant was detected before treatment. Antibiotic exposure selects among variants rather than teaching a needed sequence.'
      ]},
      regulated:{paragraphs:[
        'The antibiotic acts as a selection pressure. Because the variant was already present, resistant bacteria survive or reproduce better under treatment than susceptible bacteria.',
        'Their descendants make up a larger fraction of the population, so the resistance frequency rises. A change in frequency does not require every original bacterium to change its own genotype.'
      ],reasons:[
        'The result is differential success among variants, not uniform strengthening of every bacterium.',
        'This matches the evidence of pre-existing resistance followed by an increased frequency after treatment.',
        'The observation does not require new resistance genes: a resistant variant was already detected.',
        'A possible effect on an individual metabolic pathway is not the population-level mechanism demonstrated here.'
      ]},
      form:{paragraphs:[
        'A heritable molecular change can reduce the effect of an antibiotic: the target may bind the drug less effectively, an efflux system may remove it, or an enzyme may inactivate it. The relevant phenotype arises from a physical molecular mechanism.',
        'The case does not identify which mechanism applies, so a full answer should give these as possibilities, then link inheritance of the variant to the resistant descendants.'
      ],reasons:[
        'Intention does not create a molecular resistance mechanism or explain inheritance.',
        'Inherited variants can alter targets, transport or drug degradation and thereby reduce susceptibility.',
        'The patient’s immune system can affect bacterial survival, but it is not the inherited bacterial resistance variant detected here.',
        'The drug does not reproduce and evolve as a bacterial genotype; the measured variant is in the bacteria.'
      ]},
      strategy:{paragraphs:[
        'Compare the frequency of the inherited resistance variant before and after treatment, then explain the difference through survival and reproduction. The key evidence is that the variant was present at low frequency before selection.',
        'A stronger investigation would compare exposed and unexposed populations, verify inheritance, and measure differential growth or survival. Those tests separate a selection explanation from a claim about a single cell’s immediate response.'
      ],reasons:[
        'Tracking frequencies connects individual differences in success to evolution of the whole population.',
        'An immediate cellular response alone does not explain inherited variant frequencies across generations.',
        'Mutation is not directed toward future need. Selection can favour useful variants without specifying their DNA sequence.'
      ]},
      reason:{answer:'Natural selection increased the frequency of the pre-existing resistant variant.',paragraphs:[
        'Before treatment, the population contained heritable variation: most bacteria were susceptible, while a resistant variant was rare. The antibiotic inhibited or killed susceptible bacteria more strongly. Resistant survivors therefore made a disproportionate contribution to later generations and passed the resistance variant to descendants.',
        'As resistant descendants became more common, the population responded less well to the same antibiotic. This is evolution through differential survival and reproduction: the population’s composition changed, rather than every bacterium learning to resist.'
      ],diagram:resistance,note:'This evidence supports selection of an existing variant in the simplified case. Mutation and horizontal gene transfer can supply additional variation during real infections, and treatment failure can have other causes.'}
    },
    glucose:{
      principles:{reasons:[
        'The concentration fluctuates but is regulated within a physiological range; homeostasis allows controlled variation.',
        'The insulin response promotes changes that oppose the initial rise, so the feedback is negative.',
        'Insulin and glucagon have important opposing effects on liver glucose handling, helping respond to high and low glucose.',
        'Movement down a gradient cannot by itself account for regulated transport, storage and liver glucose production.',
        'Insulin secretion responds dynamically to nutrients and other signals; it does not remain constant across a meal.'
      ]},
      regulated:{paragraphs:[
        'The regulated variable is blood-glucose concentration. Insulin secretion is one adjustable control: after a meal, it helps coordinate uptake, storage and suppression of liver glucose output.',
        'Distinguish a changing signal from the variable it helps regulate. Insulin is allowed to rise and fall precisely because its action supports glucose regulation.'
      ],reasons:[
        'Insulin is an adjustable hormonal signal, not the concentration being defended in this question.',
        'The observed disturbance and recovery concern blood-glucose concentration.',
        'The size of the eaten meal is an input, not a variable insulin can retrospectively change.',
        'Stomach acidity is controlled by other mechanisms and is not the measured variable in the scenario.'
      ]},
      form:{paragraphs:[
        'Pancreatic β-cells increase insulin secretion in response to glucose, with gut hormones and other signals modifying the response. Insulin increases GLUT4-mediated uptake in skeletal muscle and fat, favours storage and reduces liver glucose output.',
        'The liver can store glucose as glycogen, but it does not use insulin-induced GLUT4 translocation for glucose entry. This distinction prevents a simplified “insulin opens every cell” explanation.'
      ],reasons:[
        'The liver is an important target of insulin; pancreatic β-cells are its source.',
        'This is the best cell-to-hormone-to-target link, with the different liver and muscle transport mechanisms distinguished in the explanation.',
        'Red cells use glucose but are not the insulin-secreting sensor or the primary regulated storage mechanism here.',
        'Brain glucose use is important, but increased brain fuel use alone is not the feedback pathway described.'
      ],diagram:glucose},
      strategy:{paragraphs:[
        'Follow the increase in concentration to a change in secretion, then to altered glucose fluxes. Insulin promotes uptake and storage and reduces liver production, helping the concentration move back toward its usual range.',
        'Complete the feedback explanation: as the glucose stimulus declines, the meal-related insulin response also declines. A response is negative feedback because it opposes the initiating change, not because insulin is somehow harmful.'
      ],reasons:[
        'This supplies the stimulus, hormonal response, effector changes and reduction of the original stimulus.',
        'Ongoing glucose use contributes, but ignoring regulated uptake and liver output omits the control mechanism.',
        'A fixed insulin level cannot describe the changing meal response; basal secretion and changing stimulated secretion are distinct.'
      ]},
      reason:{answer:'A dynamic insulin response helps oppose the meal-related rise in blood glucose through negative feedback.',paragraphs:[
        'Digestion and absorption add glucose to the blood. Pancreatic β-cells respond with increased insulin secretion, influenced also by gut and neural signals. Insulin promotes glucose uptake in muscle and fat, favours glycogen storage, and suppresses hepatic glucose production, helping reduce blood-glucose concentration.',
        'As glucose moves toward its physiological range, the glucose-driven insulin response declines, while basal secretion can continue. This is negative feedback because the effects of the response reduce the original rise. During low glucose, glucagon and other counter-regulatory mechanisms instead support liver glucose release and production.'
      ],diagram:glucose,note:'Regulation does not require an exactly fixed glucose value or the same timetable for every meal. The liver uses GLUT2 rather than insulin-regulated GLUT4 for glucose entry, and a two-hormone model omits other controls.'}
    }
  };
  global.BIO_EXAM_REASON = {
    enzymes:{paragraphs:[
      'The initial-rate pattern is consistent with substrate saturation of the available enzyme. When many active sites are already occupied, adding more substrate causes little further increase in rate. Adding enzyme increases the number of catalytic sites, allowing more reaction cycles per unit time.',
      'For a simple Michaelis–Menten system at saturating substrate, v approaches Vmax and Vmax = kcat[E]total. Increasing enzyme therefore increases capacity, provided substrate and other conditions remain adequate. The paired observations support this interpretation more strongly than a plateau alone.'
    ],diagram:{title:'Why additional enzyme can raise the rate',steps:[['High substrate, fixed enzyme','Most available catalytic sites are occupied.'],['More substrate alone','Little spare enzyme capacity remains, so the rate changes little.'],['More active enzyme','Additional sites process substrate in parallel and raise the limiting rate.']]},note:'This is a likely explanation, not proof from one measurement. Check initial-rate conditions, enzyme activity, substrate availability, inhibitors and other assay limitations.'}
  };
})(window);
