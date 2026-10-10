import { useEffect, useRef, useState } from "react";
import { Bot, ChevronLeft, Pencil, Sparkles } from "lucide-react";
import { ApiError } from "@/lib/api";
import type { AgentDraft } from "@/lib/agents";
import {
  buildDraft,
  clearBuilderProgress,
  loadBuilderProgress,
  MAX_QUESTIONS,
  nextQuestion,
  saveBuilderProgress,
  type BuilderAnswer,
  type InterviewQuestion,
} from "@/lib/agentBuilder";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

// The AI agent builder: the person says what they want in their own words,
// the AI asks what's missing one question at a time (skip any, edit earlier
// answers, build whenever ready), then turns it all into the agent's setup,
// handed to the agent form to review, refine and save. The interview is kept
// in this browser (src/lib/agentBuilder.ts), so it survives leaving the panel.

const EXAMPLE =
  "e.g. I run a SaaS company that helps people create LinkedIn content. I want to connect with founders and creators, understand their challenges, and introduce our product when it's relevant. My messages should sound natural, not salesy.";

type Stage = "describe" | "interview" | "building";

interface Props {
  // The setup is ready: open it in the agent form.
  onBuilt: (draft: AgentDraft) => void;
  onCancel: () => void;
}

function message(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export function AgentBuilder({ onBuilt, onCancel }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [stage, setStage] = useState<Stage>("describe");
  const [description, setDescription] = useState("");
  const [answers, setAnswers] = useState<BuilderAnswer[]>([]);
  const [pending, setPending] = useState<InterviewQuestion | null>(null);
  const [done, setDone] = useState(false);
  const [answer, setAnswer] = useState("");
  const [editing, setEditing] = useState<{ index: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  // Picks up an interview left part-way.
  useEffect(() => {
    alive.current = true;
    void loadBuilderProgress().then((saved) => {
      if (!alive.current) return;
      if (saved) {
        setDescription(saved.description);
        setAnswers(saved.answers);
        setPending(saved.pending);
        setDone(saved.done);
        if (saved.pending || saved.done || saved.answers.length > 0) setStage("interview");
      }
      setLoaded(true);
    });
    return () => {
      alive.current = false;
    };
  }, []);

  function remember(next: { description?: string; answers?: BuilderAnswer[]; pending?: InterviewQuestion | null; done?: boolean }) {
    void saveBuilderProgress({
      description: next.description ?? description,
      answers: next.answers ?? answers,
      pending: next.pending === undefined ? pending : next.pending,
      done: next.done ?? done,
    });
  }

  // Asks for the next question with these answers; none left means done.
  async function ask(withAnswers: BuilderAnswer[]) {
    setBusy(true);
    setError(null);
    try {
      const question = withAnswers.length >= MAX_QUESTIONS ? null : await nextQuestion(description.trim(), withAnswers);
      if (!alive.current) return;
      setPending(question);
      setDone(question === null);
      setStage("interview");
      remember({ answers: withAnswers, pending: question, done: question === null });
    } catch (err) {
      if (alive.current) setError(message(err, "Couldn't get the next question. Try again."));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  function submit(skip: boolean) {
    if (!pending) return;
    const next = [...answers, { question: pending.question, answer: skip ? "" : answer.trim(), ...(pending.topic ? { topic: pending.topic } : {}) }];
    setAnswers(next);
    setAnswer("");
    void ask(next);
  }

  function saveEdit() {
    if (!editing) return;
    const next = answers.map((a, i) => (i === editing.index ? { ...a, answer: editing.text.trim() } : a));
    setAnswers(next);
    setEditing(null);
    remember({ answers: next });
  }

  async function build() {
    setStage("building");
    setBusy(true);
    setError(null);
    try {
      const draft = await buildDraft(description.trim(), answers);
      if (!alive.current) return;
      onBuilt(draft);
    } catch (err) {
      if (!alive.current) return;
      setError(message(err, "Couldn't build the agent. Try again."));
      setStage("interview");
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  async function startOver() {
    await clearBuilderProgress();
    setDescription("");
    setAnswers([]);
    setPending(null);
    setDone(false);
    setAnswer("");
    setError(null);
    setStage("describe");
  }

  const header = (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="-ml-1 inline-flex items-center gap-0.5 rounded px-1 text-xs font-medium text-muted-foreground transition-colors duration-fast hover:text-foreground disabled:opacity-50"
      >
        <ChevronLeft aria-hidden className="h-3.5 w-3.5" />
        Agents
      </button>
      <h2 className="flex items-center gap-1.5 text-base font-semibold tracking-tight">
        <Sparkles aria-hidden className="h-4 w-4 text-primary-text" />
        Build an agent with AI
      </h2>
    </div>
  );

  if (!loaded) return <div className="p-4">{header}</div>;

  if (stage === "building") {
    return (
      <div className="flex flex-col gap-4 p-4">
        {header}
        <div role="status" aria-live="polite" className="space-y-3 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">Building your agent…</p>
          <Skeleton className="h-3.5 w-3/5" />
          <Skeleton className="w-4/5" />
          <Skeleton className="w-2/3" />
        </div>
      </div>
    );
  }

  if (stage === "describe") {
    return (
      <div className="flex flex-col gap-4 p-4">
        {header}
        <div className="space-y-1.5">
          <label htmlFor="agent-goal" className="text-sm font-medium">
            What do you want your AI agent to help you achieve?
          </label>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Say it in your own words: your business, who you talk to, what you want from the conversations, how you want to sound.
          </p>
          <Textarea
            id="agent-goal"
            autoGrow
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 3000))}
            onBlur={() => remember({})}
            placeholder={EXAMPLE}
            className="max-h-72 min-h-[7rem]"
          />
        </div>
        {error && <Alert>{error}</Alert>}
        <Button disabled={description.trim().length < 10} loading={busy} onClick={() => void ask(answers)}>
          {!busy && <Sparkles aria-hidden />}
          Continue
        </Button>
        <p className="text-xs text-muted-foreground">
          The AI asks a few short questions, then sets the agent up. You review everything before it&apos;s saved.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {header}

      <div className="space-y-1 rounded-lg border bg-muted/40 p-3">
        <p className="text-xs font-medium text-muted-foreground">What you want</p>
        <p className="line-clamp-3 text-xs leading-relaxed">{description}</p>
      </div>

      {answers.length > 0 && (
        <ol className="space-y-2" aria-label="Your answers">
          {answers.map((a, index) => (
            <li key={index} className="space-y-1 rounded-lg border bg-card p-3">
              <p className="text-xs font-medium text-muted-foreground">{a.question}</p>
              {editing?.index === index ? (
                <div className="space-y-2">
                  <Textarea
                    autoGrow
                    aria-label={`Your answer to: ${a.question}`}
                    value={editing.text}
                    onChange={(e) => setEditing({ index, text: e.target.value.slice(0, 1500) })}
                    className="max-h-48 min-h-[3.5rem]"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>
                      Save answer
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className={a.answer ? "text-sm" : "text-sm italic text-muted-foreground"}>{a.answer || "Skipped"}</p>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 px-2"
                    disabled={busy}
                    aria-label={`Edit your answer to: ${a.question}`}
                    onClick={() => setEditing({ index, text: a.answer })}
                  >
                    <Pencil aria-hidden className="!size-3.5" />
                    Edit
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      {pending && !done ? (
        <section aria-label="Next question" className="animate-fade-in-up space-y-2 rounded-lg border border-primary/50 bg-card p-3 shadow-sm">
          <div className="flex items-start gap-2">
            <Bot aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary-text" />
            <p className="text-sm font-medium">{pending.question}</p>
          </div>
          <Textarea
            autoGrow
            aria-label="Your answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value.slice(0, 1500))}
            placeholder={pending.hint ? `e.g. ${pending.hint}` : "Your answer"}
            className="max-h-48 min-h-[3.5rem]"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!answer.trim()} loading={busy} onClick={() => submit(false)}>
              Next
            </Button>
            {pending.optional && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => submit(true)}>
                Skip
              </Button>
            )}
            <span className="ml-auto text-xs tabular-nums text-muted-foreground">
              Question {answers.length + 1} of up to {MAX_QUESTIONS}
            </span>
          </div>
        </section>
      ) : (
        <div role="status" className="rounded-lg border bg-card p-3 text-sm">
          {done ? "That's all it needs. Build your agent, then check it over." : "Asking the next question…"}
        </div>
      )}

      {error && <Alert>{error}</Alert>}
      {!pending && !done && !busy && (
        <Button variant="outline" onClick={() => void ask(answers)}>
          Try again
        </Button>
      )}

      <Button variant={done ? "default" : "outline"} disabled={busy || editing !== null} onClick={() => void build()}>
        <Sparkles aria-hidden />
        Build my agent{done ? "" : " now"}
      </Button>
      <button
        type="button"
        onClick={() => void startOver()}
        disabled={busy}
        className="w-fit text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        Start over
      </button>
    </div>
  );
}
