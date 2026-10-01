import { Marked, type Token, type Tokens } from "marked";

export interface TocEntry {
  id: string;
  text: string;
}

export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Post body to HTML. Second-level headings get ids and are returned as the table of contents. */
export function renderMarkdown(body: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const used = new Map<string, number>();
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth, text }: Tokens.Heading) {
        const base = headingId(text);
        const n = used.get(base) ?? 0;
        used.set(base, n + 1);
        const id = n === 0 ? base : `${base}-${n}`;
        if (depth === 2) toc.push({ id, text });
        return `<h${depth} id="${id}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
    },
  });
  const html = (marked.parse(body, { async: false }) as string)
    .replaceAll("<table>", '<div class="table-scroll"><table>')
    .replaceAll("</table>", "</table></div>");
  return { html, toc };
}

/** Every token in the body, nested ones included. */
export function allTokens(body: string): Token[] {
  const out: Token[] = [];
  const marked = new Marked({ gfm: true, walkTokens: (token) => void out.push(token) });
  marked.parse(body, { async: false });
  return out;
}

export function firstParagraph(body: string): string {
  const first = new Marked({ gfm: true }).lexer(body).find((t) => t.type === "paragraph");
  return first ? (first as Tokens.Paragraph).text : "";
}
