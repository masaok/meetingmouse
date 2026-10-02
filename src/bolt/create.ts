import "server-only";

import { App, LogLevel, type AppOptions, type InstallationStore } from "@slack/bolt";
import { VercelReceiver, type VercelReceiverOptions } from "@vercel/slack-bolt";

import type { Feature } from "@/features/types";
import { gridLinks, type GridOptions } from "@/web/link";

export interface Bolt {
  app: App;
  receiver: VercelReceiver;
}

/** Bolt's per-request token resolver, for hosts that install into many workspaces. */
export type Authorize = NonNullable<AppOptions["authorize"]>;

/** The bot scopes the core needs; the same list as manifest.json. A host appends its own. */
export const CORE_BOT_SCOPES = [
  "commands",
  "chat:write",
  "chat:write.public",
  "users:read",
] as const;

/** Slack OAuth for a deployment that installs into many workspaces. */
export interface OAuthOptions {
  clientId: string;
  clientSecret: string;
  /** Signs the `state` parameter that protects the callback from forgery. */
  stateSecret: string;
  /** Bot scopes to request; `CORE_BOT_SCOPES` plus whatever the host's own features need. */
  scopes: readonly string[];
  /** The redirect URL registered on the Slack app, if the default from the request is not right. */
  redirectUri?: string;
  /** Where installations live. The receiver's in-memory default does not survive a request. */
  installationStore: InstallationStore;
  installerOptions?: VercelReceiverOptions["installerOptions"];
}

export interface CreateMeetingMouseOptions {
  /** Registered in order. A host passes `coreFeatures` plus its own. Names must be unique. */
  features: readonly Feature[];
  signingSecret: string;
  /**
   * One bot token for a single workspace; a resolver that finds the token per request; or Slack
   * OAuth, which gives the receiver an install path and a callback and resolves tokens from the
   * installation store.
   */
  auth: { token: string } | { authorize: Authorize } | { oauth: OAuthOptions };
  /**
   * Turns on the web grid: the Add my availability form then carries a personal link to it. The host
   * serves the page by mounting `createGridHandlers` from `meetingmouse/web` at `/grid/[token]`
   * with the same secret.
   */
  grid?: GridOptions;
  /**
   * Where a person gets help with this deployment: an http(s) URL. When set, the App Home tab ends
   * with a line that links to it; when not, the tab says nothing about support.
   */
  supportUrl?: string;
  logLevel?: LogLevel;
}

/** The URL as Slack mrkdwn can link it, or a throw that names the option. */
function supportLink(supportUrl: string): string {
  const url = URL.canParse(supportUrl) ? new URL(supportUrl) : undefined;
  if (url?.protocol !== "http:" && url?.protocol !== "https:") {
    throw new Error(`supportUrl must be an http(s) URL, got "${supportUrl}"`);
  }
  // A bare pipe would end the URL half of a `<url|label>` link.
  return url.href.replaceAll("|", "%7C");
}

/**
 * Build the Bolt app and the Vercel receiver for a list of features. Nothing here reads the
 * environment: the caller decides where credentials come from, so the same function serves
 * the reference app in this repo and a host that embeds it.
 */

export function createMeetingMouse(options: CreateMeetingMouseOptions): Bolt {
  const {
    features,
    signingSecret,
    auth,
    grid,
    supportUrl,
    logLevel = LogLevel.INFO,
  } = options;
  const names = new Set<string>();
  for (const { name } of features) {
    if (names.has(name)) throw new Error(`duplicate feature name "${name}"`);
    names.add(name);
  }
  const oauth = "oauth" in auth ? auth.oauth : undefined;
  const receiver = new VercelReceiver({
    signingSecret,
    logLevel,
    ...(oauth && {
      clientId: oauth.clientId,
      clientSecret: oauth.clientSecret,
      stateSecret: oauth.stateSecret,
      scopes: [...oauth.scopes],
      redirectUri: oauth.redirectUri,
      installationStore: oauth.installationStore,
      installerOptions: { directInstall: true, ...oauth.installerOptions },
    }),
  });
  // With an installer on the receiver, Bolt wires the installer's authorize itself and rejects
  // a token or an authorize function beside it.
  const appAuth =
    "token" in auth
      ? { token: auth.token }
      : "authorize" in auth
        ? { authorize: auth.authorize }
        : {};
  const app = new App({ ...appAuth, signingSecret, receiver, deferInitialization: true });
  const context = {
    grid: grid && gridLinks(grid),
    supportUrl: supportUrl === undefined ? undefined : supportLink(supportUrl),
  };
  for (const feature of features) feature.register(app, context);
  return { app, receiver };
}
