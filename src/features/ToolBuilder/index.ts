/**
 * Tool Builder — public surface of the orchestrator feature.
 *
 * This feature only composes the panel features into the workspace layout. Its
 * shared domain now lives in shared dirs:
 * - state slice → `@/stores/slices/toolBuilderSlice`
 * - state hook  → `@/hooks/useToolBuilder`
 * - types       → `@/types/tool-builder`
 * - catalog     → `@/constants/tool-builder`
 * - runtime     → `@/lib/tool-builder-runtime`
 */
export { ToolBuilder } from "./ToolBuilder";
