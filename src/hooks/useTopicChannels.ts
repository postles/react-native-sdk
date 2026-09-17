import { useState, useEffect, useCallback } from 'react'
import type { TopicChannel, TopicUpdate } from '../models'
import { usePostles } from './usePostles'

export interface UseTopicChannelsResult {
    /** The user's topic preferences, grouped into channels */
    channels: TopicChannel[]
    /** Whether the preferences are being loaded */
    loading: boolean
    /** The last load or save error, or null */
    error: Error | null
    /** Save a screen's worth of changes in one request, then reload */
    save: (updates: TopicUpdate[]) => Promise<void>
    /** Reload the preferences from the server */
    refresh: () => void
}

const toError = (err: unknown): Error =>
    err instanceof Error ? err : new Error(String(err))

export function useTopicChannels(): UseTopicChannelsResult {
    const postles = usePostles()

    const [channels, setChannels] = useState<TopicChannel[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const load = useCallback(async () => {
        if (!postles) return

        setLoading(true)
        try {
            setChannels(await postles.getTopicChannels())
            setError(null)
        } catch (err) {
            setError(toError(err))
        } finally {
            setLoading(false)
        }
    }, [postles])

    const refresh = useCallback(() => {
        load()
    }, [load])

    useEffect(() => {
        refresh()
    }, [refresh])

    const save = useCallback(
        async (updates: TopicUpdate[]) => {
            if (!postles) return

            try {
                await postles.setTopics(updates)
                setError(null)
            } catch (err) {
                const failure = toError(err)
                setError(failure)
                throw failure
            }

            await load()
        },
        [postles, load]
    )

    return { channels, loading, error, save, refresh }
}
