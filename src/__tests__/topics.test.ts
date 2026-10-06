import { beforeEach, describe, expect, it, vi } from 'vitest'

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
const { PostlesError, isTopicResubscribeLocked } = await import('../errors')

const channelsFixture = {
    channels: [
        {
            channel: 'text',
            label: 'All Text Messages',
            master: {
                subscription_id: 1,
                name: 'All Text Messages',
                channel: 'text',
                kind: 'channel',
                is_opt_in: false,
                state: 'unsubscribed',
            },
            topics: [
                {
                    subscription_id: 11,
                    name: 'Daily Recap',
                    channel: 'text',
                    kind: 'topic',
                    is_opt_in: true,
                    state: 'not_opted_in',
                },
            ],
            paused: true,
            can_resubscribe: false,
            resubscribe_text_number: '+1 312 555 0100',
        },
    ],
}

const respondWith = (body: unknown, status = 200) => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

const createSdk = () => Postles.create({
    apiKey: 'public-key',
    urlEndpoint: 'https://postles.test',
})

describe('topics', () => {
    beforeEach(() => {
        vi.unstubAllGlobals()
    })

    it('maps a channels response into TopicChannel objects', async () => {
        const fetchMock = respondWith(channelsFixture)
        const postles = await createSdk()

        const channels = await postles.getTopicChannels()

        expect(fetchMock.mock.calls[0][0]).toBe(
            'https://postles.test/api/client/subscriptions/channels'
        )
        expect(channels).toEqual([
            {
                channel: 'text',
                label: 'All Text Messages',
                master: {
                    subscriptionId: 1,
                    name: 'All Text Messages',
                    channel: 'text',
                    kind: 'channel',
                    isOptIn: false,
                    state: 'unsubscribed',
                },
                topics: [
                    {
                        subscriptionId: 11,
                        name: 'Daily Recap',
                        channel: 'text',
                        kind: 'topic',
                        isOptIn: true,
                        state: 'not_opted_in',
                    },
                ],
                paused: true,
                canResubscribe: false,
                resubscribeTextNumber: '+1 312 555 0100',
            },
        ])
    })

    it('defaults kind and isOptIn on a row from an older backend', async () => {
        respondWith({
            results: [
                {
                    subscription_id: 7,
                    name: 'Newsletter',
                    channel: 'email',
                    state: 'subscribed',
                },
            ],
        })
        const postles = await createSdk()

        const page = await postles.getTopics()

        expect(page.results).toEqual([
            {
                subscriptionId: 7,
                name: 'Newsletter',
                channel: 'email',
                kind: 'topic',
                isOptIn: false,
                state: 'subscribed',
            },
        ])
    })

    it('reports not_opted_in as unsubscribed through the deprecated alias', async () => {
        respondWith({
            results: [
                {
                    subscription_id: 11,
                    name: 'Daily Recap',
                    channel: 'text',
                    kind: 'topic',
                    is_opt_in: true,
                    state: 'not_opted_in',
                },
            ],
        })
        const postles = await createSdk()

        const page = await postles.getSubscriptions()

        expect(page.results).toEqual([
            {
                subscriptionId: 11,
                name: 'Daily Recap',
                channel: 'text',
                state: 'unsubscribed',
            },
        ])
    })

    it('turns a locked resubscribe response into a PostlesError', async () => {
        respondWith({
            status: 'error',
            error: 'Text messages can only be turned back on by replying START from your phone.',
            code: 4004,
        }, 422)
        const postles = await createSdk()

        const failure = await postles.setTopic(1, 'subscribed').catch((err) => err)

        expect(failure).toBeInstanceOf(PostlesError)
        expect(failure.status).toBe(422)
        expect(failure.code).toBe(4004)
        expect(failure.message).toBe(
            'Text messages can only be turned back on by replying START from your phone.'
        )
        expect(isTopicResubscribeLocked(failure)).toBe(true)
    })
})
