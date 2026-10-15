"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  GraduationCap,
  Trophy,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  ChevronDown,
  ShieldCheck,
  EyeOff,
  Blend,
  Focus,
  BookOpenCheck,
} from "lucide-react";
import { useLab } from "@/lib/engine/store";
import { getPractical } from "@/lib/engine/registry";
import { structureById } from "@/lib/engine/types";
import { askInstructor } from "@/lib/ai/instructor";
import { cn } from "@/lib/utils";

const KIND_STYLE: Record<string, string> = {
  explain: "text-foreground/85",
  hint: "text-cyan-accent",
  warn: "text-rose-accent",
  praise: "text-bio-300",
  system: "text-foreground/70",
  viva: "text-foreground/85",
  user: "text-ink-950",
};

export function InstructorPanel() {
  const practicalId = useLab((s) => s.practicalId);
  const mode = useLab((s) => s.mode);
  const guidedIndex = useLab((s) => s.guidedIndex);
  const advanceGuided = useLab((s) => s.advanceGuided);
  const selectedId = useLab((s) => s.selectedId);
  const identified = useLab((s) => s.identified);
  const completedSteps = useLab((s) => s.completedSteps);
  const mistakes = useLab((s) => s.mistakes);
  const xp = useLab((s) => s.xp);
  const messages = useLab((s) => s.messages);
  const pushMessage = useLab((s) => s.pushMessage);
  const openViva = useLab((s) => s.openViva);
  const hideStructure = useLab((s) => s.hideStructure);
  const fadeStructure = useLab((s) => s.fadeStructure);
  const isolate = useLab((s) => s.isolate);
  const mastery = useLab((s) => s.mastery);

  const p = getPractical(practicalId);
  const selected = structureById(p, selectedId);
  const [q, setQ] = useState("");
  const [pending, setPending] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [messages]);

  const guidedStep = p.guided[guidedIndex];
  const guidedDone = guidedIndex >= p.guided.length;
  const assessmentDone = p.assessment.every((a) =>
    completedSteps.includes(a.id),
  );
  const identifiableCount = useMemo(
    () => new Set(p.structures.map((s) => s.id)).size,
    [p],
  );
  const vivaReady =
    identified.length >= Math.min(4, identifiableCount) || assessmentDone;

  const ask = async (prompt?: string) => {
    const text = (prompt ?? q).trim();
    if (!text || pending) return;
    setQ("");
    pushMessage({ kind: "user", text });
    setPending(true);
    const answer = await askInstructor(text, {
      practical: p,
      mode,
      tool: useLab.getState().tool,
      gesture: useLab.getState().primaryGesture,
      selectedId,
      hoveredId: useLab.getState().hoveredId,
      completedSteps,
      mistakes,
      dissection: useLab.getState().dissection,
    });
    pushMessage({ kind: "explain", text: answer });
    setPending(false);
  };

  return (
    <div className="flex flex-col gap-3 lg:h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bio-500/15 text-bio-300">
            <Sparkles size={16} />
          </span>
          <div>
            <div className="text-sm font-semibold leading-tight">
              AI Instructor
            </div>
            <div className="text-[11px] text-muted">{p.discipline}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex items-center gap-1 rounded-full bg-white/6 px-2 py-1 text-bio-300">
            <Trophy size={12} /> {xp}
          </span>
          {mistakes > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-white/6 px-2 py-1 text-rose-accent">
              <AlertCircle size={12} /> {mistakes}
            </span>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-white/[0.025]">
        <button
          type="button"
          onClick={() => setBriefOpen((value) => !value)}
          aria-expanded={briefOpen}
          className="flex min-h-11 w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
        >
          <span className="flex items-center gap-2 text-xs font-semibold">
            <ShieldCheck size={15} className="text-bio-300" /> Investigation brief
          </span>
          <ChevronDown size={14} className={cn("text-muted transition-transform", briefOpen && "rotate-180")} />
        </button>
        {briefOpen && (
          <div className="border-t border-white/8 px-3.5 pb-3 pt-2 text-[11px] leading-relaxed text-foreground/65">
            <p><strong className="text-foreground/85">Orientation:</strong> {p.orientation ?? "Observe the whole specimen before selecting or separating any structure."}</p>
            <p className="mt-2"><strong className="text-foreground/85">Safety & ethics:</strong> {p.safetyAndEthics ?? "This simulation replaces no required supervised safety training. Treat biological material with care and respect."}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.objectives.slice(0, 3).map((objective) => (
                <span key={objective} className="rounded-full border border-white/8 bg-white/[0.035] px-2 py-1">{objective}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mode-contextual objective */}
      <div className="rounded-2xl glass p-3.5">
        {mode === "guided" && !guidedDone && guidedStep && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wide text-bio-300">
                Step {guidedIndex + 1} / {p.guided.length}
              </span>
              <div className="flex gap-1">
                {p.guided.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 w-3 rounded-full",
                      i <= guidedIndex ? "bg-bio-400" : "bg-white/15",
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="text-sm font-semibold">{guidedStep.title}</div>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground/75">
              {guidedStep.narration}
            </p>
            {guidedStep.action && (
              <div className="mt-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] text-cyan-accent">
                {guidedStep.action}
              </div>
            )}
            {guidedStep.checkpoint && (
              <details className="mt-2 rounded-xl border border-amber-accent/20 bg-amber-accent/[0.05] px-2.5 py-2 text-[11px]">
                <summary className="cursor-pointer font-medium text-amber-accent">
                  {guidedStep.checkpoint.prompt}
                </summary>
                <p className="mt-2 leading-relaxed text-foreground/70">
                  {guidedStep.checkpoint.answer}
                </p>
              </details>
            )}
            {guidedStep.advanceOn.type === "next" && (
              <button
                onClick={advanceGuided}
                className="mt-3 flex items-center gap-1.5 rounded-full bg-bio-500 px-3.5 py-1.5 text-xs font-semibold text-ink-950 transition-colors hover:bg-bio-400"
              >
                Continue <ArrowRight size={13} />
              </button>
            )}
          </div>
        )}

        {mode === "guided" && guidedDone && (
          <div className="text-[13px] text-foreground/80">
            <div className="mb-1 font-semibold text-bio-300">
              Guided walkthrough complete
            </div>
            You&apos;ve worked through the whole specimen. Try the assessment, or
            continue to the viva.
            {p.revisionSummary && (
              <ul className="mt-2 space-y-1 text-[11px] text-foreground/65">
                {p.revisionSummary.map((point) => <li key={point}>• {point}</li>)}
              </ul>
            )}
          </div>
        )}

        {mode === "explore" && (
          <div className="text-[13px] leading-relaxed text-foreground/75">
            <span className="font-semibold text-foreground">Explore freely.</span>{" "}
            {p.tagline} Point at any structure to identify it, pinch to grab, and
            open your palm to release.
          </div>
        )}

        {mode === "practice" && (
          <div>
            <div className="mb-2 flex items-center justify-between text-[13px]">
              <span className="font-semibold">Practice</span>
              <span className="text-muted">
                {identified.length}/{identifiableCount} identified
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-bio-500 transition-all"
                style={{
                  width: `${(identified.length / identifiableCount) * 100}%`,
                }}
              />
            </div>
            <ul className="mt-2 space-y-1 text-[12px] text-foreground/70">
              {p.objectives.map((o) => (
                <li key={o} className="flex gap-1.5">
                  <span className="text-bio-400">•</span> {o}
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode === "assessment" && (
          <div>
            <div className="mb-2 text-[13px] font-semibold">Assessment</div>
            <ul className="space-y-1.5">
              {p.assessment.map((a) => {
                const done = completedSteps.includes(a.id);
                const current =
                  !done &&
                  p.assessment.find((x) => !completedSteps.includes(x.id))?.id ===
                    a.id;
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-2 py-1.5 text-[12px]",
                      current && "bg-white/6",
                    )}
                  >
                    {done ? (
                      <CheckCircle2 size={14} className="mt-0.5 text-bio-400" />
                    ) : (
                      <Circle
                        size={14}
                        className={cn(
                          "mt-0.5",
                          current ? "text-cyan-accent" : "text-white/25",
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        done ? "text-foreground/50 line-through" : "text-foreground/85",
                      )}
                    >
                      {a.instruction}
                    </span>
                  </li>
                );
              })}
            </ul>
            {assessmentDone && (
              <div className="mt-2 text-[12px] text-bio-300">
                All tasks complete — start the viva to finish.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected structure */}
      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl border border-bio-500/25 bg-bio-500/5 p-3.5"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-bio-300">
                <BookOpenCheck size={11} /> Reviewed content
              </span>
              <span className="text-[10px] text-foreground/45">
                Mastery {Math.round((mastery[selected.id] ?? 0) * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: selected.accent ?? "#34d399" }}
              />
              <span className="text-sm font-semibold">{selected.name}</span>
            </div>
            <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/80">
              {selected.description}
            </p>
            {selected.functionText && (
              <p className="mt-1.5 text-[12px] italic text-bio-300">
                {selected.functionText}
              </p>
            )}
            {selected.relationships && (
              <p className="mt-1.5 text-[12px] leading-relaxed text-foreground/65">
                <strong className="text-foreground/80">Relationships:</strong> {selected.relationships}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StructureAction label="Hide" onClick={() => hideStructure(selected.id)}><EyeOff size={12} /></StructureAction>
              <StructureAction label="Fade" onClick={() => fadeStructure(selected.id)}><Blend size={12} /></StructureAction>
              {selected.group && (
                <StructureAction label="Isolate system" onClick={() => isolate(selected.group ?? null)}><Focus size={12} /></StructureAction>
              )}
            </div>
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
              {[
                ["Simplify", `Explain the ${selected.name} more simply.`],
                ["Go deeper", `Explain the ${selected.name} in greater depth.`],
                ["Analogy", `Give me an analogy for the ${selected.name}.`],
                ["Test me", `Test me on the ${selected.name}.`],
                ["Connect", `Show how the ${selected.name} connects to another system.`],
              ].map(([label, prompt]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => void ask(prompt)}
                  className="shrink-0 rounded-full border border-white/10 px-2 py-1 text-[10px] text-foreground/65 transition-colors hover:border-bio-300/35 hover:text-foreground"
                >
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat feed */}
      <div
        ref={feedRef}
        className="no-scrollbar min-h-56 overflow-y-auto rounded-2xl glass p-3 text-[13px] lg:min-h-0 lg:flex-1"
      >
        <div className="mb-2 flex items-center justify-between border-b border-white/8 pb-2 text-[9px] uppercase tracking-[0.1em] text-foreground/40">
          <span>Tutor conversation</span>
          <span>Generated answers labelled</span>
        </div>
        <div className="flex flex-col gap-2.5">
          {messages.length === 0 && (
            <div className="py-6 text-center text-[12px] text-muted">
              Your instructor&apos;s guidance will appear here.
            </div>
          )}
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                m.kind === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[90%] rounded-2xl px-3 py-2 leading-relaxed",
                  m.kind === "user"
                    ? "bg-bio-500 text-ink-950"
                    : "bg-white/5",
                  KIND_STYLE[m.kind],
                )}
              >
                {m.kind === "explain" && (
                  <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-cyan-accent/70">
                    Tutor response
                  </span>
                )}
                {m.text}
              </div>
            </motion.div>
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/5 px-3 py-2 text-muted">
                <span className="inline-flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-bio-400 [animation-delay:-0.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-bio-400 [animation-delay:-0.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-bio-400" />
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ask + Viva */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-full glass px-2 py-1.5">
          <input
            aria-label="Ask the instructor"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void ask()}
            placeholder="Ask the instructor…"
            className="flex-1 bg-transparent px-2 text-[13px] outline-none placeholder:text-muted"
          />
          <button
            aria-label="Send question"
            onClick={() => void ask()}
            disabled={!q.trim() || pending}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-bio-500 text-ink-950 transition-opacity disabled:opacity-40"
          >
            <Send size={14} />
          </button>
        </div>
        <button
          onClick={openViva}
          disabled={!vivaReady}
          className={cn(
            "flex items-center justify-center gap-2 rounded-full py-2.5 text-sm font-semibold transition-all",
            vivaReady
              ? "bg-gradient-to-r from-bio-500 to-cyan-accent text-ink-950 bio-glow"
              : "cursor-not-allowed bg-white/5 text-muted",
          )}
        >
          <GraduationCap size={16} />
          {vivaReady ? "Start AI Viva" : "Identify structures to unlock viva"}
        </button>
      </div>
    </div>
  );
}

function StructureAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-8 items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 text-[10px] font-medium text-foreground/70 transition-colors hover:bg-white/[0.1] hover:text-foreground"
    >
      {children} {label}
    </button>
  );
}
