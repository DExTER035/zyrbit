/**
 * DexOS — Dex Package Index
 * Public interface for the Dex orchestration layer.
 *
 * Consumers should import from this index — never from internal files directly.
 */

// Primary entry point — the only function the UI should call
export { processUserInput, DEX_RESULT_TYPE } from './dexOrchestrator.js';

// Context snapshot — useful for display components that want current state
export { buildDexContext } from './dexContextProvider.js';

// Planning & cross-domain orchestration
export * from './planning/index.js';

