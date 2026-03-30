import React, { useEffect, useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ScrollView,
} from 'react-native'
import { usePostles } from '@postles/react-native-sdk'

export default function HomeScreen() {
    const postles = usePostles()
    const [anonymousId, setAnonymousId] = useState<string | null>(null)
    const [externalId, setExternalId] = useState<string | null>(null)

    useEffect(() => {
        if (!postles) return
        setAnonymousId(postles.getAnonymousId())
        setExternalId(postles.getExternalId())
    }, [postles])

    const handleReset = async () => {
        if (!postles) return
        await postles.reset()
        setAnonymousId(postles.getAnonymousId())
        setExternalId(postles.getExternalId())
        Alert.alert('Reset', 'Session reset. A new anonymous ID has been generated.')
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Postles SDK Example</Text>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>SDK Status</Text>
                <Text style={[styles.status, postles ? styles.statusReady : styles.statusPending]}>
                    {postles ? 'Initialized' : 'Initializing...'}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Current Session</Text>
                <Text style={styles.label}>Anonymous ID</Text>
                <Text style={styles.value} numberOfLines={1} ellipsizeMode="middle">
                    {anonymousId ?? '—'}
                </Text>
                <Text style={styles.label}>External ID</Text>
                <Text style={styles.value}>
                    {externalId ?? 'Not yet identified'}
                </Text>
            </View>

            <TouchableOpacity
                style={[styles.button, styles.dangerButton, !postles && styles.disabled]}
                onPress={handleReset}
                disabled={!postles}
            >
                <Text style={styles.buttonText}>Reset Session</Text>
            </TouchableOpacity>

            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>About this example</Text>
                <Text style={styles.infoText}>
                    Each tab demonstrates a key feature of the Postles React Native SDK:
                    {'\n\n'}
                    <Text style={styles.bold}>Identify</Text>
                    {' — '}Associate this session with a known user{'\n'}
                    <Text style={styles.bold}>Track</Text>
                    {' — '}Send custom analytics events{'\n'}
                    <Text style={styles.bold}>In-App</Text>
                    {' — '}Fetch and display in-app messages
                </Text>
            </View>
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        gap: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        gap: 6,
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
    status: {
        fontSize: 16,
        fontWeight: '600',
    },
    statusReady: {
        color: '#22c55e',
    },
    statusPending: {
        color: '#f59e0b',
    },
    label: {
        fontSize: 11,
        color: '#9ca3af',
        marginTop: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 14,
        color: '#374151',
        fontFamily: 'monospace',
    },
    button: {
        backgroundColor: '#6366f1',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    dangerButton: {
        backgroundColor: '#ef4444',
    },
    disabled: {
        opacity: 0.4,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    infoCard: {
        backgroundColor: '#f5f3ff',
        borderRadius: 12,
        padding: 16,
        borderLeftWidth: 3,
        borderLeftColor: '#6366f1',
    },
    infoTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#4f46e5',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 22,
    },
    bold: {
        fontWeight: '700',
    },
})
