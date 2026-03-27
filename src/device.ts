import { Platform } from 'react-native'

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
