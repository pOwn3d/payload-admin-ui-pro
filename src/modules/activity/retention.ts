/**
 * Activity-log retention.
 *
 * `retentionDays` (default 90) used to describe something that never happened:
 * the only code that read it was `DELETE /api/admin-ui-pro/activity/cleanup`,
 * an endpoint nothing calls on its own. An audit trail that records every write
 * on every tracked collection and never forgets anything is a data-minimisation
 * problem that grows by itself — and the integrator who read the option
 * believed it was handled.
 *
 * The cutoff lives here, in one place, so the manual endpoint and the scheduled
 * job cannot drift apart.
 */

/** Minimal surface of the Payload instance this needs — endpoints get a
 *  `req.payload`, the job handler gets `payload`, and tests get neither. */
export interface RetentionPayload {
  delete: (args: {
    collection: string
    where: Record<string, unknown>
    overrideAccess?: boolean
  }) => Promise<{ docs?: unknown[] }>
}

export interface PurgeResult {
  deleted: number
  cutoffDate: string
}

/**
 * The oldest timestamp that survives a purge.
 *
 * Kept separate and exported so a caller can report the boundary without
 * deleting anything.
 */
export function retentionCutoff(retentionDays: number, now: Date = new Date()): Date {
  const cutoff = new Date(now.getTime())
  cutoff.setDate(cutoff.getDate() - retentionDays)
  return cutoff
}

/**
 * Delete every activity entry older than the retention window.
 *
 * `retentionDays <= 0` deletes NOTHING and is not an error. The temptation is
 * to read 0 as "keep nothing" — a purge endpoint elsewhere in this codebase
 * family does exactly that — but a scheduled task that wipes the whole audit
 * trail because a config value was left at its falsy default is a trap, not a
 * feature. Emptying the log stays a manual act.
 */
export async function purgeExpiredActivity(args: {
  payload: RetentionPayload
  logCollectionSlug: string
  retentionDays: number
  now?: Date
}): Promise<PurgeResult> {
  const { payload, logCollectionSlug, retentionDays, now } = args
  const reference = now ?? new Date()

  // Checked BEFORE the cutoff is computed: `retentionCutoff(NaN)` yields an
  // Invalid Date, and `Invalid Date.toISOString()` throws a RangeError — which
  // in the scheduled task would surface as a failed job rather than as "nothing
  // to purge".
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) {
    return { deleted: 0, cutoffDate: reference.toISOString() }
  }

  const cutoff = retentionCutoff(retentionDays, reference)

  const result = await payload.delete({
    collection: logCollectionSlug,
    where: { timestamp: { less_than: cutoff.toISOString() } },
    overrideAccess: true,
  })

  return {
    deleted: Array.isArray(result?.docs) ? result.docs.length : 0,
    cutoffDate: cutoff.toISOString(),
  }
}

/** Slug of the scheduled task, exported so a host can target it explicitly. */
export const ACTIVITY_CLEANUP_TASK_SLUG = 'aup-activity-cleanup'

/** Daily, at 03:00. Payload's cron parser takes an optional leading seconds field. */
export const DEFAULT_RETENTION_CRON = '0 0 3 * * *'

/**
 * Build the Payload Jobs task that runs the purge.
 *
 * Returned rather than registered here so `activityModule` stays the single
 * place that decides whether to register it at all — see the comment there:
 * declaring a task is not free, it brings Payload's own jobs tables with it.
 */
export function createActivityCleanupTask(args: {
  logCollectionSlug: string
  retentionDays: number
  cron: string
  queue: string
}) {
  const { logCollectionSlug, retentionDays, cron, queue } = args

  return {
    slug: ACTIVITY_CLEANUP_TASK_SLUG,
    label: 'Admin UI Pro — activity log retention',
    schedule: [{ cron, queue }],
    handler: async ({ req }: { req: { payload: RetentionPayload } }) => {
      const { deleted, cutoffDate } = await purgeExpiredActivity({
        payload: req.payload,
        logCollectionSlug,
        retentionDays,
      })
      return { output: { deleted, cutoffDate } }
    },
  }
}
