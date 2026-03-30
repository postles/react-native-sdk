import React from 'react'
import { StatusBar } from 'expo-status-bar'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { PostlesProvider } from '@postles/react-native-sdk'

import HomeScreen from './src/screens/HomeScreen'
import IdentifyScreen from './src/screens/IdentifyScreen'
import TrackingScreen from './src/screens/TrackingScreen'
import InAppScreen from './src/screens/InAppScreen'
import PushSetup from './src/PushSetup'

// ─── Configuration ────────────────────────────────────────────────────────────
// Replace these with your actual Postles API key and instance URL
const POSTLES_CONFIG = {
    apiKey: 'your-api-key',
    urlEndpoint: 'https://your-postles-instance.com',
}
// ──────────────────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator()

export default function App() {
    return (
        <PostlesProvider
            config={POSTLES_CONFIG}
            onReady={(postles) => {
                console.log('[Postles] SDK ready, anonymous ID:', postles.getAnonymousId())
            }}
        >
            {/*
             * PushSetup is a silent component that requests notification permissions
             * and registers the device push token with Postles.
             * It must live inside PostlesProvider to access the SDK instance.
             */}
            <PushSetup />

            <NavigationContainer>
                <StatusBar style="auto" />
                <Tab.Navigator
                    screenOptions={{
                        headerStyle: { backgroundColor: '#6366f1' },
                        headerTintColor: '#fff',
                        headerTitleStyle: { fontWeight: '600' },
                        tabBarActiveTintColor: '#6366f1',
                    }}
                >
                    <Tab.Screen
                        name="Home"
                        component={HomeScreen}
                        options={{ title: 'Overview' }}
                    />
                    <Tab.Screen
                        name="Identify"
                        component={IdentifyScreen}
                        options={{ title: 'Identify' }}
                    />
                    <Tab.Screen
                        name="Track"
                        component={TrackingScreen}
                        options={{ title: 'Track' }}
                    />
                    <Tab.Screen
                        name="InApp"
                        component={InAppScreen}
                        options={{ title: 'In-App' }}
                    />
                </Tab.Navigator>
            </NavigationContainer>
        </PostlesProvider>
    )
}
