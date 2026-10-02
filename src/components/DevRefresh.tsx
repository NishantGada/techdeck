import Constants from 'expo-constants';
import { useCallback, useState } from 'react';
import { Linking, RefreshControl } from 'react-native';

/** "10.0.0.97:8085" while a dev server is attached; null in any built app. */
const hostUri = Constants.expoConfig?.hostUri ?? null;

/**
 * Pull down to reload the project from the dev server.
 *
 * This is a *development* affordance, not a data refresh: nothing here is remote, so
 * re-reading state would be a no-op. It reloads the bundle, which is the only way to pick
 * up changes Fast Refresh cannot hot-swap — anything in `app.json` (name, scheme, icon),
 * read once at startup, and a brand-new file in `content/`, which needs require.context
 * to be re-evaluated.
 *
 * It opens the project's own `exp://` URL rather than calling `DevSettings.reload()`.
 * That matters: Expo Go is a host app that owns the JS runtime lifecycle, and the bare
 * React Native reload restarts the VM behind its back — Expo Go comes back with no bundle
 * fetched and no native modules bound ("Cannot find native module 'ExpoAsset'",
 * `"main" has not been registered`). Going through the loader re-fetches the manifest and
 * the bundle, the way scanning the QR code does.
 *
 * Hidden unless a dev server is attached, so a built app never shows a gesture that
 * cannot do anything.
 */
export function useDevRefreshControl(tintColor: string) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    if (!__DEV__ || !hostUri) return;
    setRefreshing(true);
    // Failing softly is the point: if the loader declines, nothing happens and the app
    // keeps running, rather than being torn down into an unrecoverable state.
    void Linking.openURL(`exp://${hostUri}`).catch(() => {});
    // Release the spinner if the reload never arrives, so the gesture is not left stuck.
    setTimeout(() => setRefreshing(false), 2500);
  }, []);

  if (!__DEV__ || !hostUri) return undefined;

  return (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={tintColor} />
  );
}
