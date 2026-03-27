# Postles React Native SDK

The official Postles SDK for React Native. Provides user identification, event tracking, push notification registration, in-app messaging, and deep link handling.

## Installation

```bash
npm install @postles/react-native-sdk @react-native-async-storage/async-storage
```

For iOS:
```bash
cd ios && pod install
```

### Optional Dependencies

**In-App Messaging** (required for displaying in-app notifications):
```bash
npm install react-native-webview
```

**Device Info** (for richer device registration data):
```bash
npm install react-native-device-info
```

## Quick Start

### Imperative API

```typescript
import { Postles } from '@postles/react-native-sdk'

// Initialize (call once on app startup)
await Postles.initialize({
    apiKey: 'your-api-key',
    urlEndpoint: 'https://your-postles-instance.com',
})

// Identify a user
await Postles.shared.identify({
    id: 'user-123',
    email: 'user@example.com',
    traits: { plan: 'premium' },
})

// Track an event
await Postles.shared.track({
    event: 'Purchase Completed',
    properties: { amount: 99.99, currency: 'USD' },
})
```

### Declarative API (React Components)

```tsx
import { PostlesProvider } from '@postles/react-native-sdk'

function App() {
    return (
        <PostlesProvider
            config={{
                apiKey: 'your-api-key',
                urlEndpoint: 'https://your-postles-instance.com',
            }}
        >
            <YourApp />
        </PostlesProvider>
    )
}
```

## Configuration

```typescript
interface PostlesConfig {
    apiKey: string       // Your Postles public API key
    urlEndpoint: string  // Your Postles instance URL
}
```

## User Identification

### Identify

Identify a user with an external ID and optional attributes. When a user transitions from anonymous to known, the SDK automatically aliases the anonymous and known user.

```typescript
await Postles.shared.identify({
    id: 'user-123',
    email: 'user@example.com',
    phone: '+1234567890',
    traits: {
        firstName: 'Jane',
        plan: 'premium',
        company: 'Acme',
    },
})
```

### Reset

Call `reset()` when a user logs out. This generates a new anonymous ID and clears the external ID.

```typescript
await Postles.shared.reset()
```

## Event Tracking

```typescript
await Postles.shared.track({
    event: 'Button Tapped',
    properties: {
        buttonName: 'checkout',
        screen: 'cart',
    },
})
```

## Push Notifications

The SDK accepts push tokens as strings, so it works with any push notification library. Pass the token to `register()` after obtaining it.

### With @react-native-firebase/messaging

```typescript
import messaging from '@react-native-firebase/messaging'
import { Postles } from '@postles/react-native-sdk'

// Request permission
await messaging().requestPermission()

// Get token and register
const token = await messaging().getToken()
await Postles.shared.register({ token })

// Listen for token refresh
messaging().onTokenRefresh(async (newToken) => {
    await Postles.shared.register({ token: newToken })
})
```

### With expo-notifications

```typescript
import * as Notifications from 'expo-notifications'
import { Postles } from '@postles/react-native-sdk'

const { data: token } = await Notifications.getExpoPushTokenAsync()
// Or for native push tokens:
// const { data: token } = await Notifications.getDevicePushTokenAsync()

await Postles.shared.register({ token })
```

### With @react-native-community/push-notification-ios

```typescript
import PushNotificationIOS from '@react-native-community/push-notification-ios'
import { Postles } from '@postles/react-native-sdk'

PushNotificationIOS.addEventListener('register', async (token) => {
    await Postles.shared.register({ token })
})

PushNotificationIOS.requestPermissions()
```

## Device Registration

Register the device without a push token (useful for device analytics):

```typescript
await Postles.shared.register()
```

## In-App Messaging

In-app messages require `react-native-webview` as a peer dependency.

### Using the Hook

```tsx
import { usePostles, useInAppMessages, InAppMessage } from '@postles/react-native-sdk'

function HomeScreen() {
    const postles = usePostles()

    const { currentNotification, visible, dismiss, refresh } = useInAppMessages({
        autoShow: true,
        useDarkMode: false,
        onAction: (action, context, notification) => {
            console.log('In-app action:', action, context)
        },
        onNew: (notification) => {
            // Return 'show', 'skip', or 'consume'
            return 'show'
        },
        onError: (error) => {
            console.error('In-app error:', error)
        },
    })

    return (
        <>
            {/* Your screen content */}
            {currentNotification && (
                <InAppMessage
                    notification={currentNotification}
                    visible={visible}
                    onDismiss={dismiss}
                    onAction={(action, context, notification) => {
                        console.log('Action:', action, context)
                    }}
                />
            )}
        </>
    )
}
```

### Using the Component Directly

```tsx
import { useState, useEffect } from 'react'
import { Postles, InAppMessage } from '@postles/react-native-sdk'
import type { PostlesNotification } from '@postles/react-native-sdk'

function MyScreen() {
    const [notification, setNotification] = useState<PostlesNotification | null>(null)

    useEffect(() => {
        Postles.shared.getNotifications().then((page) => {
            if (page.results.length > 0) {
                setNotification(page.results[0])
            }
        })
    }, [])

    if (!notification) return null

    return (
        <InAppMessage
            notification={notification}
            visible={!!notification}
            onDismiss={(n) => {
                Postles.shared.consume(n)
                setNotification(null)
            }}
        />
    )
}
```

## Deep Link Handling

### With React Navigation

```typescript
import { Postles } from '@postles/react-native-sdk'
import { Linking } from 'react-native'

// In your linking configuration
const linking = {
    prefixes: ['https://your-app.com', 'yourapp://'],
    subscribe(listener: (url: string) => void) {
        const subscription = Linking.addEventListener('url', ({ url }) => {
            // Check if it's a Postles deep link
            if (Postles.shared.isPostlesDeepLink(url)) {
                const redirect = Postles.shared.handleDeepLink(url)
                if (redirect) {
                    listener(redirect)
                    return
                }
            }
            listener(url)
        })

        return () => subscription.remove()
    },
}
```

### Manual Handling

```typescript
if (Postles.shared.isPostlesDeepLink(url)) {
    const redirectUrl = Postles.shared.handleDeepLink(url)
    // redirectUrl is the unwrapped destination URL
}
```

## API Reference

### Postles

| Method | Description |
|--------|-------------|
| `Postles.initialize(config)` | Initialize the SDK (async) |
| `Postles.shared` | Access the singleton instance |
| `.identify(params)` | Identify a user |
| `.track(params)` | Track an event |
| `.alias(anonymousId, externalId)` | Alias anonymous to known user |
| `.register(params?)` | Register device / push token |
| `.reset()` | Reset session (logout) |
| `.getNotifications()` | Fetch in-app notifications |
| `.consume(notification)` | Mark notification as read |
| `.isPostlesDeepLink(url)` | Check if URL is a Postles deep link |
| `.handleDeepLink(url)` | Handle and unwrap a deep link |
| `.getAnonymousId()` | Get current anonymous ID |
| `.getExternalId()` | Get current external ID |

### Components

| Component | Description |
|-----------|-------------|
| `<PostlesProvider>` | Initializes SDK and provides context |
| `<InAppMessage>` | Renders in-app notification in a modal |

### Hooks

| Hook | Description |
|------|-------------|
| `usePostles()` | Access SDK instance from context |
| `useInAppMessages(options?)` | Manage in-app message display flow |

## License

MIT
