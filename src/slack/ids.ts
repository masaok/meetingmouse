/**
 * Every Slack surface id, in one place. Renderers reference these when they emit buttons
 * and menus; listeners reference them when they subscribe. docs/FEATURE_MAP.md must list
 * each one (CI: `pnpm featuremap:check`).
 */
/** The command the copy leads with. */
export const COMMAND_MEET = "/meet";
/** An alias of `/meet`: the app's own name. */
export const COMMAND_MOUSE = "/mouse";
/** Every command that opens the create form. The manifest registers the same two. */
export const COMMANDS = [COMMAND_MEET, COMMAND_MOUSE] as const;
export const SHORTCUT_CREATE_POLL = "create_poll";

export const CALLBACK_CREATE_POLL_MODAL = "create_poll_modal";
export const CALLBACK_RESPOND_MODAL = "respond_modal";
export const CALLBACK_PICK_TIME_MODAL = "pick_time_modal";

export const ACTION_RESPOND_BUTTON = "respond_button";
export const ACTION_ORGANIZER_MENU = "organizer_menu";
export const ACTION_GCAL_LINK = "gcal_link";
export const ACTION_GRID_LINK = "grid_link";
/** One button per slot in the respond form; its action id is this plus `:<epoch seconds>`. */
export const ACTION_TOGGLE_SLOT = "toggle_slot";
export const ACTION_TOGGLE_NONE = "toggle_none";

export const EVENT_APP_HOME_OPENED = "app_home_opened";

/** Values of the organizer overflow menu. */
export const ORGANIZER_MENU = {
  PICK: "pick_time",
  CLOSE: "close_poll",
  DELETE: "delete_poll",
} as const;
export type OrganizerMenuValue = (typeof ORGANIZER_MENU)[keyof typeof ORGANIZER_MENU];
