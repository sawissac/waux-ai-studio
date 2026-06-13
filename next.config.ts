import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Treat `.md` / `.mdx` files as routable pages alongside the usual JS/TS. */
  pageExtensions: ["js", "jsx", "ts", "tsx", "md", "mdx"],
};

/**
 * MDX support for docs pages (e.g. `src/app/docs/**`).
 *
 * No remark/rehype plugins are configured: the dev server runs on Turbopack,
 * which can only accept plugins by serialisable string name, and we don't need
 * any yet. Element styling is handled in `src/mdx-components.tsx` instead.
 */
const withMDX = createMDX({});

export default withMDX(nextConfig);
