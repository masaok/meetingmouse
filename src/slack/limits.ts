/**
 * Slack platform limits that shape the design. Tests in src/slack/limits.test.ts assert
 * that our poll limits stay inside these, so a change here fails a test rather than a demo.
 * Source: https://docs.slack.dev/reference/block-kit
 */
export const SLACK_LIMITS = {
  /** `checkboxes` element: max options. */
  CHECKBOX_OPTIONS: 10,
  /** Max blocks in a modal view. */
  BLOCKS_PER_MODAL: 100,
  /** Max blocks in a message. */
  BLOCKS_PER_MESSAGE: 50,
  /** `section.text` max length. */
  SECTION_TEXT_CHARS: 3000,
  /** `context` element text max length. */
  CONTEXT_TEXT_CHARS: 2000,
  /** `table` block: max rows, header row included. */
  TABLE_ROWS: 100,
  /** `table` block: max cells in a row. */
  TABLE_COLUMNS: 20,
  /** `table` block: max characters across all cells. */
  TABLE_CHARS: 10_000,
  /** `header.text` max length. */
  HEADER_TEXT_CHARS: 150,
  /** option.value max length. */
  OPTION_VALUE_CHARS: 75,
  /** option.text max length. */
  OPTION_TEXT_CHARS: 75,
  /** static_select: max options. */
  STATIC_SELECT_OPTIONS: 100,
  /** Elements in an actions block. */
  ACTIONS_ELEMENTS: 25,
  /** Overflow menu options. */
  OVERFLOW_OPTIONS: 5,
  /** Modal title max length. */
  MODAL_TITLE_CHARS: 24,
  /** `trigger_id` must be used within this window. */
  TRIGGER_ID_MS: 3000,
  /** Ack deadline for every interaction. */
  ACK_MS: 3000,
} as const;
