import { SLACK_INSTALL_URL } from "@/lib/site";

const BUTTON = "https://platform.slack-edge.com/img/add_to_slack";

/**
 * Slack's own Add to Slack button, as Slack publishes it. The link goes to the app's install
 * route and not straight to slack.com: that route redirects to Slack's authorize page with a
 * signed `state`, and the redirect back is refused without it.
 */
export function AddToSlackButton({ className }: { className?: string }) {
  return (
    <a href={SLACK_INSTALL_URL} className={`inline-block shrink-0 ${className ?? ""}`}>
      {/* Slack serves the 1x and 2x files itself; next/image cannot name a second file for 2x. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Add to Slack"
        height={40}
        width={139}
        src={`${BUTTON}.png`}
        srcSet={`${BUTTON}.png 1x, ${BUTTON}@2x.png 2x`}
      />
    </a>
  );
}
