// src/lib/generationPerf.ts — timing for one Generate, logged as a single
// line in the side panel's console (right-click the panel → Inspect). Only
// durations: never the post, the comment or anything identifying.
//
// The server's half (auth, model first token, attempts) arrives in the final
// event's `timing`; see app/api/ext/generate.

export interface GenerateServerTiming {
  beforeModel?: number;
  ttft?: number | null;
  firstText?: number | null;
  attempts?: number;
  model?: string;
  total?: number;
}

type Mark = "request" | "start" | "firstText" | "shown" | "final";

export function generationPerf() {
  const t0 = performance.now();
  const marks: Partial<Record<Mark, number>> = {};

  return {
    // First occurrence wins: a retry's text doesn't move "first visible".
    mark(name: Mark) {
      marks[name] ??= performance.now() - t0;
    },
    report(server?: GenerateServerTiming): Partial<Record<Mark, number>> {
      const ms = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? "-" : `${Math.round(v)} ms`);
      const diff = (a?: number, b?: number) => (a == null || b == null ? null : a - b);
      // An older server answers in one piece, so the text first shows with it.
      const shown = marks.shown ?? marks.final;
      const toStart = diff(marks.start, marks.request);
      const network = toStart == null || server?.beforeModel == null ? null : toStart - server.beforeModel;

      console.info(
        `[perf] generate: FIRST VISIBLE TEXT ${ms(shown)} | TOTAL ${ms(marks.final)}` +
          ` | frontend prep ${ms(marks.request)} | network ${ms(network)}` +
          ` | backend before model ${ms(server?.beforeModel)} | AI first token ${ms(server?.ttft)}` +
          ` | render ${ms(diff(marks.shown, marks.firstText))}` +
          ` | attempts ${server?.attempts ?? "-"} | model ${server?.model ?? "-"}`,
      );
      return { ...marks, shown };
    },
  };
}
