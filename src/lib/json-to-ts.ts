/**
 * Pure JSON → TypeScript declaration generator used by the Tool Builder's
 * "TS Type Converter" node. No React, no Redux — takes a JSON source string
 * and returns TypeScript `interface` / `type` declarations as text.
 *
 * Inference rules:
 * - Objects become named `interface`s; nested objects get their own interface
 *   named after the property (PascalCase, de-duplicated with a numeric suffix).
 * - Arrays merge their element types into a union (`(A | B)[]`). Object
 *   elements are merged into one interface; a property missing from some
 *   elements becomes optional.
 * - Property names that aren't valid identifiers are quoted.
 * - Primitives map to `string` / `number` / `boolean` / `null`; empty arrays
 *   become `unknown[]`, empty objects `Record<string, unknown>`.
 */

/** Matches a property name usable without quotes / a valid type identifier. */
const IDENT_RE = /^[A-Za-z_$][\w$]*$/;

/** PascalCase a hint into a valid type identifier (`user-list` → `UserList`). */
function pascal(hint: string): string {
  const cleaned = hint
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  if (!cleaned) {
    return "Type";
  }
  return /^[0-9]/.test(cleaned) ? `Type${cleaned}` : cleaned;
}

/** Best-effort singular hint for array element types (`users` → `user`). */
function singular(hint: string): string {
  if (hint.length > 2 && /s$/i.test(hint) && !/ss$/i.test(hint)) {
    return hint.slice(0, -1);
  }
  return `${hint}Item`;
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

const isPlainObject = (v: Json): v is { [k: string]: Json } =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Convert a JSON source string into TypeScript type declarations.
 *
 * @param source - Raw JSON text (whatever a JSON input node holds).
 * @param rootName - Name for the root interface/type. Defaults to `Root`.
 * @returns TypeScript declarations, nested interfaces first, root last.
 * @throws SyntaxError when `source` is not valid JSON.
 */
export function jsonToTs(source: string, rootName = "Root"): string {
  const value = JSON.parse(source) as Json;
  const used = new Set<string>();
  const decls: string[] = [];

  /** Reserve a unique interface name derived from `hint`. */
  const claim = (hint: string): string => {
    const base = pascal(hint);
    let name = base;
    for (let i = 2; used.has(name); i++) {
      name = `${base}${i}`;
    }
    used.add(name);
    return name;
  };

  /**
   * Merge one or more sibling objects (e.g. array elements) into a single
   * named interface. Returns the interface name to reference.
   */
  const objectType = (objs: { [k: string]: Json }[], hint: string): string => {
    const props = new Map<string, { types: Set<string>; count: number }>();
    // Claim the parent name before recursing so children can't steal it.
    const hasProps = objs.some((o) => Object.keys(o).length > 0);
    if (!hasProps) {
      return "Record<string, unknown>";
    }
    const name = claim(hint);
    for (const obj of objs) {
      for (const [key, v] of Object.entries(obj)) {
        const slot = props.get(key) ?? { types: new Set<string>(), count: 0 };
        slot.types.add(typeOf(v, key));
        slot.count += 1;
        props.set(key, slot);
      }
    }
    const lines = [...props.entries()].map(([key, slot]) => {
      const safeKey = IDENT_RE.test(key) ? key : JSON.stringify(key);
      const optional = slot.count < objs.length ? "?" : "";
      return `  ${safeKey}${optional}: ${[...slot.types].join(" | ")};`;
    });
    decls.push(`export interface ${name} {\n${lines.join("\n")}\n}`);
    return name;
  };

  /** Type reference for any JSON value. */
  const typeOf = (v: Json, hint: string): string => {
    if (v === null) {
      return "null";
    }
    if (Array.isArray(v)) {
      if (v.length === 0) {
        return "unknown[]";
      }
      const elementHint = singular(hint);
      const objs = v.filter(isPlainObject);
      const types = new Set<string>();
      if (objs.length > 0) {
        types.add(objectType(objs, elementHint));
      }
      for (const item of v) {
        if (!isPlainObject(item)) {
          types.add(typeOf(item, elementHint));
        }
      }
      const union = [...types];
      return union.length === 1 ? `${union[0]}[]` : `(${union.join(" | ")})[]`;
    }
    if (isPlainObject(v)) {
      return objectType([v], hint);
    }
    return typeof v; // "string" | "number" | "boolean"
  };

  const rootRef = isPlainObject(value)
    ? objectType([value], rootName)
    : typeOf(value, rootName);

  // Primitive / array / empty-object roots still get a named declaration.
  if (!used.has(rootRef)) {
    decls.push(`export type ${claim(rootName)} = ${rootRef};`);
  }
  return `${decls.join("\n\n")}\n`;
}
