/** Error code returned when a channel can only be turned back on from the handset. */
export const TOPIC_RESUBSCRIBE_LOCKED = 4004

/**
 * An error response from the Postles API: the HTTP `status`, plus the Postles
 * error `code` when the response body carried one.
 */
export class PostlesError extends Error {
    readonly status: number
    readonly code?: number

    constructor(message: string, status: number, code?: number) {
        super(message)
        this.name = 'PostlesError'
        this.status = status
        this.code = code
        // Keeps `instanceof` working when the SDK is transpiled down to ES5.
        Object.setPrototypeOf(this, PostlesError.prototype)
    }
}

/**
 * True when a topic update was refused because the channel can only be turned
 * back on from the handset.
 */
export function isTopicResubscribeLocked(error: unknown): boolean {
    return error instanceof PostlesError && error.code === TOPIC_RESUBSCRIBE_LOCKED
}
