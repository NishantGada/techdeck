import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BookmarksProvider } from '../src/state/BookmarksContext';
import { FeedProvider } from '../src/state/FeedContext';
import { SettingsProvider, useSettings } from '../src/state/SettingsContext';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';

function Shell() {
  const theme = useTheme();
  const { ready } = useSettings();

  // Hold the first paint until the stored theme is known, so the app never flashes
  // light before switching to dark.
  if (!ready) return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;

  return (
    <>
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ThemeProvider>
          <FeedProvider>
            <BookmarksProvider>
              <Shell />
            </BookmarksProvider>
          </FeedProvider>
        </ThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
