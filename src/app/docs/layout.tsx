import { DocsShell } from "@/features/NodeDocs";

/**
 * Shared shell for every `/docs/**` route. Wraps the rendered MDX in the docs
 * topbar + centred `prose` column (see {@link DocsShell}). Inherits the app
 * providers (store, config, theme) from the root layout, so `t()` and theming
 * work inside docs pages.
 */
export default function DocsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <DocsShell>{children}</DocsShell>;
}
