import { CLIENT_SCRIPT } from "./client";
import type { GridState } from "./state";

const escapeHtml = (s: string): string =>
  s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

/** JSON for a `<script type="application/json">`: no sequence can close the element early. */
const embedJson = (value: unknown): string =>
  JSON.stringify(value).replaceAll("<", "\\u003c");

const ROW_HEIGHT_REM: Record<number, number> = { 15: 0.75, 30: 1.25, 60: 2 };

const STYLE = `
:root { color-scheme: light; --free: 51, 153, 0; --busy: #ffdede; --line: #1c1917; --muted: #57534e; }
* { box-sizing: border-box; }
body { margin: 0; padding: 1.5rem 1rem 3rem; background: #fafaf9; color: #1c1917;
  font: 16px/1.4 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 72rem; margin: 0 auto; }
h1 { margin: 0; font-size: 1.5rem; font-weight: 600; }
h2 { margin: 0 0 .5rem; font-size: 1.25rem; font-weight: 500; text-align: center; }
.meta { margin: .25rem 0 0; color: var(--muted); font-size: .875rem; }
.notice { display: none; margin: 1rem 0 0; padding: .5rem .75rem; border-radius: .375rem;
  background: #fef3c7; font-size: .875rem; }
body.closed .notice { display: block; }
.panels { display: flex; flex-wrap: wrap; gap: 2.5rem 4rem; justify-content: center; margin-top: 1.75rem; }
.panel { display: flex; flex-direction: column; align-items: center; max-width: 100%; }
.legend { display: flex; align-items: center; gap: .5rem; min-height: 1.75rem; font-size: .875rem; }
.legend i, .swatch { display: inline-block; width: 2rem; height: 1.25rem; border: 1px solid var(--line); }
.scale { display: inline-flex; }
.scale i { background: rgba(var(--free), var(--a)); border-left-width: 0; }
.scale i:first-child { border-left-width: 1px; }
.swatch.busy { background: var(--busy); }
.swatch.free { background: rgb(var(--free)); }
.hint { margin: .5rem 0 1rem; min-height: 1.25rem; color: var(--muted); font-size: .875rem; text-align: center; }
.hint.bad { color: #b91c1c; }
.scroll { max-width: 100%; overflow-x: auto; padding-top: .25rem; }
.grid { display: grid; grid-template-columns: 4.75rem repeat(var(--days), 2.75rem); width: max-content;
  user-select: none; -webkit-user-select: none; }
.day { padding-bottom: .25rem; text-align: center; font-size: .75rem; line-height: 1.15; }
.day b { display: block; font-size: 1.15rem; font-weight: 400; }
.time { position: relative; height: var(--row); }
.time span { position: absolute; right: .5rem; top: -.6rem; font-size: .75rem; white-space: nowrap; }
.cell { height: var(--row); border-left: 1px solid var(--line); border-top: 1px dotted var(--line); }
.cell.hour, .cell.first { border-top-style: solid; }
.cell.last { border-right: 1px solid var(--line); }
.cell.gap { background: repeating-linear-gradient(45deg, #e7e5e4 0 4px, #f5f5f4 4px 8px); }
.end { height: 0; border-top: 1px solid var(--line); }
#mine-grid { touch-action: none; }
#mine-grid .cell[data-slot] { background: var(--busy); cursor: pointer; }
#mine-grid .cell.on { background: rgb(var(--free)); }
#mine-grid .cell:focus-visible { outline: 2px solid #2563eb; outline-offset: -2px; }
body.closed #mine-grid .cell[data-slot] { cursor: default; opacity: .6; }
#group-grid .cell[data-slot] { background: rgba(var(--free), var(--a, 0)); }
`;

function gridHtml(state: GridState, kind: "mine" | "group"): string {
  const mine = new Set(state.me.slots);
  const total = state.othersTotal + (state.me.responded ? 1 : 0);
  const lastDay = state.days.length - 1;
  const parts: string[] = ['<div class="corner"></div>'];
  for (const day of state.days)
    parts.push(
      `<div class="day">${escapeHtml(day.label)}<b>${escapeHtml(day.weekday)}</b></div>`,
    );
  state.rows.forEach((row, r) => {
    const label = row.onHour || r === 0 ? `<span>${escapeHtml(row.label)}</span>` : "";
    parts.push(`<div class="time">${label}</div>`);
    state.cells[r].forEach((slot, c) => {
      const classes = ["cell"];
      if (r === 0) classes.push("first");
      if (row.onHour) classes.push("hour");
      if (c === lastDay) classes.push("last");
      if (slot === null) {
        parts.push(`<div class="${classes.join(" ")} gap"></div>`);
        return;
      }
      const day = state.days[c];
      const name = escapeHtml(`${day.weekday} ${day.label}, ${row.label}`);
      if (kind === "mine") {
        const on = mine.has(slot);
        if (on) classes.push("on");
        parts.push(
          `<div class="${classes.join(" ")}" role="checkbox" tabindex="0" aria-checked="${on}" aria-label="${name}" data-slot="${slot}" data-r="${r}" data-c="${c}"></div>`,
        );
      } else {
        const count = (state.others[slot]?.length ?? 0) + (mine.has(slot) ? 1 : 0);
        parts.push(
          `<div class="${classes.join(" ")}" style="--a:${total ? count / total : 0}" data-slot="${slot}" data-label="${name}"></div>`,
        );
      }
    });
  });
  parts.push(`<div class="time"><span>${escapeHtml(state.endLabel)}</span></div>`);
  for (let c = 0; c <= lastDay; c++) parts.push('<div class="end"></div>');
  const rowHeight = ROW_HEIGHT_REM[state.slotMinutes] ?? 1.25;
  return `<div class="scroll"><div class="grid" id="${kind}-grid" style="--days:${state.days.length};--row:${rowHeight}rem">${parts.join("")}</div></div>`;
}

const htmlDocument = (title: string, body: string, script = ""): string =>
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>${body}</main>${script}
</body>
</html>`;

/**
 * The whole page as one HTML document: both grids drawn on the server, the state embedded as
 * JSON, and the script inline. The left grid is the viewer's own availability, the right one
 * the group's, darker where more people are free.
 */
export function renderGridPage(state: GridState): string {
  const total = state.othersTotal + (state.me.responded ? 1 : 0);
  const body = `
<h1>${escapeHtml(state.title)}</h1>
<p class="meta"><span id="responded">${total} ${total === 1 ? "person has" : "people have"} responded</span> · times in ${escapeHtml(state.tz)}</p>
<p class="notice">This poll is no longer open, so availability cannot be changed.</p>
<div class="panels">
<section class="panel" id="mine">
<h2>Your availability</h2>
<div class="legend"><span>Unavailable</span><i class="swatch busy"></i><span>Available</span><i class="swatch free"></i></div>
<p class="hint" id="save-status" role="status">Click and drag to toggle. Saved as you go.</p>
${gridHtml(state, "mine")}
</section>
<section class="panel" id="group">
<h2>Group's availability</h2>
<div class="legend" id="legend"></div>
<p class="hint" id="who">Point at a time to see who is free.</p>
${gridHtml(state, "group")}
</section>
</div>`;
  const script = `
<script type="application/json" id="state">${embedJson(state)}</script>
<script>${CLIENT_SCRIPT}</script>`;
  return htmlDocument(`${state.title} · Meeting Mouse`, body, script);
}

/** A page with one message, for a link that is expired or a poll that is gone. */
export function renderMessagePage(heading: string, message: string): string {
  return htmlDocument(
    `${heading} · Meeting Mouse`,
    `<h1>${escapeHtml(heading)}</h1><p class="meta">${escapeHtml(message)}</p>`,
  );
}
