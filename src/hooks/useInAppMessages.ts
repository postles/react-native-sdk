import { useState, useEffect, useCallback, useRef } from 'react'
import type {
    PostlesNotification,
    InAppAction,
    InAppDisplayState,
} from '../models'
import { Postles } from '../Postles'

export interface UseInAppMessagesOptions {
    /** Automatically fetch and show notifications. Default: true */
    autoShow?: boolean
    /** Apply dark mode CSS class to HTML notifications. Default: false */
    useDarkMode?: boolean
    /** Called when a user triggers an action in the notification */
    onAction?: (
        action: InAppAction,
        context: Record<string, any>,
        notification: PostlesNotification
    ) => void
    /** Called when an error occurs fetching or displaying notifications */
    onError?: (error: Error) => void
    /** Called when a notification is displayed */
    onDisplay?: (notification: PostlesNotification) => void
    /**
     * Called for each new notification to decide how to handle it.
     * Return 'show' to display, 'skip' to skip, or 'consume' to mark as read.
     * Default: always returns 'show'
     */
    onNew?: (notification: PostlesNotification) => InAppDisplayState
}

export interface UseInAppMessagesResult {
    /** The notification currently being displayed, or null */
    currentNotification: PostlesNotification | null
    /** Whether the in-app message modal is visible */
    visible: boolean
    /** Dismiss the current notification */
    dismiss: () => void
    /** Refresh notifications from the server */
    refresh: () => void
}

export function useInAppMessages(
    options: UseInAppMessagesOptions = {}
): UseInAppMessagesResult {
    const {
        autoShow = true,
        onAction,
        onError,
        onNew,
    } = options

    const [currentNotification, setCurrentNotification] =
        useState<PostlesNotification | null>(null)
    const [visible, setVisible] = useState(false)
    const notificationQueue = useRef<PostlesNotification[]>([])
    // Track visible in a ref so processNotifications doesn't need it as a dep,
    // which would otherwise cause refresh to recreate and re-trigger the effect.
    const visibleRef = useRef(false)

    // Keep visibleRef in sync with visible state
    useEffect(() => {
        visibleRef.current = visible
    }, [visible])

    const showNext = useCallback(() => {
        const next = notificationQueue.current.shift()
        if (next) {
            setCurrentNotification(next)
            setVisible(true)
            visibleRef.current = true
        } else {
            setCurrentNotification(null)
            setVisible(false)
            visibleRef.current = false
        }
    }, [])

    const processNotifications = useCallback(
        async (notifications: PostlesNotification[]) => {
            const postles = Postles.shared

            for (const notification of notifications) {
                const state = onNew?.(notification) ?? 'show'

                switch (state) {
                    case 'show':
                        notificationQueue.current.push(notification)
                        break
                    case 'consume':
                        try {
                            await postles.consume(notification)
                        } catch (err) {
                            onError?.(
                                err instanceof Error
                                    ? err
                                    : new Error(String(err))
                            )
                        }
                        break
                    case 'skip':
                        continue
                }
            }

            // Show the first queued notification if nothing is currently displayed
            if (!visibleRef.current && notificationQueue.current.length > 0) {
                showNext()
            }
        },
        [onNew, onError, showNext]
    )

    const refresh = useCallback(() => {
        const postles = Postles.shared

        postles
            .getNotifications()
            .then((page) => processNotifications(page.results))
            .catch((err) => {
                onError?.(
                    err instanceof Error ? err : new Error(String(err))
                )
            })
    }, [processNotifications, onError])

    const dismiss = useCallback(() => {
        if (currentNotification) {
            const postles = Postles.shared
            postles.consume(currentNotification).catch(() => {})
            setVisible(false)
            visibleRef.current = false
            // Show next notification after a brief delay for animation
            setTimeout(showNext, 100)
        }
    }, [currentNotification, showNext])

    // Auto-fetch notifications on mount
    useEffect(() => {
        if (autoShow) {
            refresh()
        }
    }, [autoShow, refresh])

    return {
        currentNotification,
        visible,
        dismiss,
        refresh,
    }
}
