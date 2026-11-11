import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.couplechaos.app',
  appName: 'Couple Chaos',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SocialLogin: {
      providers: { google: true, apple: true, facebook: false, twitter: false },
      logLevel: 1,
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#050505',
      androidSplashResourceName: 'splash',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050505',
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#050505',
  },
  ios: {
    backgroundColor: '#050505',
    contentInset: 'never',
    scrollEnabled: false,
  },
};

export default config;
