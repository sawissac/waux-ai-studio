"use client";

import { formatHex, parse as parseCssColor } from "culori";
import { MousePointerClick, Palette, RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { VIEWPORT_DEVICES } from "@/constants/tool-builder";
import {
  DeviceFrame,
  DeviceToggle,
} from "@/features/PreviewPane/components/DeviceFrame";
import type { ViewportDevice } from "@/types/tool-builder";

/** Editable color slots surfaced for a selected element. */
const FIELDS = [
  { key: "color", label: "Text" },
  { key: "background-color", label: "Background" },
  { key: "border-color", label: "Border" },
] as const;

/** Map a picker field to the `select` message field carrying its current value. */
const FIELD_SOURCE: Record<string, "color" | "background" | "border"> = {
  color: "color",
  "background-color": "background",
  "border-color": "border",
};

/** A live override: paint `prop` = `value` on every element matching `selector`. */
interface Rule {
  selector: string;
  prop: string;
  value: string;
}

/** What the in-frame controller reports about a clicked element. */
interface Selection {
  /** CSS selector matching the element and every identical sibling. */
  selector: string;
  /** Current computed colors, as opaque hex for `<input type="color">`. */
  color: string;
  background: string;
  border: string;
}

/** Resolve any CSS color (rgb/rgba/named/hex) to an opaque hex; fallback black. */
function toHex(css: string | undefined): string {
  const parsed = css ? parseCssColor(css) : null;
  return parsed ? formatHex(parsed) : "#000000";
}

/**
 * In-frame controller injected into the previewed document. It runs in a
 * sandboxed (`allow-scripts`, unique-origin) iframe — the site's own scripts
 * are already stripped upstream, so this is the only script present. It:
 *   - outlines elements on hover and turns the cursor into a pointer,
 *   - on click, posts the element's selector + current computed colors up to
 *     the parent (and suppresses the page's own click handling),
 *   - applies `apply` / `applyAll` color messages back down by setting inline
 *     `!important` styles on every element the selector matches.
 *
 * `FID` scopes messages to one node — several Themed nodes can be on screen at
 * once without cross-talk. On load it announces `ready` so the parent can
 * replay overrides after any reload/remount.
 */
function controllerScript(frameId: string): string {
  return `<script>(function(){
  var FID=${JSON.stringify(frameId)};
  function sel(el){
    if(!el||!el.tagName) return "";
    var t=el.tagName.toLowerCase();
    if(el.classList&&el.classList.length){
      return t+Array.prototype.map.call(el.classList,function(c){
        return "."+((window.CSS&&CSS.escape)?CSS.escape(c):c);
      }).join("");
    }
    return t;
  }
  document.addEventListener("mouseover",function(e){
    var el=e.target;
    if(el&&el.style){el.style.outline="2px solid #6366f1";el.style.outlineOffset="-2px";el.style.cursor="pointer";}
  },true);
  document.addEventListener("mouseout",function(e){
    var el=e.target;
    if(el&&el.style){el.style.outline="";el.style.outlineOffset="";el.style.cursor="";}
  },true);
  document.addEventListener("click",function(e){
    e.preventDefault();e.stopPropagation();
    var el=e.target,s=sel(el);
    if(!s) return;
    el.style.outline="";
    var cs=getComputedStyle(el);
    parent.postMessage({__themed:FID,type:"select",selector:s,color:cs.color,background:cs.backgroundColor,border:cs.borderTopColor},"*");
  },true);
  function paint(r){
    try{document.querySelectorAll(r.selector).forEach(function(n){n.style.setProperty(r.prop,r.value,"important");});}catch(_){}
  }
  window.addEventListener("message",function(e){
    var d=e.data;
    if(!d||d.__themed!==FID) return;
    if(d.type==="apply"){paint(d);}
    else if(d.type==="applyAll"){(d.rules||[]).forEach(paint);}
  });
  parent.postMessage({__themed:FID,type:"ready"},"*");
})();</script>`;
}

/** Splice the controller script in just before the document closes. */
function withController(html: string, frameId: string, nonce: number): string {
  const tag = `<!--themed:${nonce}-->${controllerScript(frameId)}`;
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${tag}</body>`);
  }
  if (/<\/html>/i.test(html)) {
    return html.replace(/<\/html>/i, `${tag}</html>`);
  }
  return html + tag;
}

/**
 * Themed website node body: read a static HTML document from the bound state
 * slot (typically a Convert to HTML node's output — CSS inlined, scripts
 * stripped) and render it in a sandboxed iframe. Clicking any element in the
 * preview selects it; the color pickers then recolor that element **and every
 * identical element** (same tag + classes) live, without reloading the page.
 *
 * Overrides are kept in the parent and replayed whenever the frame reloads
 * (device switch, source change), so edits survive remounts. They are
 * preview-session state — they reset when the source document changes.
 *
 * @param props.html - Static HTML document from the bound state ("" = empty).
 * @param props.height - Frame height in px (`responsive` screen).
 * @param props.hasBinding - Whether a state slot is bound to read from.
 * @param props.device - Simulated screen (shared across the preview's frames).
 * @param props.onDeviceChange - Switch the shared simulated screen.
 */
export function ThemedSite({
  html,
  height,
  hasBinding,
  device,
  onDeviceChange,
}: {
  html: string;
  height: number;
  hasBinding: boolean;
  device: ViewportDevice;
  onDeviceChange: (next: ViewportDevice) => void;
}) {
  const frameId = useId();
  /** Override rules keyed by selector → prop → value. */
  const [overrides, setOverrides] = useState<
    Record<string, Record<string, string>>
  >({});
  const [selected, setSelected] = useState<Selection | null>(null);
  /** Bumped to force a clean iframe reload (source change / reset). */
  const [nonce, setNonce] = useState(0);

  /** Latest overrides for the message handler (avoids stale closures). */
  const overridesRef = useRef(overrides);
  overridesRef.current = overrides;
  /** The frame's content window, captured from its messages. */
  const frameWin = useRef<Window | null>(null);

  // Edits belong to one document — reset when the source changes.
  useEffect(() => {
    setOverrides({});
    setSelected(null);
    setNonce((n) => n + 1);
  }, [html]);

  // Listen for the frame's selection clicks and reload handshakes.
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const d = e.data as {
        __themed?: string;
        type?: string;
        selector?: string;
        color?: string;
        background?: string;
        border?: string;
      } | null;
      if (d?.__themed !== frameId) {
        return;
      }
      frameWin.current = e.source as Window | null;
      if (d.type === "ready") {
        // Replay every override into the freshly (re)loaded document.
        const rules = flattenOverrides(overridesRef.current);
        (e.source as Window | null)?.postMessage(
          { __themed: frameId, type: "applyAll", rules },
          "*",
        );
      } else if (d.type === "select" && d.selector) {
        setSelected({
          selector: d.selector,
          color: toHex(d.color),
          background: toHex(d.background),
          border: toHex(d.border),
        });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [frameId]);

  /** Paint `prop` = `value` on the selection's matches, live + persisted. */
  const applyColor = (prop: string, value: string) => {
    if (!selected) {
      return;
    }
    const { selector } = selected;
    setOverrides((prev) => ({
      ...prev,
      [selector]: { ...prev[selector], [prop]: value },
    }));
    frameWin.current?.postMessage(
      { __themed: frameId, type: "apply", selector, prop, value },
      "*",
    );
    setSelected((s) => (s ? { ...s, [FIELD_SOURCE[prop]]: value } : s));
  };

  const resetColors = () => {
    setOverrides({});
    setSelected(null);
    setNonce((n) => n + 1); // clean reload drops all inline overrides
  };

  const themedHtml = useMemo(
    () => (html ? withController(html, frameId, nonce) : ""),
    [html, frameId, nonce],
  );

  const changed = Object.keys(overrides).length > 0;
  const dims = VIEWPORT_DEVICES.find((d) => d.value === device && d.width);

  if (!hasBinding || !html) {
    return (
      <div
        style={{ height }}
        className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 text-center text-xs text-muted-foreground"
      >
        <Palette size={20} className="opacity-30" />
        {hasBinding
          ? "Waiting for page HTML — point a Convert to HTML node's output at the bound state."
          : "Bind a state slot holding page HTML — e.g. a Convert to HTML node's output."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">
            {selected ? (
              <span className="font-mono text-[11px] font-normal text-muted-foreground">
                {selected.selector}
              </span>
            ) : (
              "Click an element to recolor it"
            )}
          </span>
          {changed && (
            <button
              type="button"
              onClick={resetColors}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors duration-(--motion-duration-fast) hover:bg-accent hover:text-foreground"
            >
              <RotateCcw size={11} /> Reset colors
            </button>
          )}
        </div>
        {selected ? (
          <div className="grid grid-cols-3 gap-2">
            {FIELDS.map((f) => {
              const value = selected[FIELD_SOURCE[f.key]];
              return (
                <label
                  key={f.key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 bg-background px-2 py-1.5"
                >
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => applyColor(f.key, e.target.value)}
                    className="size-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-semibold text-muted-foreground">
                      {f.label}
                    </span>
                    <span className="block truncate font-mono text-[11px]">
                      {value}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <MousePointerClick size={12} className="shrink-0" />
            Hover highlights an element. Click it to change its color — every
            identical element updates too.
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">
          Recolored site
        </span>
        <DeviceToggle value={device} onChange={onDeviceChange} />
      </div>
      <DeviceFrame
        srcDoc={themedHtml}
        title="Themed website"
        device={device}
        height={height}
        sandbox="allow-scripts"
      />
      <p className="truncate font-mono text-[11px] text-muted-foreground">
        {dims ? `${dims.width}×${dims.height} · ` : ""}static snapshot from
        state, scripts removed
      </p>
    </div>
  );
}

/** Flatten the selector→prop→value map into a flat list of paint rules. */
function flattenOverrides(
  overrides: Record<string, Record<string, string>>,
): Rule[] {
  const rules: Rule[] = [];
  for (const [selector, props] of Object.entries(overrides)) {
    for (const [prop, value] of Object.entries(props)) {
      rules.push({ selector, prop, value });
    }
  }
  return rules;
}
