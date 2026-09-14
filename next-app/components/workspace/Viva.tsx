"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, X, ArrowRight } from "lucide-react";
import { useLab } from "@/lib/engine/store";
import { getPractical } from "@/lib/engine/registry";
import { gradeViva, masterySummary } from "@/lib/ai/instructor";
import { cn } from "@/lib/utils";

export function Viva() {
  const viva = useLab((s) => s.viva);
  const practicalId = useLab((s) => s.practicalId);
  const mistakes = useLab((s) => s.mistakes);
  const recordViva = useLab((s) => s.recordViva);
  const nextViva = useLab((s) => s.nextViva);
  const finishViva = useLab((s) => s.finishViva);
  const closeViva = useLab((s) => s.closeViva);

  const p = getPractical(practicalId);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(
    null,
  );

  if (!viva.open) return null;

  const q = p.viva[viva.index];
  const isLast = viva.index >= p.viva.length - 1;
  const avg =
    viva.answers.length > 0
      ? viva.answers.reduce((s, a) => s + a.score, 0) / viva.answers.length
      : 0;

  const submit = () => {
    if (!q || !answer.trim()) return;
    const r = gradeViva(q, answer);
    setResult(r);
    recordViva({ question: q.prompt, answer, score: r.score, feedback: r.feedback });
  };

  const next = () => {
    setResult(null);
    setAnswer("");
    if (isLast) finishViva();
    else nextViva();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="viva-title"
      >
        <motion.div
          initial={{ scale: 0.94, y: 16, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl glass-strong p-6"
        >
          <button
            onClick={closeViva}
            aria-label="Close viva"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-white/8 hover:text-foreground"
          >
            <X size={16} />
          </button>

          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bio-500/15 text-bio-300">
              <GraduationCap size={18} />
            </span>
            <div>
              <div id="viva-title" className="text-sm font-semibold">AI Viva · {p.title}</div>
              <div className="text-[11px] text-muted">
                An oral examination with your instructor
              </div>
            </div>
          </div>

          {!viva.finished ? (
            <div>
              <div className="mb-2 flex gap-1">
                {p.viva.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full",
                      i < viva.index
                        ? "bg-bio-400"
                        : i === viva.index
                          ? "bg-cyan-accent"
                          : "bg-white/15",
                    )}
                  />
                ))}
              </div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-bio-300">
                Question {viva.index + 1} of {p.viva.length}
              </div>
              <p className="text-[15px] font-medium leading-relaxed">
                {q?.prompt}
              </p>

              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                disabled={!!result}
                rows={4}
                placeholder="Answer in your own words…"
                className="mt-3 w-full resize-none rounded-2xl bg-white/5 p-3 text-[13px] leading-relaxed outline-none ring-1 ring-white/10 focus:ring-bio-400/50 disabled:opacity-70"
              />

              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-3 overflow-hidden"
                  >
                    <div className="rounded-2xl bg-white/5 p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-xs font-semibold text-bio-300">
                          Instructor feedback
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            result.score >= 0.7
                              ? "bg-bio-500/20 text-bio-300"
                              : result.score >= 0.4
                                ? "bg-amber-accent/15 text-amber-accent"
                                : "bg-rose-accent/15 text-rose-accent",
                          )}
                        >
                          {Math.round(result.score * 100)}%
                        </span>
                      </div>
                      <p className="text-[13px] leading-relaxed text-foreground/85">
                        {result.feedback}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 flex justify-end">
                {!result ? (
                  <button
                    onClick={submit}
                    disabled={!answer.trim()}
                    className="rounded-full bg-bio-500 px-5 py-2 text-sm font-semibold text-ink-950 transition-colors hover:bg-bio-400 disabled:opacity-40"
                  >
                    Submit answer
                  </button>
                ) : (
                  <button
                    onClick={next}
                    className="flex items-center gap-1.5 rounded-full bg-bio-500 px-5 py-2 text-sm font-semibold text-ink-950 hover:bg-bio-400"
                  >
                    {isLast ? "See result" : "Next question"}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-bio-500 to-cyan-accent text-2xl">
                {avg >= 0.6 ? "🎓" : "📘"}
              </div>
              <div className="mb-1 text-lg font-semibold bio-text-gradient">
                {Math.round(avg * 100)}% · Viva complete
              </div>
              <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-foreground/80">
                {masterySummary(p, avg, mistakes)}
              </p>
              <button
                onClick={closeViva}
                className="mt-5 rounded-full bg-white/8 px-6 py-2 text-sm font-medium hover:bg-white/12"
              >
                Back to the lab
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
