/**
 * Facts about the hosted Meeting Mouse service that the privacy policy and the support page
 * state. They describe the instance at app.meetingmouse.net, not this repository's code alone:
 * the retention job, the plan limit and the `installations` table live in the hosted app.
 * A change there needs the matching change here. `hosted.test.ts` holds the core's tables equal
 * to the columns listed below.
 */
export const SUPPORT_EMAIL = "support@meetingmouse.net";
export const SUPPORT_REPLY_DAYS = 2;
/** A poll is deleted this many months after it closes. */
export const RETENTION_MONTHS = 12;
/** Polls a workspace can have open at once on the free plan. */
export const FREE_PLAN_OPEN_POLLS = 10;
/** The date shown on the privacy policy. Change it with the text. */
export const PRIVACY_UPDATED = "October 1, 2026";

/** Every column the hosted app stores, in the words the privacy policy uses. */
export interface StoredColumn {
  table: string;
  column: string;
  what: string;
}

export interface StoredGroup {
  title: string;
  why: string;
  /** True for a table only the hosted app has. The core's tables are checked by a test here. */
  hostedOnly?: boolean;
  columns: readonly StoredColumn[];
}

export const STORED_DATA: readonly StoredGroup[] = [
  {
    title: "Each poll",
    why: "To post the poll in the channel its organizer chose, keep its message up to date and list it on the organizer's Home tab.",
    columns: [
      { table: "polls", column: "id", what: "An id we generate for the poll" },
      { table: "polls", column: "team_id", what: "The Slack workspace id" },
      { table: "polls", column: "channel_id", what: "The Slack channel id" },
      { table: "polls", column: "message_ts", what: "The id of the poll's message" },
      { table: "polls", column: "creator_id", what: "The organizer's Slack user id" },
      { table: "polls", column: "title", what: "The title the organizer typed" },
      { table: "polls", column: "creator_tz", what: "The organizer's time zone" },
      { table: "polls", column: "slot_minutes", what: "The slot length" },
      { table: "polls", column: "status", what: "Open, closed or scheduled" },
      { table: "polls", column: "final_slot_start", what: "The final time, once picked" },
      { table: "polls", column: "created_at", what: "When the poll was created" },
      { table: "polls", column: "updated_at", what: "When the poll last changed" },
      { table: "poll_slots", column: "poll_id", what: "The poll a time belongs to" },
      { table: "poll_slots", column: "slot_start", what: "Each time the poll offers" },
    ],
  },
  {
    title: "Each answer",
    why: "To show who is free when, in each person's own time zone.",
    columns: [
      { table: "participants", column: "poll_id", what: "The poll that was answered" },
      { table: "participants", column: "user_id", what: "The Slack user id" },
      { table: "participants", column: "tz", what: "The person's time zone" },
      {
        table: "participants",
        column: "display_name",
        what: "The person's display name",
      },
      { table: "participants", column: "responded_at", what: "When the person answered" },
      { table: "availability", column: "poll_id", what: "The poll that was answered" },
      { table: "availability", column: "user_id", what: "The Slack user id" },
      {
        table: "availability",
        column: "slot_start",
        what: "Each time the person marked",
      },
    ],
  },
  {
    title: "A short-lived copy of two profile fields",
    why: "So that opening a form does not ask Slack for the same profile every time.",
    columns: [
      { table: "slack_users", column: "team_id", what: "The Slack workspace id" },
      { table: "slack_users", column: "user_id", what: "The Slack user id" },
      { table: "slack_users", column: "tz", what: "The person's time zone" },
      { table: "slack_users", column: "display_name", what: "The person's display name" },
      { table: "slack_users", column: "fetched_at", what: "When we last asked Slack" },
    ],
  },
  {
    title: "Each workspace that installed the app",
    why: "To act in the workspace with the permissions it granted, and nothing more.",
    hostedOnly: true,
    columns: [
      { table: "installations", column: "team_id", what: "The Slack workspace id" },
      { table: "installations", column: "team_name", what: "The workspace's name" },
      {
        table: "installations",
        column: "enterprise_id",
        what: "The Enterprise Grid organization id, when there is one",
      },
      { table: "installations", column: "app_id", what: "The Slack app's id" },
      {
        table: "installations",
        column: "bot_token",
        what: "The app's access token for the workspace, encrypted",
      },
      { table: "installations", column: "bot_id", what: "The app's bot id" },
      { table: "installations", column: "bot_user_id", what: "The app's bot user id" },
      { table: "installations", column: "scopes", what: "The permissions granted" },
      {
        table: "installations",
        column: "installed_by",
        what: "The Slack user id of the person who installed",
      },
      { table: "installations", column: "installed_at", what: "When it was installed" },
      {
        table: "installations",
        column: "updated_at",
        what: "When it was last installed",
      },
      { table: "installations", column: "plan", what: "The plan, which is free" },
    ],
  },
];
