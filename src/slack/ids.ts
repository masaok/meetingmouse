/**
 * Every Slack surface id, in one place. Renderers reference these when they emit buttons
 * and menus; listeners reference them when they subscribe. docs/FEATURE_MAP.md must list
 * each one (CI: `pnpm featuremap:check`).
 */
export const COMMAND_WHEN = "/when";
export const SHORTCUT_CREATE_POLL = "create_poll";

export const CALLBACK_CREATE_POLL_MODAL = "create_poll_modal";
export const CALLBACK_RESPOND_MODAL = "respond_modal";
export const CALLBACK_PICK_TIME_MODAL = "pick_time_modal";

export const ACTION_RESPOND_BUTTON = "respond_button";
export const ACTION_ORGANIZER_MENU = "organizer_menu";
export const ACTION_GCAL_LINK = "gcal_link";
export const ACTION_GRID_LINK = "grid_link";
export const ACTION_RESPOND_CHECKBOXES = "respond_checkboxes";

export const EVENT_APP_HOME_OPENED = "app_home_opened";

/** Values of the organizer overflow menu. */
export const ORGANIZER_MENU = {
  PICK: "pick_time",
  CLOSE: "close_poll",
  DELETE: "delete_poll",
} as const;
export type OrganizerMenuValue = (typeof ORGANIZER_MENU)[keyof typeof ORGANIZER_MENU];
