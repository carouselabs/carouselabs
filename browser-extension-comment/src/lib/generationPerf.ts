// src/lib/generationPerf.ts — timing for one Generate, logged as a single
// line in the side panel's console (right-click the panel → Inspect). Only
// durations and the request's random id: never the post, the comment or
// anything identifying.
//
// The server's half (auth, daily limit, profile, reservation, model first
// token, attempts) arrives in the final event's `timing`; see
// app/api/ext/generate. The same request id is in the server's
// "[ext/generate] timing req=…" log line, so a slow one can be looked up on
// both sides. Each side's durations come from its own clock: nothing here
// subtracts one machine's time from the other's, except "network", which is
// the panel's wait for the server's first event minus the server's own time
// before it (so it also holds any queueing or cold start on the server).

export interface GenerateServerTiming {
  requestId?: string | null;
  auth?: number;
  limit?: number;
  profile?: number;
  reserve?: number;
  beforeModel?: number;
  ttft?: number | null;
  firstText?: number | null;
  attempts?: number;
  model?: string;
  total?: number;
}

// From the click: "feedback" the loading state is on screen, "request" the
// request leaves, "start" the server has it, "firstText" the first words
// arrive, "shown" they are painted, "final" the checked comment is in.
type Mark = "feedback" | "request" | "start" | "firstText" | "shown" | "final";

export function generationPerf() {
  const t0 = performance.now();
  const marks: Partial<Record<Mark, number>> = {};
  let requestId: string | null = null;

  return {
    // First occurrence wins: a retry's text doesn't move "first visible".
    mark(name: Mark) {
      marks[name] ??= performance.now() - t0;
    },
    request(id: string) {
      requestId = id;
      marks.request ??= performance.now() - t0;
    },
    report(server?: GenerateServerTiming): Partial<Record<Mark, number>> {
      const ms = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? "-" : `${Math.round(v)} ms`);
      const diff = (a?: number, b?: number) => (a == null || b == null ? null : a - b);
      // An older server answers in one piece, so the text first shows with it.
      const shown = marks.shown ?? marks.final;
      const toStart = diff(marks.start, marks.request);
      const network = toStart == null || server?.beforeModel == null ? null : toStart - server.beforeModel;

      console.info(
        `[perf] generate req=${requestId ?? "-"}: FIRST VISIBLE TEXT ${ms(shown)} | TOTAL ${ms(marks.final)}` +
          ` | loading shown ${ms(marks.feedback)} | frontend prep ${ms(marks.request)} | network ${ms(network)}` +
          ` | backend before model ${ms(server?.beforeModel)} (auth ${ms(server?.auth)}, limit ${ms(server?.limit)},` +
          ` profile ${ms(server?.profile)}, reserve ${ms(server?.reserve)}) | AI first token ${ms(server?.ttft)}` +
          ` | render ${ms(diff(marks.shown, marks.firstText))}` +
          ` | attempts ${server?.attempts ?? "-"} | model ${server?.model ?? "-"}`,
      );
      return { ...marks, shown };
    },
  };
}
