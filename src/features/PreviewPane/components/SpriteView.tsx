"use client";

/**
 * Sprite animation viewer for the Tool Builder's Sprite node (preview-only).
 *
 * Each {@link SpriteNode} track resolves its source from its own `binding` (or
 * the node's default `binding` when blank). Two source shapes are supported:
 *
 * - A single **sprite sheet** image (URL / `data:` URL). Its natural size is
 *   read on load and sliced into a grid of `frameWidth` × `frameHeight` cells
 *   (left-to-right, top-to-bottom); the cells play as a flip-book via stepped
 *   `background-position`.
 * - An **array of frame images** (or a JSON string of one). Each element — an
 *   image URL, a `data:` URL, or an object with a `src` / `url` field — is one
 *   full frame, swapped per tick.
 *
 * Playback runs at the node's `fps`. The idle track auto-plays and loops;
 * play-once tracks (intro / click) run a single cycle and settle back to idle.
 * The component never writes to state.
 */
import { Film, Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "@/hooks/useTranslation";
import { resolveBinding, type StateMap } from "@/lib/tool-builder-runtime";
import { cn } from "@/lib/utils";
import type {
  SpriteAction,
  SpriteAnimation,
  SpriteNode,
  StateNode,
} from "@/types/tool-builder";

/** Coerce one array element to an image source string. */
function elementToSrc(el: unknown): string {
  if (typeof el === "string") {
    return el.trim();
  }
  if (el && typeof el === "object") {
    const o = el as Record<string, unknown>;
    const src = o.src ?? o.url ?? o.image ?? o.dataUrl ?? o.frame;
    return typeof src === "string" ? src.trim() : "";
  }
  return "";
}

/**
 * Normalize a bound state value into an ordered list of image sources. Accepts
 * an array, a JSON string of an array, or a single image URL / data URL. A
 * single source is treated as a sprite sheet; multiple sources as frames.
 */
function toSources(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(elementToSrc).filter(Boolean);
  }
  if (typeof value === "string") {
    const s = value.trim();
    if (!s) {
      return [];
    }
    if (s.startsWith("[")) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          return parsed.map(elementToSrc).filter(Boolean);
        }
      } catch {
        // fall through — treat as a single source
      }
    }
    return [s];
  }
  return [];
}

/** Resolve the image source(s) for one animation track (falls back to default). */
function sourcesFor(
  anim: SpriteAnimation | undefined,
  node: SpriteNode,
  runtime: StateMap,
  stateNode: StateNode | null,
): string[] {
  if (!anim) {
    return [];
  }
  const binding = anim.binding.value ? anim.binding : node.binding;
  const name = resolveBinding(binding, stateNode);
  return toSources(name ? runtime[name] : undefined);
}

/** Natural pixel size of a loaded image, or null while loading / on error. */
function useImageSize(src: string): { w: number; h: number } | null {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setSize(null);
    if (!src) {
      return;
    }
    let alive = true;
    const img = new Image();
    img.onload = () => {
      if (alive) {
        setSize({ w: img.naturalWidth, h: img.naturalHeight });
      }
    };
    img.onerror = () => {
      if (alive) {
        setSize(null);
      }
    };
    img.src = src;
    return () => {
      alive = false;
    };
  }, [src]);
  return size;
}

/**
 * Render a bound sprite sheet (or frame array) as an interactive animation.
 *
 * @param props.node - The Sprite node config (frame size, fps, tracks).
 * @param props.runtime - Live state map the bound slots are read from.
 * @param props.stateNode - Tool state node, for binding resolution.
 */
export function SpriteView({
  node,
  runtime,
  stateNode,
}: {
  node: SpriteNode;
  runtime: StateMap;
  stateNode: StateNode | null;
}): React.ReactElement {
  const { t } = useTranslation();
  const animations = node.animations;

  const idleAction: SpriteAction | undefined =
    animations.find((a) => a.action === "idle")?.action ??
    animations[0]?.action;

  const [action, setAction] = useState<SpriteAction | undefined>(idleAction);
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);

  // Keep a valid current track even if the action list changes underneath us.
  const current = animations.find((a) => a.action === action) ?? animations[0];

  const sources = useMemo(
    () => sourcesFor(current, node, runtime, stateNode),
    [current, node, runtime, stateNode],
  );

  // One source = sprite sheet (sliced by frame size); many = frame array.
  const isSheet = sources.length === 1;
  const sheetSrc = isSheet ? sources[0] : "";
  const sheet = useImageSize(sheetSrc);

  const frameW = Math.max(1, node.frameWidth);
  const frameH = Math.max(1, node.frameHeight);
  const cols = sheet ? Math.max(1, Math.round(sheet.w / frameW)) : 1;
  const rows = sheet ? Math.max(1, Math.round(sheet.h / frameH)) : 1;
  const frameCount = isSheet ? cols * rows : sources.length;

  const fps = Math.min(60, Math.max(1, node.fps || 12));
  const interval = Math.max(16, Math.round(1000 / fps));

  // Restart playback from the first frame whenever the track or its size changes.
  useEffect(() => {
    setFrame(0);
  }, [action, frameCount]);

  // Advance the flip-book while playing; loop tracks wrap, play-once tracks hold.
  useEffect(() => {
    if (!playing || frameCount <= 1) {
      return;
    }
    const id = window.setInterval(() => {
      setFrame((prev) => {
        const next = prev + 1;
        if (next < frameCount) {
          return next;
        }
        return current?.loop ? 0 : prev;
      });
    }, interval);
    return () => window.clearInterval(id);
  }, [playing, frameCount, interval, current?.loop]);

  // When a play-once track reaches its last frame, settle back to idle.
  const settled = useRef(false);
  useEffect(() => {
    settled.current = false;
  }, [action]);
  useEffect(() => {
    if (
      current &&
      !current.loop &&
      frameCount > 0 &&
      frame >= frameCount - 1 &&
      idleAction &&
      action !== idleAction &&
      !settled.current
    ) {
      settled.current = true;
      const id = window.setTimeout(() => setAction(idleAction), interval);
      return () => window.clearTimeout(id);
    }
  }, [frame, frameCount, current, action, idleAction, interval]);

  const play = (next: SpriteAction) => {
    setAction(next);
    setFrame(0);
    setPlaying(true);
  };

  const safeFrame = frameCount > 0 ? Math.min(frame, frameCount - 1) : 0;
  const col = safeFrame % cols;
  const row = Math.floor(safeFrame / cols);
  const hasContent = isSheet ? !!sheetSrc : sources.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-input bg-muted/30 shadow-sm"
        style={{ width: frameW, height: frameH, maxWidth: "100%" }}
      >
        {hasContent && isSheet && sheet ? (
          <div
            aria-label={`${node.fieldLabel} — ${t(`sprite.action.${current?.action ?? "idle"}`)}`}
            role="img"
            className="h-full w-full [image-rendering:pixelated]"
            style={{
              backgroundImage: `url("${sheetSrc}")`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${cols * frameW}px ${rows * frameH}px`,
              backgroundPosition: `-${col * frameW}px -${row * frameH}px`,
            }}
          />
        ) : hasContent && !isSheet ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={sources[safeFrame]}
            alt={`${node.fieldLabel} — ${t(`sprite.action.${current?.action ?? "idle"}`)}`}
            draggable={false}
            className="h-full w-full select-none object-contain [image-rendering:pixelated]"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 p-2 text-center text-[11px] text-muted-foreground">
            <Film size={18} className="opacity-20" />
            <span>{t("sprite.empty")}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          disabled={frameCount <= 1}
          aria-label={playing ? t("sprite.pause") : t("sprite.play")}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors duration-(--motion-duration-fast) hover:bg-accent active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        {animations.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => play(a.action)}
            className={cn(
              "inline-flex h-8 shrink-0 items-center justify-center rounded-md border px-2.5 text-xs font-medium transition-colors duration-(--motion-duration-fast) hover:bg-accent active:scale-95",
              a.action === current?.action &&
                "border-foreground bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            {t(`sprite.action.${a.action}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
