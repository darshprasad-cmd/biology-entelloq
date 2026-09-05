"use client";

import { useState, type ComponentType } from "react";
import Link from "next/link";
import { HeartIllustration } from "./HeartIllustration";
import {
  ArrowRight,
  BookOpenCheck,
  Boxes,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleGauge,
  Dna,
  Eye,
  FlaskConical,
  Focus,
  GraduationCap,
  Hand,
  HeartPulse,
  Layers3,
  Microscope,
  MousePointer2,
  School,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

const HOW = [
  { number: "01", title: "Orient the specimen", body: "Start with objectives, prior knowledge, ethics, and a clear anatomical frame of reference." },
  { number: "02", title: "Investigate in layers", body: "Rotate, inspect, isolate, fade, section, and dissect with every action safely reversible." },
  { number: "03", title: "Prove understanding", body: "Predict before revealing, identify structures, explain relationships, and finish with a viva." },
];

const USE_CASES = [
  { icon: GraduationCap, title: "For students", body: "Move from recognition to explanation with guided practicals and specific feedback." },
  { icon: Users, title: "For teachers", body: "Use a consistent practical structure with visible objectives, sources, and mastery evidence." },
  { icon: School, title: "For schools", body: "Give every learner a repeatable lab experience on ordinary laptops—without extra hardware." },
];

const FAQS = [
  ["Do I need a headset or special hardware?", "No. Biology Entelloq runs in a modern browser. Mouse, touch, keyboard, and optional on-device hand tracking are supported."],
  ["What happens if 3D does not work on my device?", "Every primary task has a structured 2D atlas alternative with the same reviewed explanations and assessment path."],
  ["Is this a replacement for a physical laboratory?", "No. It is a preparation, rehearsal, accessibility, and revision environment. Supervised physical practical work still teaches material handling and real-world technique."],
  ["How is AI used?", "Reviewed curriculum content stays visibly separate. The tutor can rephrase, deepen, connect, or test that approved material and falls back safely when an online model is unavailable."],
  ["Where do the scientific explanations come from?", "Each practical can list its references and asset licences. The heart practical currently cites OpenStax and NCBI Bookshelf."],
];

export function Landing() {
  return (
    <div className="landing-page">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="landing-nav-wrap">
        <nav className="landing-nav" aria-label="Primary navigation">
          <Link href="/" className="landing-brand" aria-label="Biology Entelloq home">
            <span className="landing-brand__mark"><Dna size={19} /></span>
            <span>Biology <strong>Entelloq</strong></span>
          </Link>
          <div className="landing-nav__links" aria-label="Page sections">
            <a href="#how-it-works">How it works</a>
            <a href="#practicals">Practicals</a>
            <a href="#science">Our science</a>
          </div>
          <Link href="/lab" className="button button--nav">Enter the lab <ArrowRight size={15} /></Link>
        </nav>
      </header>

      <main id="main-content">
        <section className="hero-section section-shell">
          <div className="hero-copy">
            <div className="landing-eyebrow"><span /> Your biology lab. Reimagined.</div>
            <h1>Understand living systems.<br /><em>From the inside.</em></h1>
            <p className="hero-lede">
              Go beyond the diagram. Open a heart, follow its vessels, and discover why every structure matters. Your next breakthrough starts with a closer look.
            </p>
            <div className="hero-actions">
              <Link href="/lab" className="button button--primary">Explore a dissection <ArrowRight size={17} /></Link>
              <a href="#how-it-works" className="button button--secondary">See how it works</a>
            </div>
            <div className="trust-row" aria-label="Product capabilities">
              <span><BookOpenCheck size={15} /> Sources visible</span>
              <span><MousePointer2 size={15} /> Mouse, touch & keyboard</span>
              <span><Eye size={15} /> Accessible 2D mode</span>
            </div>
          </div>
          <HeartPreview />
        </section>

        <div className="specimen-rail section-shell" aria-label="Available practicals">
          <span className="specimen-rail__label">One lab. A world to explore.</span>
          <span><HeartPulse size={17} /> Human heart</span>
          <span><FlaskConical size={17} /> Flower anatomy</span>
          <span><Dna size={17} /> Animal & plant cells</span>
          <span><Microscope size={17} /> Microscopy</span>
        </div>

        <section className="problem-band">
          <div className="section-shell problem-grid">
            <div>
              <p className="landing-kicker">The learning problem</p>
              <h2>A diagram shows where.<br />A practical reveals why.</h2>
            </div>
            <p>
              Static notes flatten biology into labels. Real understanding comes from orientation, prediction, observation, and cause-and-effect—especially when a student must explain what changes if a structure fails.
            </p>
            <div className="problem-proof">
              <span className="problem-proof__line" />
              <strong>Built around scientific reasoning</strong>
              <span>Not random clicking. Not completion points.</span>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="content-section section-shell">
          <SectionIntro eyebrow="How it works" title="From first look to lasting understanding" body="A consistent investigation loop reduces cognitive load, so attention stays on the biology." />
          <div className="how-grid">
            {HOW.map((item) => (
              <article key={item.number} className="how-card">
                <span className="how-card__number">{item.number}</span>
                <div className="how-card__icon"><FlaskConical size={19} /></div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="practicals" className="showcase-section">
          <div className="section-shell showcase-grid">
            <div className="showcase-copy">
              <p className="landing-kicker landing-kicker--mint">Virtual dissection</p>
              <h2>Open the heart.<br />Keep the thinking intact.</h2>
              <p>
                The flagship heart practical pairs a manipulable 3D specimen with an ordered scientific procedure, reversible tools, camera presets, reviewed explanations, and a text-first 2D atlas.
              </p>
              <ul className="check-list">
                <li><Check size={15} /> Hide, fade, isolate, section, undo, and reset</li>
                <li><Check size={15} /> Guided, independent, and assessment modes</li>
                <li><Check size={15} /> Mastery tracked per structure—not just completion</li>
              </ul>
              <Link href="/lab" className="text-link">Launch the heart practical <ArrowRight size={15} /></Link>
            </div>
            <div className="showcase-console" aria-label="Virtual lab interface preview">
              <div className="showcase-console__top"><span>Human heart</span><span>Guided investigation · 2 / 6</span></div>
              <div className="showcase-console__stage">
                <div className="showcase-console__tools"><Hand size={15} /><Focus size={15} /><Layers3 size={15} /><Target size={15} /></div>
                <HeartIllustration className="showcase-heart" layer="interior" />
                <div className="showcase-console__label"><span /> Left ventricle</div>
                <div className="showcase-console__prompt"><small>Observation checkpoint</small><strong>Why is this wall thicker?</strong><span>Compare the pressure demands of both circuits.</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="content-section section-shell">
          <SectionIntro eyebrow="More than dissection" title="See processes that paper cannot show" body="Interactive diagrams and concept simulations make invisible relationships visible without adding spectacle for its own sake." />
          <div className="capability-grid">
            <Capability icon={Layers3} title="Layered anatomy" body="Move between external form, vessels, chambers, and internal structures while preserving spatial context." meta="Structure → relationship" />
            <Capability icon={HeartPulse} title="Living processes" body="Trace flow, compare pressure, and connect tissue form to physiological function." meta="Motion with meaning" />
            <Capability icon={Microscope} title="Practical technique" body="Rehearse microscope controls and specimen handling before entering the physical lab." meta="Prepare → perform" />
            <Capability icon={BrainCircuit} title="Connected concepts" body="Ask for a simpler explanation, deeper mechanism, analogy, retrieval check, or system connection." meta="Grounded tutor" />
          </div>
        </section>

        <section className="practice-section">
          <div className="section-shell practice-grid">
            <div className="mastery-card">
              <div className="mastery-card__head"><span>Cardiac anatomy · example</span><strong>Mastery map</strong></div>
              {[["Left ventricle", 92], ["Valves", 74], ["Great vessels", 61], ["Coronary supply", 38]].map(([label, value]) => (
                <div className="mastery-row" key={label as string}>
                  <div><span>{label}</span><strong>{value}%</strong></div>
                  <i><b style={{ width: `${value}%` }} /></i>
                </div>
              ))}
              <div className="mastery-card__note"><Target size={15} /> Next focus: connect coronary supply to myocardial function.</div>
            </div>
            <div className="practice-copy">
              <p className="landing-kicker">Personalised revision</p>
              <h2>Practice what is weak—not what is comfortable.</h2>
              <p>Identification, procedure steps, and explanations contribute differently to mastery. Feedback names the missing idea, then offers a targeted way back in.</p>
              <div className="practice-pills"><span>Structure identification</span><span>Guided procedures</span><span>Viva reflection</span></div>
            </div>
          </div>
        </section>

        <section className="content-section section-shell">
          <SectionIntro eyebrow="One laboratory, three perspectives" title="Useful in class, at home, and before the bench" />
          <div className="use-case-grid">
            {USE_CASES.map((item) => <UseCase key={item.title} {...item} />)}
          </div>
        </section>

        <section id="science" className="science-section">
          <div className="section-shell science-grid">
            <div>
              <div className="science-seal"><ShieldCheck size={23} /></div>
              <p className="landing-kicker landing-kicker--mint">Scientific trust</p>
              <h2>Reviewed content stays reviewed.</h2>
              <p>
                Curriculum explanations, citations, and asset licences belong to the practical itself. Tutor responses are visually distinct and grounded in that approved material, with an offline fallback.
              </p>
            </div>
            <div className="source-card">
              <span className="source-card__tag">Sources shown in the heart practical</span>
              <a href="https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy" target="_blank" rel="noreferrer"><BookOpenCheck size={17} /><span><strong>OpenStax Anatomy & Physiology 2e</strong><small>Heart anatomy · open educational text</small></span><ArrowRight size={14} /></a>
              <a href="https://www.ncbi.nlm.nih.gov/books/NBK470256/" target="_blank" rel="noreferrer"><BookOpenCheck size={17} /><span><strong>NCBI Bookshelf</strong><small>Anatomy, Thorax, Heart</small></span><ArrowRight size={14} /></a>
              <div className="source-card__asset"><Boxes size={16} /><span><strong>No external heart asset</strong><small>Procedural geometry authored in-project</small></span></div>
            </div>
          </div>
        </section>

        <section className="content-section section-shell faq-section">
          <SectionIntro eyebrow="Frequently asked" title="A practical answer to practical questions" />
          <div className="faq-list">
            {FAQS.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}<ChevronDown size={18} /></summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="final-cta section-shell">
          <div className="final-cta__motif" aria-hidden="true"><Dna size={130} /></div>
          <p className="landing-kicker landing-kicker--mint">Your next practical starts here</p>
          <h2>Look closer.<br />Think deeper.</h2>
          <p>Begin with the human heart. Use a mouse, keyboard, touch, or optional hand tracking.</p>
          <Link href="/lab" className="button button--primary button--light">Explore a dissection <ArrowRight size={17} /></Link>
        </section>
      </main>

      <footer className="landing-footer section-shell">
        <div className="landing-brand"><span className="landing-brand__mark"><Dna size={19} /></span><span>Biology Entelloq</span></div>
        <p>Understanding life through investigation.</p>
        <div><Link href="/lab">Laboratory</Link><a href="#science">Sources</a><a href="#main-content">Back to top</a></div>
      </footer>
    </div>
  );
}

type PreviewLayer = "surface" | "flow" | "interior";

function HeartPreview() {
  const [layer, setLayer] = useState<PreviewLayer>("surface");
  const descriptions: Record<PreviewLayer, { title: string; body: string }> = {
    surface: { title: "External anatomy", body: "Orient the apex, chambers, coronary vessels, and great vessels before making an incision." },
    flow: { title: "Double circulation", body: "Trace deoxygenated blood to the lungs, then oxygenated blood through the systemic circuit." },
    interior: { title: "Internal relationships", body: "Reveal valves, chambers, and the septum while keeping their spatial relationships visible." },
  };

  return (
    <div className="hero-preview" aria-label="Interactive heart layer preview">
      <div className="hero-preview__bar"><span><i /> The living laboratory</span><span>SPECIMEN / 01</span></div>
      <div className="hero-preview__stage">
        <div className="preview-specimen-title"><span>Human anatomy</span><strong>The heart</strong></div>
        <span className="preview-orientation" aria-hidden="true">ANTERIOR VIEW <span>↑</span></span>
        <div className="preview-orbit preview-orbit--outer" aria-hidden="true" />
        <div className="preview-orbit preview-orbit--inner" aria-hidden="true" />
        <div className={`preview-heart preview-heart--${layer}`} aria-hidden="true">
          <HeartIllustration layer={layer} />
          <i className="preview-heart__flow preview-heart__flow--one" />
          <i className="preview-heart__flow preview-heart__flow--two" />
        </div>
        <div className="preview-callout preview-callout--one"><span /> Aorta</div>
        <div className="preview-callout preview-callout--two"><span /> Left ventricle</div>
        <div className="preview-status"><CircleGauge size={14} /> Select a layer to look closer</div>
        <svg className="preview-pulse" viewBox="0 0 180 40" fill="none" aria-hidden="true"><path d="M0 22H44L53 17L62 24L73 22L82 5L90 36L99 18L107 22H180" /></svg>
      </div>
      <div className="hero-preview__controls">
        <div className="hero-preview__tabs" role="group" aria-label="Anatomy layer">
          {(["surface", "flow", "interior"] as const).map((item) => (
            <button key={item} type="button" onClick={() => setLayer(item)} aria-pressed={layer === item}>{item === "surface" ? "Surface" : item === "flow" ? "Blood flow" : "Inside"}</button>
          ))}
        </div>
        <div className="hero-preview__copy"><strong>{descriptions[layer].title}</strong><span>{descriptions[layer].body}</span></div>
      </div>
    </div>
  );
}

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="section-intro"><p className="landing-kicker">{eyebrow}</p><h2>{title}</h2>{body && <p>{body}</p>}</div>;
}

function Capability({ icon: Icon, title, body, meta }: { icon: ComponentType<{ size?: number }>; title: string; body: string; meta: string }) {
  return <article className="capability-card"><div><Icon size={20} /></div><h3>{title}</h3><p>{body}</p><span>{meta} <ArrowRight size={13} /></span></article>;
}

function UseCase({ icon: Icon, title, body }: { icon: ComponentType<{ size?: number }>; title: string; body: string }) {
  return <article className="use-case"><Icon size={20} /><h3>{title}</h3><p>{body}</p></article>;
}
