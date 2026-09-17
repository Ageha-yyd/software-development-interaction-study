import type { ExperimentCondition, ExperimentPhase } from "./types";

export interface ExperimentEvent {
  schemaVersion: "software-development-browser-preview-v1";
  sessionId: string;
  sequence: number;
  scenarioId: string;
  condition: ExperimentCondition;
  phase: ExperimentPhase;
  event: string;
  timestampUtc: string;
  monotonicMs: number;
  payload: Record<string, unknown>;
}

function newSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `preview-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export class BrowserTelemetrySession {
  readonly sessionId = newSessionId();
  readonly scenarioId: string;
  #entries: ExperimentEvent[] = [];
  #persistenceError: string | null = null;

  constructor(scenarioId: string) {
    this.scenarioId = scenarioId;
  }

  append(
    condition: ExperimentCondition,
    phase: ExperimentPhase,
    event: string,
    payload: Record<string, unknown> = {},
  ): ExperimentEvent {
    const entry: ExperimentEvent = Object.freeze({
      schemaVersion: "software-development-browser-preview-v1",
      sessionId: this.sessionId,
      sequence: this.#entries.length + 1,
      scenarioId: this.scenarioId,
      condition,
      phase,
      event,
      timestampUtc: new Date().toISOString(),
      monotonicMs: typeof performance === "undefined" ? 0 : performance.now(),
      payload: Object.freeze({ ...payload }),
    });
    this.#entries.push(entry);
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(
          `experiment-preview:${this.scenarioId}:${this.sessionId}`,
          JSON.stringify(this.#entries),
        );
        this.#persistenceError = null;
      }
    } catch (error) {
      // Preserve the complete in-memory log and the caller's capture path when
      // browser persistence is unavailable; never truncate research records.
      this.#persistenceError = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    }
    return entry;
  }

  get persistenceError(): string | null {
    return this.#persistenceError;
  }

  entries(): readonly ExperimentEvent[] {
    return Object.freeze([...this.#entries]);
  }

  download(): void {
    const blob = new Blob([JSON.stringify(this.#entries, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `${this.scenarioId}-${this.sessionId}.json`;
    link.click();
    URL.revokeObjectURL(href);
  }
}
