import * as React from "react";
import Link from "next/link";

/**
 * Tiny markdown renderer for assistant replies — deliberately NOT a full
 * markdown engine (no dependency, no HTML injection surface). Supports
 * exactly what the system prompt allows the model to emit:
 *   - paragraphs (blank-line separated)
 *   - "- " bullet lists
 *   - **bold**
 *   - `inline code` (order numbers, coupon codes)
 *   - [label](/relative/path) links — internal paths render as <Link>;
 *     anything else (external/js:) renders as plain text, by policy.
 */

const INLINE_RE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|`([^`\n]+)`/g;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const match of text.matchAll(INLINE_RE)) {
    const idx = match.index;
    if (idx > last) nodes.push(text.slice(last, idx));
    if (match[1] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-bold">
          {match[1]}
        </strong>,
      );
    } else if (match[2] !== undefined && match[3] !== undefined) {
      const href = match[3];
      if (href.startsWith("/")) {
        nodes.push(
          <Link
            key={`${keyPrefix}-a${i}`}
            href={href}
            className="font-semibold text-primary underline underline-offset-2 hover:text-primary-hover"
          >
            {match[2]}
          </Link>,
        );
      } else {
        // External or malformed target — render the label only.
        nodes.push(match[2]);
      }
    } else if (match[4] !== undefined) {
      nodes.push(
        <code
          key={`${keyPrefix}-c${i}`}
          className="rounded bg-muted px-1 py-0.5 font-mono text-12 font-semibold text-ink"
        >
          {match[4]}
        </code>,
      );
    }
    last = idx + match[0].length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] };

function toBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let list: string[] | null = null;
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimEnd();
    if (/^\s*[-*] /.test(line)) {
      list ??= [];
      list.push(line.replace(/^\s*[-*] /, ""));
      continue;
    }
    if (list) {
      blocks.push({ kind: "ul", items: list });
      list = null;
    }
    if (line.trim()) blocks.push({ kind: "p", text: line });
  }
  if (list) blocks.push({ kind: "ul", items: list });
  return blocks;
}

const MarkdownBlocks = React.memo(function MarkdownBlocks({
  text,
}: {
  text: string;
}) {
  const blocks = toBlocks(text);
  return (
    <>
      {blocks.map((block, bi) =>
        block.kind === "ul" ? (
          <ul key={bi} className="my-1 list-disc space-y-0.5 pl-4">
            {block.items.map((item, li) => (
              <li key={li}>{renderInline(item, `${bi}-${li}`)}</li>
            ))}
          </ul>
        ) : (
          <p key={bi} className="my-0.5">
            {renderInline(block.text, `${bi}`)}
          </p>
        ),
      )}
    </>
  );
});

/**
 * `streaming` splits the text at the last completed paragraph so the stable
 * prefix (a memoized subtree) stops re-parsing on every token flush — only the
 * still-growing tail re-tokenizes per frame. Splitting on the blank line keeps
 * the output identical to a single parse: a paragraph break ends a block (and
 * a list) in toBlocks either way, and inline parsing is per-line.
 */
export function MarkdownLite({
  text,
  streaming = false,
}: {
  text: string;
  streaming?: boolean;
}) {
  if (!streaming) return <MarkdownBlocks text={text} />;
  const splitAt = text.lastIndexOf("\n\n");
  if (splitAt === -1) return <MarkdownBlocks text={text} />;
  return (
    <>
      <MarkdownBlocks text={text.slice(0, splitAt)} />
      <MarkdownBlocks text={text.slice(splitAt + 2)} />
    </>
  );
}
