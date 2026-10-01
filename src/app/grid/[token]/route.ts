import { WebClient } from "@slack/web-api";

import { assertEnv, env } from "@/lib/env";
import { createGridHandlers, type GridHandlers } from "@/web/handlers";
import { deriveGridSecret } from "@/web/link";

let handlers: GridHandlers | undefined;

/** Built on first request, like the Bolt app, so `next build` needs no secrets. */
function getHandlers(): GridHandlers {
  if (handlers) return handlers;
  assertEnv();
  const { SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET } = env();
  const client = new WebClient(SLACK_BOT_TOKEN);
  handlers = createGridHandlers({
    secret: deriveGridSecret(SLACK_SIGNING_SECRET),
    clientFor: async () => client,
  });
  return handlers;
}

/** The web grid: a person's own availability beside the group's. */
export const GET = (request: Request): Promise<Response> => getHandlers().GET(request);

export const POST = (request: Request): Promise<Response> => getHandlers().POST(request);
