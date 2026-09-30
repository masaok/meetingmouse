/**
 * One JSON line per event, so Vercel logs can be filtered by poll_id, user_id or action.
 * Keep fields flat and snake_case to match Slack's ids.
 */
export type LogFields = Record<string, unknown>;
type Level = "info" | "warn" | "error";

function emit(level: Level, fields: LogFields): void {
  const line = JSON.stringify({ level, ts: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (fields: LogFields): void => emit("info", fields),
  warn: (fields: LogFields): void => emit("warn", fields),
  error: (fields: LogFields): void => emit("error", fields),
};

/** Runs `fn` and logs `duration_ms` alongside `fields`; rethrows after logging on failure. */
export async function withTiming<T>(fields: LogFields, fn: () => Promise<T>): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    log.info({ ...fields, duration_ms: Date.now() - started });
    return result;
  } catch (error) {
    log.error({
      ...fields,
      duration_ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
