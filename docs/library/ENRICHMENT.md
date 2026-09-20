# Compact concept enrichment

`src/library/learning-cards.js` exports `window.BIO_ENRICHMENT`, keyed by the exact IDs of the 73 published `BIO_LIBRARY.topics`. No enrichment is fabricated for the 175 planned curriculum entries.

The file supplies:

- 73 topic-specific curiosity cards, with bodies of at most 34 words.
- 73 worked examples containing 218 causal reasoning steps. Individual steps are at most 18 words; final answers are at most 19 words.
- 146 additional application, prediction or misconception checkpoints. Combined with the existing quick check, each topic has three distinct practice questions.

Learn displays the curiosity and concise example. The practice bridge consumes the example for progressive Reason work and combines the new checkpoints with the existing question for Solve. Content defines no completion score or mastery claim.

## Data contract

```js
BIO_ENRICHMENT[topicId] = {
  curiosity: {title, body, sourceId /* optional canonical BIO_LIBRARY.sources ID */},
  workedExample: {question, steps: [/* 2–4 short causal steps */], answer},
  checkpoints: [
    {question, options: [/* 3 distinct choices */], answer: 0, explanation},
    {question, options: [/* 3 distinct choices */], answer: 1, explanation}
  ]
};
```

Authoring places the correct option first. The helper deterministically rotates options and recalculates the answer index, balancing correct positions across the library. Learners receive fully materialized question objects; no random answer generation happens at runtime. Incorrect choices emphasize nearby mechanisms and common misconceptions rather than repeating generic distractors.

## Scientific boundaries

Worked examples state their assumptions where these determine the result: ordinary meiosis and mitosis, simple Mendelian dominance, ideal PCR doubling, controlled diffusion comparisons, and an ideal competitive-inhibition model. Explanations distinguish probability from a promised small-sample ratio, oxygen partial pressure from oxygen content, and a targeted DNA cut from a guaranteed editing outcome.

The cards use the concepts and reference registry established in `topics.js`; 37 curiosity cards point directly to existing canonical source IDs. Remaining cards do not attach an unrelated citation just to display a source badge. Biotechnology and stem-cell framing was additionally checked against the [NHGRI PCR fact sheet](https://www.genome.gov/about-genomics/fact-sheets/Polymerase-Chain-Reaction-Fact-Sheet), [NHGRI CRISPR glossary](https://www.genome.gov/genetics-glossary/CRISPR), and [NIH Stem Cell Basics](https://stemcells.nih.gov/info/basics/stc-basics). No clinical treatment instructions or quantitative claims about treatment effectiveness are introduced.

## Validation

Run `node --test tests/library-enrichment.test.cjs`.

The checks require exact published-topic coverage, complete concise cards, unique questions and examples, distinct options, valid answer indices and canonical source IDs, balanced answer positions, and absence of placeholder content. Targeted answer checks protect important science and arithmetic, including DNA strand orientation, transcription, Calvin-cycle carbon bookkeeping, glycolytic net ATP, ideal PCR copy number and the direction of DNA migration in a gel.
