import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as Device from 'expo-device';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Image, Linking as NativeLinking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';

type NotificationsModule = typeof import('expo-notifications');

// Expo Go no longer provides Android remote notifications. Delay loading the
// module so Expo Go can run the WebView shell normally; dev/production builds
// retain the complete native push implementation.
const Notifications: NotificationsModule | null = Constants.appOwnership === 'expo'
  ? null
  : require('expo-notifications') as NotificationsModule;

Notifications?.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: true }),
});

const INSTALLATION_KEY = 'aptivo.installation-id';
const AUTH_REQUEST_KEY = 'aptivo.mobile-auth-request';
const AUTH_COMPLETION_KEY = 'aptivo.mobile-auth-completion';
const AUTHENTICATED_SESSION_KEY = 'aptivo.has-authenticated-session';
const WEB_URL = process.env.EXPO_PUBLIC_APTIVO_URL;

WebBrowser.maybeCompleteAuthSession();

function configuredOrigin() {
  if (!WEB_URL) throw new Error('EXPO_PUBLIC_APTIVO_URL is required.');
  const url = new URL(WEB_URL);
  const localHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !localHttp) throw new Error('EXPO_PUBLIC_APTIVO_URL must use HTTPS outside local development.');
  return url.origin;
}

function safeInternalPath(value: unknown) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null;
  return value;
}

function isExternalScheme(url: URL) {
  return ['mailto:', 'tel:'].includes(url.protocol);
}

function base64Url(value: string) {
  return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

/** Native-drawn Aptivo cap mark: no image or external font dependency. */
function AptivoCap({ size }: { size: number }) {
  const unit = size / 28;
  return (
    <View accessible={false} style={{ width: size, height: size }}>
      <View style={[styles.capBoard, { width: 15 * unit, height: 15 * unit, left: 6.5 * unit, top: 1.5 * unit, borderRadius: 2 * unit }]} />
      <View style={[styles.capBase, { width: 17 * unit, height: 6 * unit, left: 5.5 * unit, top: 15 * unit, borderRadius: 4 * unit }]} />
      <View style={[styles.capTassel, { width: 1.7 * unit, height: 9 * unit, left: 23 * unit, top: 10 * unit, borderRadius: unit }]} />
      <View style={[styles.capKnot, { width: 4 * unit, height: 4 * unit, left: 21.8 * unit, top: 18 * unit, borderRadius: 2 * unit }]} />
    </View>
  );
}

async function createPkceValue() {
  const bytes = await Crypto.getRandomBytesAsync(64);
  const verifier = base64Url(btoa(String.fromCharCode(...bytes)));
  // The portal authorisation endpoint validates a SHA-256 hexadecimal challenge.
  const challenge = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return { verifier, challenge };
}

async function installationId() {
  const existing = await SecureStore.getItemAsync(INSTALLATION_KEY);
  if (existing) return existing;
  const created = `aptivo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 18)}`;
  await SecureStore.setItemAsync(INSTALLATION_KEY, created);
  return created;
}

export default function AptivoWebShell() {
  const origin = useMemo(configuredOrigin, []);
  const webRef = useRef<WebView>(null);
  const [webKey, setWebKey] = useState(0);
  const [entryPath, setEntryPath] = useState<string | null>(null);
  const [hasAuthenticatedSession, setHasAuthenticatedSession] = useState<boolean | null>(null);
  const [initialReady, setInitialReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [pendingAuthCompletion, setPendingAuthCompletion] = useState<{ code: string; state: string } | null>(null);
  const installationRef = useRef<string | undefined>(undefined);
  const notificationTokenRef = useRef<string | undefined>(undefined);
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    void SecureStore.getItemAsync(AUTHENTICATED_SESSION_KEY).then((value) => {
      const hasSession = value === 'true';
      wasAuthenticatedRef.current = hasSession;
      setHasAuthenticatedSession(hasSession);
    });
  }, []);

  const loadPath = useCallback((path: string) => {
    const safePath = safeInternalPath(path);
    if (!safePath) return;
    if (initialReady) webRef.current?.injectJavaScript(`window.location.assign(${JSON.stringify(`${origin}${safePath}`)}); true;`);
    else setPendingPath(safePath);
  }, [initialReady, origin]);

  const sendToWeb = useCallback(async (message: Record<string, unknown>) => {
    webRef.current?.postMessage(JSON.stringify(message));
  }, []);

  const registerForPush = useCallback(async () => {
    if (!Notifications || !Device.isDevice) return;
    const permissions = await Notifications.getPermissionsAsync();
    const finalPermissions = permissions.status === 'granted' ? permissions : await Notifications.requestPermissionsAsync();
    if (finalPermissions.status !== 'granted') return;
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId || projectId === 'REPLACE_WITH_EAS_PROJECT_ID') return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    notificationTokenRef.current = token;
    const id = installationRef.current ?? await installationId();
    installationRef.current = id;
    await sendToWeb({ type: 'SET_INSTALLATION', installationId: id });
    await sendToWeb({ type: 'REGISTER_PUSH_DEVICE', installationId: id, expoPushToken: token, platform: Platform.OS });
  }, [sendToWeb]);

  const startGoogleAuthentication = useCallback(async (intent: 'login' | 'register') => {
    try {
      const { verifier, challenge } = await createPkceValue();
      const state = Crypto.randomUUID();
      await SecureStore.setItemAsync(AUTH_REQUEST_KEY, JSON.stringify({ verifier, state }));
      const redirectUri = Linking.createURL('auth/complete');
      const requestUrl = new URL('/mobile-auth', origin);
      requestUrl.search = new URLSearchParams({ challenge, state, redirect_uri: redirectUri, intent }).toString();
      const result = await WebBrowser.openAuthSessionAsync(requestUrl.toString(), redirectUri);
      if (result.type !== 'success') return;
      const returned = new URL(result.url);
      const code = returned.searchParams.get('code');
      if (!code || returned.searchParams.get('state') !== state) return;
      setPendingAuthCompletion({ code, state });
    } catch {
      // The existing web login remains visible and retryable if the browser flow is cancelled or fails.
    }
  }, [origin]);

  const completeGoogleAuthentication = useCallback(async () => {
    if (!pendingAuthCompletion || !initialReady) return;
    setPendingAuthCompletion(null);
    const stored = await SecureStore.getItemAsync(AUTH_REQUEST_KEY);
    let request: { verifier?: string; state?: string } = {};
    try { request = stored ? JSON.parse(stored) : {}; } catch { /* invalid local data is discarded below */ }
    const { code, state } = pendingAuthCompletion;
    if (!/^[a-f0-9]{64}$/.test(code) || !request.verifier || request.state !== state) {
      await SecureStore.deleteItemAsync(AUTH_REQUEST_KEY);
      await SecureStore.deleteItemAsync(AUTH_COMPLETION_KEY);
      return;
    }
    const completion = new URL('/api/auth/mobile/webview-complete', origin);
    completion.search = new URLSearchParams({ code, verifier: request.verifier, returnTo: '/dashboard' }).toString();
    await SecureStore.deleteItemAsync(AUTH_REQUEST_KEY);
    await SecureStore.deleteItemAsync(AUTH_COMPLETION_KEY);
    webRef.current?.injectJavaScript(`window.location.replace(${JSON.stringify(completion.toString())}); true;`);
  }, [initialReady, origin, pendingAuthCompletion]);

  useEffect(() => {
    void SecureStore.getItemAsync(AUTH_COMPLETION_KEY).then((value) => {
      if (!value) return;
      try {
        const completion = JSON.parse(value) as { code?: unknown; state?: unknown };
        if (typeof completion.code === 'string' && typeof completion.state === 'string') {
          setPendingAuthCompletion({ code: completion.code, state: completion.state });
        }
      } catch { void SecureStore.deleteItemAsync(AUTH_COMPLETION_KEY); }
    });
  }, []);

  useEffect(() => { void completeGoogleAuthentication(); }, [completeGoogleAuthentication]);

  const captureAuthReturn = useCallback((url: string) => {
    try {
      const returned = new URL(url);
      // Expo Go uses /--/auth/complete while the installed APK uses
      // aptivo://auth/complete. Accept both without exposing either screen.
      if (!returned.pathname.endsWith('/auth/complete')) return false;
      const code = returned.searchParams.get('code');
      const state = returned.searchParams.get('state');
      if (!code || !state) return false;
      setPendingAuthCompletion({ code, state });
      return true;
    } catch { return false; }
  }, []);

  const handleBridgeMessage = useCallback((event: WebViewMessageEvent) => {
    let message: { type?: string };
    try { message = JSON.parse(event.nativeEvent.data); } catch { return; }
    if (message.type === 'WEBVIEW_READY') {
      void (async () => {
        const id = installationRef.current ?? await installationId();
        installationRef.current = id;
        await sendToWeb({ type: 'SET_INSTALLATION', installationId: id });
        if (notificationTokenRef.current) await sendToWeb({ type: 'REGISTER_PUSH_DEVICE', installationId: id, expoPushToken: notificationTokenRef.current, platform: Platform.OS });
      })();
    }
    if (message.type === 'AUTHENTICATED') {
      wasAuthenticatedRef.current = true;
      setHasAuthenticatedSession(true);
      void SecureStore.setItemAsync(AUTHENTICATED_SESSION_KEY, 'true');
      void registerForPush();
    }
    if (message.type === 'START_GOOGLE_AUTH') {
      void startGoogleAuthentication((message as { intent?: 'login' | 'register' }).intent === 'register' ? 'register' : 'login');
    }
    if (message.type === 'LOGOUT') {
      // A logged-out landing/login page is normal on first launch. Only clear
      // history after an authenticated session has actually existed here.
      if (!wasAuthenticatedRef.current) return;
      wasAuthenticatedRef.current = false;
      setHasAuthenticatedSession(false);
      void SecureStore.deleteItemAsync(AUTHENTICATED_SESSION_KEY);
      setCanGoBack(false);
      setWebKey((key) => key + 1); // Removes protected WebView history after normal web logout.
    }
    if (message.type === 'OPEN_EXTERNAL' && typeof (message as { url?: unknown }).url === 'string') {
      void NativeLinking.openURL((message as { url: string }).url).catch(() => undefined);
    }
  }, [registerForPush, sendToWeb, startGoogleAuthentication]);

  const shouldStart = useCallback((request: WebViewNavigation) => {
    try {
      const url = new URL(request.url);
      if (url.pathname.toLowerCase().endsWith('.pdf')) {
        void NativeLinking.openURL(request.url).catch(() => undefined);
        return false;
      }
      if (url.origin === origin) return true;
      if (isExternalScheme(url) || url.protocol === 'https:' || url.protocol === 'http:') {
        void NativeLinking.openURL(request.url).catch(() => undefined);
      }
    } catch { /* Blocks javascript:, file:, malformed, and untrusted custom schemes. */ }
    return false;
  }, [origin]);

  useEffect(() => {
    if (!Notifications) return;
    if (Platform.OS === 'android') {
      void Notifications.setNotificationChannelAsync('aptivo-updates', {
        name: 'Aptivo updates', importance: Notifications.AndroidImportance.DEFAULT, vibrationPattern: [0, 180], sound: 'default',
      }).catch(() => undefined);
    }
    const tapSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = response.notification.request.content.data?.path;
      if (typeof path === 'string') loadPath(path);
    });
    const initialResponse = Notifications.getLastNotificationResponseAsync().then((response) => {
      const path = response?.notification.request.content.data?.path;
      if (typeof path === 'string') loadPath(path);
    });
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      if (captureAuthReturn(url)) return;
      const parsed = Linking.parse(url);
      loadPath(`/${[parsed.path, parsed.queryParams ? new URLSearchParams(parsed.queryParams as Record<string, string>).toString() : ''].filter(Boolean).join('?')}`);
    });
    void Linking.getInitialURL().then((url) => { if (url) captureAuthReturn(url); });
    return () => { tapSubscription.remove(); linkingSubscription.remove(); void initialResponse; };
  }, [captureAuthReturn, loadPath]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) return false;
      webRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  // The native shell is for enrolled students, not the public marketing page.
  // Protected portal routing continues to send signed-out users to login.
  const source = { uri: `${origin}${pendingPath ?? entryPath ?? '/dashboard'}` };
  if (failed) {
    return <SafeAreaView style={styles.failure}><StatusBar style="dark" /><Text style={styles.failureTitle}>Unable to connect to Aptivo</Text><Text style={styles.failureCopy}>Check your connection and try again.</Text><Pressable onPress={() => { setFailed(false); setWebKey((key) => key + 1); }} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></SafeAreaView>;
  }

  if (hasAuthenticatedSession === null) {
    return <SafeAreaView style={styles.launchScreen}><StatusBar style="dark" /><View style={styles.launchMark}><AptivoCap size={30} /></View><Text style={styles.launchName}>Aptivo</Text></SafeAreaView>;
  }

  if (!entryPath && !hasAuthenticatedSession) {
    return (
      <SafeAreaView style={styles.welcome}>
        <StatusBar style="dark" />
        <View style={[styles.orb, styles.orbOne]} />
        <View style={[styles.orb, styles.orbTwo]} />
        <View style={[styles.orb, styles.orbThree]} />
        <View style={styles.welcomeContent}>
          <View style={styles.brandRow}>
            <View style={styles.brandMark}><AptivoCap size={24} /></View>
            <Text style={styles.brandName}>Aptivo</Text>
          </View>
          <Image source={require('../assets/aptivo-mascot.png')} style={styles.mascot} resizeMode="contain" accessibilityLabel="Aptivo learning mascot" />
          <View style={styles.welcomeCopy}>
            <Text style={styles.eyebrow}>E-LEARNING · APTITUDE</Text>
            <Text style={styles.welcomeTitle}>Welcome to{`\n`}Aptivo</Text>
            <Text style={styles.welcomeDescription}>Built by toppers for the next ones — your best aptitude learning platform.</Text>
          </View>
          <View style={styles.welcomeActions}>
            <Pressable accessibilityRole="button" accessibilityLabel="Sign in to Aptivo" onPress={() => setEntryPath('/login')} style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}>
              <Text style={styles.signInText}>Sign in</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Register for Aptivo" onPress={() => setEntryPath('/register')} style={({ pressed }) => [styles.register, pressed && styles.pressed]}>
              <Text style={styles.registerText}>Register</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <StatusBar style="dark" />
      <WebView
        key={webKey}
        ref={webRef}
        source={source}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        cacheEnabled
        allowsBackForwardNavigationGestures
        originWhitelist={['https://*', 'http://localhost:*']}
        onShouldStartLoadWithRequest={shouldStart}
        onNavigationStateChange={(state) => setCanGoBack(state.canGoBack)}
        onMessage={handleBridgeMessage}
        onLoadEnd={() => { setInitialReady(true); setFailed(false); if (pendingPath) { const path = pendingPath; setPendingPath(null); loadPath(path); } }}
        onError={() => { if (!initialReady) setFailed(true); }}
        onHttpError={(event) => { if (!initialReady && event.nativeEvent.statusCode >= 500) setFailed(true); }}
        startInLoadingState
        renderLoading={() => <View style={styles.loading}><View style={styles.logoMark} /><Text style={styles.loadingText}>APTIVO</Text></View>}
        style={styles.webview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, webview: { flex: 1, backgroundColor: '#F8FAFC' },
  loading: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', gap: 14 },
  logoMark: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#0D9488' }, loadingText: { color: '#042F2E', fontWeight: '800', letterSpacing: 3 },
  failure: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, backgroundColor: '#F8FAFC' },
  failureTitle: { color: '#042F2E', fontSize: 22, fontWeight: '800', textAlign: 'center' }, failureCopy: { color: '#475569', fontSize: 15, textAlign: 'center', marginTop: 10 },
  retry: { marginTop: 24, borderRadius: 14, backgroundColor: '#0D9488', paddingHorizontal: 28, paddingVertical: 14 }, retryText: { color: '#FFFFFF', fontWeight: '800' },
  welcome: { flex: 1, overflow: 'hidden', backgroundColor: '#F8FAFC' },
  launchScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#F8FAFC' },
  launchName: { color: '#042F2E', fontSize: 21, fontWeight: '900', letterSpacing: -0.5 },
  welcomeContent: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 24, paddingBottom: 28 },
  orb: { position: 'absolute', borderRadius: 999, backgroundColor: '#CCFBEF' },
  orbOne: { width: 172, height: 172, top: -56, right: -64, opacity: 0.65 },
  orbTwo: { width: 100, height: 100, top: '34%', left: -48, opacity: 0.8 },
  orbThree: { width: 68, height: 68, bottom: '25%', right: -22, opacity: 0.55 },
  brandRow: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D9488', shadowColor: '#0D9488', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  launchMark: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0D9488', shadowColor: '#0D9488', shadowOpacity: 0.2, shadowRadius: 10, elevation: 4 },
  capBoard: { position: 'absolute', backgroundColor: '#FFFFFF', transform: [{ rotate: '45deg' }] },
  capBase: { position: 'absolute', backgroundColor: '#FFFFFF' },
  capTassel: { position: 'absolute', backgroundColor: '#FFFFFF' },
  capKnot: { position: 'absolute', backgroundColor: '#FFFFFF' },
  brandName: { color: '#042F2E', fontSize: 23, fontWeight: '900', letterSpacing: -0.6 },
  mascot: { width: '100%', maxWidth: 280, height: 295, marginTop: 4, marginBottom: -4 },
  welcomeCopy: { alignItems: 'center', maxWidth: 330 },
  eyebrow: { color: '#0F766E', fontSize: 11, fontWeight: '900', letterSpacing: 1.6, marginBottom: 10 },
  welcomeTitle: { color: '#042F2E', fontSize: 39, lineHeight: 43, fontWeight: '900', textAlign: 'center', letterSpacing: -1.2 },
  welcomeDescription: { color: '#475569', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 14 },
  welcomeActions: { width: '100%', gap: 12, marginTop: 10 },
  signIn: { width: '100%', alignItems: 'center', borderRadius: 18, backgroundColor: '#0D9488', paddingVertical: 16, shadowColor: '#0D9488', shadowOpacity: 0.22, shadowRadius: 12, elevation: 4 },
  signInText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  register: { width: '100%', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#99F6E4', backgroundColor: '#FFFFFF', paddingVertical: 15 },
  registerText: { color: '#0F766E', fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
