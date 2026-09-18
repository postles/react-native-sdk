import type { Alias, PostlesConfig } from './models'
import { PostlesError } from './errors'

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

    private identityHeaders(user?: Alias): Record<string, string | undefined> {
        if (!user) return {}
        return {
            'x-anonymous-id': user.anonymous_id,
            'x-external-id': user.external_id,
        }
    }

    private async fail(method: string, path: string, response: Response): Promise<never> {
        const fallback = `${method} ${path} failed with status ${response.status}`
        let body: any
        try {
            body = JSON.parse(await response.text())
        } catch {
            body = undefined
        }
        throw new PostlesError(
            typeof body?.error === 'string' && body.error ? body.error : fallback,
            response.status,
            typeof body?.code === 'number' ? body.code : undefined
        )
    }

    private async parse<T>(response: Response): Promise<T | void> {
        const text = await response.text()
        if (!text) return

        try {
            return JSON.parse(text) as T
        } catch {
            return
        }
    }

    async post<T = void>(path: string, body: any): Promise<T | void> {
        const response = await fetch(this.buildUrl(path), {
            method: 'POST',
            headers: this.buildHeaders(),
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            return this.fail('POST', path, response)
        }

        return this.parse<T>(response)
    }

    async get<T>(path: string, user: Alias): Promise<T> {
        const response = await fetch(this.buildUrl(path), {
            method: 'GET',
            headers: this.buildHeaders(this.identityHeaders(user)),
        })

        if (!response.ok) {
            return this.fail('GET', path, response)
        }

        return response.json() as Promise<T>
    }

    async put<T = void>(path: string, body: any, user?: Alias): Promise<T | void> {
        const response = await fetch(this.buildUrl(path), {
            method: 'PUT',
            headers: this.buildHeaders(this.identityHeaders(user)),
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            return this.fail('PUT', path, response)
        }

        return this.parse<T>(response)
    }
}
