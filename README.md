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

### Locale & timezone

The user's `locale` (BCP 47, e.g. `en-US`) and `timezone` (IANA, e.g. `America/New_York`) are detected from the device automatically on every `identify` call. Pass them explicitly to override the device values:

```tsx
await postles.identify({
    id: 'user-123',
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
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

## Preference Center (Topics)

A user's messaging preferences are made of **topics** grouped into **channels**. Each channel (email, text, push) has a master switch and, under it, the individual topics a user can turn on and off. `useTopicChannels()` loads them in the shape a preference screen renders, and saves a whole screen in one request. No UI is included, so you build your own screen. The user must be identified first (via `identify`).

```tsx
import {
    useTopicChannels,
    isTopicResubscribeLocked,
    type Topic,
    type TopicUpdate,
} from '@postles/react-native-sdk'
import { Button, Switch, Text, View } from 'react-native'
import { useState } from 'react'

function PreferencesScreen() {
    const { channels, loading, error, save } = useTopicChannels()
    const [changes, setChanges] = useState<Record<number, TopicUpdate['state']>>({})

    if (loading) return <Text>Loading…</Text>
    if (error) return <Text>{error.message}</Text>

    const stateOf = (topic: Topic): TopicUpdate['state'] =>
        changes[topic.subscriptionId] ?? (topic.state === 'subscribed' ? 'subscribed' : 'unsubscribed')

    const toggle = (topic: Topic, on: boolean) =>
        setChanges((current) => ({
            ...current,
            [topic.subscriptionId]: on ? 'subscribed' : 'unsubscribed',
        }))

    const onSave = async () => {
        // Send every master that is not locked, plus only the topics whose
        // master was on when the screen rendered.
        const updates = channels.flatMap((channel) => [
            ...(channel.master && channel.canResubscribe ? [channel.master] : []),
            ...(channel.paused ? [] : channel.topics),
        ]).map((topic) => ({ subscriptionId: topic.subscriptionId, state: stateOf(topic) }))

        try {
            await save(updates)
        } catch (err) {
            if (isTopicResubscribeLocked(err)) {
                // The channel can only be turned back on from the handset.
            }
        }
    }

    return (
        <View>
            {channels.map((channel) => {
                const master = channel.master
                return <View key={channel.channel}>
                    <Text>{channel.label}</Text>

                    {master && (channel.canResubscribe
                        ? <Switch
                            value={stateOf(master) === 'subscribed'}
                            onValueChange={(on) => toggle(master, on)}
                        />
                        : <Text>
                            To start receiving text messages again, text START to{' '}
                            {channel.resubscribeTextNumber ?? 'our number'}.
                        </Text>
                    )}

                    {/* Only show topic toggles when there is more than one, or any is opt-in */}
                    {(channel.topics.length > 1 || channel.topics.some((t) => t.isOptIn)) &&
                        channel.topics.map((topic) => (
                            <Switch
                                key={topic.subscriptionId}
                                disabled={channel.paused}
                                value={stateOf(topic) === 'subscribed'}
                                onValueChange={(on) => toggle(topic, on)}
                            />
                        ))}
                </View>
            })}
            <Button title="Save" onPress={onSave} />
        </View>
    )
}
```

### Rendering rules

- Show topic toggles under a channel only when it has more than one topic or any opt-in topic. Otherwise show just the channel toggle.
- While `paused` is true the master is off, so topic toggles are disabled and their values are not submitted.
- When `canResubscribe` is false and the channel is off, show a notice with `resubscribeTextNumber` instead of a switch. Text is the only channel that works this way today: consent to restart has to come from the handset by replying START.
- A topic the user has never chosen has state `not_opted_in`, which is different from an explicit `unsubscribed`. Render it as off. Only `subscribed` and `unsubscribed` are ever sent back.

### Without the hook

```tsx
const postles = usePostles()

const channels = await postles?.getTopicChannels()
const page = await postles?.getTopics()

await postles?.setTopic(123, 'unsubscribed')
await postles?.subscribeTopic(123)
await postles?.unsubscribeTopic(123)
await postles?.setTopics([{ subscriptionId: 123, state: 'subscribed' }])
```

### Errors

Failed API calls throw a `PostlesError` carrying the HTTP `status` and the Postles error `code`. Turning a text channel back on from the app is refused with code `4004`; `isTopicResubscribeLocked(error)` checks for it.

### Renamed from subscriptions

The old subscription names still work and behave the same, but are deprecated and will be removed in a future major version.

| Old | New |
|-----|-----|
| `getSubscriptions(cursor?)` | `getTopics(cursor?)` |
| `setSubscription(id, state)` | `setTopic(id, state)` |
| `subscribe(id)` | `subscribeTopic(id)` |
| `unsubscribe(id)` | `unsubscribeTopic(id)` |
| `SubscriptionPreference` | `Topic` |
| `SubscriptionState` | `TopicState` |

The deprecated methods cannot express the `not_opted_in` state and report it as `'unsubscribed'`.

## API Reference

### `usePostles()`

Returns the `Postles` instance from context, or `null` while the SDK is initializing. Must be used inside `<PostlesProvider>`.

| Method | Description |
|--------|-------------|
| `.identify(params)` | Identify a user |
| `.track(params)` | Track an event |
| `.register(params?)` | Register device / push token |
| `.getTopics(cursor?)` | Fetch the user's topic preferences as a flat list |
| `.getTopicChannels()` | Fetch the user's topic preferences grouped into channels |
| `.setTopic(id, state)` | Set a topic to `'subscribed'` or `'unsubscribed'` |
| `.setTopics(updates)` | Save up to 100 topic changes in one request |
| `.subscribeTopic(id)` | Subscribe the user to a topic |
| `.unsubscribeTopic(id)` | Unsubscribe the user from a topic |
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

### `useTopicChannels()`

Returns `{ channels, loading, error, save, refresh }`. `save(updates)` sends every update in one request and reloads the channels; it rejects with a `PostlesError` if the server refuses, so a screen can catch a locked resubscribe.

### Components

| Component | Description |
|-----------|-------------|
| `<PostlesProvider config onReady?>` | Initializes SDK and provides context |
| `<InAppMessage notification visible onDismiss onAction? onDisplay? onError?>` | Renders in-app notification in a modal |

## License

MIT
