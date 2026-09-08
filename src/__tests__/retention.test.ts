import { describe, it, expect, vi } from 'vitest'
import {
  ACTIVITY_CLEANUP_TASK_SLUG,
  DEFAULT_RETENTION_CRON,
  createActivityCleanupTask,
  purgeExpiredActivity,
  retentionCutoff,
} from '../modules/activity/retention.js'
import { activityModule } from '../modules/activity/plugin.js'

function fakePayload(deletedCount = 0) {
  const calls: Array<Record<string, unknown>> = []
  return {
    calls,
    delete: vi.fn(async (args: Record<string, unknown>) => {
      calls.push(args)
      return { docs: Array.from({ length: deletedCount }, (_, i) => ({ id: i })) }
    }),
  }
}

const NOW = new Date('2026-09-08T12:00:00.000Z')

describe('retentionCutoff', () => {
  it('subtracts the retention window from now', () => {
    expect(retentionCutoff(90, NOW).toISOString()).toBe('2026-06-10T12:00:00.000Z')
  })

  it('does not mutate the date it was handed', () => {
    const now = new Date(NOW)
    retentionCutoff(30, now)
    expect(now.toISOString()).toBe(NOW.toISOString())
  })
})

describe('purgeExpiredActivity', () => {
  it('deletes entries strictly older than the cutoff, bypassing access', async () => {
    const payload = fakePayload(3)

    const result = await purgeExpiredActivity({
      payload,
      logCollectionSlug: 'activity-log',
      retentionDays: 90,
      now: NOW,
    })

    expect(result).toEqual({ deleted: 3, cutoffDate: '2026-06-10T12:00:00.000Z' })
    expect(payload.calls[0]).toEqual({
      collection: 'activity-log',
      where: { timestamp: { less_than: '2026-06-10T12:00:00.000Z' } },
      // The log denies `delete` to everyone, including administrators: the
      // trail is immutable by design, so retention has to say so explicitly.
      overrideAccess: true,
    })
  })

  it('deletes NOTHING when retentionDays is 0', async () => {
    // The trap: reading 0 as "keep nothing" turns a config default into a
    // scheduled wipe of the entire audit trail.
    const payload = fakePayload(999)

    const result = await purgeExpiredActivity({
      payload,
      logCollectionSlug: 'activity-log',
      retentionDays: 0,
      now: NOW,
    })

    expect(payload.delete).not.toHaveBeenCalled()
    expect(result.deleted).toBe(0)
  })

  it('deletes nothing for a negative or non-finite window, and does not throw', async () => {
    // `retentionCutoff(NaN)` is an Invalid Date and `.toISOString()` on one
    // raises a RangeError: computing the cutoff before validating turned a
    // misconfigured window into a crashing job instead of a no-op.
    const payload = fakePayload(999)
    for (const days of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const result = await purgeExpiredActivity({
        payload,
        logCollectionSlug: 'activity-log',
        retentionDays: days,
        now: NOW,
      })
      expect(result).toEqual({ deleted: 0, cutoffDate: NOW.toISOString() })
    }
    expect(payload.delete).not.toHaveBeenCalled()
  })
})

describe('createActivityCleanupTask', () => {
  it('runs the same purge as the endpoint, through the job request', async () => {
    const payload = fakePayload(2)
    const task = createActivityCleanupTask({
      logCollectionSlug: 'activity-log',
      retentionDays: 90,
      cron: DEFAULT_RETENTION_CRON,
      queue: 'default',
    })

    const output = await task.handler({ req: { payload } })

    expect(payload.delete).toHaveBeenCalledOnce()
    expect(output.output.deleted).toBe(2)
  })

  it('carries a schedule — a task without one is registered and never runs', () => {
    const task = createActivityCleanupTask({
      logCollectionSlug: 'activity-log',
      retentionDays: 90,
      cron: '0 0 4 * * *',
      queue: 'maintenance',
    })

    expect(task.slug).toBe(ACTIVITY_CLEANUP_TASK_SLUG)
    expect(task.schedule).toEqual([{ cron: '0 0 4 * * *', queue: 'maintenance' }])
  })
})

describe('activityModule task registration', () => {
  const baseConfig = () => ({ collections: [], endpoints: [] }) as never

  it('registers nothing when retentionSchedule is left off', () => {
    // Declaring one task makes Payload append its `payload-jobs` collection,
    // and a scheduled one also appends the `payload-jobs-stats` global. On a
    // host with no jobs that is two tables the integrator never asked for.
    const config = activityModule(undefined, {})(baseConfig())
    expect(config.jobs?.tasks).toBeUndefined()
  })

  it('registers the daily task when asked with true', () => {
    const config = activityModule({ retentionSchedule: true }, {})(baseConfig())
    const tasks = config.jobs!.tasks as Array<{ slug: string; schedule: unknown }>

    expect(tasks).toHaveLength(1)
    expect(tasks[0]!.slug).toBe(ACTIVITY_CLEANUP_TASK_SLUG)
    expect(tasks[0]!.schedule).toEqual([{ cron: DEFAULT_RETENTION_CRON, queue: 'default' }])
  })

  it('takes a string as the cron expression', () => {
    const config = activityModule({ retentionSchedule: '0 30 2 * * 1' }, {})(baseConfig())
    const tasks = config.jobs!.tasks as Array<{ schedule: Array<{ cron: string }> }>

    expect(tasks[0]!.schedule[0]!.cron).toBe('0 30 2 * * 1')
  })

  it('keeps the host tasks that were already declared', () => {
    const hostTask = { slug: 'host-task', handler: () => ({}) }
    const config = activityModule({ retentionSchedule: true }, {})({
      collections: [],
      endpoints: [],
      jobs: { tasks: [hostTask] },
    } as never)

    const tasks = config.jobs!.tasks as Array<{ slug: string }>
    expect(tasks.map((t) => t.slug)).toEqual(['host-task', ACTIVITY_CLEANUP_TASK_SLUG])
  })

  it('purges with the configured window, not the default', async () => {
    const config = activityModule({ retentionSchedule: true, retentionDays: 7 }, {})(baseConfig())
    const task = (config.jobs!.tasks as Array<{ handler: (a: unknown) => Promise<{ output: { cutoffDate: string } }> }>)[0]!
    const payload = fakePayload(1)

    const { output } = await task.handler({ req: { payload } })

    const days = Math.round(
      (Date.now() - new Date(output.cutoffDate).getTime()) / 86_400_000,
    )
    expect(days).toBe(7)
  })

  it('leaves the manual endpoint in place either way', () => {
    for (const schedule of [undefined, true]) {
      const config = activityModule({ retentionSchedule: schedule }, {})(baseConfig())
      const paths = (config.endpoints as Array<{ path: string }>).map((e) => e.path)
      expect(paths).toContain('/admin-ui-pro/activity/cleanup')
    }
  })
})
