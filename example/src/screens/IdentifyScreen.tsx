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

export default function IdentifyScreen() {
    const postles = usePostles()
    const [userId, setUserId] = useState('user-123')
    const [email, setEmail] = useState('jane@example.com')
    const [phone, setPhone] = useState('+1234567890')
    const [traits, setTraits] = useState('{\n    "plan": "premium",\n    "company": "Acme"\n}')
    const [loading, setLoading] = useState(false)

    const handleIdentify = async () => {
        if (!postles) return

        if (!userId.trim()) {
            Alert.alert('Validation Error', 'User ID is required')
            return
        }

        let parsedTraits: Record<string, unknown> | undefined
        if (traits.trim()) {
            try {
                parsedTraits = JSON.parse(traits)
            } catch {
                Alert.alert('Validation Error', 'Traits must be valid JSON')
                return
            }
        }

        setLoading(true)
        try {
            await postles.identify({
                id: userId.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                traits: parsedTraits,
            })
            Alert.alert('Success', `User "${userId.trim()}" identified successfully.`)
        } catch (err) {
            Alert.alert('Error', err instanceof Error ? err.message : 'Failed to identify user')
        } finally {
            setLoading(false)
        }
    }

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
        >
            <Text style={styles.description}>
                Associate this device session with a known user. If the session was previously
                anonymous, the SDK automatically aliases the anonymous and known profiles.
            </Text>

            <View style={styles.field}>
                <Text style={styles.label}>User ID *</Text>
                <TextInput
                    style={styles.input}
                    value={userId}
                    onChangeText={setUserId}
                    placeholder="user-123"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="user@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Phone</Text>
                <TextInput
                    style={styles.input}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+1234567890"
                    keyboardType="phone-pad"
                />
            </View>

            <View style={styles.field}>
                <Text style={styles.label}>Traits (JSON)</Text>
                <TextInput
                    style={[styles.input, styles.multiline]}
                    value={traits}
                    onChangeText={setTraits}
                    placeholder='{"plan": "premium"}'
                    multiline
                    numberOfLines={4}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <TouchableOpacity
                style={[styles.button, (!postles || loading) && styles.disabled]}
                onPress={handleIdentify}
                disabled={!postles || loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.buttonText}>Identify User</Text>
                )}
            </TouchableOpacity>
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
        height: 100,
        textAlignVertical: 'top',
    },
    button: {
        backgroundColor: '#6366f1',
        borderRadius: 10,
        padding: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    disabled: {
        opacity: 0.4,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
})
