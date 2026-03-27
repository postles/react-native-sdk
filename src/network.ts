import type { Alias, PostlesConfig } from './models'

export class NetworkManager {
    private config: PostlesConfig

    constructor(config: PostlesConfig) {
        this.config = config
    }

    private buildUrl(path: string): string {
        return `${this.config.urlEndpoint}/api/client/${path}`
    }

    private buildHeaders(extra: Record<string, string | undefined> = {}): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`,
        }
        for (const [key, value] of Object.entries(extra)) {
            if (value !== undefined) {
                headers[key] = value
            }
        }
        return headers
    }

    async post<T = void>(path: string, body: any): Promise<T | void> {
        const response = await fetch(this.buildUrl(path), {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            throw new Error(`POST ${path} failed with status ${response.status}`)
        }

        const text = await response.text()
        if (!text) return

        try {
            return JSON.parse(text) as T
        } catch {
            return
        }
    }

    async get<T>(path: string, user: Alias): Promise<T> {
        const response = await fetch(this.buildUrl(path), {
            method: 'GET',
            headers: this.buildHeaders({
                'x-anonymous-id': user.anonymous_id,
                'x-external-id': user.external_id,
            }),
        })

        if (!response.ok) {
            throw new Error(`GET ${path} failed with status ${response.status}`)
        }

        return response.json() as Promise<T>
    }

    async put<T = void>(path: string, body: any): Promise<T | void> {
        const response = await fetch(this.buildUrl(path), {
            method: 'PUT',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            throw new Error(`PUT ${path} failed with status ${response.status}`)
        }

        const text = await response.text()
        if (!text) return

        try {
            return JSON.parse(text) as T
        } catch {
            return
        }
    }
}
