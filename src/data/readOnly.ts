// The read-only rule shared by the mock and the live tier. Kept out of
// scenario.ts (which imports the mock fixtures) so live code can use it
// without pulling the mock tier into its import graph.

/** Writes read-only mode still allows: turning it off, and one's own
 * preferences and problem reports. Exported because src/data/api.ts enforces
 * the same rule on the live tier, which has no read-only concept of its own:
 * one list, or the guard silently applies to the mock tier only. */
export const READ_ONLY_EXEMPT: ReadonlySet<string> = new Set(['saveConfigSection', 'rollbackConfig', 'savePreferences', 'submitProblemReport'])

export const isRead = (name: string) => /^(get|search|semanticSearch|preview|resolve|validate)/.test(name)
