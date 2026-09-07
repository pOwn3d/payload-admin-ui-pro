import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchCount } from '../modules/dashboard/widgets/StatsWidget.js'

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchCount', () => {
  it('asks /count instead of downloading the collection', async () => {
    // Regression: the widget used `?limit=0`, which Payload reads as "disable
    // pagination" — the adapter returns EVERY row, runs access control and
    // afterRead on each, and serialises the lot, just to read totalDocs.
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { totalDocs: 1234 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchCount('posts')).resolves.toBe(1234)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const url = String(fetchMock.mock.calls[0]![0])
    expect(url).toBe('/api/posts/count')
    expect(url).not.toContain('limit=0')
  })

  it('falls back to limit=1 — never pagination=false — when /count is absent', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(404, {}))
      .mockResolvedValueOnce(jsonResponse(200, { totalDocs: 7, docs: [{ id: 1 }] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchCount('pages')).resolves.toBe(7)

    const url = String(fetchMock.mock.calls[1]![0])
    expect(url).toContain('limit=1')
    expect(url).not.toContain('pagination=false')
    expect(url).not.toContain('limit=0')
  })

  it('does not retry when the caller is simply not allowed to read', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(403, {}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchCount('secrets')).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null when both routes fail', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(404, {}))
      .mockResolvedValueOnce(jsonResponse(500, {}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchCount('posts')).resolves.toBeNull()
  })

  it('ignores a /count answer without a numeric totalDocs', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, { unexpected: true }))
      .mockResolvedValueOnce(jsonResponse(200, { totalDocs: 3 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchCount('posts')).resolves.toBe(3)
  })
})
