import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * HTML sanitization for vendor-authored rich text (product descriptions).
 *
 * Descriptions are written in the vendor Tiptap editor and stored as HTML.
 * They are semi-trusted content, so we MUST sanitize before rendering with
 * `dangerouslySetInnerHTML` to prevent stored XSS. The allowlist below mirrors
 * exactly the nodes/marks the editor can produce; anything else is stripped.
 *
 * IMPORTANT: this module is `server-only`. Sanitization runs during the server
 * render and the CLEAN html is handed to the client as a plain string prop, so
 * this parser never ships to the browser. (The previous `isomorphic-dompurify`
 * pulled in `jsdom`, whose transitive `require()` of an ESM-only module crashes
 * on Vercel's serverless runtime — `sanitize-html` is a pure-JS parser with no
 * jsdom/DOM dependency, so it runs anywhere Node does.)
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

/**
 * CSS properties the editor can set (text alignment, basic typography/colour).
 * Anything else in a `style` attribute is dropped; sanitize-html also parses
 * the CSS and rejects `url(javascript:…)` / `expression()` vectors.
 */
const ALLOWED_STYLES: sanitizeHtml.IOptions["allowedStyles"] = {
  "*": {
    "text-align": [/^(left|right|center|justify)$/],
    color: [/^#(0x)?[0-9a-f]+$/i, /^(rgb|hsl)a?\([\d\s.,%/]+\)$/i, /^[a-z-]+$/i],
    "background-color": [
      /^#(0x)?[0-9a-f]+$/i,
      /^(rgb|hsl)a?\([\d\s.,%/]+\)$/i,
      /^[a-z-]+$/i,
    ],
    "font-weight": [/^(normal|bold|bolder|lighter|\d{3})$/],
    "font-style": [/^(normal|italic|oblique)$/],
    "text-decoration": [/^[a-z\s-]+$/i],
  },
};

/** Sanitize vendor-authored rich-text HTML to a safe subset for rendering. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "loading", "decoding"],
      // class + style are allowed globally (mirrors the old DOMPurify config).
      "*": ["class", "style"],
    },
    allowedStyles: ALLOWED_STYLES,
    // Only http(s), mailto and in-page (#) links survive; no data:/javascript:.
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    // Drop disallowed tags but keep their text (matches DOMPurify's default).
    disallowedTagsMode: "discard",
    transformTags: {
      // Force external links to open safely (DOMPurify afterSanitize hook).
      a: (tagName, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      }),
      // Make embedded images lazy/async.
      img: (tagName, attribs) => ({
        tagName: "img",
        attribs: { ...attribs, loading: "lazy", decoding: "async" },
      }),
    },
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

/**
 * Resolve a raw description to sanitized HTML, or null when it's legacy
 * plain text (the caller renders that with `whitespace-pre-line`). Centralizes
 * the html-vs-text decision on the server so the client never imports the
 * sanitizer.
 */
export function renderDescriptionHtml(
  description: string | null | undefined,
): string | null {
  const text = description?.trim();
  if (!text || !looksLikeHtml(text)) return null;
  return sanitizeRichText(text);
}
