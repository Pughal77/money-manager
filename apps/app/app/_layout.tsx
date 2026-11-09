import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';
import { VaultProvider } from '../src/data/VaultContext';
import { SyncTopBar } from '../src/ui/components';
import { colors } from '../src/ui/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <VaultProvider>
        <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
          <StatusBar style="light" />
          <SyncTopBar />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="transaction/new"
              options={{ title: 'New Transaction', presentation: 'modal' }}
            />
          </Stack>
        </SafeAreaView>
      </VaultProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
