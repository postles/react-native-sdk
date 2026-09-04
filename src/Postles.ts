import { Linking } from 'react-native'
import type {
    PostlesConfig,
    Identity,
    Alias,
    Event,
    Device,
    IdentifyParams,
    TrackParams,
    DeviceRegistrationParams,
    PostlesNotification,
    Page,
    SubscriptionPreference,
    SubscriptionState,
} from './models'
import { NetworkManager } from './network'
import { PostlesStorage } from './storage'
import { generateUUID } from './utils'
import { getDeviceInfo, getDeviceLocale, getDeviceTimezone } from './device'

const inAppFetchThrottleMs = 30_000

export class Postles {
    private config: PostlesConfig
    private network: NetworkManager
    private storage: PostlesStorage
    private anonymousId: string
    private externalId: string | null = null
    private deviceId: string
    private lastInAppFetch = 0
    private inAppRefreshListeners = new Set<() => void>()

    private constructor(
        config: PostlesConfig,
        anonymousId: string,
        deviceId: string,
        externalId: string | null
    ) {
        this.config = config
        this.network = new NetworkManager(config)
        this.storage = new PostlesStorage()
        this.anonymousId = anonymousId
        this.deviceId = deviceId
        this.externalId = externalId
    }

    /**
     * Create and boot a Postles instance. Called by PostlesProvider.
     */
    static async create(config: PostlesConfig): Promise<Postles> {
        const storage = new PostlesStorage()

        let anonId = await storage.getAnonymousId()
        if (!anonId) {
            anonId = generateUUID()
            await storage.setAnonymousId(anonId)
        }

        let devId = await storage.getDeviceId()
        if (!devId) {
            devId = generateUUID()
            await storage.setDeviceId(devId)
        }

        const externalId = await storage.getExternalId()

        return new Postles(config, anonId, devId, externalId)
    }

    /**
     * Identify a user.
     *
     * Can be used for anonymous or known users. When a user transitions
     * from anonymous to known, alias is automatically called to merge
     * the user histories.
     *
     * Call identify whenever user traits change to keep them updated.
     */
    async identify(params: IdentifyParams): Promise<void> {
        // Auto-alias when transitioning from anonymous to known
        if (!this.externalId && params.id) {
            await this.alias(this.anonymousId, params.id)
        }

        this.externalId = params.id
        await this.storage.setExternalId(params.id)

        const identity: Identity = {
            anonymous_id: this.anonymousId,
            external_id: params.id,
            email: params.email,
            phone: params.phone,
            locale: params.locale ?? getDeviceLocale(),
            timezone: params.timezone ?? getDeviceTimezone(),
            data: params.traits,
        }

        await this.network.post('identify', identity)
    }

    /**
     * Track an event.
     *
     * Events can be sent for both anonymous and identified users
     * to trigger journeys or lists in Postles.
     */
    async track(params: TrackParams): Promise<void> {
        const event: Event = {
            name: params.event,
            anonymous_id: this.anonymousId,
            external_id: this.externalId ?? undefined,
            data: params.properties,
        }

        await this.postEvent(event)
    }

    /**
     * Alias an anonymous user to a known user.
     *
     * This is automatically called by identify() when a user transitions
     * from anonymous to known.
     */
    async alias(anonymousId: string, externalId: string): Promise<void> {
        this.externalId = externalId
        await this.storage.setExternalId(externalId)

        const alias: Alias = {
            anonymous_id: anonymousId,
            external_id: externalId,
        }

        await this.network.post('alias', alias)
    }

    /**
     * Register the current device with an optional push notification token.
     *
     * Pass the token as a string from whatever push notification library
     * you use (e.g. Firebase, Expo, push-notification-ios).
     */
    async register(params?: DeviceRegistrationParams): Promise<void> {
        const info = await getDeviceInfo()

        const device: Device = {
            anonymous_id: this.anonymousId,
            external_id: this.externalId ?? undefined,
            device_id: this.deviceId,
            token: params?.token,
            os: info.os,
            os_version: info.osVersion,
            model: info.model,
            app_build: info.appBuild,
            app_version: info.appVersion,
        }

        await this.network.post('devices', device)
    }

    /**
     * Fetch in-app notifications for the current user.
     */
    async getNotifications(): Promise<Page<PostlesNotification>> {
        this.lastInAppFetch = Date.now()

        const user: Alias = {
            anonymous_id: this.anonymousId,
            external_id: this.externalId ?? undefined,
        }

        return this.network.get<Page<PostlesNotification>>('notifications', user)
    }

    /**
     * Mark a notification as read/consumed.
     */
    async consume(notification: PostlesNotification): Promise<void> {
        const user: Alias = {
            anonymous_id: this.anonymousId,
            external_id: this.externalId ?? undefined,
        }

        await this.network.put(`notifications/${notification.id}`, user)
    }

    /**
     * Whether the SDK checks for in-app messages on its own.
     */
    get fetchInAppOnForeground(): boolean {
        return this.config.fetchInAppOnForeground ?? true
    }

    /**
     * Subscribe to automatic in-app message checks.
     *
     * useInAppMessages() does this for you. Returns an unsubscribe function.
     */
    onInAppRefresh(listener: () => void): () => void {
        this.inAppRefreshListeners.add(listener)
        return () => {
            this.inAppRefreshListeners.delete(listener)
        }
    }

    /**
     * Ask anything listening for in-app messages to fetch.
     *
     * Does nothing if a fetch already happened in the last 30 seconds, or if
     * `fetchInAppOnForeground` is off. Returns whether the check went out.
     */
    requestInAppRefresh(): boolean {
        if (!this.fetchInAppOnForeground) return false
        if (Date.now() - this.lastInAppFetch < inAppFetchThrottleMs) return false

        this.inAppRefreshListeners.forEach((listener) => listener())
        return true
    }

    /**
     * Handle a received push notification.
     *
     * Pass the notification data from whichever push library you use. Postles
     * pushes trigger a check for waiting in-app messages, anything else is
     * ignored. Returns true if the push came from Postles.
     */
    handlePushNotification(data?: Record<string, any> | null): boolean {
        if (!data || data.postles === undefined) return false

        this.requestInAppRefresh()
        return true
    }

    /**
     * Fetch the current user's subscription preferences.
     *
     * Only public subscriptions are returned. Pass the `nextCursor` from a
     * previous page to fetch the next page of results.
     */
    async getSubscriptions(cursor?: string): Promise<Page<SubscriptionPreference>> {
        const user: Alias = {
            anonymous_id: this.anonymousId,
            external_id: this.externalId ?? undefined,
        }

        const path = cursor
            ? `subscriptions?cursor=${encodeURIComponent(cursor)}`
            : 'subscriptions'

        const page = await this.network.get<Page<any>>(path, user)
        return {
            ...page,
            results: (page.results ?? []).map((item) => ({
                subscriptionId: item.subscription_id,
                name: item.name,
                channel: item.channel,
                state: item.state,
            })),
        }
    }

    /**
     * Update a single subscription preference for the current user.
     *
     * Flips one public subscription between `subscribed` and `unsubscribed`.
     */
    async setSubscription(subscriptionId: number, state: SubscriptionState): Promise<void> {
        await this.network.put(`subscriptions/${subscriptionId}`, {
            anonymous_id: this.anonymousId,
            external_id: this.externalId ?? undefined,
            state,
        })
    }

    /**
     * Subscribe the current user to a single subscription.
     */
    async subscribe(subscriptionId: number): Promise<void> {
        await this.setSubscription(subscriptionId, 'subscribed')
    }

    /**
     * Unsubscribe the current user from a single subscription.
     */
    async unsubscribe(subscriptionId: number): Promise<void> {
        await this.setSubscription(subscriptionId, 'unsubscribed')
    }

    /**
     * Check if a URL is a Postles deep link.
     */
    isPostlesDeepLink(url: string): boolean {
        return url.startsWith(`${this.config.urlEndpoint}/c`)
    }

    /**
     * Handle a Postles deep link.
     *
     * Registers the click with the Postles API and opens the destination
     * URL via Linking.openURL. Returns the redirect URL, or null if the
     * URL is not a Postles deep link.
     */
    handleDeepLink(url: string): string | null {
        if (!this.isPostlesDeepLink(url)) return null

        try {
            const parsed = new URL(url)
            const redirect = parsed.searchParams.get('r')
            if (!redirect) return null

            const decoded = decodeURIComponent(redirect)

            // Fire the click tracking request (fire-and-forget)
            fetch(url, { method: 'GET' }).catch(() => {})

            // Open the redirect URL
            Linking.openURL(decoded).catch(() => {})

            return decoded
        } catch {
            return null
        }
    }

    /**
     * Reset the session.
     *
     * Generates a new anonymous ID and clears the external ID.
     * Use this on user logout.
     */
    async reset(): Promise<void> {
        const newAnonymousId = generateUUID()
        this.anonymousId = newAnonymousId
        this.externalId = null

        await this.storage.setAnonymousId(newAnonymousId)
        await this.storage.setExternalId(null)
    }

    getAnonymousId(): string {
        return this.anonymousId
    }

    getExternalId(): string | null {
        return this.externalId
    }

    private async postEvent(event: Event, retries = 3): Promise<void> {
        try {
            await this.network.post('events', [event])
        } catch (error) {
            if (retries > 0) {
                await this.postEvent(event, retries - 1)
            }
        }
    }
}
