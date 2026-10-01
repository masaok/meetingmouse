import { parse as parseYaml } from "yaml";
import { z } from "zod";

export const TITLE_MAX_CHARS = 60;
export const DESCRIPTION_MIN_CHARS = 120;
export const DESCRIPTION_MAX_CHARS = 160;

/** `Date.parse` rolls 2026-02-30 over to March, so the day is read back and compared. */
const isRealDate = (v: string): boolean =>
  /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2}))?$/.test(v) &&
  !isNaN(Date.parse(v)) &&
  new Date(`${v.slice(0, 10)}T00:00:00Z`).toISOString().startsWith(v.slice(0, 10));

const isoDate = z
  .string()
  .refine(isRealDate, "must be an ISO 8601 date, such as 2026-10-01");

/** A post's front matter. `docs/BLOG.md` describes each field. */
export const postMetaSchema = z.strictObject({
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be lowercase words joined by hyphens"),
  title: z.string().min(1).max(TITLE_MAX_CHARS),
  description: z.string().min(DESCRIPTION_MIN_CHARS).max(DESCRIPTION_MAX_CHARS),
  primaryKeyword: z.string().min(1),
  secondaryKeywords: z.array(z.string().min(1)),
  tags: z.array(z.string().min(1)).min(1),
  author: z.string().min(1),
  createdAt: isoDate,
  publishedAt: isoDate,
  updatedAt: isoDate.optional(),
  draft: z.boolean(),
});

export type PostMeta = z.infer<typeof postMetaSchema>;
export type Post = PostMeta & { body: string };

export type ParsedPost = { ok: true; post: Post } | { ok: false; problems: string[] };

const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

/** The one place a post file becomes a typed `Post`. Every problem names its field. */
export function parsePost(file: string, source: string): ParsedPost {
  const match = FRONT_MATTER.exec(source);
  if (!match) return { ok: false, problems: [`${file}: no front matter block`] };
  let data: unknown;
  try {
    data = parseYaml(match[1]);
  } catch (error) {
    return {
      ok: false,
      problems: [`${file}: front matter is not YAML: ${String(error)}`],
    };
  }
  const meta = postMetaSchema.safeParse(data);
  if (!meta.success) {
    return {
      ok: false,
      problems: meta.error.issues.map(
        (issue) => `${file}: ${issue.path.join(".") || "front matter"}: ${issue.message}`,
      ),
    };
  }
  const body = match[2].trim();
  if (!body) return { ok: false, problems: [`${file}: body: the post has no body`] };
  return { ok: true, post: { ...meta.data, body } };
}
