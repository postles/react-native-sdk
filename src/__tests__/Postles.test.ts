import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
    Linking: { openURL: vi.fn(() => Promise.resolve()) },
    Platform: { OS: 'ios' },
    NativeModules: {},
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
    default: {
        getItem: vi.fn(() => Promise.resolve(null)),
        setItem: vi.fn(() => Promise.resolve()),
        removeItem: vi.fn(() => Promise.resolve()),
    },
}))

const { Postles } = await import('../Postles')

const OPEN_URL = 'https://push.example.com/o?m=abc&h=def'

const createSdk = () =>
    Postles.create({ apiKey: 'pk_test', urlEndpoint: 'https://push.example.com' })

describe('handlePushOpen', () => {
    let fetchMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
        fetchMock = vi.fn(() => Promise.resolve({ ok: true, status: 204 }))
        vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('sends one GET to the open url in the payload', async () => {
        const postles = await createSdk()

        expect(postles.handlePushOpen({ postles: 'true', postles_open_url: OPEN_URL })).toBe(true)

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(fetchMock).toHaveBeenCalledWith(OPEN_URL, { method: 'GET' })
    })

    it('sends nothing for a payload without an open url', async () => {
        const postles = await createSdk()

        expect(postles.handlePushOpen({ postles: 'true', url: 'myapp://home' })).toBe(false)

        expect(fetchMock).not.toHaveBeenCalled()
    })
})
