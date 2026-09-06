"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  Dna,
  Eye,
  Focus,
  Hand,
  Layers3,
  Maximize2,
  Microscope,
  MousePointer2,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { HeartIllustration } from "./HeartIllustration";

const FAQS = [
  [
    "Can I just open it and start?",
    "Yes. The core lab is free to use and does not require an account. Choose mouse controls or the accessible 2D atlas, then choose your practical inside the lab.",
  ],
  [
    "Do I need a powerful computer or a headset?",
    "No headset or gloves. Use a modern browser with mouse, touch, or keyboard controls. The 2D structure atlas is an alternative to the spatial 3D view. Optional hand controls use your webcam after you grant permission.",
  ],
  [
    "What can I actually explore?",
    "Five practicals: human heart, flower anatomy, animal cell, plant cell, and compound microscope. Open anatomical layers in the heart and flower, explore cell organelles, and identify microscope components. Each practical includes guided steps and written questions.",
  ],
  [
    "Does this replace a real laboratory?",
    "No. Use it to prepare, investigate, and revisit ideas. Physical practicals still teach material handling, real-world technique, and the variability of biological specimens. The digital models are educational approximations.",
  ],
  [
    "How does the tutor work?",
    "The tutor starts from the selected structure and practical content. Local explanations work without an AI key; optional connected AI responses are labelled separately. Tutor responses and illustrations should not be treated as clinically validated advice.",
  ],
];

export function Landing() {
  return (
    <div className="landing-page">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <header className="landing-nav-wrap">
        <nav
          className="landing-nav section-shell"
          aria-label="Primary navigation"
        >
          <Link
            href="/"
            className="landing-brand"
            aria-label="Biology Entelloq home"
          >
            <span className="brand-symbol">
              <Dna size={23} />
            </span>
            <span>
              Biology <strong>Entelloq</strong>
              <small>THE LIVING LABORATORY</small>
            </span>
          </Link>
          <div className="landing-nav__links">
            <a href="#how-it-works">The experience</a>
            <a href="#practicals">Lab collection</a>
            <a href="#science">Our approach</a>
          </div>
          <Link prefetch={false} href="/lab" className="button button--nav">
            Enter the lab <ArrowUpRight size={16} />
          </Link>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero-section section-shell">
          <div className="hero-copy">
            <p className="landing-eyebrow">
              <span className="status-dot" /> Curiosity has a new playground
            </p>
            <h1>
              <span>Don’t just study life.</span> <em>Step inside it.</em>
            </h1>
            <p className="hero-lede">
              Dissect a heart. Take apart a flower. Explore a cell.
              <br className="desktop-break" /> Turn “I’ve read this” into{" "}
              <strong>“I understand this.”</strong>
            </p>
            <div className="hero-actions">
              <Link prefetch={false} href="/lab" className="button button--primary">
                Explore a dissection <ArrowUpRight size={19} />
              </Link>
              <a href="#how-it-works" className="button button--quiet">
                Try it below <ArrowDown size={16} />
              </a>
            </div>
            <p className="hero-reassurance">
              <Check size={14} /> Free to explore <span /> No account needed{" "}
              <span /> Just your browser
            </p>
          </div>
          <figure className="hero-art">
            <div className="hero-art__orbit" aria-hidden="true" />
            <Image
              src="/images/biology-heart-hero.webp"
              alt="Conceptual anatomical heart illustration with detailed vessels and a soft emerald rim light"
              width={1254}
              height={1254}
              sizes="(max-width: 760px) 100vw, 55vw"
              loading="eager"
              fetchPriority="high"
            />
            <div className="hero-art__coordinate">
              <span>01 / HUMAN ANATOMY</span>
              <span>THE HEART</span>
            </div>
            <div className="hero-art__note">
              <span className="crosshair" aria-hidden="true" />
              Small structure.
              <br />
              <strong>Extraordinary system.</strong>
            </div>
            <figcaption>
              Conceptual artwork{" "}
              <span>
                Interactive model inside the lab <ArrowUpRight size={12} />
              </span>
            </figcaption>
          </figure>
          <div className="hero-footnote">
            <span>
              Made for the moment
              <br />
              <strong>biology starts making sense.</strong>
            </span>
            <a
              href="#how-it-works"
              aria-label="Discover the learning experience"
            >
              <ArrowDown size={19} />
            </a>
            <span>OBSERVE / QUESTION / UNDERSTAND</span>
          </div>
        </section>

        <div
          className="proof-strip section-shell"
          aria-label="What is inside the lab"
        >
          <div>
            <strong>
              05<span> practicals</span>
            </strong>
            <p>From whole organs to cell organelles</p>
          </div>
          <div>
            <strong>
              50<span> structures</span>
            </strong>
            <p>Each with something to discover</p>
          </div>
          <div>
            <strong>
              04<span> study modes</span>
            </strong>
            <p>Explore, guided, practice, assessment</p>
          </div>
          <div>
            <strong>
              Your<span> pace</span>
            </strong>
            <p>Revisit, undo, and try again</p>
          </div>
        </div>

        <section id="how-it-works" className="content-section section-shell">
          <div className="section-heading">
            <div>
              <p className="landing-kicker">
                01 — A different kind of learning
              </p>
              <h2>
                The moment you see it.
                <br />
                <em>The moment it clicks.</em>
              </h2>
            </div>
            <p>
              Biology gets interesting when you stop collecting labels and start
              asking why. Here’s a small taste.
            </p>
          </div>
          <InvestigationPreview />
          <div className="experience-steps">
            <div>
              <span>01</span>
              <p>
                <strong>Look closer.</strong> Find the structure.
              </p>
            </div>
            <div>
              <span>02</span>
              <p>
                <strong>Make a prediction.</strong> Commit to an idea.
              </p>
            </div>
            <div>
              <span>03</span>
              <p>
                <strong>Connect the why.</strong> Learn from the explanation.
              </p>
            </div>
          </div>
        </section>

        <section id="practicals" className="collection-section content-section">
          <div className="section-shell">
            <div className="section-heading">
              <div>
                <p className="landing-kicker">02 — The lab collection</p>
                <h2>
                  One world.
                  <br />
                  <em>Five ways in.</em>
                </h2>
              </div>
              <div>
                <p>
                  Follow your curiosity from the architecture of a heartbeat to
                  the machinery inside a cell.
                </p>
                <Link prefetch={false} href="/lab" className="text-link">
                  Choose a practical in the lab <ArrowUpRight size={17} />
                </Link>
              </div>
            </div>
            <div className="collection-grid">
              <article className="specimen-card specimen-card--heart">
                <div className="specimen-card__top">
                  <span>01 / HUMAN PHYSIOLOGY</span>
                  <span className="specimen-tag">Flagship practical</span>
                </div>
                <div className="collection-heart">
                  <HeartIllustration layer="interior" />
                </div>
                <div className="specimen-card__copy">
                  <span>13 structures · guided dissection</span>
                  <h3>The human heart</h3>
                  <p>
                    Open its chambers. Find its valves. Connect muscular form to
                    the job of moving blood.
                  </p>
                  <Link prefetch={false} href="/lab" className="text-link">
                    Enter the laboratory <ArrowUpRight size={17} />
                  </Link>
                </div>
              </article>
              <SpecimenCard
                kind="flower"
                number="02"
                discipline="BOTANY"
                title="Flower anatomy"
                detail="9 structures · explore reproduction"
                body="Take apart a flower, one structure at a time."
              />
              <SpecimenCard
                kind="animal"
                number="03"
                discipline="CELL BIOLOGY"
                title="Animal cell"
                detail="9 structures · explore organelles"
                body="Meet the machinery behind a living cell."
              />
              <SpecimenCard
                kind="plant"
                number="04"
                discipline="CELL BIOLOGY"
                title="Plant cell"
                detail="7 structures · compare cell types"
                body="Discover what makes a plant cell different."
              />
              <SpecimenCard
                kind="microscope"
                number="05"
                discipline="LAB TECHNIQUE"
                title="The microscope"
                detail="12 structures · know your instrument"
                body="Get familiar with the parts before the bench."
              />
            </div>
            <p className="collection-note">
              <MousePointer2 size={14} /> All five practicals are available in
              the selector at the top of the lab.
            </p>
          </div>
        </section>

        <section className="content-section section-shell product-section">
          <div className="section-heading">
            <div>
              <p className="landing-kicker">03 — Built for your curiosity</p>
              <h2>
                Less watching.
                <br />
                <em>More figuring it out.</em>
              </h2>
            </div>
            <p>
              Your next question belongs right beside the structure that sparked
              it.
            </p>
          </div>
          <div className="learning-grid">
            <TutorPreview />
            <article className="control-card">
              <div className="control-card__visual" aria-hidden="true">
                <span className="control-orbit" />
                <Hand size={70} strokeWidth={1} />
                <span className="control-point control-point--one" />
                <span className="control-point control-point--two" />
                <div>
                  <MousePointer2 size={20} />
                  <span />
                  <Hand size={20} />
                  <span />
                  <Eye size={20} />
                </div>
              </div>
              <p className="landing-kicker">Find your way in</p>
              <h3>
                Your mouse.
                <br />
                Your hands. Your choice.
              </h3>
              <p>
                Use familiar controls, try optional webcam hand tracking, or
                explore the keyboard-friendly 2D structure atlas.
              </p>
              <span className="feature-note">
                No headset. No special gloves.
              </span>
            </article>
            <article className="progress-card">
              <div>
                <p className="landing-kicker">
                  Understanding takes another look
                </p>
                <h3>
                  A wrong turn is
                  <br />
                  <em>part of the practical.</em>
                </h3>
                <p>
                  Undo an action. Reveal another layer. Revisit a question. Your
                  current practical is saved in this browser, so you can pick it
                  up again.
                </p>
              </div>
              <div
                className="progress-example"
                aria-label="Example practical learning sequence"
              >
                <span>THE INVESTIGATION LOOP</span>
                <p>
                  <Check size={16} /> Identify the structure{" "}
                  <small>Observe</small>
                </p>
                <p>
                  <Eye size={16} /> Look beneath the surface{" "}
                  <small>Investigate</small>
                </p>
                <p>
                  <BookOpen size={16} /> Explain what you found{" "}
                  <small>Reflect</small>
                </p>
                <div>
                  <RotateCcw size={15} /> A second look is always welcome.
                </div>
              </div>
            </article>
          </div>
          <div className="real-lab-heading">
            <span className="status-dot" />
            <span>
              Not just a beautiful idea. An actual place to investigate.
            </span>
            <Link prefetch={false} href="/lab">
              Open the workspace <ArrowUpRight size={16} />
            </Link>
          </div>
          <figure className="workspace-preview">
            <div className="workspace-preview__bar">
              <span>
                <i />
                <i />
                <i />
              </span>
              <span>Biology Entelloq / the laboratory</span>
              <Maximize2 size={13} />
            </div>
            <Image
              src="/images/lab-workspace.webp"
              alt="The actual Biology Entelloq workspace: a 3D heart, structure controls, guided practical panel, and tool tray"
              width={1280}
              height={720}
              sizes="(max-width: 760px) 100vw, 1200px"
            />
            <figcaption>
              Actual app screenshot · simplified educational models · 2D atlas
              also available
            </figcaption>
          </figure>
        </section>

        <section id="science" className="science-section">
          <div className="section-shell science-grid">
            <div>
              <p className="landing-kicker">Curiosity, with a foundation</p>
              <h2>
                Ask bold questions.
                <br />
                <em>Keep the sources close.</em>
              </h2>
              <p>
                Beautiful models invite a closer look. Clear explanations make
                that look worthwhile. The heart content draws on open anatomy
                references; tutor responses are kept distinct from practical
                content.
              </p>
              <p className="science-caveat">
                Models and illustrations are educational approximations, not
                clinical references. This lab complements—not replaces—physical
                practicals.
              </p>
            </div>
            <div className="source-panel">
              <ShieldCheck size={28} />
              <span>HEART CONTENT REFERENCES</span>
              <a
                href="https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy"
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  <strong>OpenStax</strong>
                  <small>Anatomy & Physiology 2e · Heart Anatomy</small>
                </span>
                <ArrowUpRight size={18} />
              </a>
              <a
                href="https://www.ncbi.nlm.nih.gov/books/NBK470256/"
                target="_blank"
                rel="noreferrer"
              >
                <span>
                  <strong>NCBI Bookshelf</strong>
                  <small>Anatomy, Thorax, Heart</small>
                </span>
                <ArrowUpRight size={18} />
              </a>
              <p>
                Open the references. Follow the explanation. Bring your
                questions.
              </p>
            </div>
          </div>
        </section>
        <section className="content-section section-shell faq-section">
          <div>
            <p className="landing-kicker">Before you step inside</p>
            <h2>
              Good questions.
              <br />
              <em>Straight answers.</em>
            </h2>
          </div>
          <div className="faq-list">
            {FAQS.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="final-cta section-shell">
          <p className="landing-kicker">There is a whole world in here.</p>
          <h2>
            Make room for
            <br />
            <em>your next “aha.”</em>
          </h2>
          <p>
            The heart is a good place to start.
            <br />
            Your curiosity can take it from there.
          </p>
          <Link prefetch={false} href="/lab" className="button button--primary">
            Explore a dissection <ArrowUpRight size={19} />
          </Link>
          <span>Free to explore. Ready when you are.</span>
          <Dna
            className="final-cta__dna"
            size={250}
            strokeWidth={0.7}
            aria-hidden="true"
          />
        </section>
      </main>
      <footer className="landing-footer section-shell">
        <div className="footer-top">
          <Link href="/" className="landing-brand">
            <span className="brand-symbol">
              <Dna size={23} />
            </span>
            <span>
              Biology <strong>Entelloq</strong>
            </span>
          </Link>
          <p>For the beautifully curious.</p>
          <div>
            <Link prefetch={false} href="/lab">Laboratory</Link>
            <a href="#science">Sources</a>
            <a href="#main-content">
              Back to top <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
        <div className="footer-wordmark" aria-hidden="true">
          ENTELLOQ<span>✳</span>
        </div>
        <div className="footer-bottom">
          <span>Understanding life through investigation.</span>
          <span>Made for a closer look.</span>
        </div>
      </footer>
    </div>
  );
}

type PreviewLayer = "surface" | "flow" | "interior";

function InvestigationPreview() {
  const [layer, setLayer] = useState<PreviewLayer>("interior");
  const [answer, setAnswer] = useState<"correct" | "incorrect" | null>(null);
  const descriptions = {
    surface:
      "Start outside. Notice the vessels branching across the muscular surface.",
    flow: "Two connected circuits: right heart to lungs, left heart to body.",
    interior:
      "Look inside. Compare the two ventricular walls and ask what each has to do.",
  };
  return (
    <section className="investigation" aria-label="Try a heart investigation">
      <div className="investigation__stage">
        <div className="demo-topline">
          <span>
            <span className="status-dot" /> AN INTERACTIVE FIRST LOOK
          </span>
          <span>HUMAN HEART / 01</span>
        </div>
        <div className="demo-specimen">
          <div className="demo-orbit" aria-hidden="true" />
          <HeartIllustration layer={layer} />
          <span className="demo-annotation">
            Left ventricle
            <span />
          </span>
          <span className="demo-orientation">
            ANTERIOR VIEW
            <br />
            Anatomical left is on your right
          </span>
        </div>
        <div className="layer-controls" role="group" aria-label="Anatomy layer">
          {(["surface", "flow", "interior"] as const).map((item) => (
            <button
              type="button"
              key={item}
              aria-pressed={layer === item}
              onClick={() => setLayer(item)}
            >
              {item === "surface" ? (
                <Focus size={15} />
              ) : item === "flow" ? (
                <ArrowRight size={15} />
              ) : (
                <Layers3 size={15} />
              )}
              {item === "surface"
                ? "Surface"
                : item === "flow"
                  ? "Blood flow"
                  : "Inside"}
            </button>
          ))}
        </div>
        <p className="demo-caption" aria-live="polite">
          {descriptions[layer]}
        </p>
      </div>
      <div className="investigation__question">
        <span className="question-label">YOUR FIRST INVESTIGATION</span>
        <div className="question-progress" aria-hidden="true">
          <i />
          <i className={answer ? "is-complete" : ""} />
          <i className={answer ? "is-complete" : ""} />
        </div>
        <p className="landing-kicker">Notice the difference?</p>
        <h3>Why is the left ventricular wall thicker?</h3>
        <p>
          Both ventricles pump blood. But they don’t face the same challenge.
          Make a prediction.
        </p>
        <div className="answer-options">
          <button
            type="button"
            aria-pressed={answer === "correct"}
            onClick={() => setAnswer("correct")}
          >
            <span aria-hidden="true">A</span>It pumps blood around the whole
            body
            <ArrowUpRight size={15} />
          </button>
          <button
            type="button"
            aria-pressed={answer === "incorrect"}
            onClick={() => setAnswer("incorrect")}
          >
            <span aria-hidden="true">B</span>It holds more blood
            <ArrowUpRight size={15} />
          </button>
        </div>
        <div className="answer-feedback" role="status">
          {answer ? (
            <>
              <strong>
                {answer === "correct"
                  ? "Exactly. Structure follows function."
                  : "Not quite. Think pressure, not capacity."}
              </strong>
              <p>
                The left ventricle generates the higher pressure needed for
                systemic circulation. Its thicker muscular wall supports that
                work; the right ventricle pumps through the lower-pressure lung
                circuit.
              </p>
              <button type="button" onClick={() => setAnswer(null)}>
                <RotateCcw size={13} /> Try again
              </button>
            </>
          ) : (
            <p>
              <Sparkles size={15} /> Your prediction comes before the
              explanation.
            </p>
          )}
        </div>
        <p className="demo-disclaimer">
          A short illustrative activity, not a scored assessment.
          <br />
          Based on the heart practical’s structure–function explanation.
        </p>
      </div>
    </section>
  );
}

const TUTOR_EXAMPLES = {
  Simplify: {
    title: "Think of two pumps with different jobs.",
    body: "The right ventricle sends blood to the lungs. The left sends it around the body. The left needs more force, so its muscular wall is thicker.",
  },
  Connect: {
    title: "A muscle’s structure reflects its workload.",
    body: "The heart connects muscular tissue to circulation: contracting muscle creates pressure, and that pressure moves blood through vessels.",
  },
  "Test me": {
    title: "Follow one drop of blood.",
    body: "It has just returned from the lungs. Which side of the heart receives it—and which ventricle will send it to the rest of the body?",
  },
};

function TutorPreview() {
  const [mode, setMode] = useState<keyof typeof TUTOR_EXAMPLES>("Simplify");
  return (
    <article className="tutor-card">
      <div className="tutor-card__head">
        <span className="tutor-symbol">
          <Sparkles size={21} />
        </span>
        <span>
          Curiosity, in conversation<small>CONTEXT: LEFT VENTRICLE</small>
        </span>
      </div>
      <h3>
        A label is just
        <br />
        the start of a question.
      </h3>
      <p>
        Ask for the simpler version. Find a connection. Test an idea. Keep the
        explanation beside what you’re exploring.
      </p>
      <div
        className="tutor-modes"
        role="group"
        aria-label="Tutor thinking mode"
      >
        {(
          Object.keys(TUTOR_EXAMPLES) as Array<keyof typeof TUTOR_EXAMPLES>
        ).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={mode === item}
            onClick={() => setMode(item)}
          >
            {item}
            <ArrowUpRight size={13} />
          </button>
        ))}
      </div>
      <div className="tutor-example" data-testid="tutor-example" role="status">
        <Sparkles size={15} />
        <div>
          <strong>{TUTOR_EXAMPLES[mode].title}</strong>
          <p>{TUTOR_EXAMPLES[mode].body}</p>
        </div>
      </div>
      <span className="feature-note">Illustrative example — not live AI</span>
    </article>
  );
}

type SketchKind = "flower" | "animal" | "plant" | "microscope";

function SpecimenCard({
  kind,
  number,
  discipline,
  title,
  detail,
  body,
}: {
  kind: SketchKind;
  number: string;
  discipline: string;
  title: string;
  detail: string;
  body: string;
}) {
  return (
    <article className={`specimen-card specimen-card--${kind}`}>
      <div className="specimen-card__top">
        <span>
          {number} / {discipline}
        </span>
      </div>
      <SpecimenSketch kind={kind} />
      <div className="specimen-card__copy">
        <span>{detail}</span>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </article>
  );
}

function SpecimenSketch({ kind }: { kind: SketchKind }) {
  if (kind === "microscope")
    return (
      <div className="specimen-sketch microscope-sketch" aria-hidden="true">
        <Microscope size={150} strokeWidth={0.7} />
        <span />
        <i />
      </div>
    );
  return (
    <svg
      className={`specimen-sketch specimen-sketch--${kind}`}
      viewBox="0 0 260 180"
      fill="none"
      aria-hidden="true"
    >
      {kind === "flower" ? (
        <>
          <path
            d="M130 163V88M130 145C109 122 90 134 85 119C113 113 124 124 130 139M131 127C149 101 164 115 177 95C146 90 135 105 131 120"
            stroke="#7abd7a"
            strokeWidth="2"
            fill="#254e32"
          />
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse
              key={angle}
              cx="130"
              cy="52"
              rx="26"
              ry="39"
              transform={`rotate(${angle} 130 86)`}
              fill="#9b728b"
              fillOpacity=".65"
              stroke="#e6b1cd"
              strokeOpacity=".65"
            />
          ))}
          <circle cx="130" cy="86" r="20" fill="#bdb56d" />
          <circle cx="130" cy="86" r="13" fill="#504629" />
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <circle
              key={angle}
              cx="130"
              cy="77"
              r="2"
              fill="#e9d49c"
              transform={`rotate(${angle} 130 86)`}
            />
          ))}
        </>
      ) : (
        <>
          <path
            d={
              kind === "animal"
                ? "M41 89C30 42 72 17 128 25C180 11 228 43 221 96C229 143 181 164 129 150C81 164 36 140 41 89Z"
                : "M50 25Q130 8 212 28L222 145Q136 172 41 144Z"
            }
            fill={kind === "animal" ? "#263f42" : "#193b29"}
            stroke={kind === "animal" ? "#6ca6ac" : "#75b883"}
            strokeWidth="3"
          />
          <path
            d={
              kind === "animal"
                ? "M49 89C41 45 76 26 128 34C179 22 216 49 212 96C218 137 177 153 129 142C81 152 43 132 49 89Z"
                : "M58 34Q130 19 204 37L213 136Q135 158 50 136Z"
            }
            stroke="#a1c6ad"
            strokeOpacity=".3"
          />
          <ellipse
            cx={kind === "animal" ? 126 : 96}
            cy="88"
            rx="32"
            ry="29"
            fill="#635873"
            stroke="#b4a0c4"
          />
          <circle
            cx={kind === "animal" ? 126 : 96}
            cy="87"
            r="12"
            fill="#ae86b0"
          />
          {kind === "plant" && (
            <path
              d="M138 51C198 34 200 107 176 126C142 143 137 97 138 51Z"
              fill="#407e78"
              stroke="#7eb5a0"
            />
          )}
          <path
            d="M70 61C61 47 91 43 96 55C101 68 78 74 70 61ZM167 127C157 113 180 106 187 119C194 134 175 139 167 127Z"
            fill={kind === "animal" ? "#a17468" : "#5e9666"}
            stroke="#bbbaa0"
          />
          <path
            d="M74 59L84 56L82 64M172 123L183 118L179 131M107 130C109 111 135 117 141 110M110 137C116 120 141 127 149 116"
            stroke="#d1b8a0"
            strokeOpacity=".6"
            strokeWidth="2"
          />
          {[
            [67, 108],
            [181, 55],
            [192, 85],
            [148, 43],
            [96, 110],
            [156, 145],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="2.3" fill="#c6c397" />
          ))}
        </>
      )}
    </svg>
  );
}
