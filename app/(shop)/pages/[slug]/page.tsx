import * as React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { getCmsPage, NotFoundError } from "@/lib/api/server";
import { formatDate } from "@/lib/format";

export const revalidate = 300;

/**
 * Opts the route into ISR (render once per slug, serve cached HTML for
 * `revalidate` seconds) — see the note on the product page.
 */
export function generateStaticParams() {
  return [];
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const page = await getCmsPage(slug);
    return { title: page.title };
  } catch {
    return { title: "Page not found" };
  }
}

/**
 * Render `**bold**` spans inside a line of text. Splits on the bold markers and
 * emits <strong> for the captured segments, plain text otherwise.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    const match = /^\*\*([^*]+)\*\*$/.exec(part);
    if (match) {
      return (
        <strong key={`${keyPrefix}-b-${i}`} className="font-bold text-ink">
          {match[1]}
        </strong>
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${i}`}>{part}</React.Fragment>;
  });
}

/**
 * Minimal markdown renderer (no markdown lib available). Supports `#`/`##`/`###`
 * headings, `- ` unordered lists (consecutive items grouped), `**bold**` inline,
 * and paragraphs separated by blank lines.
 */
function renderMarkdown(body: string): React.ReactNode[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    out.push(
      <ul
        key={`ul-${out.length}`}
        className="my-3 list-disc space-y-1.5 pl-6 text-sub leading-relaxed marker:text-primary"
      >
        {items.map((item, i) => (
          <li key={`li-${i}`}>{renderInline(item, `ul-${out.length}-li-${i}`)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const key = `line-${idx}`;

    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      return;
    }
    flushList();

    if (line.startsWith("### ")) {
      out.push(
        <h3 key={key} className="mt-6 font-display text-lg font-extrabold text-ink">
          {renderInline(line.slice(4), key)}
        </h3>,
      );
    } else if (line.startsWith("## ")) {
      out.push(
        <h2 key={key} className="mt-6 font-display text-xl font-extrabold text-ink">
          {renderInline(line.slice(3), key)}
        </h2>,
      );
    } else if (line.startsWith("# ")) {
      out.push(
        <h1 key={key} className="mt-6 font-display text-2xl font-extrabold text-ink">
          {renderInline(line.slice(2), key)}
        </h1>,
      );
    } else if (line.trim() === "") {
      // Blank line → paragraph break; nothing to emit.
    } else {
      out.push(
        <p key={key} className="my-3 text-sub leading-relaxed">
          {renderInline(line, key)}
        </p>,
      );
    }
  });

  flushList();
  return out;
}

export default async function CmsPageRoute({ params }: PageProps) {
  const { slug } = await params;

  let page;
  try {
    page = await getCmsPage(slug);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="wrap py-8 max-w-3xl">
      <Breadcrumbs items={[{ label: page.title }]} />

      <article className="mt-5">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          {page.title}
        </h1>
        <p className="mt-1.5 text-[13px] font-semibold text-faint">
          Last updated {formatDate(page.updatedAt)}
        </p>

        <div className="mt-6">{renderMarkdown(page.body)}</div>
      </article>
    </div>
  );
}
