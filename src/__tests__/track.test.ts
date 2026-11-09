import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('react-native', () => ({
    Linking: { openURL: vi.fn() },
    Platform: { OS: 'ios' },
    NativeModules: {},
}))

vi.mock('@react-native-async-storage/async-storage', () => ({
    default: {
        getItem: vi.fn(async () => null),
        setItem: vi.fn(async () => {}),
        removeItem: vi.fn(async () => {}),
    },
}))

const { Postles } = await import('../Postles')

describe('track', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('omits geo when unset and sends null or the object when given', async () => {
        const fetchMock = vi.fn(async () => new Response(null, { status: 202 }))
        vi.stubGlobal('fetch', fetchMock)
        const postles = await Postles.create({ apiKey: 'public-key', urlEndpoint: 'https://postles.test' })
        const sentEvent = (call: number) => JSON.parse(fetchMock.mock.calls[call][1].body)[0]

        await postles.track({ event: 'opened' })
        await postles.track({ event: 'opened', geo: null })
        await postles.track({ event: 'opened', geo: { country: 'US', region: 'IL', city: 'Chicago' } })

        expect(sentEvent(0)).not.toHaveProperty('geo')
        expect(sentEvent(1).geo).toBeNull()
        expect(sentEvent(2).geo).toEqual({ country: 'US', region: 'IL', city: 'Chicago' })
    })
})
