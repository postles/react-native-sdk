import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { usePostles } from '@postles/react-native-sdk'

/**
 * Silent component that handles push notification permission requests and token
 * registration with Postles. Place this once inside <PostlesProvider>.
 *
 * The SDK accepts any push token string, so you can swap expo-notifications for
 * @react-native-firebase/messaging or @react-native-community/push-notification-ios
 * — just call postles.register({ token }) with the token from whichever library
 * you use. See the README for examples.
 */
export default function PushSetup() {
    const postles = usePostles()

    useEffect(() => {
        if (!postles) return

        // Capture the SDK instance so callbacks stay valid across re-renders
        const sdk = postles

        async function registerPush() {
            const { status: existingStatus } = await Notifications.getPermissionsAsync()
            let finalStatus = existingStatus

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync()
                finalStatus = status
            }

            if (finalStatus !== 'granted') {
                console.log('[Postles] Push notification permission denied')
                return
            }

            try {
                const tokenData = await Notifications.getDevicePushTokenAsync()
                await sdk.register({ token: tokenData.data })
                console.log('[Postles] Push token registered')
            } catch (err) {
                // Push tokens are unavailable in simulators — this is expected in development
                console.log('[Postles] Push token unavailable (simulator?):', err)
            }
        }

        registerPush()

        // Re-register whenever the OS issues a new token
        const subscription = Notifications.addPushTokenListener(async ({ data: token }) => {
            try {
                await sdk.register({ token })
                console.log('[Postles] Push token refreshed')
            } catch (err) {
                console.error('[Postles] Failed to re-register push token:', err)
            }
        })

        return () => subscription.remove()
    }, [postles])

    return null
}
