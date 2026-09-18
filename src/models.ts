// Configuration
export interface PostlesConfig {
    apiKey: string
    urlEndpoint: string
}

// Wire format types (snake_case, sent to API)
export interface Identity {
    anonymous_id: string
    external_id?: string
    phone?: string
    email?: string
    timezone?: string
    locale?: string
    data?: Record<string, any>
}

export interface Alias {
    anonymous_id: string
    external_id?: string
}

export interface Event {
    name: string
    anonymous_id: string
    external_id?: string
    data?: Record<string, any>
}

export interface Device {
    anonymous_id: string
    external_id?: string
    device_id: string
    token?: string
    os: string
    os_version: string
    model: string
    app_build: string
    app_version: string
}

// Notification types
export type NotificationType = 'banner' | 'alert' | 'html'

export interface NotificationContent {
    title: string
    body: string
    readOnShow?: boolean
    custom?: Record<string, string>
    context?: Record<string, string>
}

export interface HtmlNotificationContent extends NotificationContent {
    html: string
}

export interface AlertNotificationContent extends NotificationContent {
    image?: string
}

export interface PostlesNotification {
    id: number
    contentType: NotificationType
    content: NotificationContent | HtmlNotificationContent | AlertNotificationContent
    readAt?: string
    expiresAt?: string
}

export interface Page<T> {
    results: T[]
    nextCursor?: string
    prevCursor?: string
    limit?: number
}

// Topic preferences
export type TopicState = 'subscribed' | 'unsubscribed' | 'not_opted_in'
export type TopicKind = 'channel' | 'topic'

export interface Topic {
    subscriptionId: number
    name: string
    channel: string
    kind: TopicKind
    isOptIn: boolean
    state: TopicState
}

export interface TopicChannel {
    channel: string
    label: string
    master: Topic | null
    topics: Topic[]
    /** The master is off, so every topic below it is suppressed. */
    paused: boolean
    /** False when the master can be turned off here but only back on from the handset. */
    canResubscribe: boolean
    /** The number to text START to. Only present when `canResubscribe` is false. */
    resubscribeTextNumber?: string | null
}

export interface TopicUpdate {
    subscriptionId: number
    state: 'subscribed' | 'unsubscribed'
}

/**
 * @deprecated Use {@link TopicState}. This type cannot express `not_opted_in`,
 * which the deprecated methods report as `'unsubscribed'`.
 */
export type SubscriptionState = 'subscribed' | 'unsubscribed'

/** @deprecated Use {@link Topic}. */
export interface SubscriptionPreference {
    subscriptionId: number
    name: string
    channel: string
    state: SubscriptionState
}

// In-app messaging
export type InAppAction = 'dismiss' | 'custom'
export type InAppDisplayState = 'show' | 'skip' | 'consume'

// Public API parameter types (user-facing, camelCase)
export interface IdentifyParams {
    id: string
    email?: string
    phone?: string
    locale?: string // eg "en-US", defaults to the device locale.
    timezone?: string // IANA timezone (eg "America/New_York"), default to device timezone.
    traits?: Record<string, any>
}

export interface TrackParams {
    event: string
    properties?: Record<string, any>
}

export interface DeviceRegistrationParams {
    token?: string
}
