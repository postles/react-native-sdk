import { Platform, NativeModules } from 'react-native'

export interface DeviceInfoData {
    os: string
    osVersion: string
    model: string
    appBuild: string
    appVersion: string
}

export async function getDeviceInfo(): Promise<DeviceInfoData> {
    try {
        const DeviceInfo = require('react-native-device-info')
        return {
            os: Platform.OS === 'ios' ? 'iOS' : 'Android',
            osVersion: DeviceInfo.getSystemVersion(),
            model: DeviceInfo.getModel(),
            appBuild: DeviceInfo.getBuildNumber(),
            appVersion: DeviceInfo.getVersion(),
        }
    } catch {
        return {
            os: Platform.OS === 'ios' ? 'iOS' : 'Android',
            osVersion: String(Platform.Version),
            model: 'Unknown',
            appBuild: '0',
            appVersion: '0.0.0',
        }
    }
}

/**
 * Resolve the device's current IANA timezone (e.g. "America/New_York").
 *
 * Uses the Intl API, which is available on Hermes. Returns undefined if
 * it can't be determined.
 */
export function getDeviceTimezone(): string | undefined {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
    } catch {
        return undefined
    }
}

/**
 * Resolve the device's current locale as a BCP 47 tag (e.g. "en-US").
 *
 * Reads from the platform's native settings. Returns undefined if it
 * can't be determined.
 */
export function getDeviceLocale(): string | undefined {
    try {
        let locale: string | undefined
        if (Platform.OS === 'ios') {
            const settings = NativeModules.SettingsManager?.settings
            locale = settings?.AppleLocale || settings?.AppleLanguages?.[0]
        } else {
            locale = NativeModules.I18nManager?.localeIdentifier
        }
        // Native APIs may return e.g. "en_US"; normalize to BCP 47 "en-US".
        return locale ? locale.replace(/_/g, '-') : undefined
    } catch {
        return undefined
    }
}
