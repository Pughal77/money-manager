import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { VaultProvider } from '../src/data/VaultContext';
import { SyncTopBar } from '../src/ui/components';
import { useTheme } from '../src/ui/theme';

function ThemedAppShell() {
  const { colors, isDark } = useTheme();

  return (
    <SafeAreaView
      style={[styles.outerContainer, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[styles.centeredColumn, { backgroundColor: colors.bg }]}>
        <SyncTopBar />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="transaction/new"
            options={{
              headerShown: false,
              presentation: 'transparentModal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="breakdown"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="category/[id]"
            options={{
              headerShown: false,
            }}
          />
        </Stack>
      </View>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <VaultProvider>
        <ThemedAppShell />
      </VaultProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
  },
  centeredColumn: {
    flex: 1,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
});
