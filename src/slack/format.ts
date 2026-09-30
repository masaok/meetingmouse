/** mrkdwn helpers. Pure string functions; see docs/ARCHITECTURE.md#time-zones. */

export type SlackDateFormat =
  | "{date_num}"
  | "{date}"
  | "{date_short}"
  | "{date_long}"
  | "{date_pretty}"
  | "{date_short_pretty}"
  | "{date_long_pretty}"
  | "{time}"
  | "{time_secs}"
  | `{date_short_pretty} {time}`
  | `{date_pretty} {time}`;

export const epochSeconds = (d: Date): number => Math.floor(d.getTime() / 1000);

/**
 * Slack renders `<!date^…>` in each viewer's own time zone. Always pass a fallback: clients
 * that cannot render the token (and the `text` notification field) show it instead.
 */
export function dateToken(d: Date, format: SlackDateFormat, fallback: string): string {
  return `<!date^${epochSeconds(d)}^${format}|${escapeMrkdwn(fallback)}>`;
}

/** Slack requires &, < and > to be escaped inside mrkdwn text. */
export function escapeMrkdwn(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export const userMention = (userId: string): string => `<@${userId}>`;

export const channelMention = (channelId: string): string => `<#${channelId}>`;

/** Truncate to `max` characters with an ellipsis, counting the ellipsis. */
export function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}…`;
}
