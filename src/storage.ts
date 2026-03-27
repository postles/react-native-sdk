import AsyncStorage from '@react-native-async-storage/async-storage'

const KEYS = {
    ANONYMOUS_ID: '@postles/anonymousId',
    EXTERNAL_ID: '@postles/externalId',
    DEVICE_ID: '@postles/deviceId',
} as const

export class PostlesStorage {
    async getAnonymousId(): Promise<string | null> {
        return AsyncStorage.getItem(KEYS.ANONYMOUS_ID)
    }

    async setAnonymousId(id: string): Promise<void> {
        await AsyncStorage.setItem(KEYS.ANONYMOUS_ID, id)
    }

    async getExternalId(): Promise<string | null> {
        return AsyncStorage.getItem(KEYS.EXTERNAL_ID)
    }

    async setExternalId(id: string | null): Promise<void> {
        if (id === null) {
            await AsyncStorage.removeItem(KEYS.EXTERNAL_ID)
        } else {
            await AsyncStorage.setItem(KEYS.EXTERNAL_ID, id)
        }
    }

    async getDeviceId(): Promise<string | null> {
        return AsyncStorage.getItem(KEYS.DEVICE_ID)
    }

    async setDeviceId(id: string): Promise<void> {
        await AsyncStorage.setItem(KEYS.DEVICE_ID, id)
    }

    async clearAll(): Promise<void> {
        await AsyncStorage.removeItem(KEYS.ANONYMOUS_ID)
        await AsyncStorage.removeItem(KEYS.EXTERNAL_ID)
        await AsyncStorage.removeItem(KEYS.DEVICE_ID)
    }
}
