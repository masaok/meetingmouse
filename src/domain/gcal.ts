export interface GcalEvent {
  title: string;
  start: Date;
  end: Date;
  details?: string;
  location?: string;
}

const GCAL_BASE = "https://calendar.google.com/calendar/render";

/** `YYYYMMDDTHHmmssZ`, the UTC form Google's template URL accepts. */
export function gcalInstant(d: Date): string {
  return d
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

/** "Add to Google Calendar" template link. No auth, opens a prefilled event. */
export function gcalUrl({ title, start, end, details, location }: GcalEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${gcalInstant(start)}/${gcalInstant(end)}`,
  });
  if (details) params.set("details", details);
  if (location) params.set("location", location);
  return `${GCAL_BASE}?${params.toString()}`;
}
