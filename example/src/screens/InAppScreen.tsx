import React from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native'
import { useInAppMessages, InAppMessage } from '@postles/react-native-sdk'
import type { InAppAction, PostlesNotification } from '@postles/react-native-sdk'

export default function InAppScreen() {
    const { currentNotification, visible, dismiss, refresh } = useInAppMessages({
        autoShow: true,
        onNew: (notification) => {
            console.log('[Postles] New in-app notification:', notification.id)
            // Return 'show' to display, 'skip' to ignore, or 'consume' to silently mark as read
            return 'show'
        },
        onError: (error) => {
            console.error('[Postles] In-app error:', error)
        },
    })

    const handleAction = (
        action: InAppAction,
        context: Record<string, unknown>,
        notification: PostlesNotification
    ) => {
        console.log('[Postles] In-app action:', action, context, notification.id)
        dismiss()
    }

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.description}>
                    In-app messages are fetched from the Postles API and displayed as modal overlays.
                    HTML-type notifications are rendered in a WebView; the page calls{' '}
                    <Text style={styles.code}>window.dismiss()</Text> or{' '}
                    <Text style={styles.code}>window.trigger(obj)</Text> to communicate actions back
                    to the SDK.
                </Text>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Pending Notification</Text>
                    {currentNotification ? (
                        <>
                            <View style={styles.row}>
                                <Text style={styles.metaLabel}>ID</Text>
                                <Text style={styles.metaValue}>{currentNotification.id}</Text>
                            </View>
                            <View style={styles.row}>
                                <Text style={styles.metaLabel}>Type</Text>
                                <Text style={[styles.metaValue, styles.typeTag]}>
                                    {currentNotification.contentType}
                                </Text>
                            </View>
                            <Text style={styles.notifTitle}>
                                {currentNotification.content.title}
                            </Text>
                            <Text style={styles.notifBody}>
                                {currentNotification.content.body}
                            </Text>
                        </>
                    ) : (
                        <Text style={styles.empty}>No pending notifications</Text>
                    )}
                </View>

                <TouchableOpacity style={styles.button} onPress={refresh}>
                    <Text style={styles.buttonText}>Refresh Messages</Text>
                </TouchableOpacity>

                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>How it works</Text>
                    <Text style={styles.infoText}>
                        {'1. useInAppMessages() fetches pending notifications on mount\n'}
                        {'2. onNew decides whether to show, skip, or silently consume each one\n'}
                        {'3. InAppMessage renders the current notification in a modal\n'}
                        {'4. dismiss() marks the notification as consumed and advances the queue'}
                    </Text>
                </View>
            </ScrollView>

            {/*
             * InAppMessage renders as a full-screen Modal overlay.
             * Note: onDismiss receives the notification as an argument — we ignore it
             * here and call dismiss() from the hook, which handles consumption internally.
             */}
            {currentNotification && (
                <InAppMessage
                    notification={currentNotification}
                    visible={visible}
                    onDismiss={() => dismiss()}
                    onAction={handleAction}
                    onDisplay={(notification) => {
                        console.log('[Postles] Displaying notification:', notification.id)
                    }}
                    onError={(error) => {
                        console.error('[Postles] Modal render error:', error)
                    }}
                />
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        padding: 20,
        gap: 16,
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    code: {
        fontFamily: 'monospace',
        fontSize: 13,
        color: '#6366f1',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaLabel: {
        fontSize: 11,
        color: '#9ca3af',
        width: 32,
    },
    metaValue: {
        fontSize: 13,
        color: '#374151',
        fontFamily: 'monospace',
    },
    typeTag: {
        color: '#6366f1',
        fontFamily: undefined,
        fontWeight: '500',
    },
    notifTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginTop: 4,
    },
    notifBody: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    empty: {
        fontSize: 14,
        color: '#9ca3af',
        fontStyle: 'italic',
    },
    button: {
        backgroundColor: '#6366f1',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    infoCard: {
        backgroundColor: '#fafafa',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        gap: 8,
    },
    infoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#374151',
    },
    infoText: {
        fontSize: 13,
        color: '#6b7280',
        lineHeight: 20,
    },
})
