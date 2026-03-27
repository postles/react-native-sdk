import React, { useCallback } from 'react'
import { Modal, StyleSheet, Linking } from 'react-native'
import type {
    PostlesNotification,
    InAppAction,
    HtmlNotificationContent,
} from '../models'

let WebView: any = null
try {
    WebView = require('react-native-webview').WebView
} catch {
    // react-native-webview not installed
}

interface InAppMessageProps {
    notification: PostlesNotification
    visible: boolean
    useDarkMode?: boolean
    onDismiss: (notification: PostlesNotification) => void
    onAction?: (
        action: InAppAction,
        context: Record<string, any>,
        notification: PostlesNotification
    ) => void
    onError?: (error: Error) => void
    onDisplay?: (notification: PostlesNotification) => void
}

const INJECTED_JS = `
(function() {
    window.dismiss = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'dismiss' }));
    };
    window.trigger = function(obj) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ action: 'custom', context: obj || {} }));
    };
    true;
})();
`

const DARK_MODE_JS = `
document.documentElement.classList.add('darkMode');
true;
`

const LIGHT_MODE_JS = `
document.documentElement.classList.remove('darkMode');
true;
`

export function InAppMessage({
    notification,
    visible,
    useDarkMode = false,
    onDismiss,
    onAction,
    onError,
    onDisplay,
}: InAppMessageProps) {
    // All hooks must be called unconditionally before any early returns
    const handleMessage = useCallback(
        (event: { nativeEvent: { data: string } }) => {
            try {
                const message = JSON.parse(event.nativeEvent.data)
                if (message.action === 'dismiss') {
                    onDismiss(notification)
                } else if (message.action === 'custom') {
                    onAction?.('custom', message.context || {}, notification)
                }
            } catch {
                // Ignore malformed messages
            }
        },
        [notification, onDismiss, onAction]
    )

    const handleNavigationStateChange = useCallback(
        (navState: { url: string }) => {
            const url = navState.url

            if (url === 'about:blank') return

            // Handle postles:// scheme
            if (url.startsWith('postles://')) {
                if (url === 'postles://dismiss') {
                    onDismiss(notification)
                } else {
                    onAction?.('custom', { url }, notification)
                }
                return
            }

            // Open external URLs in system browser
            if (url.startsWith('http://') || url.startsWith('https://')) {
                Linking.openURL(url).catch(() => {})
            }
        },
        [notification, onDismiss, onAction]
    )

    const handleShouldStartLoad = useCallback(
        (event: { url: string }): boolean => {
            const url = event.url

            // Allow initial HTML load
            if (url === 'about:blank') return true

            // Block postles:// scheme URLs and handle them
            if (url.startsWith('postles://')) {
                if (url === 'postles://dismiss') {
                    onDismiss(notification)
                } else {
                    onAction?.('custom', { url }, notification)
                }
                return false
            }

            // Block external URLs and open in system browser
            if (url.startsWith('http://') || url.startsWith('https://')) {
                Linking.openURL(url).catch(() => {})
                return false
            }

            return true
        },
        [notification, onDismiss, onAction]
    )

    const handleLoad = useCallback(() => {
        onDisplay?.(notification)
    }, [notification, onDisplay])

    const handleError = useCallback(
        (syntheticEvent: { nativeEvent: { description: string } }) => {
            onError?.(new Error(syntheticEvent.nativeEvent.description))
        },
        [onError]
    )

    if (!WebView) {
        if (__DEV__) {
            console.warn(
                'Postles: react-native-webview is required for in-app messages. ' +
                'Install it with: npm install react-native-webview'
            )
        }
        return null
    }

    // Only HTML notifications can be displayed in the modal
    const content = notification.content as HtmlNotificationContent
    if (!content.html) return null

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={() => onDismiss(notification)}
        >
            <WebView
                source={{ html: content.html }}
                style={styles.webView}
                originWhitelist={['*']}
                javaScriptEnabled
                injectedJavaScript={
                    INJECTED_JS + (useDarkMode ? DARK_MODE_JS : LIGHT_MODE_JS)
                }
                onMessage={handleMessage}
                onNavigationStateChange={handleNavigationStateChange}
                onShouldStartLoadWithRequest={handleShouldStartLoad}
                onLoad={handleLoad}
                onError={handleError}
                scrollEnabled
                backgroundColor="transparent"
            />
        </Modal>
    )
}

const styles = StyleSheet.create({
    webView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
})
