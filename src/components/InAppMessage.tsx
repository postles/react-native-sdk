import React, { useCallback, useRef, useEffect } from 'react'
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
    // Guard against double-dismiss: both onShouldStartLoadWithRequest and
    // onNavigationStateChange can fire for the same postles:// URL on Android
    // (onPageStarted fires before shouldOverrideUrlLoading blocks the navigation).
    const dismissedRef = useRef(false)
    useEffect(() => {
        dismissedRef.current = false
    }, [notification])

    const handlePostlesUrl = useCallback(
        (url: string) => {
            if (url === 'postles://dismiss') {
                if (!dismissedRef.current) {
                    dismissedRef.current = true
                    onDismiss(notification)
                }
            } else {
                onAction?.('custom', { url }, notification)
            }
        },
        [notification, onDismiss, onAction]
    )

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

    // Fallback for Android: onNavigationStateChange can fire for postles://
    // navigations when onShouldStartLoadWithRequest hasn't blocked them yet.
    const handleNavigationStateChange = useCallback(
        (navState: { url: string }) => {
            const url = navState.url
            if (!url || url === 'about:blank') return
            if (url.startsWith('postles://')) {
                handlePostlesUrl(url)
            }
        },
        [handlePostlesUrl]
    )

    const handleShouldStartLoad = useCallback(
        (event: { url: string }): boolean => {
            const url = event.url

            // Allow initial HTML load
            if (url === 'about:blank') return true

            // Block postles:// scheme URLs and handle them
            if (url.startsWith('postles://')) {
                handlePostlesUrl(url)
                return false
            }

            // Block external URLs and open in system browser
            if (url.startsWith('http://') || url.startsWith('https://')) {
                Linking.openURL(url).catch(() => {})
                return false
            }

            return true
        },
        [handlePostlesUrl]
    )

    const handleLoad = useCallback(() => {
        onDisplay?.(notification)
    }, [notification, onDisplay])

    const handleError = useCallback(
        (syntheticEvent: { nativeEvent: { description: string; url?: string } }) => {
            const { description, url } = syntheticEvent.nativeEvent
            // Android last-resort fallback: if the WebView emits ERR_UNKNOWN_URL_SCHEME
            // for a postles:// URL before onShouldStartLoadWithRequest could block it,
            // handle it here instead of surfacing a load error.
            if (url?.startsWith('postles://')) {
                handlePostlesUrl(url)
                return
            }
            onError?.(new Error(description))
        },
        [onError, handlePostlesUrl]
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
