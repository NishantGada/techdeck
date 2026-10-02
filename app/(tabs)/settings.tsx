import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '../../src/components/AppHeader';
import { useDevRefreshControl } from '../../src/components/DevRefresh';
import type { AudienceMode } from '../../src/content/types';
import { useFeed } from '../../src/state/FeedContext';
import { useSettings } from '../../src/state/SettingsContext';
import { useTheme } from '../../src/theme/ThemeContext';
import { space, typography, type ThemePreference } from '../../src/theme/theme';

function SectionLabel({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: colors.textMuted,
        fontSize: typography.label.size,
        fontWeight: typography.label.weight,
        letterSpacing: typography.label.letterSpacing,
        textTransform: 'uppercase',
        marginBottom: 10,
      }}
    >
      {children}
    </Text>
  );
}

interface ChoiceProps<T extends string> {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
}

function Choice<T extends string>({ options, value, onChange }: ChoiceProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 8,
              paddingVertical: 13,
              paddingHorizontal: 14,
              opacity: selected ? 1 : 0.62,
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 16,
                fontWeight: selected ? '700' : '500',
              }}
            >
              {option.label}
            </Text>
            {option.hint ? (
              <Text style={{ color: colors.textMuted, fontSize: 13.5, lineHeight: 19, marginTop: 3 }}>
                {option.hint}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SettingsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, setAudienceMode, setThemePreference } = useSettings();
  const feed = useFeed();
  const refreshControl = useDevRefreshControl(colors.textMuted);

  const confirmReset = () => {
    Alert.alert(
      'Reset all progress?',
      'This clears every card you have read and every question you have answered, across every topic. To reset just one topic, use Reset this topic on the Topics tab. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset all', style: 'destructive', onPress: () => feed.resetProgress() },
      ]
    );
  };

  const seenCount = feed.progress.seenOrder.length;
  const totalCount = feed.libraryDeck.base.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <AppHeader trailing="Settings" />
      <ScrollView
        refreshControl={refreshControl}
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingTop: space.gap,
          paddingHorizontal: space.screenX,
          paddingBottom: space.screenY * 2,
        }}
      >
        <View style={{ marginBottom: space.gap * 2.2 }}>
          <SectionLabel>Audience</SectionLabel>
          <Choice<AudienceMode>
            value={settings.audienceMode}
            onChange={setAudienceMode}
            options={[
              { value: 'interview', label: 'Interview prep', hint: 'Shared and interview cards.' },
              { value: 'job', label: 'On the job', hint: 'Shared and on-the-job cards.' },
            ]}
          />
        </View>

        <View style={{ marginBottom: space.gap * 2.2 }}>
          <SectionLabel>Theme</SectionLabel>
          <Choice<ThemePreference>
            value={settings.themePreference}
            onChange={setThemePreference}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </View>

        <View>
          <SectionLabel>Progress</SectionLabel>
          <Text style={{ color: colors.textMuted, fontSize: 14.5, lineHeight: 21, marginBottom: 10 }}>
            {seenCount} of {totalCount} cards seen in this mode. Individual topics can be reset
            on the Topics tab.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={confirmReset}
            style={{
              backgroundColor: colors.errorSurface,
              borderRadius: 8,
              paddingVertical: 13,
              paddingHorizontal: 14,
              alignSelf: 'flex-start',
            }}
          >
            <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>
              Reset all progress
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
