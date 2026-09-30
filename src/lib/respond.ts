/** Post to a Slack response_url (from a command, action, or a conversations_select with response_url_enabled). */
export async function respondViaUrl(
  responseUrl: string,
  text: string,
  responseType: "ephemeral" | "in_channel" = "ephemeral",
): Promise<void> {
  const res = await fetch(responseUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ response_type: responseType, text, replace_original: false }),
  });
  if (!res.ok) throw new Error(`response_url replied ${res.status}`);
}

/** Slack Web API errors carry `data.error`; everything else gets a generic code. */
export function slackErrorCode(error: unknown): string {
  const data = (error as { data?: { error?: string } } | undefined)?.data;
  return data?.error ?? (error instanceof Error ? error.message : "unknown_error");
}
