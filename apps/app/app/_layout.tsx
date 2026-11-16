import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Platform, StyleSheet, View } from 'react-native';
import { VaultProvider } from '../src/data/VaultContext';
import { SyncTopBar } from '../src/ui/components';
import { DesktopSidebar } from '../src/ui/DesktopSidebar';
import { useTheme } from '../src/ui/theme';
import { useResponsive } from '../src/ui/useResponsive';

function ThemedAppShell() {
  const { colors, isDark } = useTheme();
  const { isDesktop } = useResponsive();

  return (
    <SafeAreaView
      style={[styles.outerContainer, { backgroundColor: colors.bg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={[
          styles.centeredColumn,
          {
            backgroundColor: colors.bg,
            maxWidth: isDesktop ? 1440 : 520,
          },
        ]}
      >
        {!isDesktop && <SyncTopBar />}
        <View style={isDesktop ? styles.desktopShellRow : styles.mobileShellCol}>
          {isDesktop && <DesktopSidebar />}
          <View style={styles.stackContainer}>
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
                  presentation: Platform.OS === 'web' ? 'card' : 'transparentModal',
                  animation: Platform.OS === 'web' ? 'fade' : 'slide_from_bottom',
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
        </View>
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
  desktopShellRow: {
    flex: 1,
    flexDirection: 'row',
  },
  mobileShellCol: {
    flex: 1,
    flexDirection: 'column',
  },
  stackContainer: {
    flex: 1,
    height: '100%',
  },
});
