// Configuration
export interface PostlesConfig {
    apiKey: string
    urlEndpoint: string
    /** Automatically check for in-app messages on foreground and push receipt. Default: true */
    fetchInAppOnForeground?: boolean
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

// Subscription preferences
export type SubscriptionState = 'subscribed' | 'unsubscribed'

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
