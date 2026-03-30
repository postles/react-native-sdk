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
} from './models'
import { NetworkManager } from './network'
import { PostlesStorage } from './storage'
import { generateUUID } from './utils'
import { getDeviceInfo } from './device'

export class Postles {
    private config: PostlesConfig
    private network: NetworkManager
    private storage: PostlesStorage
    private anonymousId: string
    private externalId: string | null = null
    private deviceId: string

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
