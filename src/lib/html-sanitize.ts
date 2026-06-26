/**
 * HTML sanitization for the Tool Builder's HTML Sanitize node.
 *
 * Wraps `sanitize-html` with a layout-preserving allowlist: structural,
 * text, table, media, SVG, and form-display tags are kept so a converted page
 * still renders, while dangerous content (scripts, event handlers, unsafe URL
 * schemes, `<iframe>`/`<object>`/`<embed>`) is always stripped. Two toggles
 * widen the allowlist for styling and images. Runs entirely client-side — no
 * network, nothing leaves the browser.
 */
import sanitizeHtml from "sanitize-html";

/** Structural / text / table / SVG / form-display tags we always permit. */
const ALLOWED_TAGS = [
  // document + landmarks. <base> is kept because the site proxy injects
  // `<base href>` so relative image/asset URLs resolve against the original
  // host — dropping it breaks every relative <img> in the themed frame.
  "html",
  "head",
  "title",
  "base",
  "body",
  "header",
  "footer",
  "main",
  "nav",
  "section",
  "article",
  "aside",
  "figure",
  "figcaption",
  "address",
  "hgroup",
  // flow + text
  "div",
  "span",
  "p",
  "a",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "blockquote",
  "pre",
  "hr",
  "br",
  "wbr",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "b",
  "i",
  "strong",
  "em",
  "small",
  "s",
  "u",
  "sub",
  "sup",
  "mark",
  "abbr",
  "code",
  "kbd",
  "samp",
  "var",
  "time",
  "cite",
  "q",
  "del",
  "ins",
  // tables
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "caption",
  "colgroup",
  "col",
  // media containers (sources gated by allowImages)
  "picture",
  "source",
  "video",
  "audio",
  "track",
  // svg
  "svg",
  "path",
  "g",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "defs",
  "use",
  "symbol",
  "desc",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "text",
  "tspan",
  // interactive (display only — never executed)
  "button",
  "form",
  "label",
  "fieldset",
  "legend",
  "select",
  "option",
  "optgroup",
  "textarea",
  "input",
  "datalist",
  "output",
  "progress",
  "meter",
  "details",
  "summary",
  "dialog",
];

/** Presentation attributes kept on SVG elements regardless of `allowStyles`. */
const SVG_ATTRS = [
  "viewbox",
  "viewBox",
  "xmlns",
  "xmlns:xlink",
  "preserveaspectratio",
  "preserveAspectRatio",
  "d",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "fill-rule",
  "clip-rule",
  "opacity",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "points",
  "width",
  "height",
  "transform",
  "offset",
  "stop-color",
  "stop-opacity",
  "gradientunits",
  "gradientUnits",
  "gradienttransform",
  "gradientTransform",
  "patternunits",
  "href",
  "xlink:href",
];

/**
 * Build the `sanitize-html` options for the node's two toggles.
 *
 * @param allowStyles - Keep `<style>` blocks, inline `style`, `class`/`id`.
 * @param allowImages - Keep `<img>` and `data:` image URIs.
 */
function buildOptions(
  allowStyles: boolean,
  allowImages: boolean,
): sanitizeHtml.IOptions {
  const tags = [...ALLOWED_TAGS];
  if (allowImages) {
    tags.push("img");
  }
  if (allowStyles) {
    tags.push("style");
  }

  // Per-element attribute allowlist. The `*` entry applies to every tag.
  const starAttrs = ["title", "dir", "lang", "role", "data-*", "aria-*"];
  if (allowStyles) {
    starAttrs.push("style", "class", "id");
  }

  const allowedAttributes: sanitizeHtml.IOptions["allowedAttributes"] = {
    "*": starAttrs,
    base: ["href", "target"],
    a: ["href", "name", "target", "rel"],
    source: ["srcset", "src", "type", "media", "sizes"],
    video: [
      "src",
      "poster",
      "controls",
      "width",
      "height",
      "preload",
      "loop",
      "muted",
      "playsinline",
    ],
    audio: ["src", "controls", "preload", "loop", "muted"],
    track: ["src", "kind", "srclang", "label", "default"],
    input: [
      "type",
      "value",
      "placeholder",
      "name",
      "checked",
      "disabled",
      "readonly",
      "min",
      "max",
      "step",
    ],
    button: ["type", "value", "name", "disabled"],
    option: ["value", "selected", "disabled"],
    label: ["for"],
    td: ["colspan", "rowspan", "headers"],
    th: ["colspan", "rowspan", "headers", "scope"],
    col: ["span"],
    colgroup: ["span"],
    // every SVG element shares the presentation attribute set
    svg: SVG_ATTRS,
    path: SVG_ATTRS,
    g: SVG_ATTRS,
    circle: SVG_ATTRS,
    rect: SVG_ATTRS,
    line: SVG_ATTRS,
    polyline: SVG_ATTRS,
    polygon: SVG_ATTRS,
    ellipse: SVG_ATTRS,
    use: SVG_ATTRS,
    symbol: SVG_ATTRS,
    stop: SVG_ATTRS,
    lineargradient: SVG_ATTRS,
    radialgradient: SVG_ATTRS,
    clippath: SVG_ATTRS,
    mask: SVG_ATTRS,
    text: SVG_ATTRS,
    tspan: SVG_ATTRS,
    defs: SVG_ATTRS,
  };
  if (allowImages) {
    allowedAttributes.img = [
      "src",
      "alt",
      "width",
      "height",
      "srcset",
      "sizes",
      "loading",
      "decoding",
    ];
  }

  // When styles are allowed, <style> must stay OUT of nonTextTags so its CSS
  // text survives. When they're disallowed it must go IN, otherwise discarding
  // the <style> tag would leak its raw CSS into the page as visible text.
  const nonTextTags = ["script", "noscript", "textarea", "option"];
  if (!allowStyles) {
    nonTextTags.push("style");
  }

  return {
    allowedTags: tags,
    allowedAttributes,
    nonTextTags,
    allowedSchemes: ["http", "https", "mailto", "tel", "ftp"],
    allowedSchemesByTag: allowImages ? { img: ["http", "https", "data"] } : {},
    allowProtocolRelative: true,
    // Drop the *content* of disallowed tags (e.g. <iframe>, <object>) too.
    disallowedTagsMode: "discard",
    // <style> is flagged "vulnerable" because CSS can carry legacy XSS vectors
    // (url(javascript:), expression()). We opt in deliberately: the only
    // consumer is the Themed node's script-disabled sandbox iframe, where such
    // vectors can't execute, and keeping CSS is the point of "Keep styles".
    allowVulnerableTags: allowStyles,
  };
}

/**
 * Sanitize an HTML string, preserving page layout while removing anything
 * executable or unsafe.
 *
 * @param html - Raw HTML to clean ("" returns "").
 * @param allowStyles - Keep styling (`<style>`, inline `style`, `class`/`id`).
 * @param allowImages - Keep images (`<img>` and `data:` image URIs).
 * @returns The sanitized HTML.
 */
export function sanitizeHtmlDoc(
  html: string,
  allowStyles: boolean,
  allowImages: boolean,
): string {
  if (!html) {
    return "";
  }
  return sanitizeHtml(html, buildOptions(allowStyles, allowImages));
}

/* ===================================================================== *
 * SVG icon sanitization — for the per-tool sidebar icon.
 * ===================================================================== */

/** SVG shape/paint tags allowed inside a tool icon (no `<image>`, no `<a>`). */
const SVG_ICON_TAGS = [
  "svg",
  "path",
  "g",
  "circle",
  "rect",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "defs",
  "use",
  "symbol",
  "desc",
  "title",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  "mask",
  "text",
  "tspan",
];

/**
 * Paint/geometry attributes for the icon's inner shapes. Reuses the node
 * sanitizer's {@link SVG_ATTRS} but drops `href`/`xlink:href` — an icon never
 * needs to reference an external resource, and dropping them closes the only
 * URL-bearing attribute (no `data:`/remote fetch, no exfil vector).
 */
const SVG_ICON_SHAPE_ATTRS = SVG_ATTRS.filter(
  (a) => a !== "href" && a !== "xlink:href",
);

/**
 * Root `<svg>` attributes. Intentionally excludes `width`/`height` so the
 * render wrapper controls the size via CSS (consistent icon column), while
 * `viewBox` is kept so the artwork still scales.
 */
const SVG_ICON_ROOT_ATTRS = [
  "viewbox",
  "viewBox",
  "xmlns",
  "xmlns:xlink",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "fill-rule",
  "clip-rule",
  "preserveaspectratio",
  "preserveAspectRatio",
  "role",
  "aria-hidden",
  "class",
];

/** Per-tag attribute allowlist for {@link sanitizeSvgIcon}. */
const SVG_ICON_ATTRS: sanitizeHtml.IOptions["allowedAttributes"] = {
  svg: SVG_ICON_ROOT_ATTRS,
  ...Object.fromEntries(
    SVG_ICON_TAGS.filter((t) => t !== "svg").map((t) => [
      t,
      SVG_ICON_SHAPE_ATTRS,
    ]),
  ),
};

/**
 * Sanitize a raw SVG string down to a safe, inline-renderable icon.
 *
 * Strips everything that isn't pure SVG artwork — `<script>`, `<style>`,
 * `<foreignObject>`, `<image>`, `<a>`, every `on*` handler, and any URL-bearing
 * attribute — leaving only shapes, paths, gradients, and presentation
 * attributes. The result is safe to inject via `dangerouslySetInnerHTML`.
 *
 * Returns `""` when the input is blank or contains no `<svg>` root, so callers
 * can treat a falsy result as "no icon" and render their fallback glyph.
 *
 * @param svg - Raw SVG markup (hand-written or AI-generated).
 * @returns Sanitized SVG markup, or `""` if there is nothing renderable.
 */
export function sanitizeSvgIcon(svg: string): string {
  if (!svg?.trim()) {
    return "";
  }
  const clean = sanitizeHtml(svg, {
    allowedTags: SVG_ICON_TAGS,
    allowedAttributes: SVG_ICON_ATTRS,
    // No URL-bearing attributes survive the allowlist, so no scheme is needed.
    allowedSchemes: [],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    parser: { lowerCaseAttributeNames: false },
  }).trim();
  // Require a real <svg> root — a stripped fragment isn't a usable icon.
  return /<svg[\s>]/i.test(clean) ? clean : "";
}
