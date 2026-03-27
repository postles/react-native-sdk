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
    private static _instance: Postles | null = null

    private config: PostlesConfig | null = null
    private network: NetworkManager | null = null
    private storage: PostlesStorage
    private anonymousId: string | null = null
    private externalId: string | null = null
    private deviceId: string | null = null
    private initialized = false

    private constructor() {
        this.storage = new PostlesStorage()
    }

    static get shared(): Postles {
        if (!Postles._instance) {
            Postles._instance = new Postles()
        }
        return Postles._instance
    }

    /**
     * Initialize the SDK. Must be called before any other methods.
     */
    static async initialize(config: PostlesConfig): Promise<Postles> {
        const instance = Postles.shared
        instance.config = config
        instance.network = new NetworkManager(config)
        await instance.boot()
        return instance
    }

    private async boot(): Promise<void> {
        // Load or generate anonymous ID
        let anonId = await this.storage.getAnonymousId()
        if (!anonId) {
            anonId = generateUUID()
            await this.storage.setAnonymousId(anonId)
        }
        this.anonymousId = anonId

        // Load external ID if previously set
        this.externalId = await this.storage.getExternalId()

        // Load or generate device ID
        let devId = await this.storage.getDeviceId()
        if (!devId) {
            devId = generateUUID()
            await this.storage.setDeviceId(devId)
        }
        this.deviceId = devId

        this.initialized = true
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
        this.checkInit()

        // Auto-alias when transitioning from anonymous to known
        if (!this.externalId && params.id) {
            await this.alias(this.anonymousId!, params.id)
        }

        this.externalId = params.id
        await this.storage.setExternalId(params.id)

        const identity: Identity = {
            anonymous_id: this.anonymousId!,
            external_id: params.id,
            email: params.email,
            phone: params.phone,
            data: params.traits,
        }

        await this.network!.post('identify', identity)
    }

    /**
     * Track an event.
     *
     * Events can be sent for both anonymous and identified users
     * to trigger journeys or lists in Postles.
     */
    async track(params: TrackParams): Promise<void> {
        this.checkInit()

        const event: Event = {
            name: params.event,
            anonymous_id: this.anonymousId!,
            external_id: this.externalId ?? undefined,
            data: params.properties,
        }

        await this.postEvent(event)
    }

    /**
     * Alias an anonymous user to a known user.
     *
     * This is automatically called by identify() when a user transitions
     * from anonymous to known. Calling alias only works once; repeated
     * calls do nothing.
     */
    async alias(anonymousId: string, externalId: string): Promise<void> {
        this.checkInit()

        this.externalId = externalId
        await this.storage.setExternalId(externalId)

        const alias: Alias = {
            anonymous_id: anonymousId,
            external_id: externalId,
        }

        await this.network!.post('alias', alias)
    }

    /**
     * Register the current device with an optional push notification token.
     *
     * Pass the token as a string from whatever push notification library
     * you use (e.g. Firebase, Expo, push-notification-ios).
     */
    async register(params?: DeviceRegistrationParams): Promise<void> {
        this.checkInit()

        const info = await getDeviceInfo()

        const device: Device = {
            anonymous_id: this.anonymousId!,
            external_id: this.externalId ?? undefined,
            device_id: this.deviceId!,
            token: params?.token,
            os: info.os,
            os_version: info.osVersion,
            model: info.model,
            app_build: info.appBuild,
            app_version: info.appVersion,
        }

        await this.network!.post('devices', device)
    }

    /**
     * Fetch in-app notifications for the current user.
     */
    async getNotifications(): Promise<Page<PostlesNotification>> {
        this.checkInit()

        const user: Alias = {
            anonymous_id: this.anonymousId!,
            external_id: this.externalId ?? undefined,
        }

        return this.network!.get<Page<PostlesNotification>>('notifications', user)
    }

    /**
     * Mark a notification as read/consumed.
     */
    async consume(notification: PostlesNotification): Promise<void> {
        this.checkInit()

        const user: Alias = {
            anonymous_id: this.anonymousId!,
            external_id: this.externalId ?? undefined,
        }

        await this.network!.put(`notifications/${notification.id}`, user)
    }

    /**
     * Check if a URL is a Postles deep link.
     */
    isPostlesDeepLink(url: string): boolean {
        if (!this.config) return false
        return url.startsWith(`${this.config.urlEndpoint}/c`)
    }

    /**
     * Handle a Postles deep link.
     *
     * Unwraps click-tracked URLs, registers the click with the
     * Postles API, and returns the redirect URL. Returns null
     * if the URL is not a Postles deep link.
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

    getAnonymousId(): string | null {
        return this.anonymousId
    }

    getExternalId(): string | null {
        return this.externalId
    }

    private checkInit(): void {
        if (!this.initialized || !this.config || !this.network) {
            throw new Error(
                'Postles SDK not initialized. Call Postles.initialize() first.'
            )
        }
    }

    private async postEvent(event: Event, retries = 3): Promise<void> {
        try {
            // Events are sent as an array, matching iOS/Android SDK behavior
            await this.network!.post('events', [event])
        } catch (error) {
            if (retries > 0) {
                await this.postEvent(event, retries - 1)
            }
        }
    }
}
