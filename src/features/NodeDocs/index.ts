/**
 * NodeDocs feature — public surface.
 *
 * `NodeDocs` renders the reference catalogue of node types; `DocsShell` is the
 * topbar + `prose` wrapper for the whole `/docs` section. Both are consumed by
 * the MDX docs routes under `src/app/docs/`.
 */
export { DocsShell } from "./components/DocsShell";
export { nodeAnchorId, NodeDocs } from "./NodeDocs";
