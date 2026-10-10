import * as SecureStore from 'expo-secure-store';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const AUTH_COMPLETION_KEY = 'aptivo.mobile-auth-completion';

/** Captures the OAuth deep link before returning the student to the WebView shell. */
export default function AuthComplete() {
  const { code, state } = useLocalSearchParams<{ code?: string; state?: string }>();

  useEffect(() => {
    void (async () => {
      if (typeof code === 'string' && typeof state === 'string') {
        await SecureStore.setItemAsync(AUTH_COMPLETION_KEY, JSON.stringify({ code, state }));
      }
      router.replace('/');
    })();
  }, [code, state]);

  return <View style={styles.screen}><View style={styles.mark}><Text style={styles.cap}>⌂</Text></View><Text style={styles.title}>Returning to Aptivo</Text><ActivityIndicator color="#0D9488" /><Text style={styles.copy}>Completing your secure sign-in…</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 28, backgroundColor: '#F8FAFC' },
  mark: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D9488' },
  cap: { color: '#FFFFFF', fontSize: 27, fontWeight: '900' },
  title: { marginTop: 8, color: '#042F2E', fontSize: 21, fontWeight: '800' },
  copy: { color: '#475569', fontSize: 14, textAlign: 'center' },
});
