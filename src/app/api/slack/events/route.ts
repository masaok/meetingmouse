import { createHandler } from "@vercel/slack-bolt";

import { getBolt } from "@/bolt/app";
import { assertEnv } from "@/lib/env";

let handler: ReturnType<typeof createHandler> | undefined;

/** Every Slack request (commands, interactivity, events) lands here. */
export async function POST(request: Request): Promise<Response> {
  assertEnv();
  if (!handler) {
    const { app, receiver } = getBolt();
    handler = createHandler(app, receiver);
  }
  return handler(request);
}
