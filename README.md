# Postles React Native SDK

The official Postles SDK for React Native. Provides user identification, event tracking, push notification registration, in-app messaging, and deep link handling.

## Installation

```bash
npm install @postles/react-native-sdk @react-native-async-storage/async-storage
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

Wrap your app in `<PostlesProvider>` once. Everything else uses hooks.

```tsx
import { PostlesProvider } from '@postles/react-native-sdk'

export default function App() {
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

Then in any component:

```tsx
import { usePostles } from '@postles/react-native-sdk'

function ProfileScreen() {
    const postles = usePostles() // null while SDK is initializing

    useEffect(() => {
        if (!postles) return
        postles.identify({
            id: 'user-123',
            email: 'user@example.com',
            traits: { plan: 'premium' },
        })
    }, [postles])
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

Identify a user with an external ID and optional attributes. When a user transitions from anonymous to known, the SDK automatically aliases the anonymous and known user.

```tsx
const postles = usePostles()
if (!postles) return

await postles.identify({
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

Call `reset()` on logout. This generates a new anonymous ID and clears the external ID.

```tsx
const postles = usePostles()
if (!postles) return

await postles.reset()
```

## Event Tracking

```tsx
const postles = usePostles()
if (!postles) return

await postles.track({
    event: 'Button Tapped',
    properties: {
        buttonName: 'checkout',
        screen: 'cart',
    },
})
```

## Push Notifications

The SDK accepts push tokens as strings, so it works with any push notification library.

### With @react-native-firebase/messaging

```tsx
import messaging from '@react-native-firebase/messaging'
import { usePostles } from '@postles/react-native-sdk'

function PushSetup() {
    const postles = usePostles()

    useEffect(() => {
        if (!postles) return

        messaging().requestPermission().then(() =>
            messaging().getToken()
        ).then((token) =>
            postles.register({ token })
        )

        return messaging().onTokenRefresh((token) => {
            postles.register({ token })
        })
    }, [postles])

    return null
}
```

### With expo-notifications

```tsx
import * as Notifications from 'expo-notifications'
import { usePostles } from '@postles/react-native-sdk'

function PushSetup() {
    const postles = usePostles()

    useEffect(() => {
        if (!postles) return
        Notifications.getDevicePushTokenAsync().then(({ data: token }) =>
            postles.register({ token })
        )
    }, [postles])

    return null
}
```

### With @react-native-community/push-notification-ios

```tsx
import PushNotificationIOS from '@react-native-community/push-notification-ios'
import { usePostles } from '@postles/react-native-sdk'

function PushSetup() {
    const postles = usePostles()

    useEffect(() => {
        if (!postles) return
        PushNotificationIOS.addEventListener('register', (token) => {
            postles.register({ token })
        })
        PushNotificationIOS.requestPermissions()
    }, [postles])

    return null
}
```

## In-App Messaging

In-app messages require `react-native-webview`.

```tsx
import { useInAppMessages, InAppMessage } from '@postles/react-native-sdk'

function HomeScreen() {
    const { currentNotification, visible, dismiss } = useInAppMessages({
        autoShow: true,
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
                />
            )}
        </>
    )
}
```

## Deep Link Handling

`handleDeepLink` registers the click with Postles and opens the destination URL via `Linking.openURL`.

```tsx
const postles = usePostles()

// e.g. in a push notification handler
if (postles?.isPostlesDeepLink(url)) {
    postles.handleDeepLink(url)
}
```

## API Reference

### `usePostles()`

Returns the `Postles` instance from context, or `null` while the SDK is initializing. Must be used inside `<PostlesProvider>`.

| Method | Description |
|--------|-------------|
| `.identify(params)` | Identify a user |
| `.track(params)` | Track an event |
| `.register(params?)` | Register device / push token |
| `.reset()` | Reset session on logout |
| `.isPostlesDeepLink(url)` | Check if URL is a Postles deep link |
| `.handleDeepLink(url)` | Track click and open the destination URL |
| `.getAnonymousId()` | Get current anonymous ID |
| `.getExternalId()` | Get current external ID |

### `useInAppMessages(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoShow` | `boolean` | `true` | Fetch and show notifications on mount |
| `useDarkMode` | `boolean` | `false` | Apply dark mode CSS class to HTML notifications |
| `onNew` | `(n) => 'show' \| 'skip' \| 'consume'` | `'show'` | Filter or consume individual notifications |
| `onAction` | `(action, context, n) => void` | — | Called when the user triggers an action |
| `onDisplay` | `(n) => void` | — | Called when a notification is displayed |
| `onError` | `(error) => void` | — | Called on fetch or display errors |

Returns `{ currentNotification, visible, dismiss, refresh }`.

### Components

| Component | Description |
|-----------|-------------|
| `<PostlesProvider config onReady?>` | Initializes SDK and provides context |
| `<InAppMessage notification visible onDismiss onAction? onDisplay? onError?>` | Renders in-app notification in a modal |

## License

MIT
