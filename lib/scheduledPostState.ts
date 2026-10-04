// Persisted in failureReason so existing rows/UI need no schema migration.
export const PUBLICATION_RECONCILIATION_REASON =
  "Publication outcome unknown. Check LinkedIn before scheduling again; manual confirmation is required."

export function needsPublicationReconciliation(reason: string | null): boolean {
  return reason?.startsWith(PUBLICATION_RECONCILIATION_REASON) ?? false
}
