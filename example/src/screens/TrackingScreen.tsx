import React, { useState } from 'react'
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native'
import { usePostles } from '@postles/react-native-sdk'

const PRESET_EVENTS = [
    {
        event: 'Button Tapped',
        properties: { buttonName: 'checkout', screen: 'cart' },
    },
    {
        event: 'Screen Viewed',
        properties: { screen: 'home', referrer: 'push_notification' },
    },
    {
        event: 'Purchase Completed',
        properties: { orderId: 'ord-456', amount: 49.99, currency: 'USD' },
    },
] as const

export default function TrackingScreen() {
    const postles = usePostles()
    const [eventName, setEventName] = useState('Button Tapped')
    const [properties, setProperties] = useState(
        '{\n    "buttonName": "checkout",\n    "screen": "cart"\n}'
    )
    const [loading, setLoading] = useState(false)
    const [recentEvents, setRecentEvents] = useState<string[]>([])

    const handleTrack = async () => {
        if (!postles) return

        if (!eventName.trim()) {
            Alert.alert('Validation Error', 'Event name is required')
            return
        }

        let parsedProperties: Record<string, unknown> | undefined
        if (properties.trim()) {
            try {
                parsedProperties = JSON.parse(properties)
            } catch {
                Alert.alert('Validation Error', 'Properties must be valid JSON')
                return
            }
        }

        setLoading(true)
        try {
            await postles.track({
                event: eventName.trim(),
                properties: parsedProperties,
            })
            setRecentEvents((prev) => [eventName.trim(), ...prev.slice(0, 4)])
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to track event')
        } finally {
            setLoading(false)
        }
    }

    const applyPreset = (preset: { event: string; properties: Record<string, unknown> }) => {
        setEventName(preset.event)
        setProperties(JSON.stringify(preset.properties, null, 4))
    }

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.description}>
                Track custom events with optional properties. Events are queued and sent with
                automatic retries.
            </Text>

            <View>
                <Text style={styles.sectionLabel}>Quick Presets</Text>
                <View style={styles.presets}>
                    {PRESET_EVENTS.map((preset) => (
                        <TouchableOpacity
                            key={preset.event}
                            style={styles.chip}
                            onPress={() => applyPreset(preset)}
                        >
                            <Text style={styles.chipText}>{preset.event}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Event Name *</Text>
                <TextInput
                    style={styles.input}
                    value={eventName}
                    onChangeText={setEventName}
                    placeholder="Button Tapped"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Properties (JSON)</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    value={properties}
                    onChangeText={setProperties}
                    placeholder='{"key": "value"}'
                    multiline
                    numberOfLines={5}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <TouchableOpacity
                style={[styles.button, (!postles || loading) && styles.disabled]}
                onPress={handleTrack}
                disabled={!postles || loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Track Event</Text>
                )}
            </TouchableOpacity>

            {recentEvents.length > 0 && (
                <View style={styles.recentCard}>
                    <Text style={styles.sectionLabel}>Tracked This Session</Text>
                    {recentEvents.map((event, index) => (
                        <Text key={index} style={styles.recentEvent}>
                            {event}
                        </Text>
                    ))}
                </View>
            )}
        </ScrollView>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 20,
        gap: 16,
    },
    description: {
        fontSize: 14,
        color: '#6b7280',
        lineHeight: 20,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9ca3af',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    presets: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: '#ede9fe',
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 7,
    },
    chipText: {
        fontSize: 13,
        color: '#6366f1',
        fontWeight: '500',
    },
    field: {
        gap: 6,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
    },
    input: {
        backgroundColor: '#fff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e5e7eb',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1a1a1a',
    },
    multiline: {
        height: 120,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#6366f1',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
    },
    disabled: {
        opacity: 0.4,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    recentCard: {
        backgroundColor: '#f0fdf4',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#bbf7d0',
        gap: 6,
    },
    recentEvent: {
        fontSize: 14,
        color: '#166534',
    },
})
