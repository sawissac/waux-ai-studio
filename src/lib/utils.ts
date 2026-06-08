import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge conditional class names and resolve Tailwind conflicts.
 *
 * Combines `clsx` (conditional/variadic class joining) with `tailwind-merge`
 * (de-duplicates conflicting Tailwind utilities, last one wins).
 *
 * @param inputs - Class values: strings, arrays, or conditional objects.
 * @returns A single merged, conflict-free className string.
 *
 * @example
 * cn("px-2", isActive && "bg-primary", "px-4") // -> "bg-primary px-4"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
