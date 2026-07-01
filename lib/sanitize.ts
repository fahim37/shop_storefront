import DOMPurify from "isomorphic-dompurify";

/**
 * HTML sanitization for vendor-authored rich text (product descriptions).
 *
 * Descriptions are written in the vendor Tiptap editor and stored as HTML.
 * They are semi-trusted content, so we MUST sanitize before rendering with
 * `dangerouslySetInnerHTML` to prevent stored XSS. The allowlist below mirrors
 * exactly the nodes/marks the editor can produce; anything else is stripped.
 */

/** Tags the editor emits (headings, lists, formatting, links, images, code). */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "del",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "code",
  "pre",
  "hr",
  "span",
];

const ALLOWED_ATTR = [
  "href",
  "target",
  "rel",
  "src",
  "alt",
  "title",
  "class",
  "style",
  "loading",
  "decoding",
];

let hooksInstalled = false;

/**
 * Install afterSanitize hooks once per runtime: force external links to open
 * safely and make images lazy/async. DOMPurify itself already blocks
 * javascript:/data: URLs and strips event-handler attributes.
 */
function ensureHooks(): void {
  if (hooksInstalled) return;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    const el = node as Element;
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer nofollow");
    }
    if (el.tagName === "IMG") {
      el.setAttribute("loading", "lazy");
      el.setAttribute("decoding", "async");
    }
  });
  hooksInstalled = true;
}

/** Sanitize vendor-authored rich-text HTML to a safe subset for rendering. */
export function sanitizeRichText(html: string): string {
  ensureHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    // Only http(s) and mailto links survive; everything else is dropped.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
  });
}

/**
 * Heuristic to tell a legacy plain-text description from HTML rich text.
 * Legacy descriptions were saved as raw text (rendered with `whitespace-pre-line`);
 * the editor now stores markup.
 */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}
