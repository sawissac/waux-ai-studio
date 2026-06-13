import type { MDXComponents } from "mdx/types";

import { cn } from "@/lib/utils";

/**
 * Global MDX component map — REQUIRED by `@next/mdx` under the App Router.
 *
 * Maps the HTML elements MDX generates to design-system styling so authored
 * docs (`src/app/docs/**`) match the neobrutalism shell. Docs content is
 * wrapped in `prose` by the docs layout, so most block elements inherit
 * typography defaults; the overrides here are the few spots where the
 * neobrutalism accents (hard borders, mono chips) read better than `prose`.
 *
 * @see https://nextjs.org/docs/app/guides/mdx
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h1: ({ className, ...props }) => (
      <h1
        className={cn("font-poppins text-3xl font-bold", className)}
        {...props}
      />
    ),
    h2: ({ className, ...props }) => (
      <h2
        className={cn(
          "mt-10 border-b-2 border-foreground pb-1 font-poppins text-xl font-bold",
          className,
        )}
        {...props}
      />
    ),
    a: ({ className, ...props }) => (
      <a
        className={cn(
          "font-medium text-foreground underline decoration-2 underline-offset-2",
          className,
        )}
        {...props}
      />
    ),
    code: ({ className, ...props }) => (
      <code
        className={cn(
          "border-2 border-foreground bg-card px-1.5 py-0.5 font-mono text-[0.85em] before:content-[''] after:content-['']",
          className,
        )}
        {...props}
      />
    ),
    pre: ({ className, ...props }) => (
      <pre
        className={cn(
          "overflow-x-auto border-2 border-foreground bg-card p-4 shadow-nb-sm",
          // Neutralise the inline-code chip styling for block code inside <pre>.
          "[&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0",
          className,
        )}
        {...props}
      />
    ),
  };
}
