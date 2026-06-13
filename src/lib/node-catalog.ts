/**
 * Reusable, serialisable view of the node catalogue for docs & other readers.
 *
 * The Tool Builder owns the rich catalogue in `@/constants/tool-builder`
 * (`NODE_META` + `PALETTE_GROUPS`), but that data carries Lucide icon
 * *components*, so it can't cross a server/client boundary or feed non-React
 * consumers (sitemaps, search indexes, an API). This module flattens it into
 * plain data — node type, `@slug`, accent, group, and the i18n message keys for
 * the localized label/blurb — keyed and ordered exactly like the palette.
 *
 * Pull the icon (and accent classes) from `NODE_META` / `ACCENT_CLASSES` at
 * render time; everything else a docs page needs lives here.
 */
import { type MessageKey, MESSAGES } from "@/constants/i18n";
import { NODE_DETAILS, type NodeDetail } from "@/constants/node-docs";
import {
  NODE_META,
  PALETTE_GROUPS,
  type PaletteGroup,
} from "@/constants/tool-builder";
import type { NodeAccent, ToolNodeType } from "@/types/tool-builder";

/** One node type, reduced to serialisable, render-agnostic fields. */
export interface NodeDocEntry {
  /** Discriminator — also the lookup key into `NODE_META` for the icon. */
  type: ToolNodeType;
  /** Mono `@slug` shown in editors and docs. */
  slug: string;
  /** Accent colour key (resolve classes via `ACCENT_CLASSES`). */
  accent: NodeAccent;
  /** Palette group this node lives under. */
  group: PaletteGroup;
  /** i18n key for the localized display label. */
  labelKey: MessageKey;
  /** i18n key for the localized one-line blurb. */
  blurbKey: MessageKey;
  /** Whether a blurb exists for this type (some nodes ship label-only). */
  hasBlurb: boolean;
}

/** A palette group plus its ordered node entries. */
export interface NodeDocGroup {
  group: PaletteGroup;
  /** i18n key for the localized group heading. */
  groupKey: MessageKey;
  nodes: NodeDocEntry[];
}

/**
 * Build the catalogue as grouped, serialisable doc entries.
 *
 * Order matches the palette (`PALETTE_GROUPS`) exactly, so docs and the in-app
 * Node panel always list nodes the same way.
 *
 * @returns Palette groups, each with its node entries.
 */
export function getNodeCatalog(): NodeDocGroup[] {
  return PALETTE_GROUPS.map(({ group, types }) => ({
    group,
    groupKey: `palette.group.${group}`,
    nodes: types.map((type): NodeDocEntry => {
      const meta = NODE_META[type];
      return {
        type,
        slug: meta.slug,
        accent: meta.accent,
        group: meta.group,
        labelKey: `node.${type}.label`,
        blurbKey: `node.${type}.blurb`,
        hasBlurb: Boolean(meta.blurb),
      };
    }),
  }));
}

/** Total node-type count across all groups — handy for docs headings. */
export function getNodeCount(): number {
  return PALETTE_GROUPS.reduce((sum, g) => sum + g.types.length, 0);
}

/**
 * A single node type fully resolved into one flat, serialisable record:
 * identity (type/slug/group/accent), the canonical **English** label + blurb,
 * and the in-depth {@link NodeDetail}. No i18n keys, no React — everything is
 * plain data.
 *
 * This is the shape intended for an **AI tool call**: hand the array straight to
 * a model as the catalogue of what each node does and how it's configured.
 */
export interface NodeReference extends NodeDetail {
  type: ToolNodeType;
  slug: string;
  group: PaletteGroup;
  accent: NodeAccent;
  /** Canonical English display label. */
  label: string;
  /** Canonical English one-line blurb (empty string if none). */
  blurb: string;
}

/**
 * Build the full, AI-ready node reference: every node type as a flat record
 * with English text resolved and its {@link NodeDetail} merged in. Ordered like
 * the palette.
 *
 * English (`MESSAGES.en`) is used deliberately — it is the source-of-truth key
 * set and the most useful canonical text for a tool call. Render localized text
 * in the UI via `t()` instead.
 *
 * @returns One {@link NodeReference} per node type, in palette order.
 */
export function getNodeReference(): NodeReference[] {
  const en = MESSAGES.en;
  return getNodeCatalog().flatMap((g) =>
    g.nodes.map(
      (n): NodeReference => ({
        type: n.type,
        slug: n.slug,
        group: n.group,
        accent: n.accent,
        label: en[n.labelKey],
        blurb: n.hasBlurb ? en[n.blurbKey] : "",
        ...NODE_DETAILS[n.type],
      }),
    ),
  );
}

/**
 * One node's full reference record (English + detail), or `undefined` for an
 * unknown type. Convenience lookup over {@link getNodeReference}.
 *
 * @param type - Node kind to resolve.
 */
export function getNodeReferenceFor(
  type: ToolNodeType,
): NodeReference | undefined {
  return getNodeReference().find((n) => n.type === type);
}
